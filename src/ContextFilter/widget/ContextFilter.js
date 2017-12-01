define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "dojo/aspect"

], function(declare, _WidgetBase, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, lang, dojoText, dojoHtml, dojoEvent, Aspect) {
    "use strict";

    return declare("ContextFilter.widget.ContextFilter", [_WidgetBase], {

        gridName: null,
        overrideStaticConstraint: null,
        filterAttr: null,
        filterOutAttr: null,
        // microflow: null,

        // Internal variables.
        _handles: null,
        _contextObj: null,
        _grid: null,

        constructor: function() {
            this._handles = [];
        },

        postCreate: function() {
            logger.debug(this.id + ".postCreate");
            var gridNode = this.domNode.parentElement.getElementsByClassName("mx-name-" + this.gridName)[0];
            this._grid = dijit.registry.byNode(gridNode) || null;
            if (this._grid === null) {
                console.error("grid node not found");
            }
        },

        update: function(obj, callback) {
            logger.debug(this.id + ".update");
            this._contextObj = obj;
            var filterString = this._contextObj.get(this.filterAttr);
            // this._addActionButton();
            this._attachGridSelectionListeners();
            this._filterAndReloadGrid(filterString);
            this._resetSubscriptions();
            this._updateRendering(callback);
        },

        /**
         * every time the selection is updated, update the context object
         */
        _attachGridSelectionListeners: function() {
            Aspect.after(this._grid, "_addToSelection", lang.hitch(this, function() {
                this._setCurrentSelectionToContext();
            }));
            Aspect.after(this._grid, "_removeFromSelection", lang.hitch(this, function() {
                this._setCurrentSelectionToContext();
            }));
        },

        /**
         * Add a new button to the datagrid that, when clicked, 
         * updates a value on the context entity and then calls a microflow
         */
        // _addActionButton: function() {
        //     if (!this.filterOutAttr) return;
        //     var button = document.createElement("button");
        //     button.id = this.id + "_btn";
        //     button.innerText = "Do Something";
        //     button.className = "btn mx-button btn-default";
        //     this._grid.toolBarNode.append(button);
        //     this.connect(button, "click", lang.hitch(this, function() {
        //         this._setCurrentSelectionToContext();
        //         if (this.microflow) {
        //             mx.data.action({
        //                 params: {
        //                     applyto: "selection",
        //                     actionname: this.microflow,
        //                     guids: [this._contextObj.getGuid()]
        //                 },
        //                 origin: this.mxform,
        //                 callback: lang.hitch(this, function() {
        //                     console.debug("sent");
        //                 })
        //             });
        //         }
        //     }));
        // },

        _setCurrentSelectionToContext: function() {
            var gridSelection = this._grid._getXpathSelection();
            if (gridSelection) {
                this._contextObj.set(this.filterOutAttr, gridSelection.xpath + gridSelection.constraints);
            } else {
                this._contextObj.set(this.filterOutAttr, "");
            }
        },

        _resetSubscriptions: function() {
            this.unsubscribeAll();
            this.subscribe({
                guid: this._contextObj.getGuid(),
                callback: lang.hitch(this, function(guid) {
                    this._filterAndReloadGrid(this._contextObj.get(this.filterAttr));
                })
            });
            this.subscribe({
                guid: this._contextObj.getGuid(),
                attr: this.filterAttr,
                callback: lang.hitch(this, function(guid, attr, attrValue) {
                    this._filterAndReloadGrid(attrValue);
                })
            });
        },

        _filterAndReloadGrid: function(filterString) {
            var datasource = this._grid._dataSource || this._grid._datasource, // grid || listview
                backup = null;
            if (this.overrideStaticConstraint) {
                backup = datasource._staticconstraint;
                datasource._staticconstraint = filterString; // override
            } else {
                backup = datasource.getConstraints();
                datasource.setConstraints(filterString); // add
            }
            // EXPERIMENTAL--OVERRIDE THE _RUNQUERY METHOD ON DATASOURE
            datasource._runQuery = function(t) {
                // n.debug(this.name + "._runQuery");
                var e = this._xpathString();
                e ? window.mx.data.get({
                    xpath: this.getCurrentXPath(),
                    filter: this.getFilterOptions(),
                    count: !0,
                    aggregates: this._aggregates,
                    callback: function(e, n) {
                        this._handleObjects(e, n.count, n.aggregates, t);
                    },
                    error: function(e) {
                        // don't show the window error
                        console.error("[ContextFilter Widget] >>>> Looks like the xpath failed. Tried to run the xpath: " + this._xpath + filterString);
                    }
                }, this) : this._handleObjects([], 0, null, t);
            };
            ////////////////////

            if (this._grid.reload && "function" === typeof this._grid.reload) { // grid
                this._grid.reload();
            } else if (this._grid.update && "function" === typeof this._grid.update) {
                this._grid.update();
            } else {
                console.error("Could not find the reload/update method.");
            }

        },

        _updateRendering: function(callback) {
            logger.debug(this.id + "._updateRendering");

            if (this._contextObj !== null) {
                dojoStyle.set(this.domNode, "display", "block");
            } else {
                dojoStyle.set(this.domNode, "display", "none");
            }

            this._executeCallback(callback);
        },

        _executeCallback: function(cb) {
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["ContextFilter/widget/ContextFilter"]);
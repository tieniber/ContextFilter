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
        filterOutRefSet: null,
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
            this._attachGridLoadListeners();
            this._grid.unsubscribeAll();
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

        _attachGridLoadListeners: function() {
            if (this.resultsAttr && this.resultsIDAttr) {
                Aspect.after(this._grid, "refreshGrid", lang.hitch(this, function() {
                    this._setCurrentGridObjectsToContext();
                }));
            }
        },

        _setCurrentSelectionToContext: function() {
            if (this._grid.selection.length > 0) {
                if (this.filterOutAttr) {
                    var gridSelectionX = this._grid._getXpathSelection();
                    this._contextObj.set(this.filterOutAttr, gridSelectionX.xpath + gridSelectionX.constraints);
                }
                if (this.filterOutRefSet) {
                    var refSetName = this.filterOutRefSet.split("/")[0];
                    this._contextObj.set(refSetName, this._grid.selection);
                }
                if (this.filterOutRef) {
                    var refName = this.filterOutRef.split("/")[0];
                    this._contextObj.set(refName, this._grid.selection[0]);
                }

                if (this.filterOutIDAttr && this.listIDAttr) {

                    var selectedID = this._grid.selection[0];
                    var selectedObj = this._getMxObj(this._grid, selectedID);
                    var selectedIdVal = selectedObj.get(this.listIDAttr);
                    this._contextObj.set(this.filterOutIDAttr, selectedIdVal);
                }
            } else {
                this._contextObj.set(this.filterOutAttr, "");
                this._contextObj.set(this.filterOutRefSet, "");
            }
        },

        _setCurrentGridObjectsToContext: function() {
            var ids = []
            var mxObjs = this._grid._mxObjects;
            for (var i=0; i<mxObjs.length; i++) {
                var curObj = mxObjs[i];
                var curId = curObj.get(this.resultsIDAttr);
                ids.push(curId);
            }
            var outString = ids.join(",");
            this._contextObj.set(this.resultsAttr, outString);
        },

        //gets an mxObj from the grid based on a guid
        _getMxObj: function(grid, guid) {
            for(var t=grid._mxObjects,n=0;n<t.length;++n)if(t[n].getGuid()===guid)
            return t[n];
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

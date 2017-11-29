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

], function(declare, _WidgetBase, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, lang, dojoText, dojoHtml, dojoEvent) {
    "use strict";

    return declare("ContextFilter.widget.ContextFilter", [_WidgetBase], {

        gridName: null,
        overrideStaticConstraint: null,
        filterAttr: null,
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
            this._filterAndReloadGrid(filterString);
            this._resetSubscriptions();
            this._updateRendering(callback);
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
            var datasource = this._grid._dataSource,
                backup = null;
            if (this.overrideStaticConstraint) {
                backup = datasource._staticconstraint;
                datasource._staticconstraint = filterString; // override
            } else {
                backup = datasource.getConstraints();
                datasource.setConstraints(filterString); // add
            }
            datasource.isValid(lang.hitch(this, function(ok) {
                if (ok) { // this is always true
                    this._grid.reload();
                }
            }));

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
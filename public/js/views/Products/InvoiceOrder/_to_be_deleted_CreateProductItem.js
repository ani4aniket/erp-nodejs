/**
 * Created by soundstorm on 28.04.15.
 */
define([
    'Backbone',
    'jQuery',
    'Underscore',
    'text!templates/Products/InternalMoves.html',
    'collections/Persons/PersonsCollection',
    'collections/Departments/DepartmentsCollection',
    'models/PersonsModel',
    'populate',
    'constants'
], function (Backbone, $, _, reateTemplate, PersonsCollection, DepartmentsCollection, PersonsModel, populate, CONSTANTS) {
    var CreateProductItemTemplate = Backbone.View.extend({
        el         : '#createProductItemHolder',
        contentType: 'ProductItem',
        template   : _.template(CreateTemplate),

        events: {
            'click .current-selected': 'showNewSelect'
        },

        initialize: function (options) {
            //_.bindAll(this, "saveItem", "render");
            this.render();
        },

        hideDialog: function () {
            $(".addItem-dialog").remove();
        },

        chooseOption: function (e) {
            var holder = $(e.target).parents("dd").find(".current-selected");
            holder.text($(e.target).text()).attr("data-id", $(e.target).attr("id"));

            if (holder.attr("id") === 'product') {
                this.selectCustomer($(e.target).attr("id"));
            }
        },

        showNewSelect: function (e, prev, next) {
            populate.showSelect(e, prev, next, this);
            return false;
        },

        render: function (options) {
            var formString = this.template();
            var self = this;
            this.$el = $(formString).dialog({
                autoOpen   : true,
                dialogClass: "addItem-dialog",
                title      : "Add Product Item",
                width      : "900px",
                position   : {within: $("#wrapper")},
                buttons    : [
                    {
                        id   : "create-person-dialog",
                        text : "Create",
                        click: function () {
                            self.saveItem();
                        }
                    },

                    {
                        text : "Cancel",
                        click: function () {
                            self.hideDialog();
                        }
                    }]

            });
            populate.get2name("#product", CONSTANTS.URLS.CUSTOMERS, {}, this, true, true);
            populate.get2name("#sourceLocation", CONSTANTS.URLS.CUSTOMERS, {}, this, true, true);
            populate.get2name("#destinationLocation", CONSTANTS.URLS.CUSTOMERS, {}, this, true, true);
            populate.get2name("#invoiceControl", CONSTANTS.URLS.CUSTOMERS, {}, this, true, true);

            this.delegateEvents(this.events);

            return this;
        }
    });

    return CreateProductItemTemplate;
});
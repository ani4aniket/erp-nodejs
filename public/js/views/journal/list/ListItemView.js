﻿define([
    'Backbone',
    'Underscore',
    'text!templates/journal/list/ListTemplate.html',
    'helpers'
], function (Backbone, _, listTemplate, helpers) {
    'use strict';

    var ListItemView = Backbone.View.extend({
        el: '#listTable',

        initialize: function (options) {
            this.collection = options.collection;
            //this.startNumber = (parseInt(this.collection.currentPage, 10) - 1) * this.collection.pageSize; // Counting the start index of list items
        },

        render: function () {
            this.$el.append(_.template(listTemplate, {
                currencySplitter: helpers.currencySplitter,
                collection      : this.collection.toJSON(),
                //startNumber     : this.startNumber
            }));
        }
    });

    return ListItemView;
});

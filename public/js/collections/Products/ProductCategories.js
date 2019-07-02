﻿define([
    'Backbone',
    'models/Category',
    'constants'
], function (Backbone, Model, CONSTANTS) {
    var Collection = Backbone.Collection.extend({
        model: Model,
        url  : CONSTANTS.URLS.CATEGORY,

        initialize: function (options) {

            this.fetch({
                data   : options,
                reset  : true,
                success: function () {

                },

                error: function (models, xhr) {
                    if (xhr.status === 401) {
                        Backbone.history.navigate('#login', {trigger: true});
                    }
                }
            });
        },

        parse: function (response) {
            return response.data;
        }
    });

    return Collection;
});
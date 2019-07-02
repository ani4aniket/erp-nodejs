define([
    'Backbone',
    'jQuery',
    'models/PersonsModel',
    'constants'
], function (Backbone, $, PersonModel, CONSTANTS) {
    'use strict';

    var PersonsCollection = Backbone.Collection.extend({
        model      : PersonModel,
        idAttribute: '_id',
        url        : function () {
            return CONSTANTS.URLS.PERSONS;
        },

        initialize: function () {
            var mid = 39;

            this.fetch({
                data: $.param({
                    mid: mid
                }),

                reset  : true,
                success: this.fetchSuccess,
                error  : this.fetchError
            });
        },

        filterByLetter: function (letter) {
            var filtered = this.filter(function (data) {
                return data.get('name').last.toUpperCase().startsWith(letter);
            });
            return new PersonsCollection(filtered);
        },

        parse: function (response) {
            return response.data;
        },

        fetchSuccess: function () {
            console.log('Persons fetchSuccess');
        },

        fetchError: function (error) {
        }
    });

    return PersonsCollection;
});

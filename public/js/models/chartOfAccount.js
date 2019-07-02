define([
    'Backbone',
    'constants'
], function (Backbone, CONSTANTS) {
    'use strict';
    var ChartOfAccountModel = Backbone.Model.extend({
        idAttribute: '_id',

        default: {
            account  : '',
            type     : '',
            payMethod: null
        },

        urlRoot: function () {
            return CONSTANTS.URLS.CHARTOFACCOUNT;
        }
    });
    return ChartOfAccountModel;

});

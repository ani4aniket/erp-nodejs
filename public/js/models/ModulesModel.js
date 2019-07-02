define([
    'Backbone'
], function (Backbone) {
    'use strict';

    var ModulesModel = Backbone.Model.extend({
        defauls: {
            mid    : '',
            mname  : '',
            content: []
        },

        parse: function (resp) {
            if (resp.result.status === '0') {
                return {
                    mid    : resp.data[0].mid,
                    mname  : resp.data[0].mname,
                    content: resp.data[0].content
                };
            }
        }
    });
    return ModulesModel;
});

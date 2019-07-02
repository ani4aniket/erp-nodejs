﻿define([
    'Backbone',
    'Validation',
    'constants'
], function (Backbone, Validation, CONSTANTS) {
    'use strict';

    var JobPositionsModel = Backbone.Model.extend({
        idAttribute: '_id',
        initialize : function () {
            this.on('invalid', function (model, errors) {
                var msg;

                if (errors.length > 0) {
                    msg = errors.join('\n');

                    App.render({
                        type   : 'error',
                        message: msg
                    });
                }
            });
        },

        validate: function (attrs) {
            var errors = [];

            Validation.checkGroupsNameField(errors, true, attrs.name, 'Job name');
            Validation.checkNumberField(errors, true, attrs.expectedRecruitment, 'Expected in Recruitment');

            if (errors.length > 0) {
                return errors;
            }
        },

        defaults: {
            name               : 'New Job Position',
            expectedRecruitment: 0,
            interviewForm      : {
                id  : '',
                name: ''
            },

            department: {
                id  : '',
                name: ''
            },

            description : '',
            requirements: '',
            workflow    : {
                wName : 'jobposition',
                name  : 'No Recruitment',
                status: 'New'
            }
        },

        urlRoot: function () {
            return CONSTANTS.URLS.JOBPOSITIONS;
        }
    });
    return JobPositionsModel;
});

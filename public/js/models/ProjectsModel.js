define([
    'Backbone',
    'Underscore',
    'Validation',
    'common',
    'constants'
], function (Backbone, _, Validation, common, CONSTANTS) {
    'use strict';
    var ProjectModel = Backbone.Model.extend({
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

            Validation.checkGroupsNameField(errors, true, attrs.name, 'Project name');
            Validation.checkGroupsNameField(errors, true, attrs.projectShortDesc, 'Short description');

            if (errors.length > 0) {
                return errors;
            }
        },

        defaults: {
            name            : '',
            projectShortDesc: '',
            task            : [],
            privacy         : 'All Users',
            customer        : {
                _id : '',
                name: ''
            },

            projectmanager: {
                _id : '',
                name: ''
            },

            teams: {
                users: [],
                Teams: []
            },

            info: {
                StartDate: null,
                duration : 0,
                EndDate  : null,
                sequence : 0,
                parent   : null
            },

            estimated: 0,
            logged   : 0,
            remaining: 0,
            progress : 0,
            notes    : [],
            bonus    : [],
            budget   : {
                bonus      : [],
                projectTeam: []
            }
        },

        parse: function (response) {
            if (!response.data) {
                if (response.createdBy) {
                    response.createdBy.date = common.utcDateToLocaleDateTime(response.createdBy.date);
                }
                if (response.editedBy) {
                    response.editedBy.date = common.utcDateToLocaleDateTime(response.editedBy.date);
                }
                if (response.StartDate) {
                    response.StartDate = common.utcDateToLocaleDate(response.StartDate);
                }
                if (response.EndDate) {
                    response.EndDate = common.utcDateToLocaleDate(response.EndDate);
                }
                if (response.TargetEndDate) {
                    response.TargetEndDate = common.utcDateToLocaleDate(response.TargetEndDate);
                }
                if (response.notes) {
                    _.map(response.notes, function (note) {
                        note.date = common.utcDateToLocaleDate(new Date(note.date));
                        return note;
                    });
                }
                if (response.attachments) {
                    _.map(response.attachments, function (attachment) {
                        attachment.uploadDate = common.utcDateToLocaleDate(new Date(attachment.uploadDate));
                        return attachment;
                    });
                }
                return response;
            }
        },

        urlRoot: function () {
            return CONSTANTS.URLS.PROJECTS;
        }
    });
    return ProjectModel;
});

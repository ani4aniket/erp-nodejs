define([
    'Backbone',
    'jQuery',
    'Underscore',
    'text!templates/Applications/kanban/KanbanItemTemplate.html',
    'common',
    'moment'
], function (Backbone, $, _, KanbanItemTemplate, common, moment) {
    'use strict';
    var ApplicationsItemView = Backbone.View.extend({
        className: 'item',
        id       : function () {
            return this.model.get('_id');
        },

        template: _.template(KanbanItemTemplate),

        gotoEditForm: function (e) {
            var itemIndex = $(e.target).closest('.item').data('index') + 1;

            e.preventDefault();

            window.location.hash = '#home/action-Tasks/Edit/' + itemIndex;
        },

        gotoForm: function (e) {
            var id = $(e.target).closest('.item').attr('id');
            App.ownContentType = true;
            window.location.hash = 'home/content-Applications/form/' + id;
        },

        deleteEvent: function (e) {
            common.deleteEvent(e, this);
        },

        render: function () {
            var index = this.model.collection.indexOf(this.model);
            this.$el.html(this.template(this.model.toJSON()));
            this.$el.attr('data-index', index);

            if (this.model.toJSON().nextAction && moment(new Date(this.model.toJSON().nextAction)).isBefore(this.date)) {
                this.$el.addClass('errorContent');
            }

            return this;
        }
    });
    return ApplicationsItemView;
});

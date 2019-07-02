define([
    'Backbone',
    'jQuery',
    'Underscore',
    'text!templates/myProfile/TopBarTemplate.html',
    'custom',
    'common'
], function (Backbone, $, _, TopBarTemplate, Custom, Common) {
    var TopBarView = Backbone.View.extend({
        el         : '#top-bar',
        contentType: 'My Profile',
        actionType : null, // Content, Edit, Create
        template   : _.template(TopBarTemplate),

        events: {
            'click #top-bar-deleteBtn' : 'deleteEvent',
            'click #top-bar-saveBtn'   : 'saveEvent',
            'click #top-bar-nextBtn'   : 'nextEvent',
            'click #top-bar-discardBtn': 'discardEvent',
            'click #top-bar-editBtn'   : 'editEvent',
            'click #top-bar-createBtn' : 'createEvent'
        },

        nextEvent: function (event) {
            event.preventDefault();
            this.trigger('nextEvent');
        },

        deleteEvent: function () {
            event.preventDefault();
            if (confirm('Delete profile?')) {
                this.trigger('deleteEvent');
            }
        },

        createEvent: function (event) {
            event.preventDefault();
            this.trigger('createEvent');
        },

        discardEvent: function () {
            Backbone.history.navigate('home/content-' + this.contentType, {trigger: true});
        },

        editEvent: function (e) {
            e.preventDefault();
            this.trigger('editEvent');
        },

        getIdFromHash: function (hash) {
            var hashItems = hash.split('/');
            return hashItems[hashItems.length - 1];
        },

        initialize: function (options) {
            this.actionType = options.actionType;
            this.render();
        },

        render: function () {
            $('title').text(this.contentType);
            this.$el.html(this.template({contentType: this.contentType}));
            Common.displayControlBtnsByActionType(this.actionType);

            return this;
        }
    });

    return TopBarView;
});

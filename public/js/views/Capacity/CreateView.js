define([
    'Backbone',
    "text!templates/Capacity/CreateTemplate.html"
], function (Backbone, CreateTemplate) {

    var CreateView = Backbone.View.extend({
        el      : '#listTable',
        template: _.template(CreateTemplate),

        initialize: function (options) {
            this.render(options);
        },

        events: {},

        render: function (options) {
            this.$el.prepend(this.template(options));

            return this;
        }

    });

    return CreateView;
});

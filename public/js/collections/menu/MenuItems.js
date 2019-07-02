define([
    'Backbone',
    'jQuery',
    'Underscore',
    'constants'
], function (Backbone, $, _, CONSTANTS) {
    'use strict';

    var MyModel = Backbone.Model.extend({
        idAttribute: '_id'
    });

    var MenuItems = Backbone.Collection.extend({
        model        : MyModel,
        currentModule: 'HR',
        url          : function () {
            return CONSTANTS.URLS.MODULES;
        },

        initialize: function () {
            this.fetch({
                reset: true,

                success: function (collection, response) {
                    collection.relationships();
                },

                error: this.fetchError
            });
        },

        setCurrentModule: function (moduleName) {
            this.currentModule = moduleName;
            this.trigger('change:currentModule', this.currentModule, this);
        },

        fetchError: function () {
            throw new Error('No collection received from fetch');
        },

        relationships: function () {
            this.relations = _.groupBy(this.models, this.parent);
        },

        root: function () {
            if (!this.relations) {
                this.relationships();
            }
            
            return this.relations[0];
        },

        getRootElements: function () {
            var Model = Backbone.Model.extend({});

            if (!this.relations) {
                this.relationships();
            }

            return $.map(this.relations[0], function (current) {
                return new Model({
                    _id  : current.get('_id'),
                    mname: current.get('mname')
                });
            });
        },

        children: function (model, self) {
            var modules = self || [];

            if (!this.relations) {
                this.relationships();
            }

            if (this.relations[model.id] !== undefined) {
                _.each(this.relations[model.id], function (module) {
                    if (module.get('link')) {
                        modules.push(module);
                    } else {
                        this.children(module, modules);
                    }
                }, this);
            }

            modules = _.sortBy(modules, function (model) {
                return model.get('sequence');
            });

            return modules;
        },

        parent: function (model) {
            var parrent = model.get('parrent');
            
            return (!parrent) ? 0 : parrent;
        }
    });

    return MenuItems;
});

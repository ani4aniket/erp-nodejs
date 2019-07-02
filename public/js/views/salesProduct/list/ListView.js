define([
    'views/listViewBase',
    'text!templates/Products/list/ListHeader.html',
    'views/Products/CreateView',
    'views/salesProduct/list/ListItemView',
    'views/Products/EditView',
    'models/ProductModel',
    'text!templates/Alpabet/AphabeticTemplate.html',
    'collections/salesProduct/filterCollection',
    'views/Filter/filterView',
    'common',
    'dataService',
    'constants'
], function (ListViewBase, listTemplate, createView, listItemView, editView, productModel, aphabeticTemplate, contentCollection, FilterView, common, dataService, CONSTANT) {
    var ProductsListView = ListViewBase.extend({
        createView              : createView,
        listTemplate            : listTemplate,
        listItemView            : listItemView,
        contentCollection       : contentCollection,
        FilterView              : FilterView,
        totalCollectionLengthUrl: '/products/totalCollectionLength',
        page                    : null, // if reload page, and in url is valid page
        contentType             : CONSTANT.SALESPRODUCT, // needs in view.prototype.changeLocationHash
        exportToXlsxUrl         : '/Products/exportToXlsx',
        exportToCsvUrl          : '/Products/exportToCsv',

        initialize: function (options) {
            this.startTime = options.startTime;
            this.collection = options.collection;
            _.bind(this.collection.showMore, this.collection);
            _.bind(this.collection.showMoreAlphabet, this.collection);
            this.filter = options.filter ? options.filter : {};
            this.defaultItemsNumber = this.collection.namberToShow || 100;
            this.newCollection = options.newCollection;
            this.deleteCounter = 0;
            this.page = options.collection.page;
            this.render();
            this.getTotalLength(null, this.defaultItemsNumber, this.filter);
            this.contentCollection = contentCollection;
        },

        events: {
            "click .list td:not(.notForm)": "goToEditDialog",
            "click .letter:not(.empty)"   : "alpabeticalRender"
        },

        render: function () {
            var self;
            var $currentEl;

            $('.ui-dialog ').remove();

            self = this;
            $currentEl = this.$el;

            $currentEl.html('');
            $currentEl.append(_.template(listTemplate));
            $currentEl.append(new listItemView({
                collection : this.collection,
                page       : this.page,
                itemsNumber: this.collection.namberToShow
            }).render());

            this.renderPagination($currentEl, this);
            this.renderAlphabeticalFilter(this);
            this.renderFilter();

            $currentEl.append("<div id='timeRecivingDataFromServer'>Created in " + (new Date() - this.startTime) + " ms</div>");
        },

        goToEditDialog: function (e) {
            var id = $(e.target).closest('tr').data("id");
            var model = new productModel({validate: false});

            e.preventDefault();
            model.urlRoot = '/products/form';
            model.fetch({
                data   : {id: id},
                success: function (model) {
                    new editView({model: model});
                },
                error  : function () {
                    App.render({
                        type   : 'error',
                        message: 'Please refresh browser'
                    });
                }
            });
        }
    });

    return ProductsListView;
});

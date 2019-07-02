define([
    'Backbone',
    'jQuery',
    'Underscore',
    'views/salesQuotations/CreateView',
    'text!templates/Projects/projectInfo/quotations/CreateTemplate.html',
    'text!templates/Projects/projectInfo/quotations/newRow.html',
    'collections/Persons/PersonsCollection',
    'collections/Departments/DepartmentsCollection',
    'views/Products/InvoiceOrder/ProductItems',
    'models/QuotationModel',
    'common',
    'populate',
    'constants',
    'views/Assignees/AssigneesView',
    'dataService',
    'helpers'
], function (Backbone, $, _, createView, CreateTemplate, newRow, PersonsCollection, DepartmentsCollection, ProductItemView, QuotationModel, common, populate, CONSTANTS, AssigneesView, dataService, helpers) {
    'use strict';

    var CreateView = createView.extend({
        el            : '#content-holder',
        contentType   : 'Quotations',
        template      : _.template(CreateTemplate),
        templateNewRow: _.template(newRow),

        initialize: function (options) {

            if (options) {
                this.visible = options.visible;
                this.projectModel = options.projectModel;
                this.wTrackCollection = options.wTrackCollection;
                this.createJob = options.createJob;
                this.eventChannel = options.eventChannel;
            }

            this.populate = true;

            if (options.collection) {
                this.collection = options.collection;
            }

            _.bindAll(this, 'saveItem', 'render');
            this.model = new QuotationModel();
            this.responseObj = {};
            this.projectId = options.projectId;
            this.customerId = options.customerId;
            this.salesManager = options.salesManager;
            this.render();
            this.getForDd(this.projectId, this.customerId);
            this.forSales = true;
        },

        recalculatePriceByJob: function () {
            this.channelObject.trigger('recalculatePriceByJob');
        },

        validateForm: function (e) {

        },

        saveItem: function () {
            var self = this;
            var mid = 55;
            var thisEl = this.$el;
            var selectedProducts = thisEl.find('.productItem');
            var products = [];
            var data;
            var selectedLength = selectedProducts.length;
            var targetEl;
            var productId;
            var quantity;
            var price;
            var scheduledDate;

            var forSales = this.forSales || false;

            var currency = {
                _id : thisEl.find('#currencyDd').attr('data-id'),
                name: $.trim(thisEl.find('#currencyDd').text())
            };

            var supplier = thisEl.find('#supplierDd').attr('data-id');

            var project = thisEl.find('#projectDd').attr('data-id');
            var destination = $.trim(thisEl.find('#destination').attr('data-id'));
            var deliverTo = $.trim(thisEl.find('#deliveryDd').attr('data-id'));
            var incoterm = $.trim(thisEl.find('#incoterm').attr('data-id'));
            var invoiceControl = $.trim(thisEl.find('#invoicingControl').attr('data-id'));
            var paymentTerm = $.trim(thisEl.find('#paymentTerm').attr('data-id'));
            var fiscalPosition = $.trim(thisEl.find('#fiscalPosition').attr('data-id'));

            var orderDate = thisEl.find('#orderDate').val();
            var expectedDate = thisEl.find('#expectedDate').val() || thisEl.find('#orderDate').val();

            var total = helpers.spaceReplacer($.trim(thisEl.find('#totalAmount').text()));
            var totalTaxes = $.trim(thisEl.find('#taxes').text());
            var taxes;
            var description;
            var jobDescription;
            var unTaxed = helpers.spaceReplacer($.trim(thisEl.find('#totalUntaxes').text()));
            var subTotal;
            var jobs;
            var usersId = [];
            var groupsId = [];
            var i;

            var whoCanRW = this.$el.find("[name='whoCanRW']:checked").val();

            total = parseFloat(total) * 100;
            unTaxed = parseFloat(unTaxed) * 100;

            thisEl.find('.groupsAndUser tr').each(function () {
                if ($(this).data('type') === 'targetUsers') {
                    usersId.push($(this).data('id'));
                }
                if ($(this).data('type') === 'targetGroups') {
                    groupsId.push($(this).data('id'));
                }

            });

            if (selectedLength) {
                for (i = selectedLength - 1; i >= 0; i--) {
                    targetEl = $(selectedProducts[i]);
                    productId = targetEl.data('id');

                    if (productId) {
                        quantity = targetEl.find('[data-name="quantity"]').text();
                        price = targetEl.find('[data-name="price"] input').val();
                        price = parseFloat(helpers.spaceReplacer(price)) * 100;

                        if (isNaN(price) || price <= 0) {
                            return App.render({
                                type   : 'error',
                                message: 'Please, enter Unit Price!'
                            });
                        }
                        scheduledDate = targetEl.find('[data-name="scheduledDate"]').text();
                        taxes = targetEl.find('.taxes .sum').text();
                        taxes = parseFloat(helpers.spaceReplacer(taxes)) * 100;
                        description = targetEl.find('[data-name="productDescr"]').text();
                        jobDescription = targetEl.find('textarea.jobsDescription').val();;

                        subTotal = helpers.spaceReplacer(targetEl.find('.subtotal .sum').text());
                        subTotal = parseFloat(helpers.spaceReplacer(subTotal)) * 100;
                        jobs = targetEl.find('.current-selected.jobs').attr('data-id');

                        if (price === '') {
                            return App.render({
                                type   : 'error',
                                message: 'Unit price can\'t be empty'
                            });
                        }

                        if (jobs.length < 24) {
                            return App.render({
                                type   : 'error',
                                message: "Job field can't be empty. Please, choose or create one."
                            });
                        }

                        products.push({
                            product       : productId,
                            unitPrice     : price,
                            quantity      : quantity,
                            scheduledDate : scheduledDate,
                            jobDescription: jobDescription,
                            taxes         : taxes,
                            description   : description,
                            subTotal      : subTotal,
                            jobs          : jobs
                        });
                    } else {
                        return App.render({
                            type   : 'error',
                            message: "Products can't be empty."
                        });
                    }
                }
            }

            data = {
                currency      : currency,
                forSales      : forSales,
                supplier      : supplier,
                project       : project,
                deliverTo     : deliverTo,
                products      : products,
                orderDate     : helpers.setTimeToDate(orderDate),
                expectedDate  : expectedDate,
                destination   : destination,
                incoterm      : incoterm,
                invoiceControl: invoiceControl,
                paymentTerm   : paymentTerm,
                fiscalPosition: fiscalPosition,
                populate      : true, // Need Populate data from server
                paymentInfo   : {
                    total  : total,
                    unTaxed: unTaxed,
                    taxes  : totalTaxes
                },

                groups: {
                    owner: this.$el.find('#allUsersSelect').attr('data-id') || null,
                    users: usersId,
                    group: groupsId
                },

                whoCanRW: whoCanRW,
                workflow: this.defaultWorkflow
            };

            if (supplier && selectedLength) {
                this.model.save(data, {
                    headers: {
                        mid: mid
                    },
                    wait   : true,
                    success: function () {

                        self.hideDialog();

                        if (self.eventChannel) {
                            self.eventChannel.trigger('quotationUpdated');
                        }
                    },

                    error: function (model, xhr) {
                        self.errorNotification(xhr);
                    }
                });

            } else {
                return App.render({
                    type   : 'error',
                    message: 'Customer can not be empty.'
                });
            }
        },

        getForDd: function (projectID, customerId) {
            populate.get('#supplierDd', CONSTANTS.URLS.CUSTOMERS, {}, 'fullName', this, false, false, customerId);

            if (projectID) {

                populate.get('#projectDd', '/projects/getForDd', {}, 'name', this, false, false, projectID);
            } else {
                populate.get('#projectDd', '/projects/getForDd', {}, 'name', this, true, true);
            }
        },

        createProductView: function () {
            var productItemContainer;

            productItemContainer = this.$el.find('#productItemsHolder');
            productItemContainer.append(
                new ProductItemView({
                    canBeSold       : true,
                    service         : true,
                    projectModel    : this.projectModel,
                    wTrackCollection: this.wTrackCollection,
                    channelObject   : this.channelObject
                }).render().el
            );

        }

        /* redirectAfterSave: function (content, model) {
         var $currentEl = $('#listTableQuotation');
         var number = $currentEl.find('.countNumber');
         var numberLength = number.length ? number.length : 0;
         var lastNumber = number.length ? $(number[numberLength - 1]).html() : 0;

         var currentNumber = parseInt(lastNumber, 10) + 1;

         content.hideDialog();

         this.collection.add(model);

         $currentEl.append(this.templateNewRow({
         quotation       : model.toJSON(),
         startNumber     : currentNumber,
         dateToLocal     : common.utcDateToLocaleDate,
         currencySplitter: helpers.currencySplitter,
         currencyClass   : helpers.currencyClass
         }));
         }*/
    });

    return CreateView;
});

define([
    'Backbone',
    'jQuery',
    'Underscore',
    'text!templates/customerPayments/list/ListTotal.html',
    'helpers'
], function (Backbone, $, _, listTemplate, helpers) {
    'use strict';

    var supplierPaymentsListTotalView = Backbone.View.extend({
        el: '#listTotal',

        initialize: function (options) {
            this.element = options.element;
            this.cellSpan = options.cellSpan;
        },

        getTotal: function () {
            var result = {
                total           : 0,
                totalPaidAmount : 0,
                cellSpan        : this.cellSpan,
                currencySplitter: helpers.currencySplitter
            };

            this.element.find('.totalPaidAmount').each(function () {
                var currentText = $(this).text().replace(' ', '');

                result.totalPaidAmount += parseFloat(currentText);
            });

            result.total = result.total.toFixed(2);
            result.totalPaidAmount = result.totalPaidAmount.toFixed(2);

            return result;
        },

        render: function () {
            var totalObject;

            if (this.$el.find('tr').length > 0) {
                totalObject = this.getTotal();

                this.$el.find('#total').text(helpers.currencySplitter(totalObject.total));
                this.$el.find('#totalPaidAmount').text(helpers.currencySplitter(totalObject.totalPaidAmount));
            } else {
                this.$el.append(_.template(listTemplate, {
                    total           : '0.00',
                    totalPaidAmount : '0.00',
                    cellSpan        : this.cellSpan,
                    currencySplitter: helpers.currencySplitter
                }));
            }

            return this;
        }
    });

    return supplierPaymentsListTotalView;
});

define([
    'Backbone',
    'jQuery',
    'Underscore',
    'text!templates/taxReport/list/ListTemplate.html',
    'helpers'
], function (Backbone, $, _, listTemplate, helpers) {
    'use strict';

    var ListItemView = Backbone.View.extend({
        el: '#listTable',

        initialize: function (options) {
            this.collection = options.collection;
            this.startDate = options.startDate;
            this.endDate = options.endDate;
        },

        setAllTotalVals: function () {
            var self = this;
            var ths = $('#caption').find('th');

            ths.each(function () {
                if ($(this).hasClass('countable')) {
                    self.calcTotal($(this).attr('data-id'));
                }
            });
        },

        calcTotal: function (idTotal) {
            var footerRow = $('#glReportFooter');
            var trs = this.$el.find('tr.mainTr');
            var totalTd = $(footerRow).find('#' + idTotal + 'Total');
            var rowTdVal = 0;
            var row;
            var rowTd;

            $(trs).each(function (index, element) {
                row = $(element).closest('tr');
                rowTd = row.find('[data-id="' + idTotal + '"]');

                rowTdVal += parseFloat(rowTd.attr('data-value')) || 0;
            });

            totalTd.text('');

            rowTdVal = rowTdVal || 0;

            totalTd.text(helpers.currencySplitter(rowTdVal.toFixed(2)));
            totalTd.attr('data-value', rowTdVal);
        },

        setBalance: function () {
            var footerRow = $('#glReportFooter');
            var debit = footerRow.find('#debitTotal').attr('data-value');
            var credit = footerRow.find('#creditTotal').attr('data-value');

            var balance = parseFloat(debit) - parseFloat(credit);

            balance = isNaN(balance.toFixed(2)) ? '0.00' : balance.toFixed(2);

            if (balance === '-0.00') {
                balance = '0.00';
            }

            footerRow.find('#balanceTotal').text(helpers.currencySplitter(balance));
        },

        render: function () {
            this.$el.append(_.template(listTemplate, {
                collection      : this.collection,
                currencySplitter: helpers.currencySplitter
            }));

            this.setAllTotalVals();
            this.setBalance();

            return this;
        }
    });

    return ListItemView;
});

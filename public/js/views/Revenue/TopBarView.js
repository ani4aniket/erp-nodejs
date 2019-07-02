define([
    'Backbone',
    'Underscore',
    'jQuery',
    'text!templates/Revenue/TopBarTemplate.html',
    'moment',
    'custom'
], function (Backbone,
             _,
             $,
             ContentTopBarTemplate,
             moment,
             custom) {
    'use strict';
    var TopBarView = Backbone.View.extend({
        el         : '#top-bar',
        contentType: 'InvoiceCharts',
        template   : _.template(ContentTopBarTemplate),

        events: {
            'click #updateDate': 'changeDateRange',
            'click .dateRange' : 'toggleDateRange',
            'click #cancelBtn' : 'cancel'
        },

        cancel: function (e) {
            var targetEl = $(e.target);
            var ul = targetEl.closest('ul.frameDetail');

            ul.addClass('hidden');
        },

        changeDateRange: function (e) {
            var targetEl = $(e.target);
            var dateFilter = targetEl.closest('ul.dateFilter');
            var startDate = dateFilter.find('#startDate');
            var endDate = dateFilter.find('#endDate');
            var startTime = dateFilter.find('#startTime');
            var endTime = dateFilter.find('#endTime');

            startDate = startDate.val();
            endDate = endDate.val();

            startTime.text(startDate);
            endTime.text(endDate);

            this.trigger('changeDateRange');
            this.toggleDateRange(e);
        },

        toggleDateRange: function (e) {
            var targetEl = $(e.target);
            var ul = targetEl.closest('ul');

            if (!ul.hasClass('frameDetail')) {
                ul.find('.frameDetail').toggleClass('hidden');
            } else {
                ul.toggleClass('hidden');
            }
        },

        initialize: function (options) {
            if (options && options.collection) {
                this.collection = options.collection;
            }
        },

        bindDataPickers: function (startDate, endDate) {
            var self = this;

            this.$el.find('#startDate')
                .datepicker({
                    dateFormat : 'd M, yy',
                    changeMonth: true,
                    changeYear : true,
                    defaultDate: startDate,
                    onSelect   : function () {
                        var targetInput = $(this);
                        var endDatePicker = self.$endDate;
                        var endDate = moment(targetInput.datepicker('getDate'));

                        endDate.add(6, 'week').day('Monday');
                        endDate = endDate.toDate();

                        endDatePicker.datepicker('option', 'minDate', endDate);

                        return false;
                    }
                })
                .datepicker('setDate', startDate);
            this.$endDate = this.$el.find('#endDate')
                .datepicker({
                    dateFormat : 'd M, yy',
                    changeMonth: true,
                    changeYear : true,
                    defaultDate: endDate
                })
                .datepicker('setDate', endDate);
        },

        render: function () {
            var filter = custom.retriveFromCash('Revenue.filter') || {};
            var endDate = filter.endDate || moment().format('DD MMM, YYYY');
            var startDate = filter.startDate || moment(endDate).subtract(1, 'years').format('DD MMM, YYYY');

            startDate = moment(startDate).format('DD MMM, YYYY');
            endDate = moment(endDate).format('DD MMM, YYYY');

            filter.startDate = startDate;
            filter.endDate = endDate;

            $('title').text(this.contentType);

            this.$el.html(this.template({
                contentType: this.contentType,
                startDate  : startDate,
                endDate    : endDate
            }));

            this.bindDataPickers(startDate, endDate);

            custom.cacheToApp('Revenue.filter', filter);

            this.trigger('render', filter);

            return this;
        }
    });

    return TopBarView;
});

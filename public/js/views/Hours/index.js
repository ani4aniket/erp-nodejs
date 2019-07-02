/**
 * Created by Roman on 17.06.2015.
 */
define([
    'Backbone',
    'jQuery',
    'Underscore',
    'text!templates/Hours/index.html',
    'text!templates/Hours/weeksArray.html',
    'text!templates/Hours/monthsArray.html',
    'text!templates/Hours/perMonth.html',
    'text!templates/Hours/perMonthInt.html',
    'text!templates/Hours/hoursByDepItem.html',
    'text!templates/Hours/hoursByDepTotal.html',
    'text!templates/Hours/tableTotalHours.html',
    'text!templates/Hours/totalHours.html',
    'text!templates/Hours/perMonthForTotalHours.html',
    'text!templates/Hours/tableHoursSold.html',
    'text!templates/Hours/hoursSold.html',
    'text!templates/Hours/perMonthForHoursSold.html',
    'text!templates/Hours/tableSold.html',
    'models/Revenue',
    'moment',
    'dataService',
    'async',
    'custom',
    'constants',
    'helpers'
], function (Backbone, $, _, mainTemplate, weeksArray, monthsArray, perMonth, perMonthInt, hoursByDepItem, hoursByDepTotal, tableTotalHours, totalHours, perMonthForTotalHours, tableHoursSold, hoursSold, perMonthForHoursSold, tableSold, RevenueModel, moment, dataService, async, custom, CONSTANTS, helpers) {
    'use strict';

    var View = Backbone.View.extend({
        el: '#content-holder',

        contentType: CONSTANTS.HOURS,

        template               : _.template(mainTemplate),
        weeksArrayTemplate     : _.template(weeksArray),
        monthsArrayTemplate    : _.template(monthsArray),
        hoursByDepTemplate     : _.template(hoursByDepItem),
        hoursByDepTotalTemplate: _.template(hoursByDepTotal),
        totalHoursTemplate     : _.template(tableTotalHours),
        totalHoursByMonth      : _.template(totalHours),
        perMonthForTotalHours  : _.template(perMonthForTotalHours),

        tableSoldTemplate: _.template(tableSold),

        hoursSoldTemplate   : _.template(tableHoursSold),
        hoursSoldByMonth    : _.template(hoursSold),
        perMonthForHoursSold: _.template(perMonthForHoursSold),

        paidUnpaidDateRange: {},

        $currentStartWeek: null,
        $revenueBySales  : null,

        events: {
            'change #currentStartWeek': 'changeWeek',
            'click .ui-spinner-button': 'changeWeek',
            'click .clickToShow'      : 'showBonus'
        },

        initialize: function () {
            var self = this;
            var currentWeek = moment().week();
            var nowMonth = parseInt(moment().week(currentWeek).format("MM"), 10);

            //this.hoursUnsold = _.after(2, self.changeHoursUnsold);
            this.model = new RevenueModel();

            this.listenTo(this.model, 'change:currentYear', this.changeYear);
            this.listenTo(this.model, 'change:currentStartWeek', this.changeWeek);
            this.listenTo(this.model, 'change:weeksArr', this.changeWeeksArr);
            this.listenTo(this.model, 'change:hoursByDep', this.changeHoursByDep);
            this.listenTo(this.model, 'change:totalHours', this.changeTotalHours);
            this.listenTo(this.model, 'change:hoursSold', this.changeHoursSold);
            this.listenTo(this.model, 'change:hoursUnsold', this.changeHoursUnsold);

            var currentStartWeek = currentWeek - 6;
            var currentYear = moment().weekYear();
            var currentMonth = parseInt(moment().week(currentStartWeek).format("MM"), 10);

            self.model.set({
                currentStartWeek: currentStartWeek,
                currentYear     : currentYear,
                currentMonth    : currentMonth
            });

            this.changeWeek = _.debounce(this.updateWeek, 1);

            dataService.getData('/employees/bySales', null, function (employess) {

                self.render(employess);
                self.$currentStartWeek.val(currentStartWeek);
            });

            this.monthArr = [];
            this.paidUnpaidDateRange.endDate = currentYear * 100 + nowMonth;

            this.calculateCurrentMonthArr(nowMonth, currentYear);
        },

        getDate: function (num) {
            return moment().day("Monday").week(num).format("DD.MM");
        },

        getModelValue: function (attr) {
            return this.model.get(attr);
        },

        updateWeek: function () {
            var modelData;
            var currentStartWeek = parseInt(this.$currentStartWeek.val(), 10);
            var currentWeek = currentStartWeek + 6;
            var currentYear = this.model.get('currentYear');
            var newCurrMonth;
            var yearOfMonth;

            if (currentStartWeek || currentStartWeek === 0) {
                if (currentStartWeek > 53) {
                    currentStartWeek = 1;
                    currentYear += 1;
                }
                if (currentStartWeek < 1) {
                    currentStartWeek = 53;
                    currentYear -= 1;
                }
            }
            if (currentYear < 2014) {
                currentYear = 2014;
            }

            newCurrMonth = parseInt(moment().week(currentWeek).format("MM"), 10);

            if (currentStartWeek === 1) {
                yearOfMonth = currentYear - 1;
            } else {
                yearOfMonth = currentYear;
            }

            modelData = {
                currentStartWeek: currentStartWeek,
                currentYear     : currentYear,
                yearOfMonth     : yearOfMonth,
                newCurrMonth    : newCurrMonth
            };

            this.model.set(modelData);

            this.calculateCurrentMonthArr(newCurrMonth, currentYear);

            return false;
        },

        calculateCurrentMonthArr: function (nowMonth, currentYear) {
            this.monthArr = [];
            this.paidUnpaidDateRange.endDate = currentYear * 100 + nowMonth;
            var i;

            for (i = 0; i < 12; i++) {
                if (nowMonth - i <= 0) {
                    this.paidUnpaidDateRange.startDate = (currentYear - 1) * 100 + (nowMonth - i + 12);
                    this.monthArr.push({
                        month: nowMonth - i + 12,
                        year : currentYear - 1
                    });
                } else {
                    this.monthArr.push({
                        month: nowMonth - i,
                        year : currentYear
                    });
                }
            }

            this.monthArr = _.sortBy(this.monthArr, function (monthObject) {
                return monthObject.year * 100 + monthObject.month;
            });

            this.fetchHours();

        },

        changeWeek: function () {
            var prevVal = this.model.previous('currentStartWeek');
            var weekVal = this.model.get('currentStartWeek');

            if (prevVal === 53 || prevVal === 1) {
                this.$currentStartWeek.val(weekVal);
            }

            this.sendRequest();
        },

        changeYear: function () {
            var thisEl = this.$el;
            var year = thisEl.find('#currentYear');
            var yearVal = this.model.get('currentYear');

            year.text(yearVal);
        },

        changeWeeksArr: function () {
            var self = this;
            this.weekArr = this.getModelValue('weeksArr');

            if (!this.rendered) {
                return setTimeout(function () {
                    self.changeWeeksArr();
                }, 10);
            }
            this.$revenueBySales = this.$el.find('div.revenueBySales');
            this.$revenueBySales.html(this.weeksArrayTemplate({weeksArr: this.weekArr}));
        },

        sendRequest: function () {
            var model = this.model.toJSON();
            var weeksArr = [];
            var week;
            var i;

            if (model.currentMonth !== model.newCurrMonth) {
                model.currentMonth = model.newCurrMonth;
            }

            for (i = 0; i <= 13; i++) {
                if (model.currentStartWeek + i > 53) {
                    week = model.currentStartWeek + i - 53;
                    weeksArr.push({
                        lastDate: this.getDate(week),
                        week    : week,
                        year    : model.currentYear + 1
                    });
                } else {
                    week = model.currentStartWeek + i;
                    weeksArr.push({
                        lastDate: this.getDate(week),
                        week    : week,
                        year    : model.currentYear
                    });
                }
            }

            this.model.set('weeksArr', weeksArr);

            custom.cacheToApp('weeksArr', weeksArr);

            //this.fetchHours();
        },

        fetchHours: function () {
            var self = this;
            var week = this.model.get('currentStartWeek');
            var year = this.model.get('currentYear');
            var month = this.model.get('currentMonth');

            var data = {
                byWeek : {
                    year: year,
                    week: week

                },
                byMonth: {
                    year : year - 1,
                    month: month
                }
            };

            dataService.getData('/revenue/getFromCash', data, function (result) {
                //self.model.set('hoursByDep', result['hoursByDep']);
                //self.model.trigger('change:hoursByDep');

                self.model.set('totalHours', result.totalHours);
                self.model.trigger('change:totalHours');

                self.model.set('hoursSold', result.hoursSold);
                self.model.trigger('change:hoursSold');

                self.model.set('hoursUnsold', result.hoursUnsold);
                self.model.trigger('change:hoursUnsold');
            });
        },

        changeHoursByDep: function () {
            var self = this;
            var weeksArr = this.model.get('weeksArr');
            var hoursByDep = this.model.get('hoursByDep');
            var i;
            var target = self.$el.find('#tableHoursByDep');
            var targetTotal;

            var hoursByDepPerWeek = {};
            var tempPerWeek;
            var globalTotal = 0;

            this.departments = [];

            for (i = hoursByDep.length - 1; i >= 0; i--) {
                this.departments.push(hoursByDep[i]._id);

                tempPerWeek = hoursByDep[i].root;

                tempPerWeek.forEach(function (weekResult) {
                    var key = weekResult.week;

                    if (!hoursByDepPerWeek[key]) {
                        hoursByDepPerWeek[key] = weekResult.sold;
                    } else {
                        hoursByDepPerWeek[key] += weekResult.sold;
                    }
                });
            }

            target.html(this.tableSoldTemplate({departments: this.departments}));
            target.find('div.revenueBySales').html(this.weeksArrayTemplate({weeksArr: this.weekArr}));
            targetTotal = $(target.find('[data-content="totalHoursByDep"]'));

            async.each(this.departments, function (department, cb) {
                var target = $('#tableHoursByDep').find('[data-id="' + department + '"]');

                var byWeekData;
                var total;
                var hoursByDepPerEmployee;

                hoursByDepPerEmployee = _.find(hoursByDep, function (el) {
                    return el._id === department;
                });

                if (hoursByDepPerEmployee) {
                    byWeekData = _.groupBy(hoursByDepPerEmployee.root, 'week');
                    total = hoursByDepPerEmployee.totalSold;
                    globalTotal += total;
                    target.html(self.hoursByDepTemplate({
                        weeksArr           : weeksArr,
                        byWeekData         : byWeekData,
                        total              : total,
                        bySalesByDepPerWeek: hoursByDepPerWeek,
                        currencySplitter   : helpers.currencySplitter
                    }));
                }
                cb();
            }, function (err) {
                if (err) {
                    App.render({
                        type   : 'error',
                        message: err
                    });
                }

                targetTotal.html(self.hoursByDepTotalTemplate({
                    weeksArr           : weeksArr,
                    bySalesByDepPerWeek: hoursByDepPerWeek,
                    globalTotal        : globalTotal,
                    currencySplitter   : helpers.currencySplitter
                }));

                return false;
            });
        },

        showBonus: function (e) {
            var target = $(e.target);
            var targetText;
            var id = target.closest('div').attr('data-value');
            var dataVal = target.closest('div').attr('data-cont');
            var table = this.$el.find('#' + dataVal);
            var bonusRows = table.find("[data-value='" + id + "bonus']");

            var bonusCells = table.find("#" + id + " .divRow");

            if (!target.hasClass('rowChecked')) {
                target = target.prev();
            }
            targetText = target.text();

            bonusCells.toggle();
            bonusRows.toggle();
            bonusRows.children().toggle();

            if (targetText === '+') {
                target.text('-');
            } else {
                target.text('+');
            }

        },

        changeTotalHours: function () {
            var totalHours = this.model.get('totalHours');
            var monthArr = this.monthArr;
            var target = this.$el.find('#totalTotalHours');
            var monthContainer;
            var bySalesPerMonth = {};
            var globalTotal = 0;
            var bonusRows;
            var targetTotal;
            var self = this;

            target.html(this.totalHoursTemplate({
                departments     : totalHours,
                content         : 'totalTotalHours',
                className       : 'totalTotalHours',
                headName        : 'Total Hours',
                currencySplitter: helpers.currencySplitter
            }));
            targetTotal = $(this.$el.find('[data-content="totalTotalHours"]'));
            monthContainer = target.find('.monthContainer');
            monthContainer.html(this.monthsArrayTemplate({monthArr: monthArr}));

            async.each(totalHours, function (element, cb) {
                var department = element.name;
                var departmentContainer = target.find('[data-id="' + department + '"]');
                var total;

                total = element.totalForDep;
                globalTotal += total;
                departmentContainer.html(self.totalHoursByMonth({
                    content         : 'totalTotalHours',
                    monthArr        : monthArr,
                    total           : total,
                    employees       : element.employees,
                    currencySplitter: helpers.currencySplitter
                }));

                cb();
            }, function (err) {

                if (err) {
                    App.render({
                        type   : 'error',
                        message: err
                    });
                }

                for (var i = totalHours.length - 1; i >= 0; i--) {
                    var employees = totalHours[i].employees;

                    employees.forEach(function (employee) {
                        var totalHours = _.clone(employee.hoursTotal);

                        monthArr.forEach(function (monthResult) {
                            var key = monthResult.year * 100 + monthResult.month;

                            if (!bySalesPerMonth[key]) {
                                if (totalHours && totalHours[key]) {
                                    bySalesPerMonth[key] = totalHours[key];
                                }
                            } else {
                                if (totalHours && totalHours[key]) {
                                    bySalesPerMonth[key] += totalHours[key];
                                }
                            }
                        });
                    });
                }

                targetTotal.html(self.perMonthForTotalHours({
                    content         : 'totalTotalHours',
                    monthArr        : monthArr,
                    perMonth        : bySalesPerMonth,
                    globalTotal     : globalTotal,
                    totalName       : 'Total Hours',
                    currencySplitter: helpers.currencySplitter
                }));

                bonusRows = $.find("[data-val='totalTotalHours']");

                bonusRows.forEach(function (bonusRow) {
                    $(bonusRow).toggle();
                });

                return false;
            });
        },

        changeHoursUnsold: function () {
            // var hoursSold = this.model.get('hoursSold');
            // var totalHours = this.model.get('totalHours');
            var resultForUnsold = this.model.get('hoursUnsold');
            var monthArr = this.monthArr;
            var target = this.$el.find('#totalHoursUnsold');
            var monthContainer;
            var bySalesPerMonth = {};
            var globalTotal = 0;
            var bonusRows;
            var targetTotal;
            var self = this;

            target.html(this.totalHoursTemplate({
                departments     : resultForUnsold,
                content         : 'totalHoursUnsold',
                className       : 'totalHoursUnsold',
                headName        : 'Unsold Hours',
                currencySplitter: helpers.currencySplitter
            }));
            targetTotal = $(this.$el.find('[data-content="totalHoursUnsold"]'));
            monthContainer = target.find('.monthContainer');
            monthContainer.html(this.monthsArrayTemplate({monthArr: monthArr}));

            async.each(resultForUnsold, function (element, cb) {
                var department = element.name;
                var departmentContainer = target.find('[data-id="' + department + '"]');
                var total;

                total = element.totalForDep;
                globalTotal += total;
                departmentContainer.html(self.totalHoursByMonth({
                    content         : 'totalHoursUnsold',
                    monthArr        : monthArr,
                    total           : total,
                    employees       : element.employees,
                    currencySplitter: helpers.currencySplitter
                }));

                cb();
            }, function (err) {

                if (err) {
                    App.render({
                        type   : 'error',
                        message: err
                    });
                }

                for (var i = resultForUnsold.length - 1; i >= 0; i--) {
                    var employees = resultForUnsold[i].employees;

                    employees.forEach(function (employee) {
                        var totalHours = _.clone(employee.hoursTotal);

                        monthArr.forEach(function (monthResult) {
                            var key = monthResult.year * 100 + monthResult.month;

                            if (!bySalesPerMonth[key]) {
                                if (totalHours && totalHours[key]) {
                                    bySalesPerMonth[key] = totalHours[key];
                                }
                            } else {
                                if (totalHours && totalHours[key]) {
                                    bySalesPerMonth[key] += totalHours[key];
                                }
                            }
                        });
                    });
                }

                targetTotal.html(self.perMonthForTotalHours({
                    content         : 'totalHoursUnsold',
                    monthArr        : monthArr,
                    perMonth        : bySalesPerMonth,
                    globalTotal     : globalTotal,
                    totalName       : 'Total Hours',
                    currencySplitter: helpers.currencySplitter
                }));

                bonusRows = $.find("[data-val='totalHoursUnsold']");

                bonusRows.forEach(function (bonusRow) {
                    $(bonusRow).toggle();
                });

                return false;
            });
        },

        changeHoursSold: function () {
            var self = this;
            var hoursSold = this.model.get('hoursSold');
            var monthArr = this.monthArr;
            var target = self.$el.find('#totalHoursSold');
            var monthContainer;
            var targetTotal;
            var departments = [];
            var bonusRows;
            var globalTotal = 0;
            var bySalesPerMonth = {};

            target.html(this.hoursSoldTemplate({
                departments     : hoursSold,
                content         : 'totalHoursSold',
                className       : 'totalHoursSold',
                headName        : 'Sold Hours',
                currencySplitter: helpers.currencySplitter
            }));
            targetTotal = $(this.$el.find('[data-content="totalHoursSold"]'));
            monthContainer = target.find('.monthContainer');
            monthContainer.html(this.monthsArrayTemplate({monthArr: monthArr}));

            async.each(hoursSold, function (element, cb) {
                var department = element.name;
                var departmentContainer = target.find('[data-id="' + department + '"]');
                var total;

                total = element.totalForDep;
                globalTotal += total;

                departmentContainer.html(self.hoursSoldByMonth({
                    content         : 'totalHoursSold',
                    monthArr        : monthArr,
                    total           : total,
                    employees       : element.employees,
                    currencySplitter: helpers.currencySplitter
                }));

                cb();
            }, function (err) {

                if (err) {
                    App.render({
                        type   : 'error',
                        message: err
                    });
                }

                for (var i = hoursSold.length - 1; i >= 0; i--) {
                    var employees = hoursSold[i].employees;

                    employees.forEach(function (employee) {
                        var totalHours = _.clone(employee.hoursSold);

                        monthArr.forEach(function (monthResult) {
                            var key = monthResult.year * 100 + monthResult.month;

                            if (!bySalesPerMonth[key]) {
                                if (totalHours[key]) {
                                    bySalesPerMonth[key] = parseInt(totalHours[key]);
                                } else {
                                    totalHours[key] = 0;
                                    bySalesPerMonth[key] = 0;
                                }
                            } else {
                                bySalesPerMonth[key] += totalHours[key] ? totalHours[key] : 0;
                            }
                        });
                    });
                }

                targetTotal.html(self.perMonthForHoursSold({
                    content         : 'totalHoursSold',
                    monthArr        : monthArr,
                    perMonth        : bySalesPerMonth,
                    globalTotal     : globalTotal,
                    totalName       : 'Total Hours',
                    currencySplitter: helpers.currencySplitter
                }));

                bonusRows = $.find("[data-val='totalHoursSold']");

                bonusRows.forEach(function (bonusRow) {
                    $(bonusRow).toggle();
                });

                return false;
            });

        },

        render: function (employees) {
            $('title').text(this.contentType);

            var self = this;
            var thisEl = this.$el;
            var model = this.model.toJSON();

            this.employees = employees;

            model.employees = employees;

            this.$el.html(this.template(model));

            this.$el.find("#currentStartWeek").spinner({
                min: 0,
                max: 54
            });

            this.$currentStartWeek = thisEl.find('#currentStartWeek');
            this.$revenueBySales = thisEl.find('.revenueBySales');

            this.rendered = true;

            return this;
        }
    });

    return View;
});
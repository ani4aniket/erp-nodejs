define([
    'Backbone',
    'jQuery',
    'Underscore',
    'text!templates/Bonus/BonusTemplate.html',
    'views/selectView/selectView',
    'views/Bonus/CreateView',
    'models/BonusModel',
    'dataService',
    'moment',
    'constants'
], function (Backbone, $, _, bonusTemplate, SelectView, CreateView, CurrentModel, dataService, moment, CONSTANTS) {
    'use strict';

    var BonusView = Backbone.View.extend({
        initialize: function (options) {
            this.model = options.model;
            this.responseObj = {};
            this.selectedBonus = [];
            this.startDate = this.model.get('StartDate');
            this.endDate = this.model.get('EndDate');
        },

        template: _.template(bonusTemplate),

        events: {
            'click #createBonus'                               : 'addBonus',
            'click #removeBonus'                               : 'removeBonus',
            'click .newSelectList li:not(.miniStylePagination)': 'chooseOption',
            'click .choseType'                                 : 'showSelect',
            'click .choseEmployee'                             : 'showSelect',
            'click .bonus-checkbox'                            : 'checkBonus',
            'click #checkAll_bonus'                            : 'checkAllBonus',
            'click .startDate div'                             : 'showDatepicker',
            'click .endDate div'                               : 'showDatepicker',
            click                                              : 'hideDatepicker'
        },

        hideDatepicker: function () {

            if (this.selectView) {
                this.selectView.remove();
            }
        },

        showDatepicker: function (e) {
            var target = $(e.target);
            var parent = $(e.target).parent('td');
            var datePicker = parent.find('input');

            target.hide();
            datePicker.show();
        },

        checkBonus: function (e) {
            var self = this;
            var element = e.target;
            var checked = element.checked;
            var bonusId = element.value;
            var countCheckbox = $('#bonusTable input.bonus-checkbox').length;
            var totalCount = $('#bonusTable input.bonus-checkbox:checked').length;

            if (checked) {
                self.selectedBonus.push(bonusId);
            } else if (this.selectedBonus.length > 1) {
                self.selectedBonus = _.without(self.selectedBonus, bonusId);
            }

            if (totalCount === 0) {
                self.selectedBonus = [];
                self.$el.find('#removeBonus').hide();
            } else {
                self.$el.find('#removeBonus').show();
            }

            if (totalCount > 0 && totalCount === countCheckbox) {
                $('#checkAll_bonus').prop('checked', true);
            } else {
                $('#checkAll_bonus').prop('checked', false);
            }
        },

        checkAllBonus: function (e) {
            var self = this;
            var element = e.target;
            var checked = element.checked;
            var bonusId;

            if (checked) {
                $('#bonusTable input.bonus-checkbox').each(function (key, input) {
                    $(input).prop('checked', true);
                    bonusId = input.value;
                    self.selectedBonus.push(bonusId);
                    self.$el.find('#removeBonus').show();
                });
            } else {
                $('#bonusTable input.bonus-checkbox').each(function (key, input) {
                    self.selectedBonus = [];
                    $(input).prop('checked', false);
                    self.$el.find('#removeBonus').hide();
                });
            }
        },

        showSelect: function (e) {
            var $target = $(e.target);
            e.stopPropagation();

            if ($target.attr('id') === 'selectInput') {
                return false;
            }

            if (this.selectView) {
                this.selectView.remove();
            }

            this.selectView = new SelectView({
                e          : e,
                responseObj: this.responseObj
            });

            $target.append(this.selectView.render().el);

            return false;
        },

        chooseOption: function (e) {
            var self = this;
            var target = $(e.target);
            var closestTD = target.closest('td');
            var targetElement = closestTD.length ? closestTD : target.closest('th').find('a');
            var tr = target.closest('tr');
            var id = target.attr('id');
            var attr = targetElement.attr('id') || targetElement.data('content');
            var elementType = '#' + attr;
            var element = _.find(self.responseObj[elementType], function (el) {
                return el._id === id;
            });
            var employee;
            var bonus;
            var model = new CurrentModel();

            e.preventDefault();

            if (elementType === '#employee') {
                tr.find('[data-content="employee"]').text(element.name);
                tr.find('[data-content="employee"]').attr('data-id', element._id);

                employee = _.clone(model.get('employee'));

                employee._id = element._id;
                employee.name = target.text();
            }

            if (elementType === '#bonus') {
                tr.find('[data-content="bonus"]').text(element.name);
                tr.find('[data-content="bonus"]').attr('data-id', element._id);

                bonus = _.clone(model.get('bonus'));

                bonus._id = element._id;
                bonus.name = target.text();
            }

            self.hideNewSelect();

            $('#top-bar-saveBtn').show();

            return false;
        },

        hideNewSelect: function () {
            $('.newSelectList').remove();

            if (this.selectView) {
                this.selectView.remove();
            }
        },

        addBonus: function (e) {
            var self = this;
            e.preventDefault();

            return new CreateView(self.model.toJSON());
        },

        removeBonus: function (e) {
            var self = this;
            var element;

            e.preventDefault();

            self.selectedBonus.forEach(function (bonus) {
                element = $('#bonusTable').find('tr[data-id=' + bonus + ']');
                element.remove();
            });

            self.selectedBonus = [];
            self.$el.find('#removeBonus').hide();

            this.trigger('save');
        },

        setDatepicker: function (name) {
            var self = this;
            var selectedStart = '#' + name + 'StartDate';
            var selectedEnd = '#' + name + 'EndDate';
            var startDate = this.$el.find(selectedStart);
            var endDate = this.$el.find(selectedEnd);

            startDate.datepicker({
                dateFormat : 'd M, yy',
                changeMonth: true,
                changeYear : true,
                onSelect   : function () {
                    var startDate = $(self.$el).find(selectedStart).datepicker('getDate');
                    var parrent = $(selectedStart).parent('td');
                    var value = $(self.$el).find(selectedStart).val();

                    startDate.setDate(startDate.getDate());
                    $(self.$el).find(selectedEnd).datepicker('option', 'minDate', startDate);
                    parrent.find('div').html(value).show();
                    $(selectedStart).hide();

                    $('#top-bar-saveBtn').show();
                }
            });

            endDate.datepicker({
                dateFormat : 'd M, yy',
                changeMonth: true,
                changeYear : true,
                onSelect   : function () {
                    var endDate = $(self.$el).find(selectedEnd).datepicker('getDate');
                    var parrent = $(selectedEnd).parent('td');
                    var value = $(self.$el).find(selectedEnd).val();

                    endDate.setDate(endDate.getDate());
                    $(self.$el).find(selectedStart).datepicker('option', 'maxDate', endDate);
                    parrent.find('div').html(value).show();
                    $(selectedEnd).hide();

                    $('#top-bar-saveBtn').show();
                }
            });

            $(selectedStart).datepicker('setDate', self.startDate);
            $(selectedEnd).datepicker('setDate', self.endDate);
        },

        formatingDate: function (oldDate) {
            if (!oldDate) {
                return '';
            }

            return moment(oldDate).format('D MMM, YYYY');
        },

        render: function () {
            var self = this;
            var bonus = this.model.get('bonus');
            var startDate = this.model.get('StartDate');
            var endDate = this.model.get('EndDate');

            self.$el.html(this.template({
                bonus        : bonus,
                formatingDate: self.formatingDate,
                startDate    : startDate,
                endDate      : endDate
            }));

            self.$el.find('#removeBonus').hide();

            dataService.getData(CONSTANTS.URLS.EMPLOYEES_GETFORDD, null, function (employees) {
                employees = _.map(employees.data, function (employee) {
                    employee.name = employee.name.first + ' ' + employee.name.last;

                    return employee;
                });

                self.responseObj['#employee'] = employees;
            });

            dataService.getData('/bonusType/list', null, function (bonus) {
                self.responseObj['#bonus'] = bonus;
            });

            bonus.forEach(function (bonus) {
                self.setDatepicker(bonus._id);
            });

            return this;
        }
    });

    return BonusView;
});

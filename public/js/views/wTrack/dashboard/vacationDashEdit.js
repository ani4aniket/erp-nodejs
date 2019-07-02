define([
    'Backbone',
    'jQuery',
    'Underscore',
    'views/selectView/selectView',
    'views/wTrack/list/createJob',
    'text!templates/wTrack/dashboard/vacationDashEdit.html',
    'models/wTrackModel',
    'moment',
    'async',
    'common',
    'dataService',
    'helpers/employeeHelper',
    'helpers/keyCodeHelper',
    'helpers/overTime',
    'helpers/isOverTime'
], function (Backbone,
             $,
             _,
             selectView,
             CreateJob,
             template,
             wTrackModel,
             moment,
             async,
             common,
             dataService,
             employeeHelper,
             keyCodes,
             overTime,
             isOverTime) {
    'use strict';

    var CreateView = Backbone.View.extend({
        template   : _.template(template),
        responseObj: {},
        dateByWeek : null,
        row        : null,

        events: {
            'click .stageSelect'                               : 'showNewSelect',
            'click td.editable:not(.disabled)'                 : 'editRow',
            'click td.disabled'                                : 'notify',
            'keydown input.editing'                            : 'keyDown',
            'keyup input.editing'                              : 'onKeyUpInput',
            'click .newSelectList li:not(.miniStylePagination)': 'chooseOption',
            click                                              : 'removeInputs'
        },

        initialize: function (options) {
            var wTrack = options.wTracks[0];

            var year = wTrack.year;
            var employee = wTrack.employee._id;
            var week = wTrack.week;

            _.bindAll(this, 'saveItem');

            this.dateByWeek = options.dateByWeek;
            this.tds = options.tds;
            this.row = options.tr;
            this.wTracks = options.wTracks;
            this.setOverTime = overTime;

            employeeHelper.getNonWorkingDaysByWeek(year, week, null, employee, null,
                function (nonWorkingDays, self) {
                    options.nonWorkingDays = nonWorkingDays;
                    self.render(options);
                }, this);
        },

        keyDown: function (e) {  // validation from generateWTrack, need keydown instead of keypress in case of enter key
            var $el = $(e.target);
            var $td = $el.closest('td');
            var $tr = $el.closest('tr');
            var isOvertime = $tr.hasClass('overtime');
            var input = $tr.find('input.editing');
            var holiday = $td.is('.H, .V, .P, .S, .E, [data-content="6"], [data-content="7"]');
            var code = e.which;

            if (!isOvertime && holiday && keyCodes.isDigit(code) && code !== 48 && code !== 96) {
                App.render({
                    type   : 'error',
                    message: 'You can input only "0". Please create Overtime tCard for other values.'
                });
                return false;
            }

            if ($el.val() > 24) { // added in case of fast input
                $el.val(24);
            }

            if (keyCodes.isBspDelTabEscEnt(code) || keyCodes.isArrowsOrHomeEnd(code)) {
                if (code === 13) {
                    this.autoCalc(e);
                }
                return;
            }

            if (e.shiftKey || !keyCodes.isDigit(code)) {
                e.preventDefault();
            }
        },

        onKeyUpInput: function (e) { // max hours in cell
            var element = e.target;

            if ($(element).val() > 24) {
                $(element).val(24);
            }
        },

        stopDefaultEvents: function (e) {
            e.stopPropagation();
            e.preventDefault();
        },

        hideDialog: function () {
            $('.edit-dialog').remove();
        },

        asyncLoadImgs: function (model) {
            var currentModel = model.id ? model.toJSON() : model;
            var id = currentModel._id;
            // var pm = currentModel.projectmanager && currentModel.projectmanager._id ? currentModel.projectmanager._id : currentModel.projectmanager;
            var customer = currentModel.customer && currentModel.customer._id ? currentModel.customer._id : currentModel.customer;

            /*  if (pm) {
             common.getImagesPM([pm], '/getEmployeesImages', '#' + id, function (result) {
             var res = result.data[0];

             $('.miniAvatarPM').attr('data-id', res._id).find('img').attr('src', res.imageSrc);
             });
             }*/

            if (customer) {
                common.getImagesPM([customer], '/customers/getCustomersImages', '#' + id, function (result) {
                    var res = result.data[0];

                    $('.miniAvatarCustomer').attr('data-id', res._id).find('img').attr('src', res.imageSrc);
                });
            }
        },

        saveItem: function () {
            var Model = wTrackModel.extend({
                // redefine defaults for proper putch backEnd model;
                defaults: {}
            });
            var self = this;
            var thisEl = this.$el;
            // var table = thisEl.find('#wTrackEditTable');
            var table = this.$table;
            var inputEditing = table.find('input.editing');
            var data = [];
            var rows = table.find('tr');
            var totalWorked = 0;
            var project = thisEl.find('#project').text();

            if (inputEditing.length) {
                this.autoCalc(null, inputEditing);
            }

            function retriveText(el) {
                var child = el.children('input');

                if (child.length) {
                    return child.val();
                }

                return el.text() || 0;
            }

            rows.each(function () {
                var model;
                var $target = $(this);
                var id = $target.attr('data-id');
                var jobs = $target.find('[data-content="jobs"]');
                var monEl = $target.find('[data-content="1"]');
                var tueEl = $target.find('[data-content="2"]');
                var wenEl = $target.find('[data-content="3"]');
                var thuEl = $target.find('[data-content="4"]');
                var friEl = $target.find('[data-content="5"]');
                var satEl = $target.find('[data-content="6"]');
                var sunEl = $target.find('[data-content="7"]');
                var worked = $target.find('[data-content="worked"]');
                var _type = $target.find('[data-content="type"]').text();
                var mo = retriveText(monEl);
                var tu = retriveText(tueEl);
                var we = retriveText(wenEl);
                var th = retriveText(thuEl);
                var fr = retriveText(friEl);
                var sa = retriveText(satEl);
                var su = retriveText(sunEl);
                var wTrack;

                _type = _type === 'OT' ? 'overtime' : 'ordinary';

                worked = retriveText(worked);
                totalWorked += parseInt(worked, 10);
                wTrack = {
                    _id   : id,
                    1     : mo,
                    2     : tu,
                    3     : we,
                    4     : th,
                    5     : fr,
                    6     : sa,
                    7     : su,
                    jobs  : jobs.attr('data-id'),
                    _type : _type,
                    worked: worked
                };

                model = new Model(wTrack);
                data.push(model);
            });

            async.each(data, function (model, eachCb) {
                model.save(null, {
                    patch  : true,
                    success: function (model) {
                        eachCb(null, model);
                    },

                    error: function (model, response) {
                        eachCb(response);
                    }
                });
            }, function (err) {
                if (!err) {
                    self.updateDashRow({
                        totalWorked: totalWorked,
                        project    : project
                    });

                    return self.hideDialog();
                }

                App.render({
                    type   : 'error',
                    message: err.text
                });
            });
        },

        updateDashRow: function (options) {
            var totalHours = options.totalWorked;
            var targetEmployeeContainer = this.row.find('td.wTrackInfo[data-date="' + this.dateByWeek + '"]');
            var hoursContainer = targetEmployeeContainer.find('span.projectHours');
            var targetTdIndex = this.row.find('td').index(targetEmployeeContainer) - 1;
            var employeeId = this.row.attr('data-employee');

            hoursContainer.text(totalHours);

            this.getDataForCellClass(targetTdIndex, employeeId, totalHours);
        },

        autoCalc: function (e, targetEl) {
            var isInput;
            var trs;
            var edited;
            var editedCol;
            var value;
            var calcEl;

            targetEl = targetEl || $(e.target);

            isInput = targetEl.prop('tagName') === 'INPUT';
            trs = targetEl.closest('tr');
            edited = trs.find('input.edited');
            editedCol = edited.closest('td');

            isInput = targetEl.prop('tagName') === 'INPUT';
            trs = targetEl.closest('tr');
            edited = trs.find('input.edited');
            editedCol = edited.closest('td');

            function appplyDefaultValue(el) {
                var value = el.text();
                var children = el.children('input');

                if (value === '' || undefined) {
                    if (children.length) {
                        value = children.val();
                    } else {
                        value = '0';
                    }
                }

                return value || '0';
            }

            trs.each(function () {
                var tr = $(this);
                var days = tr.find('.autoCalc');
                var worked = 0;
                var _value;
                var workedEl;
                var i;

                workedEl = tr.find('[data-content="worked"]');

                for (i = days.length - 1; i >= 0; i--) {
                    calcEl = $(days[i]);

                    value = appplyDefaultValue(calcEl);

                    if (isInput) {
                        editedCol = targetEl.closest('td');
                        edited = targetEl;
                    }

                    worked += parseInt(value, 10);
                }

                _value = parseInt(edited.val(), 10);

                if (isNaN(_value)) {
                    _value = 0;
                }

                editedCol.text(_value);
                edited.remove();

                workedEl.text(worked);
            });
        },

        /*autoHoursPerDay: function (e) {
         var targetEl = $(e.target);
         var isInput = targetEl.prop('tagName') === 'INPUT';
         var tr = targetEl.closest('tr');
         var edited = tr.find('input.editing');
         var days = tr.find('.autoCalc');
         var editedCol = edited.closest('td');
         var worked = edited.val();
         var value;
         var intValue;
         var calcEl;
         var workedEl = tr.find('[data-content="worked"]');
         var i;

         if (worked) {
         intValue = worked / 7;
         intValue = Math.floor(intValue);

         for (i = days.length - 1; i >= 0; i--) {
         value = worked - intValue;
         calcEl = $(days[i]);

         if (value <= 0 || ((value - intValue) > 0 && (value - intValue) < intValue)) {
         calcEl.val(value);
         } else {

         calcEl.val(intValue);
         }
         }
         }

         editedCol.text(edited.val());
         edited.remove();

         workedEl.text(worked);
         },*/

        editRow: function (e) {
            var self = this;
            var el = $(e.target);
            var td = el.closest('td');
            var tr = el.closest('tr');
            var isHours = td.hasClass('hours');
            var isOvertime = tr.hasClass('overtime');
            var input = tr.find('input.editing');
            var holiday = td.is('.H, .V, .P, .S, .E, [data-content="6"], [data-content="7"]');
            var content = el.data('content');
            var tempContainer;
            var width;
            var value;
            var insertedInput;
            var colType = el.data('type');
            var isSelect = colType !== 'input' && el.prop('tagName') !== 'INPUT';
            var trs = this.$table.find('input.editing');

            $('.newSelectList').hide();

            /* if (!isOvertime && holiday) {
             App.render({
             type   : 'error',
             message: 'Please create Overtime tCard'
             });
             return false;
             } */

            this.autoCalc(null, trs);

            if (isSelect) {
                if (content === 'jobs') {
                    dataService.getData('/jobs/getForDD', {
                        projectId: self.wTracks[0].project._id,
                        all      : true
                    }, function (jobs) {

                        self.responseObj['#jobs'] = jobs;

                        tr.find('[data-content="jobs"]').addClass('editable');
                        // populate.showSelect(e, prev, next, self);
                        self.showNewSelect(e);
                        return false;
                    });
                } else if (content === 'type') {
                    el.append('<ul class="newSelectList"><li>OR</li><li>OT</li></ul>');

                    return false;
                } else {
                    // populate.showSelect(e, prev, next, this);
                    this.showNewSelect(e);
                    return false;
                }
            } else {
                input.removeClass('editing');
                input.addClass('edited');

                tempContainer = el.text();
                width = el.width() - 6;
                el.html('<input class="editing" type="text" value="' + tempContainer + '"  maxLength="2" style="width:' + width + 'px">');

                insertedInput = el.find('input');
                insertedInput.focus();
                insertedInput[0].setSelectionRange(0, insertedInput.val().length);

                isOverTime(el);

                if (input.length && !isHours) {
                    if (!input.val()) {
                        input.val(0);
                    }

                    this.autoCalc(e);
                }
            }

            return false;
        },

        notify: function () {
            App.render({
                type   : 'notify',
                message: 'This day from another month'
            });
        },

        removeInputs: function () {
            if (this.selectView) {
                this.selectView.remove();
            }

            this.$el.find('.editing').each(function () {
                var val = $(this).val();

                $(this).closest('td').text(val);
                $(this).remove();
            });
        },

        chooseOption: function (e) {
            var self = this;
            var $target = $(e.target);
            var textVal = $target.text();
            var $targetElement = $target.parents('td');
            var $tr = $target.parents('tr');
            var id = $target.attr('id');
            var attr = $targetElement.attr('id') || $targetElement.data('content');
            var elementType = '#' + attr;
            var jobs = {};

            var element = _.find(this.responseObj[elementType], function (el) {
                return el._id === id;
            });

            if (id !== 'createJob') {
                if (elementType === '#jobs') {

                    jobs = element._id;

                    $targetElement.attr('data-id', jobs);
                    $tr.find('[data-content="jobs"]').removeClass('errorContent');
                } else if (elementType === '#type') {
                    this.setOverTime(textVal, $tr);
                }
                $targetElement.removeClass('errorContent');
                $targetElement.text(textVal);
            } else if (id === 'createJob') {
                self.generateJob(e);
            }

            this.hideNewSelect();

            return false;
        },

        generateJob: function () {
            var model = this.wTracks[0].project;

            return new CreateJob({
                model     : model,
                wTrackView: this
            });
        },

        showNewSelect: function (e) {
            var $target = $(e.target);
            e.stopPropagation();

            if ($target.attr('id') === 'selectInput') {
                return false;
            }

            if (this.selectView) {
                this.selectView.remove();
            }

            this.selectView = new selectView({
                e          : e,
                responseObj: this.responseObj
            });

            $target.append(this.selectView.render().el);

            return false;
        },

        hideNewSelect: function () {

            if (this.selectView) {
                this.selectView.remove();
            }
        },

        getDataForCellClass: function (updatedTdIndex, employeeId, totalHours) {
            var table = $('#dashboardBody');
            var targetRow = table.find('[data-id="' + employeeId + '"]');
            var targetTd = targetRow.find('td.dashboardWeek').eq(updatedTdIndex);
            var hoursSpan = targetTd.find('span.vacationHours');
            var vacationSpan = targetTd.find('span.vacation');
            var holidaysSpan = targetTd.find('span.viewCount');
            var prevText = hoursSpan.text();
            var slashPos = prevText.indexOf('/');
            var vacationHours = vacationSpan.text();
            var holidays = holidaysSpan.text();
            var vacationSpanClass = 'vacation ';
            var hoursSpanClass = 'vacationHours ';
            var year = moment().isoWeekYear();
            var week = moment().isoWeek();
            var dateByWeek = year * 100 + week;
            var isInActiveClass = targetTd.hasClass('inactive');
            var isVacationClass = targetTd.hasClass('withVacation');
            var otherHours = this.tds.find('span.projectHours');

            var classString;
            var text;

            otherHours.each(function () {
                var el = $(this);

                totalHours += parseInt(el.text(), 10) || 0;
            });

            if (vacationHours) {
                vacationHours = parseInt(vacationHours);

                if (isNaN(vacationHours)) {
                    vacationHours = 0;
                }
            }

            if (holidays) {
                holidays = parseInt(holidays);
            }

            text = totalHours + ' ' + prevText.substring(slashPos);
            hoursSpan.text(text);

            classString = this.getCellClass(dateByWeek, vacationHours, holidays, totalHours, isInActiveClass, isVacationClass);
            vacationSpanClass += this.getCellSize(totalHours, vacationHours, true);
            hoursSpanClass += this.getCellSize(totalHours, vacationHours);

            hoursSpan.removeClass();
            vacationSpan.removeClass();
            hoursSpan.addClass(hoursSpanClass);
            vacationSpan.addClass(vacationSpanClass);

            targetTd.removeClass();
            targetTd.addClass(classString);
        },

        getCellClass: function (dateByWeek, vacations, holidays, hours, isInActiveClass, isVacationClass) {
            var s = 'dashboardWeek ';
            var startHours;

            if (isVacationClass) {
                s += 'withVacation ';
            }

            hours = hours || 0;
            holidays = holidays || 0;
            vacations = vacations || 0;

            startHours = hours;
            hours = hours + vacations + holidays * 8;

            if (hours > 40) {
                s += 'dgreen ';
            } else if (hours > 35) {
                s += 'green ';
            } else if (hours > 19) {
                s += 'yellow ';
            } else if (hours > 8) {
                s += startHours ? 'pink ' : ((dateByWeek >= this.dateByWeek) ? 'red' : "");
            } else if (dateByWeek >= this.dateByWeek) {
                s += 'red ';
            }
            if (dateByWeek === this.dateByWeek) {
                s += 'active ';
            }
            if (isInActiveClass) {
                s += 'inactive ';
            }

            return s;
        },

        getCellSize: function (workedHours, vacationHours, inVacation) {
            var v = '';
            var w = '';

            vacationHours = vacationHours || 0;
            workedHours = workedHours || 0;

            if (vacationHours > 16) {
                v = workedHours ? 'size40' : 'sizeFull';
                w = workedHours ? 'size40' : 'size0';
            } else if (vacationHours > 8) {
                v = workedHours ? 'size16' : 'size40';
                w = workedHours ? 'size24' : 'size40';
            } else if (vacationHours > 0) {
                v = workedHours ? 'size8' : 'size8';
                w = 'sizeFull';
            } else {
                v = 'size0';
                w = 'sizeFull';
            }

            if (inVacation && vacationHours) {
                return v;
            } else {
                return w;
            }
        },

        render: function (data) {
            var formString = this.template(data);
            var self = this;

            this.$el = $(formString).dialog({
                autoOpen   : true,
                title      : 'Edit Project',
                dialogClass: 'edit-dialog',
                width      : '900px',
                buttons    : {
                    save: {
                        text : 'Save',
                        class: 'btn',
                        click: self.saveItem
                    },

                    cancel: {
                        text : 'Cancel',
                        class: 'btn',
                        click: self.hideDialog
                    }
                }
            });

            this.delegateEvents(this.events);

            this.asyncLoadImgs(data);
            this.delegateEvents(this.events);

            this.$table = this.$el.find('#wTrackEditTable');

            return this;
        }
    });
    return CreateView;
});

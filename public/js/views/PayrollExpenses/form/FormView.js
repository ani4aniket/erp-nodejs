define([
    'Backbone',
    'jQuery',
    'Underscore',
    'text!templates/PayrollExpenses/form/FormTemplate.html',
    'text!templates/PayrollExpenses/form/sortTemplate.html',
    'text!templates/PayrollExpenses/form/cancelEdit.html',
    'views/PayrollExpenses/form/dialogView',
    'views/PayrollExpenses/EditView',
    'collections/PayrollExpenses/editCollection',
    'collections/PayrollExpenses/sortCollection',
    'collections/PayrollPayments/editCollection',
    'models/PayRollModel',
    'views/selectView/selectView',
    'views/PayrollPayments/CreateView',
    'views/PayrollExpenses/CreateView',
    'helpers',
    'moment',
    'populate',
    'dataService',
    'async',
    'constants'
], function (Backbone, $, _, PayrollTemplate, sortTemplate, cancelEdit, ReportView, EditView, editCollection, sortCollection, PaymentCollection, CurrentModel, selectView, PaymentCreateView, CreateView, helpers, moment, populate, dataService, async, CONSTANTS) {
    var PayrollExpanses = Backbone.View.extend({

        el           : '#content-holder',
        changedModels: {},
        responseObj  : {},

        initialize: function (options) {
            var hash = window.location.hash;

            this.collection = options.model;

            this.dataKey = hash.split('form/')[1];
        },

        events: {
            'click .checkbox'                                          : 'checked',
            'click td:not(.notForm)'                                   : 'editRow',
            'click .newSelectList li'                                  : 'chooseOption',
            'change .autoCalc'                                         : 'autoCalc',
            'change .editable'                                         : 'setEditable',
            'keydown input.editing'                                    : 'keyDown',
            click                                                      : 'removeNewSelect',
            'click .diff'                                              : 'newPayment',
            'click .oe_sortable'                                       : 'goSort',
            // 'click .expand'                           : 'renderDialogView',
            'click .mainTr td:not(.expand, .checkbox, .diff, .notForm)': 'goToForm'
        },

        goToForm: function (e) {
            var id = $(e.target).closest('tr').data('id');
            var model = new CurrentModel();
            var month = (this.dataKey.toString()).slice(4);
            var year = (this.dataKey.toString()).slice(0, 4);

            e.preventDefault();

            model.fetch({
                data: {
                    id   : id,
                    month: month,
                    year : year
                },

                success: function (model) {
                    return new EditView({model: model});
                },

                error: function () {
                    App.render({
                        type   : 'error',
                        message: 'Please refresh browser'
                    });
                }
            });
        },

        /* renderDialogView: function (e) {
         var self = this;
         var tr = $(e.target).closest('tr').find('[data-content="employee"]');
         var id = tr.attr('data-id');

         App.startPreload();

         new ReportView({_id: id, dataKey: self.dataKey});
         },*/

        recount: function () {
            var self = this;
            App.startPreload();

            dataService.postData('/payroll/recount', {dataKey: self.dataKey}, function () {
                App.stopPreload();
                Backbone.history.fragment = '';
                Backbone.history.navigate(window.location.hash, {trigger: true, replace: true});
            });

        },

        cancelChanges: function () {
            var self = this;
            var edited = this.edited;
            var collection = this.collection;

            this.$el.find('#false').remove();

            async.each(edited, function (el, cb) {
                var tr = $(el).closest('tr');
                var rowNumber = tr.find('[data-content="number"]').text();
                var id = tr.attr('data-id');
                var template = _.template(cancelEdit);
                var model;

                if (!id) {
                    return cb('Empty id');
                } else if (id.length < 24) {
                    tr.remove();
                    model = self.changedModels;

                    if (model) {
                        delete model[id];
                    }

                    return cb();
                }

                model = collection.get(id);
                model = model.toJSON();
                model.startNumber = rowNumber;
                tr.replaceWith(template({
                    model           : model,
                    currencySplitter: helpers.currencySplitter,
                    weekSplitter    : helpers.weekSplitter
                }));
                cb();
            }, function (err) {
                if (!err) {
                    self.bindingEventsToEditedCollection(self);
                    self.hideSaveCancelBtns();
                }
            });
        },

        goSort: function (e) {
            var target$;
            var currentParrentSortClass;
            var sortClass;
            var sortConst;
            var sortBy;
            var sortObject;

            this.collection.unbind('reset');
            this.collection.unbind('showmore');

            target$ = $(e.target).closest('th');
            currentParrentSortClass = target$.attr('class');
            sortClass = currentParrentSortClass.split(' ')[1];
            sortConst = 1;
            sortBy = target$.data('sort');
            sortObject = {};

            if (!sortClass) {
                target$.addClass('sortUp');
                sortClass = 'sortUp';
            }
            switch (sortClass) {
                case 'sortDn':
                    target$.parent().find('th').removeClass('sortDn').removeClass('sortUp');
                    target$.removeClass('sortDn').addClass('sortUp');
                    sortConst = 1;
                    break;
                case 'sortUp':
                    target$.parent().find('th').removeClass('sortDn').removeClass('sortUp');
                    target$.removeClass('sortUp').addClass('sortDn');
                    sortConst = -1;
                    break;
                // skip default;
            }
            sortObject[sortBy] = sortConst;

            this.fetchSortCollection(sortObject);
        },

        fetchSortCollection: function (sortObject) {
            var self = this;

            this.sort = sortObject;
            this.collection = new sortCollection({
                viewType: 'list',
                sort    : sortObject,
                dataKey : self.dataKey
            });
            this.collection.bind('reset', this.renderContent, this);
        },

        renderContent: function () {
            var $currentEl = this.$el;
            var tBody = $currentEl.find('#payRoll-TableBody');

            tBody.empty();
            $('#top-bar-deleteBtn').hide();
            $('#checkAll').prop('checked', false);

            if (this.collection.length > 0) {
                tBody.append(_.template(sortTemplate, {
                    collection      : this.collection.toJSON(),
                    currencySplitter: helpers.currencySplitter
                }));
            }
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
            $('.newSelectList').remove();

            if (this.selectView) {
                this.selectView.remove();
            }
        },

        newPayment: function (e) {
            var checkbox = this.$el.find('input.checkbox:checked');
            var checkboxes = checkbox || [];
            var tr;
            var dataId;
            var model;
            var jsonModel;
            var modelPayment;
            var target = e ? e.target : null;

            if (checkboxes.length) {
                for (var i = checkboxes.length - 1; i >= 0; i--) {
                    dataId = $(checkboxes[i]).attr('id');
                    model = this.editCollection.get(dataId);
                    jsonModel = model.toJSON();

                    if (jsonModel.diff > 0) {

                        modelPayment = {
                            paidAmount      : jsonModel.diff,
                            workflow        : 'Draft',
                            differenceAmount: 0,
                            month           : jsonModel.month,
                            year            : jsonModel.year,
                            supplier        : jsonModel.employee,
                            period          : jsonModel.year + '-' + jsonModel.month + '-01',
                            paymentRef      : dataId
                        };

                        this.forPayments.add(modelPayment);
                    }

                }
            } else if (target) {
                tr = $(target).closest('tr');
                dataId = tr.attr('data-id');

                model = this.editCollection.get(dataId);
                jsonModel = model.toJSON();

                if (jsonModel.diff > 0) {

                    modelPayment = {
                        paidAmount      : jsonModel.diff,
                        workflow        : 'Draft',
                        differenceAmount: 0,
                        month           : jsonModel.month,
                        year            : jsonModel.year,
                        supplier        : jsonModel.employee,
                        period          : jsonModel.year + '-' + jsonModel.month + '-01',
                        paymentRef      : dataId
                    };

                    this.forPayments.add(modelPayment);
                }
            }

            if (this.forPayments.length) {
                new PaymentCreateView({
                    redirect  : this.redirect,
                    collection: this.forPayments
                });
            } else {
                return App.render({
                    type   : 'error',
                    message: 'Please, check at most one unpaid item.'
                });
            }

        },

        showMoreContent: function (newCollection) {
            var collectionsObjects;

            var holder = this.$el;
            var $currentEl = holder.find('#payRoll-TableBody');

            this.collection = newCollection;
            collectionsObjects = this.collection.toJSON()[0];
            this.total = collectionsObjects.total;

            $currentEl.empty();
            $currentEl.append(this.totalTemplate({
                collection      : this.collection.toJSON(),
                total           : this.total,
                currencySplitter: helpers.currencySplitter,
                weekSplitter    : helpers.weekSplitter
            }));

            $('#top-bar-deleteBtn').hide();
            $('#topBarPaymentGenerate').hide();
            $('#checkAll').prop('checked', false);

            if (this.filterView) {
                this.filterView.renderFilterContent();
            }

            holder.find('#timeRecivingDataFromServer').remove();
            holder.append('<div id="timeRecivingDataFromServer">Created in ' + (new Date() - this.startTime) + ' ms</div>');
        },

        deleteRender: function () {
            this.resetCollection();
            this.render();
            this.$bodyContainer = $(this.bodyContainerId);
            this.getTotal();

            dataService.getData('/payroll/recalculateSalaryCash', {}, function (response, context) {
                context.listLength = response.count || 0;
            }, this);
        },

        deleteItems: function () {
            var that = this;
            var answer = confirm('Really DELETE items ?!');
            var value;
            var tr;

            if (!this.changed) {
                if (answer === true) {
                    $.each(that.$el.find('input:checked'), function (index, checkbox) {
                        checkbox = $(checkbox);
                        value = checkbox.attr('id');
                        tr = checkbox.closest('tr');

                        if (value) {
                            that.deleteItem(tr, value);
                        }
                    });
                }
            } else {
                this.cancelChanges();
            }
        },

        deleteItem: function (tr) {
            var self = this;
            var model;
            var mid = 39;
            var totalNew;
            var totalNewCalc;
            var totalNewPaid;
            var totalDiffOld = parseFloat(this.$el.find('#totalDiff').attr('data-cash'));
            var totalCalcOld = parseFloat(this.$el.find('#totalCalc').attr('data-cash'));
            var totalPaidOld = parseFloat(this.$el.find('#totalPaid').attr('data-cash'));
            var id = tr.attr('data-id');
            var elDiff = parseFloat(this.editCollection.get(id).get('diff'));
            var elCalc = parseFloat(this.editCollection.get(id).get('calc'));
            var elPaid = parseFloat(this.editCollection.get(id).get('paid'));

            totalNew = totalDiffOld + elDiff;
            totalNewCalc = totalCalcOld + elCalc;
            totalNewPaid = totalPaidOld + elPaid;

            if (id.length < 24) {
                this.editCollection.remove(id);
                delete this.changedModels[id];
                self.deleteItemsRender(tr, id);
            } else {
                model = this.editCollection.get(id);

                model.urlRoot = '/payroll/';

                model.destroy({
                    headers: {
                        mid: mid
                    },
                    wait   : true,
                    success: function () {
                        delete self.changedModels[id];
                        self.deleteItemsRender(tr, id);
                    },

                    error: function (model, res) {
                        if (res.status === 403) {
                            App.render({
                                type   : 'error',
                                message: 'You do not have permission to perform this action'
                            });
                        }
                    }
                });
            }

            this.$el.find('#totalDiff').text(helpers.currencySplitter(totalNew.toFixed(2)));
            this.$el.find('#totalDiff').attr('data-cash', totalNew);

            this.$el.find('#totalCalc').text(helpers.currencySplitter(totalNewCalc.toFixed(2)));
            this.$el.find('#totalCalc').attr('data-cash', totalNewCalc);

            this.$el.find('#totalPaid').text(helpers.currencySplitter(totalNewPaid.toFixed(2)));
            this.$el.find('#totalPaid').attr('data-cash', totalNewPaid);
        },

        deleteItemsRender: function (tr, id) {
            tr.remove();

            this.editCollection.remove(id);
            this.hideSaveCancelBtns();
        },

        isNewRow: function () {
            var newRow = $('#false');

            return !!newRow.length;
        },

        createItem: function () {
            var month = this.editCollection.toJSON()[0].month;
            var year = this.editCollection.toJSON()[0].year;
            var dataKey = parseInt(year, 10) * 100 + parseInt(month, 10);

            var startData = {
                dataKey: dataKey,
                type   : {
                    _id : null,
                    name: ''
                },

                month   : month,
                year    : year,
                diff    : 0,
                paid    : 0,
                calc    : 0,
                employee: {
                    name: '',
                    _id : null
                }
            };

            var model = new CurrentModel(startData);

            startData.cid = model.cid;

            if (!this.isNewRow()) {
                this.showSaveCancelBtns();
                this.editCollection.add(model);
                this.changed = true;

                return new CreateView({model: startData});
            }
        },

        setChangedValueToModel: function () {
            var editedElement = this.$el.find('.editing');
            var editedCol;
            var editedElementRow;
            var editedElementRowId;
            var editedElementContent;
            var editedElementValue;
            var editModel;
            var editedElementOldValue;
            var changedAttr;

            var calc;
            var paid;

            var oldStr;
            var newStr;
            var month;
            var year;

            var differenceBettwenValues;

            if (editedElement.length) {
                editedCol = editedElement.closest('td');
                editedElementRow = editedElement.closest('tr');
                editedElementRowId = editedElementRow.attr('data-id');
                editedElementContent = editedCol.data('content');
                editedElementOldValue = parseInt(editedElement.attr('data-cash'), 10);
                if (editedElementContent === 'dataKey') {
                    oldStr = editedElement.val();
                    newStr = oldStr.slice(0, 2) + oldStr.slice(3, 7);
                    month = parseInt(oldStr.slice(0, 2), 10);
                    year = parseInt(oldStr.slice(3, 7), 10);

                    editedElementValue = parseInt(newStr, 10) ? parseInt(newStr, 10) : 0;
                } else {
                    editedElementValue = parseInt(editedElement.val(), 10);
                    editedElementValue = isFinite(editedElementValue) ? editedElementValue : 0;

                    editedElementOldValue = isFinite(editedElementOldValue) ? editedElementOldValue : 0;

                    differenceBettwenValues = editedElementValue - editedElementOldValue;
                }

                if (differenceBettwenValues !== 0) {

                    editModel = this.editCollection.get(editedElementRowId);

                    if (!this.changedModels[editedElementRowId]) {
                        if (!editModel.id) {
                            this.changedModels[editedElementRowId] = editModel.attributes;
                        } else {
                            this.changedModels[editedElementRowId] = {};
                        }
                    }

                    calc = _.clone(editModel.get('calc'));
                    paid = _.clone(editModel.get('paid'));

                    changedAttr = this.changedModels[editedElementRowId];

                    if (month || year) {
                        changedAttr.dataKey = year * 100 + month;
                        changedAttr.month = month;
                        changedAttr.year = year;
                    }

                    if (editedElementContent === 'dataKey') {
                        editedCol.text(oldStr);
                    } else {
                        editedCol.text(editedElementValue);
                    }

                    if (changedAttr) {
                        if (editedCol.hasClass('calc')) {
                            if (editedCol.attr('data-content') === 'salary') {
                                changedAttr.baseSalary = editedElementValue;
                            } else {
                                if (!changedAttr.calc) {
                                    changedAttr.calc = calc;
                                }

                                calc = editedElementValue;
                                changedAttr.calc = calc;
                            }
                        } else if (editedCol.hasClass('paid')) {
                            if (!changedAttr.paid) {
                                changedAttr.paid = paid;
                            }

                            paid = editedElementValue;
                            changedAttr.paid = paid;
                            changedAttr.diff = paid - calc;
                        }
                    }
                }
                if (editedElementContent === 'dataKey') {
                    editedCol.text(oldStr);
                } else {
                    editedCol.text(editedElementValue);
                }
                editedElement.remove();
            }
        },

        removeNewSelect: function () {
            $('.newSelectList').remove();

            if (this.selectView) {
                this.selectView.remove();
            }
        },

        keyDown: function (e) {
            if (e.which === 13) {
                this.setChangedValueToModel();
            }
        },

        setEditable: function (td) {

            if (!td.parents) {
                td = $(td.target).closest('td');
            }

            td.addClass('edited');

            if (this.isEditRows()) {
                this.setChangedValue();
            }

            return false;
        },

        autoCalc: function (e) {
            var el = $(e.target);
            var td = $(el.closest('td'));
            var tr = el.closest('tr');
            var input = tr.find('input.editing');
            var editedElementRowId = tr.attr('data-id');
            var editModel = this.editCollection.get(editedElementRowId);
            var changedAttr;

            var diffOnCash = tr.find('.diff[data-content="onCash"]');

            var value;
            var totalValue;
            var tdForUpdate;
            var paid;
            var calc;
            var diffObj;
            var diffOnCashRealValue;

            var paidTD;
            var calcTD;

            var newValue;
            var subValues = 0;

            if (!this.changedModels[editedElementRowId]) {
                if (!editModel.id) {
                    this.changedModels[editedElementRowId] = editModel.attributes;
                } else {
                    this.changedModels[editedElementRowId] = {};
                }
            }

            if ($(td).hasClass('cash')) {
                tdForUpdate = diffOnCash;
                paidTD = tr.find('.paid[data-content="onCash"]');
                calcTD = tr.find('.calc[data-content="onCash"]');
            }

            if (tdForUpdate) {
                paid = paidTD.attr('data-cash');
                calc = calcTD.attr('data-cash');

                paid = paid ? parseInt(paid, 10) : 0;
                calc = calc ? parseInt(calc, 10) : 0;
                newValue = parseInt(input.val(), 10);

                if (!calcTD.text()) {
                    subValues = newValue - calc;
                    calc = newValue;
                }

                if (subValues !== 0) {

                    value = paid - calc;

                    paidTD.attr('data-cash', paid);
                    calcTD.attr('data-cash', calc);

                    tdForUpdate.text(this.checkMoneyTd(tdForUpdate, value));

                    diffOnCashRealValue = diffOnCash.attr('data-value');
                    diffOnCashRealValue = diffOnCashRealValue || diffOnCash.text();

                    totalValue = parseInt(diffOnCashRealValue, 10);

                    changedAttr = this.changedModels[editedElementRowId];

                    diffObj = totalValue;

                    changedAttr.diff = diffObj;
                }
            }
        },

        checkMoneyTd: function (td, value) {
            var moneyClassCheck = $(td).hasClass('money');
            var negativeMoneyClass = $(td).hasClass('negativeMoney');

            if (value < 0) {
                if (moneyClassCheck) {
                    $(td).removeClass('money');
                }
                $(td).addClass('negativeMoney');
                $(td).attr('data-value', value);
                value *= -1;
            } else {
                if (negativeMoneyClass) {
                    $(td).removeClass('negativeMoney');
                }
                $(td).addClass('money');
            }
            return value;
        },

        isEditRows: function () {
            var edited = this.$bodyContainer.find('.edited');

            this.edited = edited;

            return !!edited.length;
        },

        setChangedValue: function () {
            if (!this.changed) {
                this.changed = true;
                this.showSaveCancelBtns();
            }
        },

        showSaveCancelBtns: function () {
            var createBtnEl = $('#top-bar-createBtn');
            var saveBtnEl = $('#top-bar-saveBtn');
            var cancelBtnEl = $('#top-bar-deleteBtn');

            createBtnEl.hide();

            saveBtnEl.show();
            cancelBtnEl.show();

            return false;
        },

        chooseOption: function (e) {
            var target = $(e.target);
            var closestTD = target.closest('td');
            var targetElement = closestTD.length ? closestTD : target.closest('th').find('a');
            var tr = target.closest('tr');
            var modelId = tr.attr('data-id');
            var id = target.attr('id');
            var attr = targetElement.attr('id') || targetElement.attr('data-content');
            var elementType = '#' + attr;
            var element = _.find(this.responseObj[elementType], function (el) {
                return el._id === id;
            });

            var editModel;
            var employee;
            var changedAttr;

            e.preventDefault();

            if (modelId) {
                editModel = this.editCollection.get(modelId);

                if (!this.changedModels[modelId]) {
                    if (!editModel.id) {
                        this.changedModels[modelId] = editModel.attributes;
                    } else {
                        this.changedModels[modelId] = {};
                    }
                }

                changedAttr = this.changedModels[modelId];
            }

            if (elementType === '#employee') {
                tr.find('[data-content="employee"]').text(element.name);

                employee = _.clone(editModel.get('employee'));

                employee._id = element._id;
                employee.name = target.text();

                changedAttr.employee = employee;

                tr.find('[data-content="employee"]').removeClass('errorContent');

                this.hideNewSelect();
                this.setEditable(targetElement);

                return false;
            } else if (elementType === '#paymentType') {
                tr.find('[data-content="paymentType"]').text(element.name);

                changedAttr.type = {};
                changedAttr.type._id = element._id;
                changedAttr.type.name = element.name;

                tr.find('[data-content="paymentType"]').removeClass('errorContent');

                this.hideNewSelect();
                this.setEditable(targetElement);

                return false;
            }

            targetElement.text(target.text());

            this.hideNewSelect();
            this.setEditable(targetElement);

            return false;
        },

        editRow: function (e) {
            var self = this;
            var target = $(e.target);
            var isInput = target.prop('tagName') === 'INPUT';
            var dataContent = target.attr('data-content');
            var tr = target.closest('tr');
            var payRollId = tr.attr('data-id');
            var tempContainer;
            var insertedInput;

            var inputHtml;

            if (payRollId && !isInput) {
                if (this.payRollId) {
                    this.setChangedValueToModel();
                }
                this.payRollId = payRollId;
                this.setChangedValueToModel();
            }

            if (dataContent === 'employee') {
                this.showNewSelect(e);
                return false;
            } else if (dataContent === 'paymentType') {
                this.showNewSelect(e);
                return false;
            } else if (dataContent === 'dataKey') {

                tempContainer = target.text();
                inputHtml = "<input type='text' class='datapickerediting' value='" + tempContainer + "' readonly />";

                target.html(inputHtml);

                $('.datapicker').datepicker({
                    dateFormat : 'mm/yy',
                    changeMonth: true,
                    changeYear : true,
                    onSelect   : function () {
                        var targetInput = $(this);
                        var td = targetInput.closest('tr');
                        var endDatePicker = td.find('.endDateDP');
                        var endDate = moment(targetInput.datepicker('getDate'));
                        var endContainer = $(endDatePicker);

                        endDate.add(7, 'days');
                        endDate = endDate.toDate();

                        endContainer.datepicker('option', 'minDate', endDate);

                        self.setChangedValueToModel(targetInput);

                        return false;
                    }
                }).removeClass('datapicker');

                insertedInput = target.find('input');
                insertedInput.focus();
                insertedInput[0].setSelectionRange(0, insertedInput.val().length);

            } else if (!isInput) {
                tempContainer = target.text();
                inputHtml = "<input class='editing' type='text' data-value=' " + tempContainer + " ' value = '" + tempContainer + " ' maxLength = '4'style = 'display: block;' / > ";

                target.html(inputHtml);

                target.attr('data-cash', tempContainer);

                insertedInput = target.find('input');
                insertedInput.focus();
                insertedInput[0].setSelectionRange(0, insertedInput.val().length);
            }

            return false;
        },

        checked: function (e) {
            var checkLength;
            var target = $(e.target);
            var id = target.attr('id');
            var totalNew;
            var totalNewCalc;
            var totalNewPaid;
            var totalDiffOld = parseFloat(this.$el.find('#totalDiff').attr('data-cash'));
            var totalCalcOld = parseFloat(this.$el.find('#totalCalc').attr('data-cash'));
            var totalPaidOld = parseFloat(this.$el.find('#totalPaid').attr('data-cash'));
            var elDiff = parseFloat(this.editCollection.get(id).get('diff'));
            var elCalc = parseFloat(this.editCollection.get(id).get('calc'));
            var elPaid = parseFloat(this.editCollection.get(id).get('paid'));

            e.stopPropagation();
            e.preventDefault();

            if (this.$el.find('#false').length) {
                return false;
            }

            if (!target.prop('checked')) {
                elDiff = elDiff * (-1);
                elCalc = elCalc * (-1);
                elPaid = elPaid * (-1);
            }

            totalNew = totalDiffOld + elDiff;
            totalNewCalc = totalCalcOld + elCalc;
            totalNewPaid = totalPaidOld + elPaid;

            if (this.editCollection.length > 0) {
                checkLength = $('input.checkbox:checked').length;

                this.$el.find('#totalDiff').text(helpers.currencySplitter(totalNew.toFixed(2)));
                this.$el.find('#totalDiff').attr('data-cash', totalNew);

                this.$el.find('#totalCalc').text(helpers.currencySplitter(totalNewCalc.toFixed(2)));
                this.$el.find('#totalCalc').attr('data-cash', totalNewCalc);

                this.$el.find('#totalPaid').text(helpers.currencySplitter(totalNewPaid.toFixed(2)));
                this.$el.find('#totalPaid').attr('data-cash', totalNewPaid);

                if ($('input.checkbox:checked').length > 0) {
                    $('#top-bar-createBtn').hide();
                    $('#top-bar-deleteBtn').show();
                    $('#topBarPaymentGenerate').show();
                    if (checkLength === 1) {
                        $('#top-bar-copy').show();
                        $('#top-bar-createBtn').hide();
                    } else {
                        $('#top-bar-copy').hide();
                    }
                    if (checkLength === this.collection.length) {
                        this.$el.find('#checkAll').prop('checked', true);
                    } else {
                        this.$el.find('#checkAll').prop('checked', false);
                    }
                } else {
                    this.$el.find('#checkAll').prop('checked', false);
                    $('#top-bar-deleteBtn').hide();
                    $('#topBarPaymentGenerate').hide();
                    $('#top-bar-copy').hide();
                    $('#top-bar-createBtn').show();
                }
            }
        },

        copy: function () {
            var checkedRows = this.$el.find('input.checkbox:checked');
            var selectedRow = checkedRows[0];
            var self = this;
            var target = $(selectedRow);
            var id = target.val();
            var row = target.closest('tr');
            var model = self.editCollection.get(id);
            var _model;
            var tdsArr;
            var cid;
            var calc = (model.changed && model.changed.calc) ? model.changed.calc : model.get('calc');

            this.hideCopy();

            $(selectedRow).attr('checked', false);

            model.set({paid: 0});
            model.set({diff: calc * (-1)});
            model = model.toJSON();

            delete model._id;
            _model = new CurrentModel(model);

            this.showSaveCancelBtns();
            this.editCollection.add(_model);

            cid = _model.cid;

            if (!this.changedModels[cid]) {
                this.changedModels[cid] = model;
            }

            this.$el.find('#payRoll-listTable').prepend("<tr id='false' data-id=' " + cid + '>' + row.html() + '</tr>');

            row = this.$el.find('#false');

            tdsArr = row.find('td');
            $(tdsArr[0]).text(1);
            $(tdsArr[3]).addClass('editable');
        },

        hideCopy: function () {
            $('#top-bar-copy').hide();
        },

        hideSaveCancelBtns: function () {
            var createBtnEl = $('#top-bar-createBtn');
            var saveBtnEl = $('#top-bar-saveBtn');
            var cancelBtnEl = $('#top-bar-deleteBtn');
            var copyBtnEl = $('#top-bar-copy');
            var generate = $('#top-bar-generate');
            var recount = $('#top-bar-recount');
            var paymentBtnEl = $('#topBarPaymentGenerate');

            this.changed = false;

            saveBtnEl.hide();
            cancelBtnEl.hide();
            createBtnEl.show();
            copyBtnEl.hide();
            paymentBtnEl.hide();
            generate.hide();
            recount.show();

            return false;
        },

        resetCollection: function (model) {
            var id;

            if (model && model._id) {
                model = new CurrentModel(model);

                this.editCollection.add(model);
            } else {
                for (id in this.changedModels) {
                    model = this.editCollection.get(id);
                    model.set(this.changedModels[id]);
                }

                this.collection.set(this.editCollection.models, {remove: false});
            }

            this.bindingEventsToEditedCollection(this);
        },

        bindingEventsToEditedCollection: function (context, collection) {
            if (!context.editCollection) {
                context.editCollection = new editCollection(collection);
            } else {
                context.editCollection.unbind();
                context.editCollection.add(collection);
            }

            context.editCollection.on('saved', context.savedNewModel, context);
            context.editCollection.on('updated', context.updatedOptions, context);
        },

        savedNewModel: function (modelObject) {
            var savedRow = this.$bodyContainer.find('#false');
            var modelId;
            var checkbox = savedRow.find('input[type=checkbox]');

            if (modelObject) {
                modelId = modelObject._id;
                savedRow.attr('data-id', modelId);
                checkbox.val(modelId);
                checkbox.attr('id', modelId);
                savedRow.removeAttr('id');
            }

            this.hideSaveCancelBtns();
            this.resetCollection(modelObject);
        },

        updatedOptions: function () {
            this.hideSaveCancelBtns();
            this.resetCollection();
        },

        saveItem: function () {
            var model;
            var id;
            var errors = this.$el.find('.errorContent');

            this.editCollection.on('saved', this.savedNewModel, this);
            this.editCollection.on('updated', this.updatedOptions, this);

            if (errors.length) {
                return false;
            }

            for (id in this.changedModels) {
                model = this.editCollection.get(id);
                model.changed = this.changedModels[id];
            }
            this.editCollection.save();
        },

        filterEmployeesForDD: function (content) {
            dataService.getData(CONSTANTS.URLS.EMPLOYEES_GETFORDD, null, function (employees) {
                employees = _.map(employees.data, function (employee) {
                    employee.name = employee.name.first + ' ' + employee.name.last;

                    return employee;
                });

                content.responseObj['#employee'] = employees;
            });

            dataService.getData('/category/getExpenses', null, function (paymentType) {

                content.responseObj['#paymentType'] = paymentType;
            });
        },

        render: function () {
            var self = this;
            var collection = this.collection.toJSON();

            this.$el.html(_.template(PayrollTemplate, {
                collection      : collection,
                currencySplitter: helpers.currencySplitter
            }));

            this.$bodyContainer = this.$el.find('#payRoll-listTable');

            this.hideSaveCancelBtns();

            this.filterEmployeesForDD(this);

            $('#checkAll').click(function () {
                var totalOld = 0;
                var totalNew = 0;
                var totalCalc = 0;
                var totalPaid = 0;

                var checkboxes = self.$el.find('.checkbox');

                self.$el.find('.checkbox').prop('checked', this.checked);

                $.each(checkboxes, function () {
                    var target = $(this);
                    var id = target.attr('id');
                    var elDiff = parseFloat(self.editCollection.get(id).get('diff'));
                    var elCalc = parseFloat(self.editCollection.get(id).get('calc'));
                    var elPaid = parseFloat(self.editCollection.get(id).get('paid'));

                    if (!target.prop('checked')) {
                        elDiff = elDiff * (-1);
                    }

                    totalNew += totalOld + elDiff;
                    totalCalc += totalOld + elCalc;
                    totalPaid += totalOld + elPaid;

                });

                if (self.$el.find('input.checkbox:checked').length > 0) {

                    self.$el.find('#totalDiff').text(helpers.currencySplitter(totalNew.toFixed(2)));
                    self.$el.find('#totalDiff').attr('data-cash', totalNew);

                    self.$el.find('#totalCalc').text(helpers.currencySplitter(totalCalc.toFixed(2)));
                    self.$el.find('#totalCalc').attr('data-cash', totalCalc);

                    self.$el.find('#totalPaid').text(helpers.currencySplitter(totalPaid.toFixed(2)));
                    self.$el.find('#totalPaid').attr('data-cash', totalPaid);

                    $('#top-bar-deleteBtn').show();
                    $('#topBarPaymentGenerate').show();
                    $('#top-bar-createBtn').hide();
                } else {

                    self.$el.find('#totalDiff').text(0);
                    self.$el.find('#totalDiff').attr('data-cash', 0);

                    self.$el.find('#totalCalc').text(0);
                    self.$el.find('#totalCalc').attr('data-cash', 0);

                    self.$el.find('#totalPaid').text(0);
                    self.$el.find('#totalPaid').attr('data-cash', 0);

                    $('#top-bar-deleteBtn').hide();
                    $('#topBarPaymentGenerate').hide();
                    $('#top-bar-createBtn').show();
                }
            });

            $('#top-bar-recountAll').hide();

            setTimeout(function () {
                self.editCollection = new editCollection(self.collection.models);

                self.forPayments = new PaymentCollection();
            }, 10);

            return this;
        }
    });
    return PayrollExpanses;
});

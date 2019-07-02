
var async = require('async');
var express = require('express');
var router = express.Router();
var ImportHandler = require('../helpers/importer/importer');
var mongoose = require('mongoose');
var _ = require('lodash');
var CONSTANTS = require('../constants/mainConstants');

var moment = require('../public/js/libs/moment/moment');

var dateCalc = require('../helpers/dateManipulator');

var tasks = require('../helpers/importer/map/').tmDevelopment;

module.exports = function (models) {
    var handler = ImportHandler({
        msSql: {
            user: 'thinkmobiles@wbje9y2n5u',
            password: '1q2w3e!@#',
            server: 'wbje9y2n5u.database.windows.net',
            //database: 'ex_dev',
            database: 'production',
            requestTimeout: 150000,
            options: {
                encrypt: true
            }
        }
    });

    function getAge(birthday) {
        var today = new Date();
        var years;
        if (birthday) {
            birthday = new Date(birthday);
            years = today.getFullYear() - birthday.getFullYear();

            birthday.setFullYear(today.getFullYear());

            if (today < birthday) {
                years--;
            }
            return (years < 0) ? 0 : years;
        }

        return 0;
    };

    function comparator(columnName, field) {
        var targetObject = _.find(field, function (fieldValue) {
            if (columnName === null || columnName === undefined) {
                columnName = 'null';
            }
            return fieldValue.value.toLowerCase() === columnName.toString().toLowerCase();
        });
        return targetObject ? targetObject.fieldValue : targetObject;
    };

    function queryBuilder(table) {
        return 'SELECT * FROM ' + table;
    };

    function salesImporter(req, tasks) {
        var projectSchema = tasks[3];
        var customerSchema = tasks[4];
        var wTrackSchema = tasks[5];
        var invoiceSchema = tasks[7];
        var paymentSchema = tasks[8];
        var bonusTypeSchema = tasks[12];
        var payOutSchema = tasks[14];

        var ownerId = req.session ? req.session.uId : null;

        var customerCollection = customerSchema.collection;
        var projectCollection = projectSchema.collection;
        var wTrackCollection = wTrackSchema.collection;
        var paymentCollection = paymentSchema.collection;
        var bonusTypeCollection = bonusTypeSchema.collection;
        var payOutCollection = paymentSchema.collection;

        var ProjectSchema = projectCollection[projectCollection];
        var CustomerSchema = mongoose.Schemas[customerCollection];
        var DepartmentSchema = mongoose.Schemas['Department'];
        var EmployeeSchema = mongoose.Schemas['Employee'];
        var IndustrySchema = mongoose.Schemas['Industry'];
        var WorkflowSchema = mongoose.Schemas['workflow'];
        var WTrackSchema = mongoose.Schemas[wTrackCollection];
        var InvoiceSchema = mongoose.Schemas['wTrackInvoice'];
        var PaymentSchema = mongoose.Schemas['Payment'];
        var BonusTypeSchema = mongoose.Schemas[bonusTypeCollection];
        var PayOutSchema = mongoose.Schemas[payOutCollection];

        var Project = models.get(req.session.lastDb, projectCollection, ProjectSchema);
        var Customer = models.get(req.session.lastDb, customerCollection, CustomerSchema);
        var Department = models.get(req.session.lastDb, 'Department', DepartmentSchema);
        var Employee = models.get(req.session.lastDb, 'Employees', EmployeeSchema);
        var Industry = models.get(req.session.lastDb, 'Industry', IndustrySchema);
        var Workflow = models.get(req.session.lastDb, 'workflows', WorkflowSchema);
        var Wtrack = models.get(req.session.lastDb, wTrackCollection, WTrackSchema);
        var Invoice = models.get(req.session.lastDb, 'wTrackInvoice', InvoiceSchema);
        var Payment = models.get(req.session.lastDb, 'Payment', PaymentSchema);
        var BonusType = models.get(req.session.lastDb, bonusTypeCollection, BonusTypeSchema);
        var PayOut = models.get(req.session.lastDb, payOutCollection, PayOutSchema);

        function importPayOut(payOutSchema, seriesCb) {
            var query = queryBuilder(payOutSchema.table);
            var waterfallTasks;

            function getData(callback) {
                handler.importData(query, callback);
            }

            function saverPayOut(fetchedArray, callback) {
                var model;
                var mongooseFields = Object.keys(payOutSchema.aliases);

                async.eachLimit(fetchedArray, 100, function (fetchedPayOut, cb) {
                    var objectToSave = {};
                    var employeeQuery;
                    var bonusTypeQuery;
                    var key;
                    var msSqlKey;

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        key = mongooseFields[i];
                        msSqlKey = payOutSchema.aliases[key];

                        if (payOutSchema.defaultValues) {
                            for (var defKey in payOutSchema.defaultValues) {
                                objectToSave[defKey] = payOutSchema.defaultValues[defKey];
                            }
                        }

                        if (payOutSchema.comparator && msSqlKey in payOutSchema.comparator) {
                            fetchedPayOut[msSqlKey] = comparator(fetchedPayOut[msSqlKey], payOutSchema.comparator[msSqlKey]) || fetchedPayOut[msSqlKey];
                        }

                        objectToSave[key] = fetchedPayOut[msSqlKey];
                        objectToSave.createdBy = {
                            user: ownerId
                        };
                        objectToSave.editedBy = {
                            user: ownerId
                        }
                    }

                    if (fetchedPayOut) {

                        objectToSave.forSale = false;
                        objectToSave.bonus = true;

                        objectToSave.differenceAmount = fetchedPayOut['Amount'] - fetchedPayOut['Paid'];

                        if (fetchedPayOut['Status'] === 1) {
                            objectToSave.workflow = 'Paid';
                        } else {
                            objectToSave.workflow = 'Draft';
                        }

                        employeeQuery = {
                            ID: fetchedPayOut['EmployeeID']
                        };

                        bonusTypeQuery = {
                            ID: fetchedPayOut['BonusID']
                        };

                        function employeeFinder(callback) {
                            Employee.findOne(employeeQuery, {_id: 1}, function (err, employee) {
                                if (err) {
                                    return callback(err);
                                }
                                callback(null, employee);
                            });
                        }

                        function bonusTypeFinder(callback) {
                            BonusType.findOne(bonusTypeQuery, {_id: 1, name: 1}, function (err, bonus) {
                                if (err) {
                                    return callback(err);
                                }
                                callback(null, bonus);
                            });
                        }

                        async.parallel({
                            bonusTypeResult: bonusTypeFinder,
                            employeeResult: employeeFinder
                        }, function (err, result) {
                            if (result.bonusTypeResult && result.bonusTypeResult.name) {
                                objectToSave.paymentRef = result.bonusTypeResult.name;
                            }
                            if (result.employeeResult && result.employeeResult._id) {
                                objectToSave.supplier = result.employeeResult._id;
                            }

                            model = new PayOut(objectToSave);
                            model.save(function (err, rez) {
                                if (err) {
                                    console.error(err);
                                    return cb(err);
                                }
                                cb();
                            });
                        });
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                })
            }

            waterfallTasks = [getData, saverPayOut];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    return seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        }

        function payOutImporter(callback) {
            importPayOut(payOutSchema, callback);
        }

        function importBonusType(bonusTypeSchema, seriesCb) {
            var query = queryBuilder(bonusTypeSchema.table);
            var waterfallTasks;

            function getData(callback) {
                handler.importData(query, callback);
            }

            function saverBonusType(fetchedArray, callback) {
                var model;
                var mongooseFields = Object.keys(bonusTypeSchema.aliases);

                async.eachLimit(fetchedArray, 100, function (fetchedBonusType, cb) {
                    var objectToSave = {};

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        var key = mongooseFields[i];
                        var msSqlKey = bonusTypeSchema.aliases[key];

                        objectToSave[key] = fetchedBonusType[msSqlKey];
                    }

                    if (fetchedBonusType) {
                        model = new BonusType(objectToSave);
                        model.save(cb);
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                })
            }

            waterfallTasks = [getData, saverBonusType];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    return seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        }

        function bonusTypeImporter(callback) {
            importBonusType(bonusTypeSchema, callback);
        }

        function importCustomer(customerSchema, seriesCb) {
            var query = queryBuilder(customerSchema.table);
            var waterfallTasks;

            function getData(callback) {
                handler.importData(query, callback);
            }

            function saverCustomer(fetchedArray, callback) {
                var model;
                var mongooseFields = Object.keys(customerSchema.aliases);

                async.eachLimit(fetchedArray, 100, function (fetchedCustomer, cb) {
                    var objectToSave = {};
                    var industryQuery;

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        var key = mongooseFields[i];
                        var msSqlKey = customerSchema.aliases[key];
                        var _comparator = customerSchema.comparator;

                        if (_comparator && msSqlKey in _comparator) {
                            fetchedCustomer[msSqlKey] = comparator(fetchedCustomer[msSqlKey], _comparator[msSqlKey]) || fetchedCustomer[msSqlKey];
                        }

                        objectToSave[key] = fetchedCustomer[msSqlKey];
                        objectToSave.createdBy = {
                            user: ownerId
                        };
                        objectToSave.editedBy = {
                            user: ownerId
                        }
                    }

                    if (fetchedCustomer) {
                        industryQuery = {
                            ID: fetchedCustomer['Industry']
                        };
                        Industry.findOne(industryQuery, {_id: 1}, function (err, industry) {
                            if (err) {
                                return cb(err);
                            }

                            objectToSave['companyInfo.industry'] = industry ? industry._id : industry;

                            if (!objectToSave.type) {
                                objectToSave.type = objectToSave['companyInfo.size'] ? 'Company' : 'Person';
                            }

                            model = new Customer(objectToSave);
                            model.save(function (err, customer) {
                                if (err) {
                                    console.error(err);
                                    return cb(err);
                                }
                                cb();
                            });
                        });

                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                })
            }

            waterfallTasks = [getData, saverCustomer];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    return seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        }

        function customerImporter(callback) {
            importCustomer(customerSchema, callback);
        }

        function fetchWorkflow(query, callback) {
            query = query || {
                    wId: 'Projects'
                };

            var projectionObject = {
                status: 1,
                name: 1,
                _id: 1
            };

            Workflow.find(query, projectionObject, function (err, workflows) {
                if (err) {
                    return callback(err);
                }

                workflows = _.groupBy(workflows, 'status');

                callback(null, workflows);
            });
        };

        function importProject(projectShema, seriesCb) {
            var query = queryBuilder(projectShema.table);
            var waterfallTasks;

            function getData(callback) {
                handler.importData(query, callback);
            }

            function fetchWorkflows(fetchedArray, callback) {
                fetchWorkflow(null, function (err, workflows) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, workflows, fetchedArray);
                });
            };

            function saverProject(workflows, fetchedArray, callback) {
                var model;

                var mongooseFields = Object.keys(projectShema.aliases);

                async.eachLimit(fetchedArray, 100, function (fetchedProject, cb) {
                    var objectToSave = {};
                    var customerQuery;
                    var employeeQuery;

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        var key = mongooseFields[i];
                        var msSqlKey = projectShema.aliases[key];

                        if (msSqlKey in projectShema.comparator) {
                            fetchedProject[msSqlKey] = comparator(fetchedProject[msSqlKey], projectShema.comparator[msSqlKey]);
                        }

                        if (key === 'workflow') {
                            objectToSave[key] = {};
                            objectToSave[key]['_id'] = workflows[fetchedProject[msSqlKey]][0]._id;
                            objectToSave[key]['name'] = workflows[fetchedProject[msSqlKey]][0].name;
                        } else {
                            objectToSave[key] = fetchedProject[msSqlKey];
                        }
                        objectToSave.createdBy = {
                            user: ownerId
                        };
                        objectToSave.editedBy = {
                            user: ownerId
                        }
                    }

                    if (fetchedProject) {
                        employeeQuery = {
                            ID: fetchedProject['Assigned']
                        };
                        customerQuery = {
                            ID: fetchedProject['Company']
                        };

                        function customerFinder(callback) {
                            Customer.findOne(customerQuery, function (err, customer) {
                                if (err) {
                                    return callback(err);
                                }
                                callback(null, customer);
                            });
                        };

                        function employeeFinder(callback) {
                            Employee.findOne(employeeQuery, function (err, employee) {
                                if (err) {
                                    return callback(err);
                                }
                                callback(null, employee);
                            });
                        }

                        async.parallel({
                            customerResult: customerFinder,
                            employeeResult: employeeFinder
                        }, function (err, result) {
                            objectToSave.customer = {};
                            objectToSave.customer._id = result.customerResult ? result.customerResult._id : null;
                            objectToSave.customer.name = result.customerResult ? result.customerResult.name.first + ' ' + result.customerResult.name.last : null;
                            objectToSave.projectmanager = {};
                            objectToSave.projectmanager._id = result.employeeResult ? result.employeeResult._id : null;
                            objectToSave.projectmanager.name = result.employeeResult ? result.employeeResult.name.first + ' ' + result.employeeResult.name.last : null;

                            model = new Project(objectToSave);
                            model.save(function (err, project) {
                                if (err) {
                                    console.error(err);
                                    return cb(err);
                                }
                                cb();
                            });
                        });
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                })
            }

            waterfallTasks = [getData, fetchWorkflows, saverProject];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    return seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        };

        function projectImporter(callback) {
            importProject(projectSchema, callback);
        };

        function importWtrack(wTrackSchema, seriesCb) {
            var query = queryBuilder(wTrackSchema.table);
            var waterfallTasks;

            function getData(callback) {
                handler.importData(query, callback);
            }

            function saverWtrack(fetchedArray, callback) {
                var model;
                var mongooseFields = Object.keys(wTrackSchema.aliases);

                async.eachLimit(fetchedArray, 100, function (fetchedWtrack, cb) {
                    var objectToSave = {};

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        var key = mongooseFields[i];
                        var msSqlKey = wTrackSchema.aliases[key];
                        var _comparator = wTrackSchema.comparator;

                        var projectQuery;
                        var employeeQuery;
                        var departmentQuery;

                        if (_comparator && msSqlKey in _comparator) {
                            fetchedWtrack[msSqlKey] = comparator(fetchedWtrack[msSqlKey], _comparator[msSqlKey]) || fetchedWtrack[msSqlKey];
                        }

                        objectToSave[key] = fetchedWtrack[msSqlKey];
                        objectToSave.createdBy = {
                            user: ownerId
                        };
                        objectToSave.editedBy = {
                            user: ownerId
                        }
                    }

                    if (fetchedWtrack) {
                        departmentQuery = {
                            ID: fetchedWtrack['Department']
                        };

                        projectQuery = {
                            ID: fetchedWtrack['Project']
                        };

                        employeeQuery = {
                            ID: fetchedWtrack['Employee']
                        };

                        function departmentFinder(callback) {
                            Department
                                .findOne(departmentQuery, {
                                    _id: 1,
                                    name: 1
                                })
                                .lean()
                                .exec(function (err, department) {
                                    if (err) {
                                        return callback(err);
                                    }
                                    callback(null, department);
                                });
                        };

                        function projectFinder(callback) {
                            Project
                                .findOne(projectQuery)
                                .populate('projectmanager._id')
                                .populate('customer._id')
                                .populate('workflow._id')
                                .lean()
                                .exec(function (err, project) {
                                    if (err) {
                                        return callback(err);
                                    }
                                    callback(null, project);
                                });
                        };

                        function employeeFinder(callback) {
                            Employee.findOne(employeeQuery, {
                                _id: 1,
                                name: 1
                            })
                                .lean(true)
                                .exec(function (err, employee) {
                                    if (err) {
                                        return callback(err);
                                    }
                                    callback(null, employee);
                                });
                        };

                        async.parallel({
                            department: departmentFinder,
                            project: projectFinder,
                            employee: employeeFinder
                        }, function (err, result) {
                            objectToSave.dateByWeek = fetchedWtrack.Week + 100 * fetchedWtrack.Year;
                            objectToSave.dateByMonth = fetchedWtrack.Month + 100 * fetchedWtrack.Year;

                            if (result.department) {
                                objectToSave.department = {};
                                objectToSave.department._id = result.department._id || null;
                                objectToSave.department.name = result.department.name || '';
                            }
                            if (result.project) {
                                objectToSave.project = {};
                                objectToSave.project._id = result.project._id || null;
                                objectToSave.project.name = result.project.name || '';

                                if (result.project.projectmanager && result.project.projectmanager.name) {
                                    objectToSave.project.projectmanager = {
                                        _id: result.project.projectmanager._id,
                                        name: result.project.projectmanager.name.first + ' ' + result.project.projectmanager.name.last
                                    };
                                }

                                objectToSave.project.customer = {
                                    _id: result.project.customer ? result.project.customer._id : null,
                                    name: result.project.customer && result.project.customer.name ? result.project.customer.name.first + ' ' + result.project.customer.name.last : ''
                                };

                                objectToSave.project.workflow = {
                                    _id: result.project.workflow ? result.project.workflow._id : null,
                                    name: result.project.workflow ? result.project.workflow.name : '',
                                    status: result.project.workflow ? result.project.workflow.status : ''
                                };
                            }

                            if (result.employee) {
                                objectToSave.employee = {};
                                objectToSave.employee._id = result.employee._id || null;
                                objectToSave.employee.name = result.employee.name ? result.employee.name.first + ' ' + result.employee.name.last : '';
                            }

                            objectToSave.info = {
                                salePrice: fetchedWtrack['Revenue']
                            };

                            model = new Wtrack(objectToSave);
                            model.save(cb);
                        });
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                })
            }

            waterfallTasks = [getData, saverWtrack];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    return seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        };

        function wTrackImporter(callback) {
            importWtrack(wTrackSchema, callback);
        };

        function importInvoice(InvoiceSchema, callback) {
            var query = queryBuilder(invoiceSchema.table);

            async.waterfall([wTrackInvoiceImporter, groupByInvoice, getData, fetchWorkflows, saverInvoice], function (err, wTrackInvoices) {
                if (err) {
                    return callback(err);
                }
                console.dir(wTrackInvoices);
                callback(null, wTrackInvoices);
            });

            function getData(groupedInvoices, callback) {
                handler.importData(query, function (err, invoicecs) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, groupedInvoices, invoicecs);
                });
            }

            function saverInvoice(groupedInvoices, workflows, fetchedArray, callback) {
                var model;
                var mongooseFields = Object.keys(invoiceSchema.aliases);

                async.eachLimit(fetchedArray, 100, function (fetchedInvoice, cb) {
                    var objectToSave = {};

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        var key = mongooseFields[i];
                        var msSqlKey = invoiceSchema.aliases[key];
                        var _comparator = invoiceSchema.comparator;

                        var wTrackQueryQuery;
                        var projectQuery;
                        var invoiceAmmount = 0;
                        var invoicePaid = 0;
                        var balance = 0;
                        var paidByInvoice = 0;
                        var wTrackInvoice;

                        if (_comparator && msSqlKey in _comparator) {
                            fetchedInvoice[msSqlKey] = comparator(fetchedInvoice[msSqlKey], _comparator[msSqlKey]) || fetchedInvoice[msSqlKey];
                        }

                        if (key === 'workflow') {
                            objectToSave[key] = workflows[fetchedInvoice[msSqlKey]][0]._id;
                        } else {
                            objectToSave[key] = fetchedInvoice[msSqlKey];
                        }

                        objectToSave.createdBy = {
                            user: ownerId
                        };
                        objectToSave.editedBy = {
                            user: ownerId
                        }
                    }

                    if (fetchedInvoice) {

                        wTrackInvoice = groupedInvoices[fetchedInvoice['ID']];

                        paidByInvoice = fetchedInvoice.Paid;

                        for (var i = wTrackInvoice.length - 1; i >= 0; i--) {
                            invoiceAmmount += groupedInvoices[fetchedInvoice['ID']][i].Amount;
                            invoicePaid += groupedInvoices[fetchedInvoice['ID']][i].Paid;
                        }

                        balance = /*invoiceAmmount - invoicePaid*/(paidByInvoice > invoicePaid) ? invoicePaid - paidByInvoice :  invoiceAmmount - invoicePaid;

                        wTrackQueryQuery = {
                            ID: {$in: _.pluck(groupedInvoices[fetchedInvoice['ID']], 'wTrackID')}
                        };

                        projectQuery = {
                            ID: fetchedInvoice['Project']
                        };

                        if(fetchedInvoice['ID'] === 3364){
                            balance = 0;
                        }

                        function wTrackFinder(callback) {
                            Wtrack
                                .find(wTrackQueryQuery)
                                .lean()
                                .exec(function (err, wTracks) {
                                    if (err) {
                                        return callback(err);
                                    }
                                    callback(null, wTracks);
                                });
                        };

                        function projectFinder(callback) {
                            Project
                                .findOne(projectQuery)
                                .populate('projectmanager._id')
                                .populate('customer._id')
                                .lean()
                                .exec(function (err, project) {
                                    if (err) {
                                        return callback(err);
                                    }
                                    callback(null, project);
                                });
                        };

                        async.parallel({
                            wTrack: wTrackFinder,
                            project: projectFinder
                        }, function (err, result) {

                            objectToSave.paymentInfo = {
                                //total: invoiceAmmount,
                                balance: balance,
                                unTaxed: /*invoiceAmmount*/paidByInvoice,
                                taxes: 0
                            };

                            if (result.wTrack) {
                                objectToSave.products = [];
                                result.wTrack.forEach(function (wTrack) {
                                    var productObject = {};

                                    productObject.unitPrice = wTrack.revenue;
                                    productObject.product = wTrack._id;
                                    productObject.taxes = 0;
                                    productObject.subTotal = wTrack.amount;
                                    objectToSave.products.push(productObject);
                                });
                            }
                            if (result.project) {
                                objectToSave.supplier = result.project.customer ? {
                                    _id: result.project.customer._id,
                                    name: result.project.customer.name
                                } : {
                                    _id: null,
                                    name: ''
                                };

                                objectToSave.salesPerson = result.project.projectmanager ? {
                                    _id: result.project.projectmanager._id,
                                    name: result.project.projectmanager.name
                                } : {
                                    _id: null,
                                    name: ''
                                };

                                objectToSave.project = {
                                    _id: result.project._id,
                                    name: result.project.name
                                };
                            }


                            model = new Invoice(objectToSave);
                            model.save(function (err, invoice) {
                                if (err) {
                                    return cb(err);
                                }
                                cb();
                            });
                        });
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                })
            }

            function wTrackInvoiceImporter(cbForInvoiceImporter) {
                var query = queryBuilder('wTrackInvoice');

                handler.importData(query, cbForInvoiceImporter);
            };

            function groupByInvoice(wTrackInvoices, cbForInvoiceImporter) {
                var groupedResult = _.groupBy(wTrackInvoices, function (wTrackInvoice) {
                    return wTrackInvoice.InvoiceID;
                });

                cbForInvoiceImporter(null, groupedResult);
            };

            function fetchWorkflows(groupedInvoices, fetchedArray, callback) {
                fetchWorkflow({wId: 'Sales Invoice'}, function (err, workflows) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, groupedInvoices, workflows, fetchedArray);
                });
            };
        };

        function invoiceImporter(callback) {
            importInvoice(InvoiceSchema, callback);
        };

        function importPayment(paymentSchema, seriesCb) {
            var query = queryBuilder(paymentSchema.table);
            var waterfallTasks;

            function getData(callback) {
                handler.importData(query, callback);
            }

            function saverPayment(fetchedArray, callback) {
                var model;
                var mongooseFields = Object.keys(paymentSchema.aliases);

                async.eachLimit(fetchedArray, 100, function (fetchedPayment, cb) {
                    var objectToSave = {};

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        var key = mongooseFields[i];
                        var msSqlKey = paymentSchema.aliases[key];
                        var _comparator = paymentSchema.comparator;

                        var invoiceQuery;

                        if (_comparator && msSqlKey in _comparator) {
                            fetchedPayment[msSqlKey] = comparator(fetchedPayment[msSqlKey], _comparator[msSqlKey]) || fetchedPayment[msSqlKey];
                        }

                        if (key === 'paymentMethod') {
                            switch (fetchedPayment[msSqlKey]) {
                                case CONSTANTS.PAYONEER:
                                {
                                    objectToSave['paymentMethod'] = {
                                        _id: fetchedPayment[msSqlKey],
                                        name: 'Payoneer'
                                    };
                                }
                                    break;

                                case CONSTANTS.UKR_SIB_BANK:
                                {
                                    objectToSave['paymentMethod'] = {
                                        _id: fetchedPayment[msSqlKey],
                                        name: 'UkrSibBank'
                                    };
                                }
                                    break;

                                case CONSTANTS.PRIMARY:
                                {
                                    objectToSave['paymentMethod'] = {
                                        _id: fetchedPayment[msSqlKey],
                                        name: 'Primary'
                                    };
                                }
                                    break;
                            }
                        } else {
                            objectToSave[key] = fetchedPayment[msSqlKey];
                        }

                        objectToSave.createdBy = {
                            user: ownerId
                        };
                        objectToSave.editedBy = {
                            user: ownerId
                        }
                    }

                    if (fetchedPayment) {
                        invoiceQuery = {
                            ID: fetchedPayment['Invoice']
                        };

                        function invoiceFinder(callback) {
                            Invoice
                                .findOne(invoiceQuery)
                                .populate('project._id')
                                .populate('salesPerson._id', '_id name')
                                .exec(function (err, invoice) {
                                    if (err) {
                                        return callback(err);
                                    }
                                    Customer.populate(invoice.project, {
                                        path: 'customer._id',
                                        options: {lean: true}
                                    }, function (err, customer) {
                                        if (err) {
                                            return callback(err);
                                        }

                                        callback(null, invoice);
                                    });
                                });
                        };

                        async.parallel({
                            invoce: invoiceFinder
                        }, function (err, result) {
                            var invoiceId;
                            var _invoice = result.invoce;

                            if (_invoice) {
                                invoiceId = _invoice._id;
                                objectToSave.invoice = {
                                    _id: invoiceId,
                                    name: _invoice.name,
                                    assigned: {
                                        _id: _invoice.salesPerson ? _invoice.salesPerson._id : '',
                                        name: _invoice.salesPerson && _invoice.salesPerson.name ? _invoice.salesPerson.name.first + ' ' + _invoice.salesPerson.name.last : ''
                                    }
                                };
                                objectToSave.supplier = {
                                    _id: _invoice.project.customer ? _invoice.project.customer._id : null,
                                    fullName: _invoice.project.customer && _invoice.project.customer.name ? _invoice.project.customer.name : ''
                                };

                                objectToSave.differenceAmount = _invoice.paymentInfo.balance / 100;
                            }

                            model = new Payment(objectToSave);
                            model.save(function (err, result) {
                                if (err) {
                                    return cb(err);
                                }

                                Invoice.update({_id: invoiceId}, {$addToSet: {payments: result._id}}, function (err, invoice) {
                                    if (err) {
                                        return cb(err);
                                    }
                                    cb(null, result);
                                });
                            });
                        });
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                });
            }

            waterfallTasks = [getData, saverPayment];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    return seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        };

        function paymentImporter(callback) {
            importPayment(paymentSchema, callback);
        };

        return [bonusTypeImporter, customerImporter, projectImporter, wTrackImporter, invoiceImporter, paymentImporter, payOutImporter];
    };

    function projectsImporter(req, tasks) {
        var bonusSchema = tasks[13];

        var projectsCollection = bonusSchema.collection;

        var ProjectsSchema = mongoose.Schemas[projectsCollection];
        var EmployeeSchema = mongoose.Schemas['Employees'];
        var BonusTypeSchema = mongoose.Schemas['bonusType'];
        var wTrackSchema = mongoose.Schemas['wTrack'];

        var Project = models.get(req.session.lastDb, projectsCollection, ProjectsSchema);
        var Employee = models.get(req.session.lastDb, 'Employees', EmployeeSchema);
        var BonusType = models.get(req.session.lastDb, 'bonusType', BonusTypeSchema);
        var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);

        function importBonus(BonusSchema, seriesCb) {
            var query = queryBuilder(BonusSchema.table);
            var waterfallTasks;

            function getData(callback) {
                handler.importData(query, callback);
            }

            function saverBonus(fetchedArray, callback) {
                async.eachLimit(fetchedArray, 100, function (fetchedBonus, cb) {
                    if (fetchedBonus) {

                        var projectQuery = {
                            ID: fetchedBonus['Project']
                        };

                        var employeeQuery = {
                            ID: fetchedBonus['Employee']
                        };

                        var bonusTypeQuery = {
                            ID: fetchedBonus['Type']
                        };

                        function projectFinder(callback) {
                            Project.findOne(projectQuery, {_id: 1, StartDate: 1, EndDate: 1}, function (err, project) {
                                if (err) {
                                    return callback(err);
                                }
                                callback(null, project);
                            });
                        };

                        function employeFinder(callback) {
                            Employee.findOne(employeeQuery, {_id: 1}, function (err, employee) {
                                if (err) {
                                    return callback(err);
                                }
                                callback(null, employee);
                            });
                        };

                        function bonusTypeFinder(callback) {
                            BonusType.findOne(bonusTypeQuery, {_id: 1}, function (err, bonusType) {
                                if (err) {
                                    return callback(err);
                                }
                                callback(null, bonusType);
                            });
                        };

                        async.parallel({
                            project: projectFinder,
                            employee: employeFinder,
                            bonusType: bonusTypeFinder
                        }, function (err, result) {
                            var projectId = result.project ? result.project._id : null;
                            var employeeId = result.employee ? result.employee._id : null;
                            var bonusId = result.bonusType ? result.bonusType._id : null;
                            var startDate = fetchedBonus['StartDate'] || (result.project ? result.project.StartDate : null);
                            var endDate = fetchedBonus['EndDate'] || (result.project ? result.project.EndDate : null);

                            var startWeek = moment(startDate).isoWeek();
                            var startYear = moment(startDate).isoWeekYear();
                            var endWeek = moment(endDate).isoWeek();
                            var endYear = moment(endDate).isoWeekYear();

                            var query = {
                                _id: projectId
                            };

                            var updatQuery = {
                                $push: {
                                    "bonus": {
                                        employeeId: employeeId,
                                        bonusId: bonusId,
                                        startDate: startDate,
                                        startWeek: startWeek,
                                        startYear: startYear,
                                        endWeek: endWeek,
                                        endYear: endYear,
                                        endDate: endDate
                                    }
                                }
                            };

                            var settings = {
                                safe: true,
                                upsert: true,
                                new: true
                            };

                            function projectUpdater(cb) {
                                Project.findByIdAndUpdate(query, updatQuery, settings, function (err, model) {
                                    if (err) {
                                        return cb(err);
                                    }

                                    cb(null, model);
                                });
                            }

                            function wTrackUpdater(cb){
                                WTrack.findOneAndUpdate({'project._id': projectId}, {$push: {
                                    "project.bonus": {
                                        employeeId: employeeId,
                                        bonusId: bonusId,
                                        startDate: startDate,
                                        startWeek: startWeek,
                                        startYear: startYear,
                                        endWeek: endWeek,
                                        endYear: endYear,
                                        endDate: endDate
                                    }
                                }}, settings, function (err, model) {
                                    if (err) {
                                        return cb(err);
                                    }

                                    cb(null, model);
                                });
                            }

                            async.parallel([projectUpdater, wTrackUpdater], cb);

                        });
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                });
            }

            waterfallTasks = [getData, saverBonus];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    return seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        };

        function bonusImporter(callback) {
            importBonus(bonusSchema, callback);
        };

        return [bonusImporter];
    };

    function hrImporter(req, tasks) {
        var departmentShema = tasks[0];
        var jobPositionShema = tasks[1];
        var employeeSchema = tasks[2];
        var salaryShema = tasks[6];
        var holidayShema = tasks[9];
        var vacationShema = tasks[10];
        var monthHoursSchema = tasks[11];

        var ownerId = req.session ? req.session.uId : null;

        var jobPositionCollection = jobPositionShema.collection;
        var departmentCollection = departmentShema.collection;
        var employeeCollection = employeeSchema.collection;
        var salaryCollection = salaryShema.collection;
        var holidayCollection = holidayShema.collection;
        var vacationCollection = vacationShema.collection;
        var monthHoursCollection = monthHoursSchema.collection;

        var JobPositionSchema = mongoose.Schemas[jobPositionCollection];
        var DepartmentSchema = mongoose.Schemas[departmentCollection];
        var EmployeeSchema = mongoose.Schemas[employeeCollection];
        var SalarySchema = mongoose.Schemas[salaryCollection];
        var HolidaySchema = mongoose.Schemas[holidayCollection];
        var VacationSchema = mongoose.Schemas[vacationCollection];
        var WorkflowSchema = mongoose.Schemas['workflow'];
        var MonthHoursSchema = mongoose.Schemas[monthHoursCollection];

        var JobPosition = models.get(req.session.lastDb, jobPositionCollection, JobPositionSchema);
        var Department = models.get(req.session.lastDb, departmentCollection, DepartmentSchema);
        var Employee = models.get(req.session.lastDb, employeeCollection, EmployeeSchema);
        var Salary = models.get(req.session.lastDb, salaryCollection, SalarySchema);
        var Holiday = models.get(req.session.lastDb, holidayCollection, HolidaySchema);
        var Vacation = models.get(req.session.lastDb, vacationCollection, VacationSchema);
        var Workflow = models.get(req.session.lastDb, 'workflows', WorkflowSchema);
        var MonthHours = models.get(req.session.lastDb, monthHoursCollection, MonthHoursSchema);

        function importMonthHours(monthHoursSchema, seriesCb) {
            var query = queryBuilder(monthHoursSchema.table);
            var waterfallTasks;

            function getData(callback) {
                handler.importData(query, callback);
            }

            function saverMonthHours(fetchedArray, callback) {
                var model;
                var mongooseFields = Object.keys(monthHoursSchema.aliases);

                async.eachLimit(fetchedArray, 100, function (fetchedMonthHours, cb) {
                    var objectToSave = {};

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        var key = mongooseFields[i];
                        var msSqlKey = monthHoursSchema.aliases[key];

                        objectToSave[key] = fetchedMonthHours[msSqlKey];

                    }

                    if (fetchedMonthHours) {
                        model = new MonthHours(objectToSave);
                        model.save(cb);
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                })
            }

            waterfallTasks = [getData, saverMonthHours];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        }

        function monthHoursImporter(callback) {
            importMonthHours(monthHoursSchema, callback);
        }

        function importDepartment(departmentShema, seriesCb) {
            var query = queryBuilder(departmentShema.table);
            var waterfallTasks;

            function getData(callback) {
                handler.importData(query, callback);
            }

            function saverDepartment(fetchedArray, callback) {
                var model;
                var mongooseFields = Object.keys(departmentShema.aliases);

                async.eachLimit(fetchedArray, 100, function (fetchedDepartment, cb) {
                    var objectToSave = {};

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        var key = mongooseFields[i];
                        var msSqlKey = departmentShema.aliases[key];

                        objectToSave[key] = fetchedDepartment[msSqlKey];
                        objectToSave.createdBy = {
                            user: ownerId
                        };
                        objectToSave.editedBy = {
                            user: ownerId
                        }
                    }

                    if (fetchedDepartment) {
                        model = new Department(objectToSave);
                        model.save(cb);
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                })
            }

            waterfallTasks = [getData, saverDepartment];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    return seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        }

        function departmentImporter(callback) {
            importDepartment(departmentShema, callback);
        }

        function importJobPosition(jobPositionShema, seriesCb) {
            var query = queryBuilder(jobPositionShema.table);
            var waterfallTasks;

            function getData(callback) {
                handler.importData(query, callback);
            }

            function saverJobPosition(fetchedArray, callback) {
                var model;
                var mongooseFields = Object.keys(jobPositionShema.aliases);

                async.eachLimit(fetchedArray, 100, function (fetchedJobPosition, cb) {
                    var objectToSave = {};
                    var departmentQuery;

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        var key = mongooseFields[i];
                        var msSqlKey = jobPositionShema.aliases[key];

                        if (jobPositionShema.comparator && msSqlKey in jobPositionShema.comparator) {
                            fetchedJobPosition[msSqlKey] = comparator(fetchedJobPosition[msSqlKey], jobPositionShema.comparator[msSqlKey]);
                        }

                        objectToSave[key] = fetchedJobPosition[msSqlKey];
                        objectToSave.createdBy = {
                            user: ownerId
                        };
                        objectToSave.editedBy = {
                            user: ownerId
                        }
                    }

                    if (fetchedJobPosition) {
                        departmentQuery = {
                            ID: fetchedJobPosition['Department']
                        };
                        Department.findOne(departmentQuery, {_id: 1}, function (err, department) {
                            if (err) {
                                return cb(err);
                            }

                            objectToSave.department = department._id;

                            model = new JobPosition(objectToSave);
                            model.save(cb);
                        });
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                })
            }

            waterfallTasks = [getData, saverJobPosition];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        }

        function jobPositionImporter(callback) {
            importJobPosition(jobPositionShema, callback);
        }

        function importEmployee(employeeSchema, workflow, seriesCb) {
            var query = queryBuilder(employeeSchema.table);
            var waterfallTasks;

            workflow = workflow ? workflow._id : null;

            function getData(hiredResult, firedResult, lastFire, callback) {

                handler.importData(query, function (err, fetchedArray) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, hiredResult, firedResult, lastFire, fetchedArray);
                });
            }

            function saverEmployee(hiredResult, firedResult, lastFire, fetchedArray, callback) {
                var model;
                var mongooseFields = Object.keys(employeeSchema.aliases);

                async.eachLimit(fetchedArray, 100, function (fetchedEmployee, cb) {
                    var objectToSave = {};
                    var departmentQuery;
                    var jobPositionQuery;
                    var key;
                    var msSqlKey;

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        key = mongooseFields[i];
                        msSqlKey = employeeSchema.aliases[key];

                        if (employeeSchema.defaultValues) {
                            for (var defKey in employeeSchema.defaultValues) {
                                objectToSave[defKey] = employeeSchema.defaultValues[defKey];
                            }
                        }

                        if (employeeSchema.comparator && msSqlKey in employeeSchema.comparator) {
                            fetchedEmployee[msSqlKey] = comparator(fetchedEmployee[msSqlKey], employeeSchema.comparator[msSqlKey]) || fetchedEmployee[msSqlKey];
                        }

                        if (key === 'dateBirth') {
                            objectToSave.age = getAge(fetchedEmployee[msSqlKey]);
                        }

                        if (key === 'isEmployee') {
                            if (fetchedEmployee[msSqlKey] === false) {
                                objectToSave.workflow = workflow;
                            }
                        }

                        objectToSave[key] = fetchedEmployee[msSqlKey];

                        if (key === 'personalEmail') {
                            if (fetchedEmployee[msSqlKey] === 'null') {
                                delete objectToSave[key];
                            }
                        }

                        objectToSave.createdBy = {
                            user: ownerId
                        };
                        objectToSave.editedBy = {
                            user: ownerId
                        };
                        objectToSave.lastFire = lastFire[fetchedEmployee['ID']];
                    }

                    if (fetchedEmployee) {

                        if (hiredResult[fetchedEmployee['ID']]) {
                            objectToSave.hire = hiredResult[fetchedEmployee['ID']];
                        }
                        if (firedResult[fetchedEmployee['ID']]) {
                            objectToSave.fire = firedResult[fetchedEmployee['ID']];
                        }

                        departmentQuery = {
                            ID: fetchedEmployee['Department']
                        };

                        jobPositionQuery = {
                            ID: fetchedEmployee['JobPosition']
                        };

                        function departmentFinder(callback) {
                            Department.findOne(departmentQuery, {_id: 1}, function (err, department) {
                                if (err) {
                                    return callback(err);
                                }
                                callback(null, department);
                            });
                        }

                        function jobPositionFinder(callback) {
                            JobPosition.findOne(jobPositionQuery, {_id: 1}, function (err, jobPosition) {
                                if (err) {
                                    return callback(err);
                                }
                                callback(null, jobPosition);
                            });
                        }

                        async.parallel({
                            department: departmentFinder,
                            jobPosition: jobPositionFinder
                        }, function (err, result) {
                            objectToSave.department;
                           if(result.department){
                               objectToSave.department = {
                                   _id: result.department._id,
                                   name: result.department.name
                               }
                           } else {
                               objectToSave.department = {
                                   _id: null,
                                   name:''
                               }
                           }

                            if(result.jobPosition){
                               objectToSave.jobPosition = {
                                   _id: result.jobPosition._id,
                                   name: result.jobPosition.name
                               }
                           } else {
                               objectToSave.jobPosition = {
                                   _id: null,
                                   name:''
                               }
                           }
                            objectToSave.jobPosition = result.jobPosition ? result.jobPosition._id : null;

                            model = new Employee(objectToSave);
                            model.save(cb);
                        });
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                })
            }

            function hiredFiredImporter(callback) {
                var query = queryBuilder('HiredFired');

                handler.importData(query, callback);
            };

            function groupByID(hiredFired, callback) {
                var groupedResult = _.groupBy(hiredFired, function (hiredFired) {
                    return hiredFired.Employee;
                });

                var hiredResult = [];
                var firedResult = [];
                var hire;
                var fire;
                var length;

                var hiredImported;
                var firedImported;
                var hiredParsedArr;
                var firedParsedArr;
                var lastFire = {};
                var _fire;
                var dateString;

                for (var key in groupedResult) {

                    hiredResult[key] = [];
                    firedResult[key] = [];
                    length = groupedResult[key].length;

                    for (var j = 0; j < length; j++) {
                        if (groupedResult[key][j]) {
                            hiredImported = groupedResult[key][j].Date_Hire;
                            firedImported = groupedResult[key][j].Date_Fire;

                            if (hiredImported) {
                                hiredParsedArr = hiredImported.split('/');
                                hire = new Date(hiredParsedArr[2] + '-' + hiredParsedArr[1] + '-' + hiredParsedArr[0]);
                                hiredResult[key].push(hire);
                            }
                            if (firedImported) {
                                firedParsedArr = firedImported.split('/');
                                dateString = firedParsedArr[2] + '-' + firedParsedArr[1] + '-' + firedParsedArr[0];
                                fire = new Date(dateString);
                                _fire = moment(dateString).year() * 100 + moment(dateString).isoWeek();

                                if (!lastFire[key]) {
                                    lastFire[key] = _fire;
                                } else if (lastFire[key] < _fire) {
                                    lastFire[key] = _fire;
                                }

                                firedResult[key].push(fire);
                            }
                        }
                    }
                }

                callback(null, hiredResult, firedResult, lastFire);
            };

            waterfallTasks = [hiredFiredImporter, groupByID, getData, saverEmployee];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        }

        function employeeImporter(callback) {
            Workflow
                .findOne({
                    wId: 'Applications',
                    status: "Cancelled"
                }, {_id: 1})
                .sort({sequence: -1})
                .exec(function (err, workflow) {
                    if (err) {
                        return callback(err);
                    }

                    importEmployee(employeeSchema, workflow, callback);
                });
        }

        function importSalary(salaryShema, seriesCb) {
            var query = queryBuilder(salaryShema.table);
            var waterfallTasks;

            function getData(callback) {
                handler.importData(query, callback);
            }

            function saverSalary(fetchedArray, callback) {
                var model;
                var mongooseFields = Object.keys(salaryShema.aliases);

                async.eachLimit(fetchedArray, 100, function (fetchedSalary, cb) {
                    var objectToSave = {};
                    var employeeQuery;
                    var key;
                    var msSqlKey;

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        key = mongooseFields[i];
                        msSqlKey = salaryShema.aliases[key];

                        if (salaryShema.defaultValues) {
                            for (var defKey in salaryShema.defaultValues) {
                                objectToSave[defKey] = salaryShema.defaultValues[defKey];
                            }
                        }

                        if (salaryShema.comparator && msSqlKey in salaryShema.comparator) {
                            fetchedSalary[msSqlKey] = comparator(fetchedSalary[msSqlKey], salaryShema.comparator[msSqlKey]) || fetchedSalary[msSqlKey];
                        }

                        objectToSave[key] = fetchedSalary[msSqlKey];
                        objectToSave.createdBy = {
                            user: ownerId
                        };
                        objectToSave.editedBy = {
                            user: ownerId
                        }
                    }

                    if (fetchedSalary) {
                        objectToSave.diff = {};

                        objectToSave.diff.onCash = fetchedSalary['PaidOnCash'] - fetchedSalary['CalcOnCash'];
                        objectToSave.diff.onCard = fetchedSalary['PaidOnCard'] - fetchedSalary['CalcOnCard'];
                        objectToSave.diff.total = objectToSave.diff.onCash + objectToSave.diff.onCard;

                        employeeQuery = {
                            ID: fetchedSalary['Employee']
                        };

                        Employee.findOne(employeeQuery, {_id: 1, name: 1}, function (err, employee) {
                            if (err) {
                                return cb(err);
                            }

                            if (employee) {
                                objectToSave.employee = {};
                                objectToSave.employee._id = employee._id || null;
                                objectToSave.employee.name = employee.name ? employee.name.first + ' ' + employee.name.last : '';

                                model = new Salary(objectToSave);
                                model.save(cb);
                            }
                        });
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                })
            }

            waterfallTasks = [getData, saverSalary];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        }

        function salaryImporter(callback) {
            importSalary(salaryShema, callback);
        }

        function importHoliday(holidayShema, seriesCb) {
            var query = queryBuilder(holidayShema.table);
            var waterfallTasks;

            function getData(callback) {
                handler.importData(query, callback);
            }

            function saverHoliday(fetchedArray, callback) {
                var model;
                var mongooseFields = Object.keys(holidayShema.aliases);

                async.eachLimit(fetchedArray, 100, function (fetchedHoliday, cb) {
                    var objectToSave = {};
                    var key;
                    var msSqlKey;

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        key = mongooseFields[i];
                        msSqlKey = holidayShema.aliases[key];

                        if (holidayShema.defaultValues) {
                            for (var defKey in holidayShema.defaultValues) {
                                objectToSave[defKey] = holidayShema.defaultValues[defKey];
                            }
                        }

                        if (holidayShema.comparator && msSqlKey in holidayShema.comparator) {
                            fetchedHoliday[msSqlKey] = comparator(fetchedHoliday[msSqlKey], holidayShema.comparator[msSqlKey]) || fetchedHoliday[msSqlKey];
                        }

                        objectToSave[key] = fetchedHoliday[msSqlKey];
                        objectToSave.createdBy = {
                            user: ownerId
                        };
                        objectToSave.editedBy = {
                            user: ownerId
                        }
                    }

                    if (fetchedHoliday) {
                        objectToSave.year = moment(fetchedHoliday.Date).year();
                        objectToSave.week = moment(fetchedHoliday.Date).isoWeek();
                        model = new Holiday(objectToSave);
                        model.save(cb);
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                })
            }

            waterfallTasks = [getData, saverHoliday];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        }

        function holidayImporter(callback) {
            importHoliday(holidayShema, callback);
        }

        function importVacation(vacationShema, seriesCb) {
            var query = queryBuilder(vacationShema.table);
            var waterfallTasks;

            function getData(callback) {
                handler.importData(query, callback);
            }

            function saverVacation(fetchedArray, callback) {
                var model;
                var mongooseFields = Object.keys(vacationShema.aliases);

                async.eachSeries(fetchedArray, function (fetchedVacation, cb) {
                    var objectToSave = {};
                    var employeeQuery;
                    var key;
                    var msSqlKey;

                    for (var i = mongooseFields.length - 1; i >= 0; i--) {
                        key = mongooseFields[i];
                        msSqlKey = vacationShema.aliases[key];

                        if (vacationShema.defaultValues) {
                            for (var defKey in vacationShema.defaultValues) {
                                objectToSave[defKey] = vacationShema.defaultValues[defKey];
                            }
                        }

                        if (vacationShema.comparator && msSqlKey in vacationShema.comparator) {
                            fetchedVacation[msSqlKey] = comparator(fetchedVacation[msSqlKey], vacationShema.comparator[msSqlKey]) || fetchedVacation[msSqlKey];
                        }

                        objectToSave[key] = fetchedVacation[msSqlKey];
                        objectToSave.createdBy = {
                            user: ownerId
                        };
                        objectToSave.editedBy = {
                            user: ownerId
                        }
                    }

                    if (fetchedVacation) {
                        var date = new Date(fetchedVacation['StartDate']);
                        var startDay = new Date(fetchedVacation.StartDate).getDate();
                        var endDay = new Date(fetchedVacation.EndDate).getDate();
                        var daysCount;

                        objectToSave.month = date.getMonth() + 1;
                        objectToSave.year = date.getFullYear();
                        daysCount = new Date(objectToSave.year, objectToSave.month, 0).getDate();

                        employeeQuery = {
                            ID: fetchedVacation['Employee']
                        };

                        Employee.findOne(employeeQuery,
                            {_id: 1, name: 1, department: 1})
                            .populate('department._id')
                            .lean()
                            .exec(function (err, employee) {
                                if (err) {
                                    return cb(err);
                                }

                                if (employee) {
                                    objectToSave.employee = {};
                                    objectToSave.employee._id = employee._id || null;
                                    objectToSave.employee.name = employee.name ? employee.name.first + ' ' + employee.name.last : '';

                                    if (employee.department && employee.department.name) {
                                        objectToSave.department = {}
                                        objectToSave.department._id = employee.department._id;
                                        objectToSave.department.name = employee.department.name;
                                    }
                                    Vacation.findOne({
                                        month: objectToSave.month,
                                        year: objectToSave.year,
                                        'employee._id': objectToSave.employee._id
                                    })
                                        .exec(function (err, result) {
                                            var dateValue = moment([objectToSave.year, objectToSave.month - 1]);
                                            var weekKey;
                                            var dayNumber;

                                            if (err) {
                                                cb(err)
                                            }
                                            if (result) {
                                                result.vacations = result.vacations ? result.vacations : {};

                                                for (var i = endDay; i >= startDay; i--) {

                                                    dateValue.date(i);
                                                    weekKey = objectToSave.year * 100 + moment(date).isoWeek();

                                                    dayNumber = moment(dateValue).day();

                                                    if (dayNumber !== 0 && dayNumber !== 6) {
                                                        result.vacations[weekKey] ? result.vacations[weekKey] += 1 : result.vacations[weekKey] = 1;
                                                    }

                                                    result.vacArray[i - 1] = fetchedVacation.AbsenceType;
                                                }

                                                Vacation.update({_id: result._id}, {
                                                    $set: {
                                                        vacArray: result.vacArray,
                                                        vacations: result.vacations
                                                    }
                                                }, cb);
                                            } else {
                                                objectToSave.vacations = {};
                                                objectToSave.vacArray = new Array(daysCount);

                                                for (var i = endDay; i >= startDay; i--) {

                                                    dateValue.date(i);
                                                    weekKey = objectToSave.year * 100 + moment(date).isoWeek();

                                                    dayNumber = moment(dateValue).day();

                                                    if (dayNumber !== 0 && dayNumber !== 6) {
                                                        objectToSave.vacations[weekKey] ? objectToSave.vacations[weekKey] += 1 : objectToSave.vacations[weekKey] = 1;
                                                    }

                                                    objectToSave.vacArray[i - 1] = fetchedVacation.AbsenceType;
                                                }

                                                model = new Vacation(objectToSave);
                                                model.save(cb);
                                            }
                                        });
                                }
                            });
                    }
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, 'Completed');
                })
            }

            waterfallTasks = [getData, saverVacation];

            async.waterfall(waterfallTasks, function (err, result) {
                if (err) {
                    seriesCb(err);
                }

                seriesCb(null, 'Complete')
            });
        }

        function vacationImporter(callback) {
            importVacation(vacationShema, callback);
        }

        return [monthHoursImporter, departmentImporter, jobPositionImporter, employeeImporter, salaryImporter, holidayImporter, vacationImporter];
    }

    router.post('/', function (req, res, next) {
        var hrTasks = hrImporter(req, tasks);
        var salesTasks = salesImporter(req, tasks);
        var projectsTasks = projectsImporter(req, tasks);
        var tempArr = hrTasks.concat(salesTasks);
        var seriesTasks = tempArr.concat(projectsTasks);

        async.series(seriesTasks, function (err) {
            if (err) {
                return next(err);
            }

            res.status(200).send('Imported success');
        });

    });

    return router;
};
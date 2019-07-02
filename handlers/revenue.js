var async = require('async');
var _ = require('lodash');
var mongoose = require('mongoose');
var objectId = mongoose.Types.ObjectId;
var CONSTANTS = require('../constants/mainConstants');
var FilterMapper = require('../helpers/filterMapper');
var filterMapper = new FilterMapper();

var moment = require('../public/js/libs/moment/moment');

var wTrack = function (models) {
    'use strict';

    var wTrackSchema = mongoose.Schemas.wTrack;
    var ProjectSchema = mongoose.Schemas.Project;
    var BonusTypeSchema = mongoose.Schemas.bonusType;
    var monthHoursSchema = mongoose.Schemas.MonthHours;
    var vacationSchema = mongoose.Schemas.Vacation;
    var holidaysSchema = mongoose.Schemas.Holiday;
    var employeeSchema = mongoose.Schemas.Employee;
    var HoursCashesSchema = mongoose.Schemas.HoursCashes;
    var paymentSchema = mongoose.Schemas.Payment;
    var invoiceSchema = mongoose.Schemas.wTrackInvoice;
    var journalEntry = mongoose.Schemas.journalEntry;
    var tempJournalEntry = mongoose.Schemas.tempJournalEntry;
    var newInvoiceSchema = mongoose.Schemas.Invoices;

    var constForView = [
        'iOS',
        'Android',
        'Web',
        'WP',
        'QA',
        'Design',
        'PM'
    ];
    var constForDep = [
        'PM',
        'Design',
        'QA',
        'WP',
        'Web',
        'Android',
        'iOS'
    ];

    this.bySales = function (req, res, next) {
        var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);
        var options = req.query;
        var startWeek = parseInt(options.week);
        var startYear = parseInt(options.year);
        var endWeek;
        var endYear;
        var startDate;
        var endDate;
        var match;
        var groupBy;

        if (startWeek >= 40) {
            endWeek = parseInt(startWeek) + 14 - 53;
            endYear = parseInt(startYear) + 1;
        } else {
            endWeek = parseInt(startWeek) + 14;
            endYear = parseInt(startYear);
        }

        startDate = startYear * 100 + startWeek;
        endDate = endYear * 100 + endWeek;

        match = {
            $and: [
                {'project._id': {$exists: true}},
                {'project._id': {$ne: null}},
                {dateByWeek: {$gte: startDate, $lt: endDate}}
            ]
        };

        groupBy = {
            _id: {
                employee: '$project.projectmanager',
                year    : '$year',
                week    : '$week'
            },

            // revenue: {$sum: {$multiply: ["$rate", {$add: ["$1", "$2", "$3", "$4", "$5", "$6", "$7"]}]}}
            revenue: {$sum: '$revenue'}
        };

        WTrack.aggregate([{
            $lookup: {
                from        : 'Project',
                localField  : 'project',
                foreignField: '_id', as: 'project'
            }
        }, {
            $project: {
                project   : {$arrayElemAt: ["$project", 0]},
                year      : 1,
                week      : 1,
                revenue   : {
                    $divide: ['$revenue', 100]
                },
                dateByWeek: 1
            }
        }, {
            $lookup: {
                from        : 'Employees',
                localField  : 'project.projectmanager',
                foreignField: '_id', as: 'employee'
            }
        }, {
            $project: {
                project   : 1,
                year      : 1,
                week      : 1,
                employee  : {$arrayElemAt: ["$employee", 0]},
                revenue   : 1,
                dateByWeek: 1
            }
        }, {
            $match: match
        }, {
            $group: groupBy
        }, {
            $project: {
                year    : "$_id.year",
                week    : "$_id.week",
                employee: "$_id.employee",
                revenue : 1,
                _id     : 0
            }
        }, {
            $group: {
                _id  : "$employee",
                root : {$push: "$$ROOT"},
                total: {$sum: "$revenue"}
            }
        }], function (err, response) {
            if (err) {
                return next(err);
            }

            res.status(200).send(response);
        });
    };

    this.byDepartment = function (req, res, next) {
        var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);

        var options = req.query;
        var startWeek = parseInt(options.week);
        var startYear = parseInt(options.year);
        var endWeek;
        var endYear;
        var startDate;
        var endDate;
        var match;
        var groupBy;

        if (startWeek >= 40) {
            endWeek = parseInt(startWeek) + 14 - 53;
            endYear = parseInt(startYear) + 1;
        } else {
            endWeek = parseInt(startWeek) + 14;
            endYear = parseInt(startYear);
        }

        //startDate = dateCalc(startWeek, startYear);
        //endDate = dateCalc(endWeek, endYear);
        startDate = startYear * 100 + startWeek;
        endDate = endYear * 100 + endWeek;

        match = {
            dateByWeek: {
                $gte: startDate,
                $lt : endDate
            }
        };

        groupBy = {
            _id    : {
                department: '$department.name',
                _id       : '$department._id',
                year      : '$year',
                week      : '$week'
            },
            //revenue: {$sum: {$multiply: ["$rate", {$add: ["$1", "$2", "$3", "$4", "$5", "$6", "$7"]}]}}
            revenue: {
                $sum: '$revenue'
            }
        };

        WTrack.aggregate([{
            $lookup: {
                from        : 'Department',
                localField  : 'department',
                foreignField: '_id', as: 'department'
            }
        }, {
            $project: {
                department: {$arrayElemAt: ["$department", 0]},
                year      : 1,
                week      : 1,
                revenue   : {
                    $divide: ['$revenue', 100]
                },
                dateByWeek: 1
            }
        }, {
            $match: match
        }, {
            $group: groupBy
        }, {
            $project: {
                year      : "$_id.year",
                week      : "$_id.week",
                department: "$_id.department",
                revenue   : 1,
                _id       : 0
            }
        }, {
            $group: {
                _id  : "$department",
                root : {$push: "$$ROOT"},
                total: {$sum: "$revenue"}
            }
        }, {
            $sort: {_id: 1}
        }], function (err, response) {
            if (err) {
                return next(err);
            }

            res.status(200).send(response);
        });
    };

    this.paidwtrack = function (req, res, next) {
        var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);
        var options = req.query;
        var startMonth = parseInt(options.month, 10) || 8;
        var startYear = parseInt(options.year, 10) || 2014;
        var endMonth = parseInt(options.endMonth, 10) || 7;
        var endYear = parseInt(options.endYear, 10) || 2015;
        var startDate;
        var endDate;
        var match;
        var groupBy;

        startDate = parseInt(options.startDate, 10) || (startYear * 100 + startMonth);
        endDate = parseInt(options.endDate, 10) || (endYear * 100 + endMonth);

        match = {
            $and: [
                {'project._id': {$exists: true}},
                {'project._id': {$ne: null}},
                {dateByMonth: {$gte: startDate, $lte: endDate}}
            ]
        };

        groupBy = {
            _id        : {
                assigned: '$project.projectmanager',
                month   : '$month',
                year    : '$year'
            },
            revenue    : {$sum: '$amount'},
            dateByMonth: {$addToSet: '$dateByMonth'}
        };

        WTrack.aggregate([{
            $lookup: {
                from        : 'Project',
                localField  : 'project',
                foreignField: '_id', as: 'project'
            }
        }, {
            $project: {
                project    : {$arrayElemAt: ["$project", 0]},
                month      : 1,
                year       : 1,
                revenue    : 1,
                dateByMonth: 1,
                amount     : 1
            }
        }, {
            $match: match
        }, {
            $group: groupBy
        }, {
            $project: {
                year       : "$_id.year",
                month      : "$_id.month",
                employee   : "$_id.assigned",
                revenue    : 1,
                dateByMonth: 1,
                _id        : 0
            }
        }, {
            $group: {
                _id  : "$employee",
                root : {$push: "$$ROOT"},
                total: {$sum: "$revenue"}
            }
        }, {
            $sort: {
                dateByMonth: -1
            }
        }], function (err, response) {
            if (err) {
                return next(err);
            }

            res.status(200).send(response);
        });
    };

    this.unpaidwtrack = function (req, res, next) {
        var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);

        var options = req.query;
        var startMonth = parseInt(options.month) || 8;
        var startYear = parseInt(options.year) || 2014;
        var endMonth = parseInt(options.endMonth) || 7;
        var endYear = parseInt(options.endYear) || 2015;
        var startDate;
        var endDate;
        var match;
        var groupBy;

        startDate = parseInt(options.startDate) || (startYear * 100 + startMonth);
        endDate = parseInt(options.endDate) || (endYear * 100 + endMonth);

        match = {
            $and: [
                {'project._id': {$exists: true}},
                {'project._id': {$ne: null}},
                {'project.workflow.status': {$ne: 'Cancelled'}},
                {dateByMonth: {$gte: startDate, $lte: endDate}}
            ]
        };

        groupBy = {
            _id        : {
                assigned: '$project.projectmanager',
                month   : '$month',
                year    : '$year'
            },
            revenue    : {$sum: '$revenue'},
            amount     : {$sum: '$amount'},
            dateByMonth: {$addToSet: '$dateByMonth'}
        };

        WTrack.aggregate([{
            $lookup: {
                from        : 'Project',
                localField  : 'project',
                foreignField: '_id', as: 'project'
            }
        }, {
            $project: {
                project    : {$arrayElemAt: ["$project", 0]},
                month      : 1,
                year       : 1,
                revenue    : 1,
                dateByMonth: 1,
                amount     : 1
            }
        }, {
            $lookup: {
                from        : 'workflows',
                localField  : 'project.workflow',
                foreignField: '_id', as: 'project.workflow'
            }
        }, {
            $project: {
                'project._id'           : 1,
                'project.projectmanager': 1,
                'project.workflow'      : {$arrayElemAt: ["$project.workflow", 0]},
                month                   : 1,
                year                    : 1,
                revenue                 : 1,
                dateByMonth             : 1,
                amount                  : 1
            }
        }, {
            $match: match
        }, {
            $project: {
                'project._id'           : 1,
                'project.workflow'      : 1,
                'project.projectmanager': 1,
                month                   : 1,
                year                    : 1,
                revenue                 : 1,
                amount                  : 1,
                diff                    : {$subtract: ["$revenue", "$amount"]},
                dateByMonth             : 1,
                _id                     : 1
            }
        }, {
            $match: {diff: {$gte: 0}}
        }, {
            $group: groupBy
        }, {
            $project: {
                year       : "$_id.year",
                month      : "$_id.month",
                employee   : "$_id.assigned",
                revenue    : {$subtract: ["$revenue", "$amount"]},
                dateByMonth: 1,
                _id        : 0
            }
        }, {
            $match: {
                revenue: {$gt: 0}
            }
        }, {
            $group: {
                _id  : "$employee",
                root : {$push: "$$ROOT"},
                total: {$sum: "$revenue"}
            }
        }, {
            $sort: {
                dateByMonth: -1
            }
        }], function (err, response) {
            if (err) {
                return next(err);
            }

            console.log('======================================================');
            console.log(startDate);
            console.log('======================================================');

            res.status(200).send(response);
        });
    };

    this.cancelledWtrack = function (req, res, next) {
        var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);
        var options = req.query;
        var startMonth = parseInt(options.month) || 8;
        var startYear = parseInt(options.year) || 2014;
        var endMonth = parseInt(options.endMonth) || 7;
        var endYear = parseInt(options.endYear) || 2015;
        var startDate;
        var endDate;
        var match;
        var groupBy;

        if (!access) {
            return res.status(403).send();
        }

        startDate = parseInt(options.startDate) || (startYear * 100 + startMonth);
        endDate = parseInt(options.endDate) || (endYear * 100 + endMonth);

        match = {
            $and: [
                {'project._id': {$exists: true}},
                {'project._id': {$ne: null}},
                {'project.workflow.status': 'Cancelled'},
                {dateByMonth: {$gte: startDate, $lte: endDate}}
            ]
        };

        groupBy = {
            _id        : {
                assigned: '$project.projectmanager',
                month   : '$month',
                year    : '$year'
            },
            revenue    : {$sum: '$revenue'},
            amount     : {$sum: '$amount'},
            dateByMonth: {$addToSet: '$dateByMonth'}
        };

        WTrack.aggregate([{
            $lookup: {
                from        : 'Project',
                localField  : 'project',
                foreignField: '_id', as: 'project'
            }
        }, {
            $project: {
                project    : {$arrayElemAt: ["$project", 0]},
                month      : 1,
                year       : 1,
                revenue    : 1,
                dateByMonth: 1,
                amount     : 1
            }
        }, {
            $lookup: {
                from        : 'workflows',
                localField  : 'project.workflow',
                foreignField: '_id', as: 'project.workflow'
            }
        }, {
            $project: {
                'project._id'           : 1,
                'project.projectmanager': 1,
                'project.workflow'      : {$arrayElemAt: ["$project.workflow", 0]},
                month                   : 1,
                year                    : 1,
                revenue                 : 1,
                dateByMonth             : 1,
                amount                  : 1
            }
        }, {
            $match: match
        }, {
            $project: {
                project    : 1,
                month      : 1,
                year       : 1,
                revenue    : 1,
                amount     : 1,
                diff       : {$subtract: ["$revenue", "$amount"]},
                dateByMonth: 1,
                _id        : 1
            }
        }, {
            $match: {diff: {$gte: 0}}
        }, {
            $group: groupBy
        }, {
            $project: {
                year       : "$_id.year",
                month      : "$_id.month",
                employee   : "$_id.assigned",
                revenue    : {$subtract: ["$revenue", "$amount"]},
                dateByMonth: 1,
                _id        : 0
            }
        }, {
            $match: {
                revenue: {$gt: 0}
            }
        }, {
            $group: {
                _id  : "$employee",
                root : {$push: "$$ROOT"},
                total: {$sum: "$revenue"}
            }
        }, {
            $sort: {
                dateByMonth: -1
            }
        }], function (err, response) {
            if (err) {
                return next(err);
            }

            res.status(200).send(response);
        });
    };

    this.projectBySales = function (req, res, next) {
        var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);
        var options = req.query;
        var startMonth = parseInt(options.month) || 8;
        var startYear = parseInt(options.year) || 2014;
        var endMonth = parseInt(options.endMonth) || 7;
        var endYear = parseInt(options.endYear) || 2015;
        var startDate;
        var endDate;
        var match;
        var groupBy;

        if (!access) {
            return res.status(403).send();
        }

        startDate = parseInt(options.startDate) || (startYear * 100 + startMonth);
        endDate = parseInt(options.endDate) || (endYear * 100 + endMonth);

        match = {
            $and: [
                {'project._id': {$exists: true}},
                {'project._id': {$ne: null}},
                {dateByMonth: {$gte: startDate, $lte: endDate}}
            ]
        };

        groupBy = {
            _id        : {
                project : '$project._id',
                assigned: '$project.projectmanager',
                month   : '$month',
                year    : '$year'
            },
            count      : {$sum: 1},
            dateByMonth: {$addToSet: '$dateByMonth'}
        };

        WTrack.aggregate([{
            $lookup: {
                from        : 'Project',
                localField  : 'project',
                foreignField: '_id', as: 'project'
            }
        }, {
            $project: {
                project    : {$arrayElemAt: ["$project", 0]},
                month      : 1,
                year       : 1,
                dateByMonth: 1
            }
        }, {
            $match: match
        }, {
            $group: groupBy
        }, {
            $group: {
                _id         : {
                    assigned: '$_id.assigned',
                    month   : '$_id.month',
                    year    : '$_id.year'
                },
                projectCount: {$sum: 1}
            }
        }, {
            $project: {
                year        : "$_id.year",
                month       : "$_id.month",
                employee    : "$_id.assigned",
                dateByMonth : 1,
                projectCount: 1,
                _id         : 0
            }
        }, {
            $group: {
                _id  : '$employee',
                root : {$push: '$$ROOT'},
                total: {$sum: '$projectCount'}
            }
        }, {
            $sort: {
                month: -1
            }
        }], function (err, response) {
            if (err) {
                return next(err);
            }

            res.status(200).send(response);
        });
    };

    this.employeeBySales = function (req, res, next) {
        var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);
        var options = req.query;
        var startMonth = parseInt(options.month) || 8;
        var startYear = parseInt(options.year) || 2014;
        var endMonth = parseInt(options.endMonth) || 7;
        var endYear = parseInt(options.endYear) || 2015;
        var startDate;
        var endDate;
        var match;
        var groupBy;

        startDate = parseInt(options.startDate, 10) || (startYear * 100 + startMonth);
        endDate = parseInt(options.endDate, 10) || (endYear * 100 + endMonth);

        match = {
            $and: [
                {'project._id': {$exists: true}},
                {'project._id': {$ne: null}},
                {dateByMonth: {$gte: startDate, $lte: endDate}}
            ]
        };

        groupBy = {
            _id        : {
                project : '$project._id',
                assigned: '$project.projectmanager',
                employee: '$employee',
                month   : '$month',
                year    : '$year'
            },
            dateByMonth: {$addToSet: '$dateByMonth'}
        };

        WTrack.aggregate([{
            $lookup: {
                from        : 'Project',
                localField  : 'project',
                foreignField: '_id', as: 'project'
            }
        }, {
            $project: {
                project    : {$arrayElemAt: ["$project", 0]},
                month      : 1,
                year       : 1,
                dateByMonth: 1,
                employee   : 1
            }
        }, {
            $match: match
        }, {
            $group: groupBy
        }, {
            $group: {
                _id         : {
                    assigned: '$_id.assigned',
                    employee: '$employee',
                    month   : '$_id.month',
                    year    : '$_id.year'
                },
                projectCount: {$sum: 1}
            }
        }, {
            $project: {
                year        : "$_id.year",
                month       : "$_id.month",
                employee    : "$_id.assigned",
                dateByMonth : 1,
                projectCount: 1,
                _id         : 0
            }
        }, {
            $group: {
                _id  : '$employee',
                root : {$push: '$$ROOT'},
                total: {$sum: '$projectCount'}
            }
        }, {
            $sort: {
                month: -1
            }
        }], function (err, response) {
            if (err) {
                return next(err);
            }

            res.status(200).send(response);
        });
    };

    this.hoursByDep = function (req, res, next) {
        var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);
        var options = req.query;
        var startWeek = parseInt(options.week);
        var startYear = parseInt(options.year);
        var endWeek;
        var endYear;
        var startDate;
        var endDate;
        var match;
        var groupBy;
        var sortResult = [];

        if (startWeek >= 40) {
            endWeek = parseInt(startWeek) + 14 - 53;
            endYear = parseInt(startYear) + 1;
        } else {
            endWeek = parseInt(startWeek) + 14;
            endYear = parseInt(startYear);
        }

        startDate = startYear * 100 + startWeek;
        endDate = endYear * 100 + endWeek;

        match = {
            dateByWeek: {
                $gte: startDate,
                $lt : endDate
            }
        };

        groupBy = {
            _id : {
                department: '$department.name',
                _id       : '$department._id',
                year      : '$year',
                week      : '$week'
            },
            sold: {$sum: '$worked'}
        };

        WTrack.aggregate([{
            $lookup: {
                from        : 'Department',
                localField  : 'department',
                foreignField: '_id', as: 'department'
            }
        }, {
            $project: {
                department: {$arrayElemAt: ["$department", 0]},
                month     : 1,
                year      : 1,
                dateByWeek: 1
            }
        }, {
            $match: match
        }, {
            $group: groupBy
        }, {
            $project: {
                year      : "$_id.year",
                week      : "$_id.week",
                department: "$_id.department",
                sold      : 1,
                _id       : 0
            }
        }, {
            $group: {
                _id      : '$department',
                root     : {$push: '$$ROOT'},
                totalSold: {$sum: '$sold'}
            }
        }, {
            $sort: {_id: 1}
        }], function (err, response) {
            if (err) {
                return next(err);
            }

            constForDep.forEach(function (dep) {
                response.forEach(function (depart) {
                    if (dep === depart._id) {
                        sortResult.push(depart);
                    }
                });
            });

            res.status(200).send(sortResult);
        });
    };

    this.allBonusBySales = function (req, res, next) {
        var JournalEntry = models.get(req.session.lastDb, 'journalEntry', journalEntry);
        var projectionContent = req.params.byContent || 'salesManager';

        projectionContent = projectionContent.toUpperCase();

        var options = req.query;
        var _dateMoment = moment();
        var _endDateMoment;
        var startDate = options.startDate;
        var endDate = options.endDate;
        var salesManagers = objectId(CONSTANTS[projectionContent]);
        var salesManagersMatch = {
            'salesPersons.projectPositionId': salesManagers
        };
        var match;

        if (!startDate && !endDate) {
            _endDateMoment = moment(_dateMoment).subtract(1, 'years');
            startDate = _dateMoment.startOf('month').hours(0).minutes(0);
            endDate = _endDateMoment.endOf('month').hours(23).minutes(59);
        } else {
            startDate = moment(new Date(startDate)).startOf('day');
            endDate = moment(new Date(endDate)).endOf('day');
        }

        startDate = startDate.toDate();
        endDate = endDate.toDate();

        salesManagersMatch.$or = [{
            'salesPersons.startDate': null,
            'salesPersons.endDate'  : null
        }, {
            'salesPersons.startDate': {$lte: endDate},
            'salesPersons.endDate'  : null
        }, {
            'salesPersons.startDate': null,
            'salesPersons.endDate'  : {$gte: startDate}
        }, {
            'salesPersons.startDate': {$lte: endDate},
            'salesPersons.endDate'  : {$gte: startDate}
        }];

        match = {
            credit                : {
                $exists: true,
                $ne    : 0
            },
            'sourceDocument.model': 'Invoice',
            // journal               : objectId('56f2a96f58dfeeac4be1582a'),
            journal               : objectId('565ef6ba270f53d02ee71d65'),
            date                  : {
                $lte: endDate,
                $gte: startDate
            }
        };

        JournalEntry.aggregate([{
            $match: match
        }, {
            $lookup: {
                from        : 'Invoice',
                localField  : 'sourceDocument._id',
                foreignField: '_id',
                as          : 'invoice'
            }
        }, {
            $project: {
                credit : 1,
                date   : 1,
                project: 1,
                invoice: {$arrayElemAt: ['$invoice', 0]}
            }
        }, {
            $project: {
                credit   : 1,
                date     : 1,
                project  : '$invoice.project',
                invoiceId: '$invoice._id',
                products : '$invoice.products'
            }
        }, {
            $unwind: {
                path                      : '$products',
                preserveNullAndEmptyArrays: true
            }
        }, {
            $lookup: {
                from        : 'journalentries',
                localField  : 'products.jobs',
                foreignField: 'sourceDocument._id',
                as          : 'jobFinished'
            }
        }, {
            $unwind: {
                path                      : '$jobFinished',
                preserveNullAndEmptyArrays: true
            }
        }, {
            $match: {
                'jobFinished.journal': objectId('56f2a96f58dfeeac4be1582a'),
                'jobFinished.credit' : {
                    $exists: true,
                    $ne    : 0
                }
            }
        }, {
            $group: {
                _id    : '$invoiceId',
                project: {$first: '$project'},
                revenue: {$first: '$credit'},
                date   : {$first: '$date'},
                cost   : {$sum: '$jobFinished.credit'}
            }
        }, {
            $unwind: {
                path                      : '$invoice.products',
                preserveNullAndEmptyArrays: true
            }
        }, {
            $lookup: {
                from        : 'projectMembers',
                localField  : 'project',
                foreignField: 'projectId',
                as          : 'salesPersons'
            }
        }, {
            $unwind: {
                path                      : '$salesPersons',
                preserveNullAndEmptyArrays: true
            }
        }, {
            $match: salesManagersMatch
        }, {
            $project: {
                revenueSum: '$revenue',
                credit    : '$cost',
                year      : {$year: '$date'},
                month     : {$month: '$date'},
                week      : {$week: '$date'},
                date      : 1,

                salesPersons: {
                    _id      : '$salesPersons.employeeId',
                    startDate: '$salesPersons.startDate',
                    endDate  : '$salesPersons.endDate',
                    bonusId  : '$salesPersons.bonusId'
                },

                profit: {$subtract: ['$revenue', '$cost']}
            }
        }, {
            $project: {
                salesPersons: 1,
                revenueSum  : 1,
                profit      : 1,
                credit      : 1,
                date        : 1,
                dateByMonth : {$add: [{$multiply: ['$year', 100]}, '$month']},
                dateByWeek  : {$add: [{$multiply: ['$year', 100]}, '$week']},

                isValid: {
                    $or: [{
                        $and: [{
                            $eq: ['$salesPersons.startDate', null]
                        }, {
                            $eq: ['$salesPersons.endDate', null]
                        }]
                    }, {
                        $and: [{
                            $lte: ['$salesPersons.startDate', '$date']
                        }, {
                            $eq: ['$salesPersons.endDate', null]
                        }]
                    }, {
                        $and: [{
                            $eq: ['$salesPersons.startDate', null]
                        }, {
                            $gte: ['$salesPersons.endDate', '$date']
                        }]
                    }, {
                        $and: [{
                            $lte: ['$salesPersons.startDate', '$date']
                        }, {
                            $gte: ['$salesPersons.endDate', '$date']
                        }]
                    }]
                }
            }
        }, {
            $match: {
                isValid: true
            }
        }, {
            $lookup: {
                from        : 'bonusType',
                localField  : 'salesPersons.bonusId',
                foreignField: '_id',
                as          : 'salesPersonsBonus'
            }
        }, {
            $project: {
                salesPersonsBonus: {$arrayElemAt: ['$salesPersonsBonus', 0]},
                salesPersons     : 1,
                revenueSum       : 1,
                profit           : 1,
                date             : 1,
                dateByMonth      : 1,
                dateByWeek       : 1
            }
        }, {
            $lookup: {
                from        : 'Employees',
                localField  : 'salesPersons._id',
                foreignField: '_id',
                as          : 'salesPersons'
            }
        }, {
            $project: {
                salesPersons     : {$arrayElemAt: ['$salesPersons', 0]},
                salesPersonsBonus: 1,
                profit           : 1,
                date             : 1,
                dateByMonth      : 1,
                dateByWeek       : 1
            }
        }, {
            $project: {
                salesPersons: {
                    _id : '$salesPersons._id',
                    name: {$concat: ['$salesPersons.name.first', ' ', '$salesPersons.name.last']}
                },

                salesPersonsBonus: 1,
                profit           : {$multiply: ['$profit', '$salesPersonsBonus.value', 0.01]},
                date             : 1,
                dateByMonth      : 1,
                dateByWeek       : 1
            }
        }, {
            $group: {
                _id        : null,
                totalProfit: {$sum: '$profit'},
                root       : {$push: '$$ROOT'},

                salesArray: {
                    $addToSet: {
                        _id : '$salesPersons._id',
                        name: '$salesPersons.name'
                    }
                }
            }
        }, {
            $unwind: '$root'
        }, {
            $project: {
                _id         : 0,
                salesArray  : 1,
                totalProfit : 1,
                salesPersons: '$root.salesPersons._id',
                profit      : '$root.profit',
                dateByMonth : '$root.dateByMonth',
                dateByWeek  : '$root.dateByWeek'
            }
        }, {
            $group: {
                _id          : '$dateByMonth', // todo change dinamicly
                profitByMonth: {$sum: '$profit'},
                root         : {$push: '$$ROOT'},
                salesArray   : {$first: '$salesArray'},
                totalProfit  : {$first: '$totalProfit'}
            }
        }, {
            $unwind: '$root'
        }, {
            $project: {
                _id          : 0,
                salesPerson  : '$root.salesPersons',
                dateByMonth  : '$root.dateByMonth',
                dateByWeek   : '$root.dateByWeek',
                profit       : '$root.profit',
                profitByMonth: 1,
                totalProfit  : 1,
                salesArray   : 1
            }
        }, {
            $group: {
                _id               : {
                    date       : '$dateByMonth',
                    salesPerson: '$salesPerson'
                },
                profitBySales     : {$sum: '$profit'},
                profitByMonth     : {$first: '$profitByMonth'},
                totalProfitBySales: {$first: '$totalProfitBySales'},
                salesArray        : {$first: '$salesArray'},
                totalProfit       : {$first: '$totalProfit'},
                root              : {$push: '$$ROOT'}
            }
        }, {
            $group: {
                _id               : '$_id.salesPerson',
                totalProfitBySales: {$sum: '$profitBySales'},
                root              : {$push: '$$ROOT'}
            }
        }, {
            $unwind: '$root'
        }, {
            $group: {
                _id               : '$root._id',
                profitBySales     : {$first: '$root.profitBySales'},
                profitByMonth     : {$first: '$root.profitByMonth'},
                totalProfitBySales: {$first: '$totalProfitBySales'},
                salesArray        : {$first: '$root.salesArray'},
                totalProfit       : {$first: '$root.totalProfit'}
            }
        }, {
            $group: {
                _id: '$_id.date',

                profitBySales: {
                    $addToSet: {
                        salesPerson  : '$_id.salesPerson',
                        profitBySales: '$profitBySales'
                    }
                },

                profitByMonth     : {$first: '$profitByMonth'},
                salesArray        : {$first: '$salesArray'},
                totalProfitBySales: {$first: '$totalProfitBySales'},
                totalProfit       : {$first: '$totalProfit'}
            }
        }, {
            $project: {
                date              : '$_id',
                totalProfit       : 1,
                totalProfitBySales: 1,
                salesArray        : 1,
                profitBySales     : 1,
                profitByMonth     : 1,
                _id               : 0
            }
        }]).exec(function (err, response) {
            var sales;

            if (err) {
                return next(err);
            }

            sales = response[0] ? response[0].salesArray : [];
            response = _.sortBy(response, 'date');

            res.status(200).send({sales: sales, data: response});
        });
    };

    this.uncalcBonus = function (req, res, next) {
        var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);
        var Project = models.get(req.session.lastDb, 'Project', ProjectSchema);
        var Employee = models.get(req.session.lastDb, 'Employees', employeeSchema);
        var BonusType = models.get(req.session.lastDb, 'bonusType', BonusTypeSchema);

        var options = req.query;
        var startMonth = parseInt(options.month) || 8;
        var startYear = parseInt(options.year) || 2014;
        var endMonth = parseInt(options.endMonth) || 7;
        var endYear = parseInt(options.endYear) || 2015;
        var startDateByWeek;
        var startDate;
        var endDateByWeek;
        var endDate;
        var waterfallTasks;
        var projectIds;

        var startMomentDate = moment().isoWeekYear(startYear).month(startMonth - 1);
        var endMomentDate = moment().isoWeekYear(endYear).month(endMonth - 1);

        var startWeek = startMomentDate.isoWeek();
        var endWeek = endMomentDate.isoWeek();

        startDate = startMomentDate.date(1).toDate();
        endDate = endMomentDate.date(31).toDate();

        startDateByWeek = parseInt(options.startDate) || (startYear * 100 + startMonth);
        endDateByWeek = parseInt(options.endDate) || (endYear * 100 + endMonth);

        var idForProjects = function (callback) {
            Project.aggregate([{
                $project: {
                    _id       : 1,
                    bonus     : 1,
                    bonusCount: {$size: '$bonus'}
                }
            }, {
                $match: {
                    $and: [{
                        bonusCount: {$gt: 0}
                    }, {
                        $or: [{
                            $or: [{
                                'bonus.startDate': null
                            }, {
                                'bonus.endDate': null
                            }]
                        }, {
                            $or: [{
                                'bonus.startDate': {$gte: startDate}
                            }, {
                                'bonus.endDate': {$lte: endDate}
                            }]
                        }]
                    }]
                }
            }, {
                $project: {
                    _id: 1
                }
            }], function (err, response) {
                if (err) {
                    return callback(err);
                }

                response = _.pluck(response, '_id');

                callback(null, response);
            });
        };

        function getWTracksByProjects(_ids, callback) {
            var queryObject = {};

            projectIds = _ids;

            queryObject['$and'] = [
                {'dateByMonth': {'$gte': startDateByWeek}},
                {'dateByMonth': {'$lte': endDateByWeek}},
                {'project': {'$in': projectIds}},
                {'isPaid': false}
            ];

            WTrack.aggregate([
                {
                    $match: queryObject
                }, {
                    $lookup: {
                        from        : 'Project',
                        localField  : 'project',
                        foreignField: '_id', as: 'project'
                    }
                }, {
                    $project: {
                        project    : {$arrayElemAt: ["$project", 0]},
                        dateByMonth: 1,
                        revenue    : 1,
                        cost       : 1
                    }
                }, {
                    $group: {
                        _id    : {
                            name       : '$project.name',
                            _id        : '$project._id',
                            dateByMonth: '$dateByMonth'
                        },
                        ids    : {$addToSet: '$project._id'},
                        revenue: {$sum: {$subtract: ['$revenue', '$cost']}}
                    }
                }, {
                    $project: {
                        name       : '$_id.name',
                        _id        : '$_id._id',
                        dateByMonth: '$_id.dateByMonth',
                        revenue    : 1
                    }
                }, {
                    $group: {
                        _id : '$dateByMonth',
                        root: {$addToSet: '$$ROOT'}
                    }
                }, {
                    $sort: {
                        _id: 1
                    }
                }], function (err, result) {

                if (err) {
                    return callback(err);
                }

                callback(null, result);
            });
        };

        function getProjectsByIds(wTracks, callback) {
            //var _ids = _.pluck(wTracks, 'project._id');

            Project.aggregate([
                {
                    $match: {
                        _id: {'$in': projectIds}
                    }
                },
                {
                    $unwind: '$bonus'
                },
                {
                    $group: {
                        _id     : {
                            employeeId: '$bonus.employeeId',
                            bonusId   : '$bonus.bonusId'
                        },
                        projects: {
                            $addToSet: {
                                _id : '$_id',
                                name: '$name'
                            }
                        }

                    }
                }, {
                    $project: {
                        employee: '$_id.employeeId',
                        bonus   : '$_id.bonusId',
                        projects: 1,
                        _id     : 0
                    }
                }, {
                    $group: {
                        _id : '$employee',
                        root: {$push: '$$ROOT'}
                    }
                }
            ], function (err, projects) {
                if (err) {
                    return callback(err)
                }

                Employee.populate(projects, {
                    path   : '_id',
                    match  : {'department': '55b92ace21e4b7c40f000014'},
                    select : '_id name',
                    options: {
                        lean: true
                    }
                }, function (err, employees) {
                    if (err) {
                        return callback(err);

                    }

                    projects = _.filter(projects, function (employee) {
                        if (employee._id) {
                            return employee;
                        }
                    });

                    BonusType.populate(projects, {
                        path   : 'root.bonus',
                        select : '_id name value',
                        options: {
                            lean: true
                        }
                    }, function (err, types) {
                        if (err) {
                            return callback(err);

                        }

                        callback(null, {wTracks: wTracks, projects: projects});
                    });
                });

            });
        };

        function getBonuses(wTracks, callback) {
            var _ids = _.pluck(wTracks, 'project._id');

            Project.aggregate([
                {
                    $match: {
                        _id: {'$in': _ids}
                    }
                },
                {
                    $unwind: '$bonus'
                },
                {
                    $group: {
                        _id      : {employeeId: '$bonus.employeeId', bonusId: '$bonus.bonusId'},
                        dateArray: {
                            $push: {
                                startDate: '$bonus.startDate',
                                endDate  : '$bonus.endDate',
                                projectId: '$_id'
                            }
                        }

                    }
                }
            ], callback);
        };

        waterfallTasks = [idForProjects, getWTracksByProjects, getProjectsByIds];

        async.waterfall(waterfallTasks, function (err, result) {
            if (err) {
                return next(err);
            }

            result = resultGenerator(result);

            res.status(200).send(result);
        });

        function resultGenerator(projectsWetrackObject) {
            var employees = [];
            var groupedEmployees = projectsWetrackObject.projects;
            var groupedWtracks = projectsWetrackObject.wTracks;
            var employee;
            var _employee;
            var dateStr;
            var groupedEmployee;
            var totalByBonus;
            var bonusObject;

            //iterate over grouped result of projects with bonus by Employee
            for (var i = groupedEmployees.length;
                i--;) {
                totalByBonus = 0;

                groupedEmployee = groupedEmployees[i];
                _employee = groupedEmployee._id;
                employee = {
                    _id  : _employee._id,
                    name : _employee.name.first + ' ' + _employee.name.last,
                    total: 0
                };
                //iterate over grouped result of wTrack by date and projects
                for (var j = groupedWtracks.length;
                    j--;) {
                    dateStr = groupedWtracks[j]._id;
                    /*employee[dateStr] = [];*/
                    bonusObject = {
                        total: 0
                    };
                    for (var m = groupedEmployee.root.length;
                        m--;) {
                        /*bonusObject = {
                         total: 0
                         };*/
                        totalByBonus = 0;

                        for (var k = groupedWtracks[j].root.length;
                            k--;) {

                            for (var l = groupedEmployee.root[m].projects.length;
                                l--;) {
                                if (groupedWtracks[j].root[k]._id.toString() === groupedEmployee.root[m].projects[l]._id.toString()) {
                                    if (groupedEmployee.root[m].bonus) {
                                        totalByBonus += (groupedEmployee.root[m].bonus.value * groupedWtracks[j].root[k].revenue / 100) / 100;
                                    }
                                }
                            }

                        }
                        if (groupedEmployee.root[m].bonus) {
                            bonusObject[groupedEmployee.root[m].bonus.name] = totalByBonus;
                        }
                        bonusObject.total += totalByBonus;
                        bonusObject.total = parseFloat(bonusObject.total.toFixed(2));
                        /*employee[dateStr].push(bonusObject);*/
                    }
                    employee.total += bonusObject.total;
                    employee.total = parseFloat(employee.total.toFixed(2));
                    employee[dateStr] = bonusObject;
                }

                employees.push(employee);
            }

            return employees;
        }
    };

    this.calcBonus = function (req, res, next) {
        var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);
        var Project = models.get(req.session.lastDb, 'Project', ProjectSchema);
        var Employee = models.get(req.session.lastDb, 'Employees', employeeSchema);
        var BonusType = models.get(req.session.lastDb, 'bonusType', BonusTypeSchema);

        var options = req.query;
        var startMonth = parseInt(options.month) || 8;
        var startYear = parseInt(options.year) || 2014;
        var endMonth = parseInt(options.endMonth) || 7;
        var endYear = parseInt(options.endYear) || 2015;
        var startDateByWeek;
        var startDate;
        var endDateByWeek;
        var endDate;
        var waterfallTasks;
        var projectIds;

        var startMomentDate = moment().isoWeekYear(startYear).month(startMonth - 1);
        var endMomentDate = moment().isoWeekYear(endYear).month(endMonth - 1);

        var startWeek = startMomentDate.isoWeek();
        var endWeek = endMomentDate.isoWeek();

        startDate = startMomentDate.date(1).toDate();
        endDate = endMomentDate.date(31).toDate();

        startDateByWeek = parseInt(options.startDate) || (startYear * 100 + startMonth);
        endDateByWeek = parseInt(options.endDate) || (endYear * 100 + endMonth);

        var idForProjects = function (callback) {
            Project.aggregate([{
                $project: {
                    _id       : 1,
                    bonus     : 1,
                    bonusCount: {$size: '$bonus'}
                }
            }, {
                $match: {
                    $and: [{
                        bonusCount: {$gt: 0}
                    }, {
                        $or: [{
                            $or: [{
                                'bonus.startDate': null
                            }, {
                                'bonus.endDate': null
                            }]
                        }, {
                            $or: [{
                                'bonus.startDate': {$gte: startDate}
                            }, {
                                'bonus.endDate': {$lte: endDate}
                            }]
                        }]
                    }]
                }
            }, {
                $project: {
                    _id: 1
                }
            }], function (err, response) {
                if (err) {
                    return callback(err);
                }

                response = _.pluck(response, '_id');

                callback(null, response);
            });
        };

        function getWTracksByProjects(_ids, callback) {
            var queryObject = {};

            projectIds = _ids;

            queryObject['$and'] = [
                {'dateByMonth': {'$gte': startDateByWeek}},
                {'dateByMonth': {'$lte': endDateByWeek}},
                {'project': {'$in': projectIds}},
                {'isPaid': true}
            ];

            WTrack.aggregate([
                {
                    $match: queryObject
                }, {
                    $lookup: {
                        from        : 'Project',
                        localField  : 'project',
                        foreignField: '_id', as: 'project'
                    }
                }, {
                    $project: {
                        project    : {$arrayElemAt: ["$project", 0]},
                        dateByMonth: 1,
                        revenue    : 1,
                        cost       : 1
                    }
                }, {
                    $group: {
                        _id    : {
                            name       : '$project.name',
                            _id        : '$project._id',
                            dateByMonth: '$dateByMonth'
                        },
                        ids    : {$addToSet: '$project._id'},
                        revenue: {$sum: {$subtract: ['$revenue', '$cost']}}
                    }
                }, {
                    $project: {
                        name       : '$_id.name',
                        _id        : '$_id._id',
                        dateByMonth: '$_id.dateByMonth',
                        revenue    : 1
                    }
                }, {
                    $group: {
                        _id : '$dateByMonth',
                        root: {$addToSet: '$$ROOT'}
                    }
                }, {
                    $sort: {
                        _id: 1
                    }
                }], function (err, result) {

                if (err) {
                    return callback(err);
                }

                callback(null, result);
            });
        };

        function getProjectsByIds(wTracks, callback) {
            //var _ids = _.pluck(wTracks, 'project._id');

            Project.aggregate([
                {
                    $match: {
                        _id: {'$in': projectIds}
                    }
                },
                {
                    $unwind: '$bonus'
                },
                {
                    $group: {
                        _id     : {
                            employeeId: '$bonus.employeeId',
                            bonusId   : '$bonus.bonusId'
                        },
                        projects: {
                            $addToSet: {
                                _id : '$_id',
                                name: '$name'
                            }
                        }

                    }
                }, {
                    $project: {
                        employee: '$_id.employeeId',
                        bonus   : '$_id.bonusId',
                        projects: 1,
                        _id     : 0
                    }
                }, {
                    $group: {
                        _id : '$employee',
                        root: {$push: '$$ROOT'}
                    }
                }
            ], function (err, projects) {
                if (err) {
                    return callback(err)
                }

                Employee.populate(projects, {
                    path   : '_id',
                    match  : {'department': '55b92ace21e4b7c40f000014'},
                    select : '_id name',
                    options: {
                        lean: true
                    }
                }, function (err, employees) {
                    if (err) {
                        return callback(err);

                    }

                    projects = _.filter(projects, function (employee) {
                        if (employee._id) {
                            return employee;
                        }
                    });

                    BonusType.populate(projects, {
                        path   : 'root.bonus',
                        select : '_id name value',
                        options: {
                            lean: true
                        }
                    }, function (err, types) {
                        if (err) {
                            return callback(err);

                        }

                        callback(null, {wTracks: wTracks, projects: projects});
                    });
                });

            });
        };

        function getBonuses(wTracks, callback) {
            var _ids = _.pluck(wTracks, 'project._id');

            Project.aggregate([
                {
                    $match: {
                        _id: {'$in': _ids}
                    }
                },
                {
                    $unwind: '$bonus'
                },
                {
                    $group: {
                        _id      : {employeeId: '$bonus.employeeId', bonusId: '$bonus.bonusId'},
                        dateArray: {
                            $push: {
                                startDate: '$bonus.startDate',
                                endDate  : '$bonus.endDate',
                                projectId: '$_id'
                            }
                        }

                    }
                }
            ], callback);
        };

        waterfallTasks = [idForProjects, getWTracksByProjects, getProjectsByIds];

        async.waterfall(waterfallTasks, function (err, result) {
            if (err) {
                return next(err);
            }

            result = resultGenerator(result);

            res.status(200).send(result);
        });

        function resultGenerator(projectsWetrackObject) {
            var employees = [];
            var groupedEmployees = projectsWetrackObject.projects;
            var groupedWtracks = projectsWetrackObject.wTracks;
            var employee;
            var _employee;
            var dateStr;
            var groupedEmployee;
            var totalByBonus;
            var bonusObject;

            //iterate over grouped result of projects with bonus by Employee
            for (var i = groupedEmployees.length;
                i--;) {
                totalByBonus = 0;

                groupedEmployee = groupedEmployees[i];
                _employee = groupedEmployee._id;
                employee = {
                    _id  : _employee._id,
                    name : _employee.name.first + ' ' + _employee.name.last,
                    total: 0
                };
                //iterate over grouped result of wTrack by date and projects
                for (var j = groupedWtracks.length;
                    j--;) {
                    dateStr = groupedWtracks[j]._id;
                    /*employee[dateStr] = [];*/
                    bonusObject = {
                        total: 0
                    };
                    for (var m = groupedEmployee.root.length;
                        m--;) {
                        /*bonusObject = {
                         total: 0
                         };*/
                        totalByBonus = 0;

                        for (var k = groupedWtracks[j].root.length;
                            k--;) {

                            for (var l = groupedEmployee.root[m].projects.length;
                                l--;) {
                                if (groupedWtracks[j].root[k]._id.toString() === groupedEmployee.root[m].projects[l]._id.toString()) {
                                    if (groupedEmployee.root[m].bonus) {
                                        totalByBonus += (groupedEmployee.root[m].bonus.value * groupedWtracks[j].root[k].revenue / 100) / 100;
                                    }
                                }
                            }

                        }
                        if (groupedEmployee.root[m].bonus) {
                            bonusObject[groupedEmployee.root[m].bonus.name] = totalByBonus;
                        }
                        bonusObject.total += totalByBonus;
                        bonusObject.total = parseFloat(bonusObject.total.toFixed(2));
                        /*employee[dateStr].push(bonusObject);*/
                    }
                    employee.total += bonusObject.total;
                    employee.total = parseFloat(employee.total.toFixed(2));
                    employee[dateStr] = bonusObject;
                }

                employees.push(employee);
            }

            return employees;
        }
    };

    this.getFromCash = function (req, res, next) {
        var self = this;
        var HoursCashes = models.get(req.session.lastDb, 'HoursCashes', HoursCashesSchema);
        var query = req.query;
        var startWeek = query.byWeek.week;
        var startYear = query.byWeek.year;
        var startMonth = query.byMonth.month;
        var yearforMonth = query.byMonth.year;
        var dateByWeek = startYear * 100 + parseInt(startWeek);
        var dateByMonth = yearforMonth * 100 + parseInt(startMonth);
        var dateKey = dateByWeek + '_' + dateByMonth;
        var waterfallTasks;
        var modelToSave;
        var hoursCashes;

        function getHoursByDep(startWeek, startYear, callback) {
            var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);

            var endWeek;
            var endYear;
            var startDate;
            var endDate;
            var match;
            var groupBy;
            var sortResult = [];

            if (startWeek >= 40) {
                endWeek = parseInt(startWeek) + 14 - 53;
                endYear = parseInt(startYear) + 1;
            } else {
                endWeek = parseInt(startWeek) + 14;
                endYear = parseInt(startYear);
            }

            startDate = startYear * 100 + parseInt(startWeek);
            endDate = endYear * 100 + parseInt(endWeek);

            match = {
                dateByWeek: {
                    $gte: startDate,
                    $lt : endDate
                }
            };

            groupBy = {
                _id : {
                    department: '$department.name',
                    _id       : '$department._id',
                    year      : '$year',
                    week      : '$week'
                },
                sold: {$sum: '$worked'}
            };

            WTrack.aggregate([{
                $match: match
            }, {
                $lookup: {
                    from        : 'Department',
                    localField  : 'department',
                    foreignField: '_id', as: 'department'
                }
            }, {
                $project: {
                    department: {$arrayElemAt: ["$department", 0]},
                    year      : 1,
                    week      : 1,
                    worked    : 1
                }
            }, {
                $group: groupBy
            }, {
                $project: {
                    year      : "$_id.year",
                    week      : "$_id.week",
                    department: "$_id.department",
                    sold      : 1,
                    _id       : 0
                }
            }, {
                $group: {
                    _id      : '$department',
                    root     : {$push: '$$ROOT'},
                    totalSold: {$sum: '$sold'}
                }
            }, {
                $sort: {_id: 1}
            }], function (err, response) {
                if (err) {
                    return callback(err);
                }

                constForDep.forEach(function (dep) {
                    response.forEach(function (depart) {
                        if (dep === depart._id) {
                            sortResult.push(depart);
                        }
                    });
                });

                callback(null, sortResult);
            });

        }

        function getHoursSold(startMonth, startYear, callback) {
            var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);

            var endMonth = startMonth;
            var nowMonth = moment().month() + 1;
            var endYear = startYear;

            var startDate;
            var endDate;
            var match;
            var groupBy;

            startDate = startYear * 100 + parseInt(startMonth);
            endDate = (parseInt(endYear) + 1) * 100 + parseInt(nowMonth);

            match = {
                dateByMonth: {$gte: startDate, $lte: endDate}
            };

            groupBy = {
                _id : {
                    department: '$department.name',
                    _id       : '$department._id',
                    year      : '$year',
                    month     : '$month',
                    employee  : '$employee'
                },
                sold: {$sum: '$worked'}
            };

            WTrack.aggregate([{
                $match: match
            }, {
                $lookup: {
                    from        : 'Department',
                    localField  : 'department',
                    foreignField: '_id', as: 'department'
                }
            }, {
                $lookup: {
                    from        : 'Employees',
                    localField  : 'employee',
                    foreignField: '_id', as: 'employee'
                }
            }, {
                $project: {
                    department: {$arrayElemAt: ["$department", 0]},
                    year      : 1,
                    month     : 1,
                    worked    : 1,
                    employee  : {$arrayElemAt: ["$employee", 0]}
                }
            }, {
                $group: groupBy
            }, {
                $project: {
                    year      : "$_id.year",
                    month     : "$_id.month",
                    department: "$_id.department",
                    sold      : 1,
                    employee  : '$_id.employee',
                    _id       : 0
                }
            }, {
                $group: {
                    _id      : '$department',
                    root     : {$push: '$$ROOT'},
                    totalSold: {$sum: '$sold'}
                }
            }, {
                $sort: {_id: 1}
            }], function (err, response) {

                if (err) {
                    return callback(err);
                }

                resultMapper(response);

            });

            function resultMapper(response) {
                var result = [];
                var departments = [];
                var sortDepartments = [];

                response.forEach(function (departments) {
                    var depObj = {};
                    var depName = departments._id;
                    var rootArray = departments.root;
                    var employeesArray = [];
                    var groupedRoot = _.groupBy(rootArray, 'employee._id');
                    var keys = Object.keys(groupedRoot);

                    depObj.department = depName;

                    keys.forEach(function (key) {
                        var arrayGrouped = groupedRoot[key];
                        var empObj = {};

                        arrayGrouped.forEach(function (element) {
                            var key = element.year * 100 + element.month;

                            if (element.employee && !empObj[element.employee._id]) {

                                empObj[element.employee._id] = {};
                                empObj[element.employee._id] = element.employee;

                                empObj[element.employee._id].hoursSold = {};
                                empObj[element.employee._id].hoursSold[key] = element.sold;

                                empObj[element.employee._id].total = parseInt(element.sold);
                            } else {
                                empObj[element.employee._id].hoursSold[key] = element.sold;
                                empObj[element.employee._id].total += parseInt(element.sold);
                            }

                        });
                        employeesArray.push(empObj);
                    });
                    depObj.employees = employeesArray;

                    result.push(depObj);
                });

                constForView.forEach(function (dep) {
                    result.forEach(function (depart) {
                        if (dep === depart.department) {
                            sortDepartments.push(depart);
                        }
                    });
                });

                async.each(sortDepartments, function (element) {
                    var obj = {};
                    var objToSave = {};
                    var empArr;
                    var key;

                    obj.employees = [];
                    obj.name = element.department;

                    obj.totalForDep = 0;

                    empArr = element.employees;

                    empArr.forEach(function (element) {
                        var object;

                        key = Object.keys(element)[0];

                        objToSave.name = element[key].name.first + ' ' + element[key].name.last;
                        objToSave.total = element[key].total;
                        objToSave.hoursSold = element[key].hoursSold;
                        object = _.clone(objToSave);
                        obj.employees.push(object);
                        obj.totalForDep += objToSave.total;
                    });
                    departments.push(obj);
                });

                callback(null, departments);
            }
        }

        function getHoursTotal(startMonth, startYear, callback) {
            var MonthHours = models.get(req.session.lastDb, 'MonthHours', monthHoursSchema);
            var Vacation = models.get(req.session.lastDb, 'Vacation', vacationSchema);
            var Holidays = models.get(req.session.lastDb, 'Holiday', holidaysSchema);
            var Employees = models.get(req.session.lastDb, 'Employees', employeeSchema);

            var endMonth = startMonth;

            var endYear = parseInt(startYear) + 1;
            var startWeek = moment().year(startYear).month(startMonth - 1).isoWeek();
            var match;
            var matchHoliday;
            var matchVacation;
            var parallelTasksObject;
            var waterfallTasks;

            var startDate = startYear * 100 + startWeek;

            function employeesRetriver(waterfallCb) {
                var Ids = [];

                Employees
                    .find({},
                        {_id: 1}
                    )
                    .lean()
                    .exec(function (err, result) {
                        if (err) {
                            waterfallCb(err);
                        }

                        result.forEach(function (element) {
                            Ids.push(element._id);
                        });

                        Employees.aggregate([{
                            $lookup: {
                                from        : 'Department',
                                localField  : 'department',
                                foreignField: '_id',
                                as          : 'department'
                            }
                        }, {
                            $project: {
                                department: {$arrayElemAt: ["$department", 0]},
                                name      : 1,
                                isEmployee: 1,
                                lastFire  : 1,
                                hire      : 1,
                                fire      : 1
                            }
                        }, {
                            $project: {
                                department: 1,
                                name      : 1,
                                isEmployee: 1,
                                lastFire  : 1,
                                hire      : 1,
                                fire      : 1
                            }
                        }, {
                            $match: {
                                $or: [
                                    {
                                        isEmployee: true
                                    }, {
                                        $and: [{isEmployee: false}, {
                                            lastFire: {
                                                $ne : null,
                                                $gte: startDate
                                            }
                                        }]
                                    }
                                ]
                            }
                        },
                            {
                                $group: {
                                    _id: {
                                        department: '$department.name',
                                        depId     : '$department._id',
                                        employee  : '$name',
                                        _id       : '$_id',
                                        hire      : '$hire',
                                        fire      : '$fire'
                                    }
                                }
                            },
                            {
                                $project: {
                                    department: '$_id.department',
                                    depId     : '$_id.depId',
                                    employee  : '$_id.employee',
                                    _id       : '$_id._id',
                                    hire      : '$_id.hire',
                                    fire      : '$_id.fire'
                                }
                            },
                            {
                                $group: {
                                    _id : '$department',
                                    root: {$push: '$$ROOT'}
                                }
                            },
                            {
                                $sort: {_id: 1}
                            }
                        ], function (err, response) {
                            if (err) {
                                return next(err);
                            }

                            waterfallCb(null, {ids: Ids, response: response});
                        });
                    });
            };

            waterfallTasks = [
                employeesRetriver,
                parallel
            ];

            function parallel(Ids, waterfallCb) {
                var ids = Ids.ids;
                var employees = Ids.response;

                match = {
                    // month: {$gte: startMonth, $lte: endMonth},
                    year: {$gte: startYear, $lte: endYear}
                };

                matchVacation = {
                    //month: {$gte: startMonth, $lte: endMonth},
                    year      : {$gte: startYear, $lte: endYear},
                    'employee': {$in: ids}
                };

                matchHoliday = {
                    // week: {$gte: startWeek, $lte: endWeek},
                    year: {$gte: startYear, $lte: endYear}
                };

                parallelTasksObject = {
                    monthHours: monthHourRetriver,
                    holidays  : holidaysRetriver,
                    vacations : vacationComposer
                };

                function monthHourRetriver(parallelCb) {
                    MonthHours
                        .find(
                            match,
                            {year: 1, month: 1, hours: 1}
                        )
                        .lean()
                        .exec(parallelCb);
                };

                function holidaysRetriver(parallelCb) {
                    Holidays
                        .find(matchHoliday)
                        .lean()
                        .exec(parallelCb);
                };
                function vacationComposer(parallelCb) {
                    Vacation.aggregate([{
                        $match: matchVacation
                    }, {
                        $lookup: {
                            from        : 'Employees',
                            localField  : 'employee',
                            foreignField: '_id', as: 'employee'
                        }
                    }, {
                        $project: {
                            employee  : {$arrayElemAt: ["$employee", 0]},
                            month     : 1,
                            year      : 1,
                            monthTotal: 1
                        }
                    }, {
                        $group: {
                            _id: {
                                _id       : '$employee._id',
                                name      : {
                                    $concat: ['$employee.name.first', ' ', '$employee.name.last']
                                },
                                month     : '$month',
                                year      : '$year',
                                monthTotal: '$monthTotal'
                            }
                        }
                    }, {
                        $project: {
                            employee  : '$_id._id',
                            name      : '$_id.name',
                            month     : '$_id.month',
                            year      : '$_id.year',
                            monthTotal: '$_id.monthTotal'
                        }
                    },
                        {
                            $sort: {_id: 1}
                        }
                    ], function (err, response) {
                        if (err) {
                            return callback(err);
                        }

                        parallelCb(null, response);
                    });
                };

                async.parallel(parallelTasksObject, function (err, response) {
                    if (err) {
                        return callback(err);
                    }

                    response.employees = employees;
                    waterfallCb(null, response);
                });
            }

            function waterfallCb(err, response) {
                if (err) {
                    return callback(err);
                }

                resultMapper(response);

            };

            function resultMapper(response) {
                var holidays = response['holidays'];
                var vacations = response['vacations'];
                var employees = response['employees'];
                var monthHours = response['monthHours'];
                var result = [];
                var departments = [];
                var sortDepartments = [];

                employees.forEach(function (employee) {
                    var department = {};
                    var depRoot;
                    var key;

                    department._id = employee._id;
                    department.employees = [];
                    depRoot = employee.root;

                    depRoot.forEach(function (element) {
                        var employee = {};
                        var hire;
                        var date;
                        var fire;

                        employee.hire = [];

                        hire = _.clone(element.hire);

                        hire.forEach(function (hireDate) {
                            date = new Date(hireDate);
                            employee.hire.push(moment(date).year() * 100 + moment(date).month() + 1);
                        });

                        employee.fire = [];

                        fire = _.clone(element.fire);

                        fire.forEach(function (hireDate) {
                            date = new Date(hireDate);
                            employee.fire.push(moment(date).year() * 100 + moment(date).month() + 1);
                        });

                        employee._id = element._id;
                        employee.name = element.employee.first + ' ' + element.employee.last;

                        employee.total = 0;
                        employee.hoursTotal = {};

                        monthHours.forEach(function (months) {
                            var month = months.month;
                            var year = months.year;
                            var vacationForEmployee = 0;
                            var hoursForMonth;
                            var holidaysForMonth = 0;
                            var hireFirst;
                            var hireLast;
                            var fireFirst;

                            hoursForMonth = months.hours;

                            vacations.forEach(function (vacation) {
                                if ((employee._id.toString() === vacation.employee.toString()) && (vacation.month === month) && (vacation.year === year)) {
                                    vacationForEmployee = vacation.monthTotal;
                                }
                            });

                            holidays.forEach(function (holiday) {
                                var dateMonth = moment(holiday.date).month() + 1;
                                var dateYear = moment(holiday.date).year();
                                var dayNumber = moment(holiday.date).day();

                                if ((dateMonth === month) && (dateYear === year) && (dayNumber !== 0 && dayNumber !== 6)) {
                                    holidaysForMonth += 1;
                                }
                            });

                            key = year * 100 + month;

                            hireFirst = employee.hire[0] ? employee.hire[0] : key;
                            hireLast = employee.hire[1] ? employee.hire[1] : hireFirst;
                            fireFirst = employee.fire[0] ? employee.fire[0] : key;
                            fire = employee.fire[0] ? employee.fire[0] : null;
                            var query;
                            if (fire && hireFirst !== hireLast) {
                                query = (hireFirst <= key) && (key <= fireFirst) || (key >= hireLast);
                            } else {
                                query = (hireFirst <= key) && (key <= fireFirst) && (key >= hireLast);
                            }

                            if (query) {
                                employee.hoursTotal[key] = parseInt(hoursForMonth) - parseInt(vacationForEmployee) * 8 - parseInt(holidaysForMonth) * 8;
                                employee.total += employee.hoursTotal[key];
                            } else {
                                employee.hoursTotal[key] = 0;
                                employee.total += employee.hoursTotal[key];
                            }

                        });

                        department.employees.push(employee);
                    });

                    result.push(department);
                });

                constForView.forEach(function (dep) {
                    result.forEach(function (depart) {
                        if (dep === depart._id) {
                            sortDepartments.push(depart);
                        }
                    });
                });

                async.each(sortDepartments, function (element) {
                    var obj = {};
                    var objToSave = {};
                    var empArr;

                    obj.employees = [];
                    obj.name = element._id;

                    obj.totalForDep = 0;

                    empArr = element.employees;

                    empArr.forEach(function (employee) {
                        var object;

                        objToSave.name = employee.name;
                        objToSave.total = employee.total;
                        objToSave.hoursTotal = employee.hoursTotal;
                        // objToSave.hire = employee.hire;
                        //objToSave.fire = employee.fire;

                        object = _.clone(objToSave);

                        obj.employees.push(object);
                        obj.totalForDep += objToSave.total;
                    });
                    departments.push(obj);
                });

                callback(null, departments);
            }

            async.waterfall(waterfallTasks, waterfallCb);

        }

        function getTotalHours(options, waterfallCB) {
            var hoursSold = options.hoursSold;
            var hoursTotal = options.totalHours;
            var resultForUnsold = [];

            hoursTotal.forEach(function (department) {
                var obj = {};
                var objToSave = {};
                var empArray;

                obj.name = department.name;
                obj.employees = [];
                obj.totalForDep = 0;

                empArray = department.employees;

                empArray.forEach(function (employee) {
                    objToSave.name = employee.name;
                    var hoursTotal = employee.hoursTotal;
                    var keys = Object.keys(hoursTotal);
                    var empArr = [];
                    var totalSold;

                    hoursSold.forEach(function (dep) {
                        if (obj.name === dep.name) {
                            empArr = dep.employees;

                            empArr.forEach(function (emp) {
                                if (employee.name === emp.name) {
                                    totalSold = _.clone(emp.hoursSold);
                                }
                            });
                        }
                        // objToSave.hire = employee.hire;
                        // objToSave.fire = employee.fire;
                        objToSave.hoursTotal = {};
                        objToSave.total = 0;
                        keys.forEach(function (key) {
                            var sold = (totalSold && totalSold[key]) ? totalSold[key] : 0;

                            objToSave.hoursTotal[key] = hoursTotal[key] - sold;
                            objToSave.total += objToSave.hoursTotal[key];
                        });
                    });
                    var object = _.clone(objToSave);
                    obj.employees.push(object);
                    obj.totalForDep += objToSave.total;
                });
                resultForUnsold.push(obj);
            });

            return resultForUnsold;
        }

        query = HoursCashes.find({dateField: dateKey});
        query.exec(function (err, result) {
            var resForView;

            if (err) {
                return next(err);
            }

            if (result.length === 0) {

                async.parallel({
                        // hoursByDep: function (callback) {
                        //    getHoursByDep(startWeek, startYear, callback);
                        // },
                        hoursSold : function (callback) {
                            getHoursSold(startMonth, yearforMonth, callback);
                        },
                        totalHours: function (callback) {
                            getHoursTotal(startMonth, yearforMonth, callback);
                        }
                    },
                    function (err, results) {
                        if (err) {
                            return next(err);
                        }

                        results['hoursUnsold'] = getTotalHours(results);

                        async.parallel([
                            function (callback) {
                                res.status(200).send(results);

                                return callback(null, 'Done!');
                            },
                            function (callback) {
                                modelToSave = {
                                    dateField: dateKey,
                                    result   : results
                                };

                                hoursCashes = new HoursCashes(modelToSave);
                                hoursCashes.save(function (err) {
                                    if (err) {
                                        return callback(err);
                                    }

                                    return callback(null, 'Done!');
                                });
                            }
                        ], function (err, results) {
                            if (err) {
                                return next(err);
                            }

                        });
                    });

            } else {
                resForView = result[0].toJSON();
                res.status(200).send(resForView.result);
            }
        });
    };

    this.totalInvoiceBySales = function (req, res, next) {
        var query = req.query;
        var filter = query.filter;
        var contentType = 'Invoices';
        var Invoice = models.get(req.session.lastDb, contentType, newInvoiceSchema);
        var dateQuery = filterMapper.mapFilter(filter, {contentType: contentType, keysArray: ['date']});

        var matchObject = {
            _type   : 'Invoices',
            forSales: true
        };

        Invoice.aggregate([
            {
                $match: {
                    $and: [matchObject, dateQuery]
                }
            },
            {
                $project: {
                    salesPerson: 1,
                    paymentInfo: 1
                }
            },
            {
                $lookup: {
                    from        : 'Employees',
                    localField  : 'salesPerson',
                    foreignField: '_id',
                    as          : 'salesPerson'
                }
            },
            {
                $project: {
                    salesPerson: {$arrayElemAt: ['$salesPerson', 0]},
                    paymentInfo: 1
                }
            },
            {
                $group: {
                    _id    : '$salesPerson._id',
                    payment: {
                        $sum: '$paymentInfo.total'
                    },

                    name: {
                        $first: {$concat: ['$salesPerson.name.first', ' ', '$salesPerson.name.last']}
                    }
                }
            },
            {
                $project: {
                    _id : 1,
                    name: {
                        $ifNull: ['$name', 'Not Assigned']
                    },

                    payment: 1
                }
            }
        ], function (err, response) {
            if (err) {
                return next(err);
            }

            res.status(200).send({data: response});
        });
    };

    this.synthetic = function (req, res, next) {
        var wTrackInvoiceCT = 'wTrackInvoice';
        var paymentCT = 'Payment';
        var query = req.query;
        var Invoice = models.get(req.session.lastDb, wTrackInvoiceCT, invoiceSchema);
        var Payment = models.get(req.session.lastDb, paymentCT, paymentSchema);
        var WTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);
        var filter = query.filter || {};
        var startDate = filter.date && filter.date.value && filter.date.value[0] || null;
        var endDate = filter.date && filter.date.value && filter.date.value[1] || null;
        var momentStartDate;
        var startYear;
        var startMonth;
        var startWeek;
        var momentEndDate;
        var endYear;
        var endMonth;
        var endWeek;
        var startDateByWeeek;
        var startDateByMonth;
        var endDateByWeeek;
        var endDateByMonth;
        var matchObject = {
            _type: wTrackInvoiceCT
        };
        var salesManagers = objectId(CONSTANTS.SALESMANAGER);
        var salesManagersMatch = {
            $and: [{
                $eq: ['$$salesPerson.projectPositionId', salesManagers]
            }, {
                $or: [{
                    $and: [{
                        $eq: ['$$salesPerson.startDate', null]
                    }, {
                        $eq: ['$$salesPerson.endDate', null]
                    }]
                }, {
                    $and: [{
                        $lte: ['$$salesPerson.startDate', '$invoiceDate']
                    }, {
                        $eq: ['$$salesPerson.endDate', null]
                    }]
                }, {
                    $and: [{
                        $gte: ['$$salesPerson.endDate', '$invoiceDate']
                    }, {
                        $eq: ['$$salesPerson.startDate', null]
                    }]
                }, {
                    $and: [{
                        $lte: ['$$salesPerson.startDate', '$invoiceDate']
                    }, {
                        $gte: ['$$salesPerson.endDate', '$invoiceDate']
                    }]
                }]
            }]
        };
        var wTrackMatchObject = {};
        var matchObjectPayment = {
            forSale: true,
            _type  : {$in: ['InvoicePayment', 'ProformaPayment']}
        };
        var projectionObject = {
            supplier   : 1,
            /* salesPerson: 1,*/
            paymentInfo: 1,
            invoiceDate: 1,
            project    : 1,
            year       : {$year: '$invoiceDate'},
            month      : {$month: '$invoiceDate'},
            week       : {$week: '$invoiceDate'}
        };
        var projectionPaymentObject = {
            paidAmount: 1,
            date      : 1,
            invoice   : {$arrayElemAt: ['$invoice', 0]},
            year      : {$year: '$date'},
            month     : {$month: '$date'},
            week      : {$week: '$date'}
        };
        var groupedKey = (query.byWeek && query.byWeek !== 'false') ? 'week' : 'month';

        var groupObject = {
            invoiced: {$sum: '$paymentInfo.total'},
            root    : {$push: '$$ROOT'}
        };

        var groupPaymentObject = {
            paid: {$sum: '$paidAmount'},
            root: {$push: '$$ROOT'}
        };

        var groupWetrackObject = {
            revenue: {$sum: '$revenue'},
            root   : {$push: '$$ROOT'}
        };

        var dateByMonthAggr = {
            $let: {
                vars: {
                    total: {$multiply: [{$year: '$invoiceDate'}, 100]}
                },
                in  : {$add: ['$$total', {$month: '$invoiceDate'}]}
            }
        };

        var dateByWeekAggr = {
            $let: {
                vars: {
                    total: {$multiply: [{$year: '$invoiceDate'}, 100]}
                },
                in  : {$add: ['$$total', {$week: '$invoiceDate'}]}
            }
        };

        var dateByMonthAggrPayment = {
            $let: {
                vars: {
                    total: {$multiply: [{$year: '$date'}, 100]}
                },
                in  : {$add: ['$$total', {$month: '$date'}]}
            }
        };

        var dateByWeekAggrPayment = {
            $let: {
                vars: {
                    total: {$multiply: [{$year: '$date'}, 100]}
                },

                in: {$add: ['$$total', {$week: '$date'}]}
            }
        };

        if (startDate && endDate) {
            momentStartDate = moment(new Date(startDate));
            momentEndDate = moment(new Date(endDate));

            startYear = momentStartDate.year();
            startMonth = momentStartDate.month();
            startWeek = momentStartDate.isoWeek();

            endYear = momentEndDate.year();
            endMonth = momentEndDate.month();
            endWeek = momentEndDate.isoWeek();

            startDateByWeeek = startYear * 100 + startWeek;
            startDateByMonth = startYear * 100 + startMonth;
            endDateByWeeek = endYear * 100 + endWeek;
            endDateByMonth = endYear * 100 + endMonth;
            if (groupedKey === 'week') {
                wTrackMatchObject.dateByWeek = {$gte: startDateByWeeek, $lte: endDateByWeeek};
            } else {
                wTrackMatchObject.dateByMonth = {$gte: startDateByMonth, $lte: endDateByMonth};
            }
        }

        if (groupedKey === 'week') {
            groupObject._id = '$dateByWeek';
            groupPaymentObject._id = '$dateByWeek';
            groupWetrackObject._id = '$dateByWeek';
            projectionObject.dateByWeek = dateByWeekAggr;
            projectionPaymentObject.dateByWeek = dateByWeekAggrPayment;
        } else {
            groupObject._id = '$dateByMonth';
            groupPaymentObject._id = '$dateByMonth';
            groupWetrackObject._id = '$dateByMonth';
            projectionObject.dateByMonth = dateByMonthAggr;
            projectionPaymentObject.dateByMonth = dateByMonthAggrPayment;
        }

        function invoiceGrouper(parallelCb) {
            Invoice.aggregate([
                {
                    $match: filterMapper.mapFilter(filter, {contentType: wTrackInvoiceCT})
                },
                {
                    $match: matchObject
                },
                {
                    $project: projectionObject
                },
                {
                    $lookup: {
                        from        : 'projectMembers',
                        localField  : 'project',
                        foreignField: 'projectId',
                        as          : 'salesPersons'
                    }
                },
                {
                    $lookup: {
                        from        : 'Customers',
                        localField  : 'supplier',
                        foreignField: '_id',
                        as          : 'supplier'
                    }
                },
                {
                    $project: {
                        salesPersons: {
                            $filter: {
                                input: '$salesPersons',
                                as   : 'salesPerson',
                                cond : salesManagersMatch
                            }
                        },
                        paymentInfo : 1,
                        year        : 1,
                        month       : 1,
                        week        : 1,
                        dateByWeek  : 1,
                        dateByMonth : 1,
                        supplier    : {$arrayElemAt: ['$supplier', 0]}
                    }
                },
                {
                    $unwind: {
                        path                      : '$salesPersons',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from        : 'Employees',
                        localField  : 'salesPersons.employeeId',
                        foreignField: '_id',
                        as          : 'salesPerson'
                    }
                },
                {
                    $project: {
                        paymentInfo: 1,
                        year       : 1,
                        month      : 1,
                        week       : 1,
                        dateByWeek : 1,
                        dateByMonth: 1,
                        supplier   : 1,
                        salesPerson: {$arrayElemAt: ['$salesPerson', 0]}
                    }
                },
                {
                    $project: {
                        paymentInfo: 1,
                        year       : 1,
                        month      : 1,
                        week       : 1,
                        dateByWeek : 1,
                        dateByMonth: 1,
                        supplier   : {
                            _id : '$supplier._id',
                            name: '$supplier.name'
                        },
                        salesPerson: {
                            _id : '$salesPerson._id',
                            name: '$salesPerson.name'
                        }
                    }
                },
                {
                    $group: {
                        _id           : null,
                        salesArray    : {
                            $addToSet: {
                                _id : '$salesPerson._id',
                                name: '$salesPerson.name'
                            }
                        },
                        suppliersArray: {
                            $addToSet: {
                                _id : '$supplier._id',
                                name: '$supplier.name'
                            }
                        },
                        root          : {$push: '$$ROOT'}
                    }
                },
                {
                    $unwind: '$root'
                },
                {
                    $project: {
                        _id           : 0,
                        salesArray    : 1,
                        suppliersArray: 1,
                        salesPerson   : '$root.salesPerson',
                        paymentInfo   : '$root.paymentInfo',
                        year          : '$root.year',
                        month         : '$root.month',
                        week          : '$root.week',
                        dateByWeek    : '$root.dateByWeek',
                        dateByMonth   : '$root.dateByMonth',
                        supplier      : '$root.supplier'
                    }
                },
                {
                    $group: groupObject
                },
                {
                    $unwind: '$root'
                },
                {
                    $group: {
                        _id            : {
                            _id : '$root.salesPerson._id',
                            name: '$root.salesPerson.name',
                            date: '$_id'
                        },
                        invoicedBySales: {$sum: '$root.paymentInfo.total'},
                        salesArray     : {$first: '$root.salesArray'},
                        suppliersArray : {$first: '$root.suppliersArray'},
                        root           : {$push: '$$ROOT'}
                    }
                },
                {
                    $unwind: '$root'
                },
                {
                    $project: {
                        _id            : 0,
                        salesPerson    : '$_id._id',
                        invoicedBySales: 1,
                        salesArray     : 1,
                        suppliersArray : 1,
                        date           : '$_id.date',
                        invoiced       : '$root.invoiced',
                        year           : '$root.root.year',
                        month          : '$root.root.month',
                        week           : '$root.root.week',
                        supplier       : '$root.root.supplier',
                        paymentInfo    : '$root.root.paymentInfo'
                    }
                },
                {
                    $group: {
                        _id               : {
                            _id : '$supplier._id',
                            name: '$supplier.name',
                            date: '$date'
                        },
                        invoicedBySupplier: {$sum: '$paymentInfo.total'},
                        salesArray        : {$first: '$salesArray'},
                        suppliersArray    : {$first: '$suppliersArray'},
                        root              : {$push: '$$ROOT'}
                    }
                },
                {
                    $unwind: '$root'
                },
                {
                    $project: {
                        _id               : 0,
                        supplier          : '$_id._id',
                        salesPerson       : '$root.salesPerson',
                        invoicedBySales   : '$root.invoicedBySales',
                        invoicedBySupplier: 1,
                        salesArray        : 1,
                        suppliersArray    : 1,
                        date              : '$_id.date',
                        invoiced          : '$root.invoiced',
                        year              : '$root.year',
                        month             : '$root.month',
                        week              : '$root.week'
                    }
                },
                {
                    $group: {
                        _id           : {
                            date    : '$date',
                            invoiced: '$invoiced'
                        },
                        sales         : {
                            $addToSet: {
                                salesPerson    : '$$ROOT.salesPerson',
                                invoicedBySales: '$$ROOT.invoicedBySales'
                            }
                        },
                        salesArray    : {$first: '$salesArray'},
                        suppliersArray: {$first: '$suppliersArray'},
                        suppliers     : {
                            $addToSet: {
                                supplier          : '$$ROOT.supplier',
                                invoicedBySupplier: '$$ROOT.invoicedBySupplier'
                            }
                        }
                    }
                },
                {
                    $project: {
                        date          : '$_id.date',
                        invoiced      : '$_id.invoiced',
                        salesArray    : 1,
                        suppliersArray: 1,
                        sales         : 1,
                        suppliers     : 1,
                        _id           : 0
                    }
                }
            ]).allowDiskUse(true).exec(parallelCb);
        }

        function paymentGrouper(parallelCb) {
            Payment.aggregate([
                {
                    $match: filterMapper.mapFilter(filter, {contentType: paymentCT})
                },
                {
                    $match: matchObjectPayment
                },
                {
                    $lookup: {
                        from        : 'Invoice',
                        localField  : 'invoice',
                        foreignField: '_id',
                        as          : 'invoice'
                    }
                },
                {
                    $project: projectionPaymentObject
                },
                {
                    $project: {
                        dateByWeek : 1,
                        dateByMonth: 1,
                        date       : 1,
                        year       : 1,
                        month      : 1,
                        week       : 1,
                        paidAmount : 1,
                        project    : '$invoice.project',
                        invoiceDate: '$invoice.invoiceDate'
                    }
                },
                {
                    $lookup: {
                        from        : 'projectMembers',
                        localField  : 'project',
                        foreignField: 'projectId',
                        as          : 'salesPersons'
                    }
                },
                {
                    $project: {
                        dateByWeek  : 1,
                        dateByMonth : 1,
                        date        : 1,
                        year        : 1,
                        month       : 1,
                        week        : 1,
                        paidAmount  : 1,
                        salesPersons: {
                            $filter: {
                                input: '$salesPersons',
                                as   : 'salesPerson',
                                cond : salesManagersMatch
                            }
                        }
                    }
                },
                {
                    $unwind: {
                        path                      : '$salesPersons',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from        : 'Employees',
                        localField  : 'salesPersons.employeeId',
                        foreignField: '_id',
                        as          : 'salesPerson'
                    }
                },
                {
                    $project: {
                        dateByWeek  : 1,
                        dateByMonth : 1,
                        date        : 1,
                        year        : 1,
                        month       : 1,
                        week        : 1,
                        paidAmount  : 1,
                        salesPersons: 1,
                        salesPerson : {$arrayElemAt: ['$salesPerson', 0]}
                    }
                },
                {
                    $project: {
                        dateByWeek  : 1,
                        dateByMonth : 1,
                        date        : 1,
                        year        : 1,
                        month       : 1,
                        week        : 1,
                        paidAmount  : 1,
                        salesPersons: 1,
                        salesPerson : {
                            _id : '$salesPerson._id',
                            name: '$salesPerson.name'
                        }
                    }
                },
                {
                    $group: {
                        _id       : null,
                        salesArray: {
                            $addToSet: {
                                _id : '$salesPerson._id',
                                name: '$salesPerson.name'
                            }
                        },
                        root      : {$push: '$$ROOT'}
                    }
                },
                {
                    $unwind: '$root'
                },
                {
                    $project: {
                        _id        : 0,
                        salesArray : 1,
                        salesPerson: '$root.salesPerson',
                        paidAmount : '$root.paidAmount',
                        year       : '$root.year',
                        month      : '$root.month',
                        week       : '$root.week',
                        dateByWeek : '$root.dateByWeek',
                        dateByMonth: '$root.dateByMonth'
                    }
                },
                {
                    $group: groupPaymentObject
                },
                {
                    $unwind: '$root'
                },
                {
                    $group: {
                        _id        : {
                            _id : '$root.salesPerson._id',
                            name: '$root.salesPerson.name',
                            date: '$_id'
                        },
                        paidBySales: {$sum: '$root.paidAmount'},
                        salesArray : {$first: '$root.salesArray'},
                        root       : {$push: '$$ROOT'}
                    }
                },
                {
                    $unwind: '$root'
                },
                {
                    $project: {
                        _id        : 0,
                        salesPerson: '$_id._id',
                        paidBySales: 1,
                        salesArray : 1,
                        date       : '$_id.date',
                        paid       : '$root.paid',
                        year       : '$root.root.year',
                        month      : '$root.root.month',
                        week       : '$root.root.week'
                    }
                },
                {
                    $group: {
                        _id        : {
                            date: '$date',
                            paid: '$paid'
                        },
                        paidBySales: {
                            $addToSet: {
                                salesPerson: '$$ROOT.salesPerson',
                                paidBySales: '$$ROOT.paidBySales'
                            }
                        },
                        salesArray : {$first: '$salesArray'}
                    }
                },
                {
                    $project: {
                        date       : '$_id.date',
                        paid       : '$_id.paid',
                        salesArray : 1,
                        paidBySales: 1,
                        _id        : 0
                    }
                }
            ]).allowDiskUse(true).exec(parallelCb);

        };

        function revenueGrouper(parallelCb) {
            var salesManagerMatch = {
                $or: [{
                    $and: [{
                        $eq: ['$startDateCond', null]
                    }, {
                        $eq: ['$endDateCond', null]
                    }]
                }, {
                    $and: [{
                        $eq: ['$startDateCond', null]
                    }, {
                        $gte: ['$endDateCond', '$dateByWeek']
                    }]
                }, {
                    $and: [{
                        $lte: ['$startDateCond', '$dateByWeek']
                    }, {
                        $eq: ['$endDateCond', null]
                    }]
                }, {
                    $and: [{
                        $lte: ['$startDateCond', '$dateByWeek']
                    }, {
                        $gte: ['$endDateCond', '$dateByWeek']
                    }]
                }]
            };

            WTrack.aggregate([{
                $match: wTrackMatchObject
            }, {
                $lookup: {
                    from        : 'projectMembers',
                    localField  : 'project',
                    foreignField: 'projectId',
                    as          : 'projectMembers'
                }
            }, {
                $project: {
                    salesPersons: {
                        $filter: {
                            input: '$projectMembers',
                            as   : 'projectMember',
                            cond : {$eq: ['$$projectMember.projectPositionId', objectId(CONSTANTS.SALESMANAGER)]}
                        }
                    },
                    dateByWeek  : 1,
                    dateByMonth : 1,
                    revenue     : 1
                }
            }, {
                $unwind: {
                    path                      : '$salesPersons',
                    preserveNullAndEmptyArrays: true
                }
            }, {
                $project: {
                    startDateCond: {
                        $let: {
                            vars: {
                                startDate: {$ifNull: ['$salesPersons.startDate', null]}
                            },
                            in  : {$cond: [{$eq: ['$$startDate', null]}, null, {$add: [{$multiply: [{$year: '$$startDate'}, 100]}, {$week: '$$startDate'}]}]}
                        }
                    },

                    endDateCond: {
                        $let: {
                            vars: {
                                endDate: {$ifNull: ['$salesPersons.endDate', null]}
                            },
                            in  : {$cond: [{$eq: ['$$endDate', null]}, null, {$add: [{$multiply: [{$year: '$$endDate'}, 100]}, {$week: '$$endDate'}]}]}
                        }
                    },

                    salesPersons: '$salesPersons.employeeId',
                    dateByWeek  : 1,
                    dateByMonth : 1,
                    revenue     : 1
                }
            }, {
                $project: {
                    isValid     : salesManagerMatch,
                    salesPersons: 1,
                    dateByWeek  : 1,
                    dateByMonth : 1,
                    revenue     : 1
                }
            }, {
                $group: groupWetrackObject
            }, {
                $unwind: '$root'
            }, {
                $group: {
                    _id           : {
                        _id : '$root.salesPersons',
                        date: '$_id'
                    },
                    revenueBySales: {$sum: '$root.revenue'},
                    root          : {$push: '$$ROOT'}
                }
            }, {
                $unwind: '$root'
            }, {
                $project: {
                    _id           : 0,
                    salesPerson   : '$_id._id',
                    revenueBySales: 1,
                    date          : '$_id.date',
                    revenue       : '$root.revenue'
                }
            }, {
                $lookup: {
                    from        : 'Employees',
                    localField  : 'salesPerson',
                    foreignField: '_id',
                    as          : 'salesPerson'
                }
            }, {
                $project: {
                    salesPerson   : {$arrayElemAt: ['$salesPerson', 0]},
                    revenueBySales: 1,
                    date          : 1,
                    revenue       : 1
                }
            }, {
                $project: {
                    salesPerson   : {
                        _id : '$salesPerson._id',
                        name: '$salesPerson.name'
                    },
                    revenueBySales: 1,
                    date          : 1,
                    revenue       : 1
                }
            }, {
                $group: {
                    _id       : null,
                    salesArray: {
                        $addToSet: '$salesPerson'
                    },
                    root      : {$push: '$$ROOT'}
                }
            }, {
                $unwind: '$root'
            }, {
                $project: {
                    _id           : 0,
                    salesArray    : 1,
                    revenueBySales: '$root.revenueBySales',
                    date          : '$root.date',
                    revenue       : '$root.revenue',
                    salesPerson   : '$root.salesPerson._id'
                }
            }, {
                $group: {
                    _id           : {
                        date   : '$date',
                        revenue: '$revenue'
                    },
                    revenueBySales: {
                        $addToSet: {
                            salesPerson   : '$$ROOT.salesPerson',
                            revenueBySales: '$$ROOT.revenueBySales'
                        }
                    },
                    salesArray    : {$first: '$salesArray'}
                }
            }, {
                $project: {
                    date          : '$_id.date',
                    revenue       : '$_id.revenue',
                    revenueBySales: 1,
                    _id           : 0,
                    salesArray    : 1
                }
            }], parallelCb);

        };

        async.parallel({
            invoiced: invoiceGrouper,
            paid    : paymentGrouper,
            /* revenue : revenueGrouper*/
        }, function (err, response) {
            var sales;
            var _sales;
            var suppliers;

            function mergeByProperty(arr1, arr2, prop) {
                _.each(arr2, function (arr2obj) {
                    var arr1obj = _.find(arr1, function (arr1obj) {
                        return arr1obj[prop] === arr2obj[prop];
                    });

                    if (arr1obj) {
                        _.extend(arr1obj, arr2obj);
                    } else {
                        arr1.push(arr2obj);
                    }

                });
            }

            if (err) {
                return next(err);
            }

            sales = response.invoiced[0] ? response.invoiced[0].salesArray : [];
            _sales = response.paid[0] ? response.paid[0].salesArray : [];
            sales = sales.concat(_sales);
            /*_sales = response.revenue[0] ? response.revenue[0].salesArray : [];
             sales = sales.concat(_sales);*/
            sales = _.uniq(sales, function (elm) {
                if (elm._id) {
                    return elm._id.toString();
                }
            });

            suppliers = response.invoiced[0] ? response.invoiced[0].suppliersArray : [];
            suppliers = _.uniq(suppliers, function (elm) {
                if (elm._id) {
                    return elm._id.toString();
                }
            });

            mergeByProperty(response.invoiced, response.paid, 'date');
            // mergeByProperty(response.invoiced, response.revenue, 'date');

            response.invoiced = _.sortBy(response.invoiced, 'date');

            // mergeByProperty(response.invoiced, response.paid, 'date');
            // mergeByProperty(response.invoiced, response.revenue, 'date');

            // response.invoiced = _.sortBy(response.invoiced, 'date');

            res.status(200).send({payments: response.invoiced, sales: sales, suppliers: suppliers});
        });
    };

    this.syntheticEmpty = function (req, res, next) {
        var query = req.query;
        var Invoice = models.get(req.session.lastDb, 'wTrackInvoice', invoiceSchema);
        var Payment = models.get(req.session.lastDb, 'Payment', paymentSchema);
        var Wetrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema);
        var startDate = query.startDate;
        var endDate = query.endDate;
        var momentStartDate;
        var startYear;
        var startMonth;
        var startWeek;
        var momentEndDate;
        var endYear;
        var endMonth;
        var endWeek;
        var startDateByWeeek;
        var startDateByMonth;
        var endDateByWeeek;
        var endDateByMonth;
        var matchObject = {
            _type      : 'wTrackInvoice',
            invoiceDate: {$gte: new Date('2016-03-01')}
            // forSales: true  // One Invoice was without forSales ObjectId("5630c3caa0eb6af71d684bad")
        };
        var salesManagers = objectId(CONSTANTS.SALESMANAGER);
        var salesManagersMatch = {
            $and: [{
                $eq: ['$$salesPerson.projectPositionId', salesManagers]
            }, {
                $eq: ['$$salesPerson.employeeId', objectId('55b92ad221e4b7c40f00004a')]
            }, {
                $or: [{
                    $and: [{
                        $eq: ['$$salesPerson.startDate', null]
                    }, {
                        $eq: ['$$salesPerson.endDate', null]
                    }]
                }, {
                    $and: [{
                        $lte: ['$$salesPerson.startDate', '$invoiceDate']
                    }, {
                        $eq: ['$$salesPerson.endDate', null]
                    }]
                }, {
                    $and: [{
                        $gte: ['$$salesPerson.endDate', '$invoiceDate']
                    }, {
                        $eq: ['$$salesPerson.startDate', null]
                    }]
                }, {
                    $and: [{
                        $lte: ['$$salesPerson.startDate', '$invoiceDate']
                    }, {
                        $gte: ['$$salesPerson.endDate', '$invoiceDate']
                    }]
                }]
            }]
        };
        var wTrackMatchObject = {};
        var matchObjectPayment = {
            forSale: true,
            _type  : 'InvoicePayment'
        };
        var projectionObject = {
            supplier   : 1,
            /* salesPerson: 1,*/
            paymentInfo: 1,
            invoiceDate: 1,
            project    : 1,
            year       : {$year: '$invoiceDate'},
            month      : {$month: '$invoiceDate'},
            week       : {$week: '$invoiceDate'}
        };
        var projectionPaymentObject = {
            paidAmount: 1,
            date      : 1,
            invoice   : {$arrayElemAt: ['$invoice', 0]},
            year      : {$year: '$date'},
            month     : {$month: '$date'},
            week      : {$week: '$date'}
        };
        var groupedKey = (query.byWeek && query.byWeek !== 'false') ? 'week' : 'month';

        var groupObject = {
            invoiced: {$sum: '$paymentInfo.total'},
            root    : {$push: '$$ROOT'}
        };

        var groupPaymentObject = {
            paid: {$sum: '$paidAmount'},
            root: {$push: '$$ROOT'}
        };

        var groupWetrackObject = {
            revenue: {$sum: '$revenue'},
            root   : {$push: '$$ROOT'}
        };

        var dateByMonthAggr = {
            $let: {
                vars: {
                    total: {$multiply: [{$year: '$invoiceDate'}, 100]}
                },
                in  : {$add: ['$$total', {$month: '$invoiceDate'}]}
            }
        };

        var dateByWeekAggr = {
            $let: {
                vars: {
                    total: {$multiply: [{$year: '$invoiceDate'}, 100]}
                },
                in  : {$add: ['$$total', {$week: '$invoiceDate'}]}
            }
        };

        var dateByMonthAggrPayment = {
            $let: {
                vars: {
                    total: {$multiply: [{$year: '$date'}, 100]}
                },
                in  : {$add: ['$$total', {$month: '$date'}]}
            }
        };

        var dateByWeekAggrPayment = {
            $let: {
                vars: {
                    total: {$multiply: [{$year: '$date'}, 100]}
                },

                in: {$add: ['$$total', {$week: '$date'}]}
            }
        };

        if (startDate && endDate) {
            startDate = new Date(startDate);
            endDate = new Date(endDate);

            momentStartDate = moment(startDate);
            momentEndDate = moment(endDate);

            startYear = momentStartDate.year();
            startMonth = momentStartDate.month();
            startWeek = momentStartDate.isoWeek();

            endYear = momentEndDate.year();
            endMonth = momentEndDate.month();
            endWeek = momentEndDate.isoWeek();

            startDateByWeeek = startYear * 100 + startWeek;
            startDateByMonth = startYear * 100 + startMonth;
            endDateByWeeek = endYear * 100 + endWeek;
            endDateByMonth = endYear * 100 + endMonth;

            matchObject.invoiceDate = {$gte: startDate, $lte: endDate};
            matchObjectPayment.date = {$gte: startDate, $lte: endDate};

            if (groupedKey === 'week') {
                wTrackMatchObject.dateByWeek = {$gte: startDateByWeeek, $lte: endDateByWeeek};
            } else {
                wTrackMatchObject.dateByMonth = {$gte: startDateByMonth, $lte: endDateByMonth};
            }
        }

        if (groupedKey === 'week') {
            groupObject._id = '$dateByWeek';
            groupPaymentObject._id = '$dateByWeek';
            groupWetrackObject._id = '$dateByWeek';
            projectionObject.dateByWeek = dateByWeekAggr;
            projectionPaymentObject.dateByWeek = dateByWeekAggrPayment;
        } else {
            groupObject._id = '$dateByMonth';
            groupPaymentObject._id = '$dateByMonth';
            groupWetrackObject._id = '$dateByMonth';
            projectionObject.dateByMonth = dateByMonthAggr;
            projectionPaymentObject.dateByMonth = dateByMonthAggrPayment;
        }

        function invoiceGrouper(parallelCb) {
            Invoice.aggregate([{
                $match: matchObject
            }, {
                $project: projectionObject
            }, {
                $lookup: {
                    from        : 'projectMembers',
                    localField  : 'project',
                    foreignField: 'projectId',
                    as          : 'salesPersons'
                }
            }, {
                $lookup: {
                    from        : 'Customers',
                    localField  : 'supplier',
                    foreignField: '_id',
                    as          : 'supplier'
                }
            }, {
                $lookup: {
                    from        : 'Project',
                    localField  : 'project',
                    foreignField: '_id',
                    as          : 'project'
                }
            }, {
                $project: {
                    salesPersons: {
                        $filter: {
                            input: '$salesPersons',
                            as   : 'salesPerson',
                            cond : salesManagersMatch
                        }
                    },
                    paymentInfo : 1,
                    year        : 1,
                    month       : 1,
                    week        : 1,
                    dateByWeek  : 1,
                    dateByMonth : 1,
                    project     : {$arrayElemAt: ['$project', 0]},
                    supplier    : {$arrayElemAt: ['$supplier', 0]}
                }
            }, {
                $project: {
                    salesPersons: 1,
                    size        : {$size: '$salesPersons'},
                    paymentInfo : 1,
                    year        : 1,
                    month       : 1,
                    week        : 1,
                    dateByWeek  : 1,
                    dateByMonth : 1,
                    supplier    : 1,
                    project     : '$project.name'
                }
            }, {
                $match: {
                    size: {$gt: 0}
                }
            }, {
                $unwind: {
                    path                      : '$salesPersons',
                    preserveNullAndEmptyArrays: true
                }
            }, {
                $lookup: {
                    from        : 'Employees',
                    localField  : 'salesPersons.employeeId',
                    foreignField: '_id',
                    as          : 'salesPerson'
                }
            }, {
                $project: {
                    paymentInfo: 1,
                    year       : 1,
                    month      : 1,
                    week       : 1,
                    dateByWeek : 1,
                    dateByMonth: 1,
                    supplier   : 1,
                    project    : 1,
                    salesPerson: {$arrayElemAt: ['$salesPerson', 0]}
                }
            }, {
                $project: {
                    paymentInfo: 1,
                    year       : 1,
                    month      : 1,
                    week       : 1,
                    dateByWeek : 1,
                    dateByMonth: 1,
                    project    : 1,
                    supplier   : {
                        _id : '$supplier._id',
                        name: '$supplier.name'
                    },
                    salesPerson: {
                        _id : '$salesPerson._id',
                        name: '$salesPerson.name'
                    }
                }
            }, {
                $group: {
                    _id           : null,
                    salesArray    : {
                        $addToSet: {
                            _id : '$salesPerson._id',
                            name: '$salesPerson.name'
                        }
                    },
                    suppliersArray: {
                        $addToSet: {
                            _id : '$supplier._id',
                            name: '$supplier.name'
                        }
                    },
                    root          : {$push: '$$ROOT'},
                    projects      : {$addToSet: '$project'}
                }
            }, {
                $unwind: '$root'
            }, {
                $project: {
                    _id           : 0,
                    salesArray    : 1,
                    suppliersArray: 1,
                    projects      : 1,
                    salesPerson   : '$root.salesPerson',
                    paymentInfo   : '$root.paymentInfo',
                    year          : '$root.year',
                    month         : '$root.month',
                    week          : '$root.week',
                    dateByWeek    : '$root.dateByWeek',
                    dateByMonth   : '$root.dateByMonth',
                    supplier      : '$root.supplier'
                }
            }, {
                $group: groupObject
            }, {
                $unwind: '$root'
            }, {
                $group: {
                    _id            : {
                        _id : '$root.salesPerson._id',
                        name: '$root.salesPerson.name',
                        date: '$_id'
                    },
                    invoicedBySales: {$sum: '$root.paymentInfo.total'},
                    salesArray     : {$first: '$root.salesArray'},
                    projects       : {$first: '$root.projects'},
                    suppliersArray : {$first: '$root.suppliersArray'},
                    root           : {$push: '$$ROOT'}
                }
            }, {
                $unwind: '$root'
            }, {
                $project: {
                    _id            : 0,
                    salesPerson    : '$_id._id',
                    invoicedBySales: 1,
                    salesArray     : 1,
                    projects       : 1,
                    suppliersArray : 1,
                    date           : '$_id.date',
                    invoiced       : '$root.invoiced',
                    year           : '$root.root.year',
                    month          : '$root.root.month',
                    week           : '$root.root.week',
                    supplier       : '$root.root.supplier',
                    paymentInfo    : '$root.root.paymentInfo'
                }
            }, {
                $group: {
                    _id               : {
                        _id : '$supplier._id',
                        name: '$supplier.name',
                        date: '$date'
                    },
                    invoicedBySupplier: {$sum: '$paymentInfo.total'},
                    salesArray        : {$first: '$salesArray'},
                    projects          : {$first: '$projects'},
                    suppliersArray    : {$first: '$suppliersArray'},
                    root              : {$push: '$$ROOT'}
                }
            }, {
                $unwind: '$root'
            }, {
                $project: {
                    _id               : 0,
                    supplier          : '$_id._id',
                    salesPerson       : '$root.salesPerson',
                    invoicedBySales   : '$root.invoicedBySales',
                    invoicedBySupplier: 1,
                    salesArray        : 1,
                    projects          : 1,
                    suppliersArray    : 1,
                    date              : '$_id.date',
                    invoiced          : '$root.invoiced',
                    year              : '$root.year',
                    month             : '$root.month',
                    week              : '$root.week'
                }
            }, {
                $group: {
                    _id           : {
                        date    : '$date',
                        invoiced: '$invoiced'
                    },
                    sales         : {
                        $addToSet: {
                            salesPerson    : '$$ROOT.salesPerson',
                            invoicedBySales: '$$ROOT.invoicedBySales'
                        }
                    },
                    salesArray    : {$first: '$salesArray'},
                    suppliersArray: {$first: '$suppliersArray'},
                    projects      : {$first: '$projects'},
                    suppliers     : {
                        $addToSet: {
                            supplier          : '$$ROOT.supplier',
                            invoicedBySupplier: '$$ROOT.invoicedBySupplier'
                        }
                    }
                }
            }, {
                $project: {
                    date          : '$_id.date',
                    invoiced      : '$_id.invoiced',
                    salesArray    : 1,
                    projects      : 1,
                    suppliersArray: 1,
                    sales         : 1,
                    suppliers     : 1,
                    _id           : 0
                }
            }], parallelCb);
        };

        function paymentGrouper(parallelCb) {
            Payment.aggregate([{
                $match: matchObjectPayment
            }, {
                $lookup: {
                    from        : 'Invoice',
                    localField  : 'invoice',
                    foreignField: '_id',
                    as          : 'invoice'
                }
            }, {
                $project: projectionPaymentObject
            }, {
                $project: {
                    dateByWeek : 1,
                    dateByMonth: 1,
                    date       : 1,
                    year       : 1,
                    month      : 1,
                    week       : 1,
                    paidAmount : 1,
                    project    : '$invoice.project',
                    invoiceDate: '$invoice.invoiceDate'
                }
            }, {
                $match: {
                    invoiceDate: {$gte: new Date('2016-03-01')}
                }
            }, {
                $lookup: {
                    from        : 'projectMembers',
                    localField  : 'project',
                    foreignField: 'projectId',
                    as          : 'salesPersons'
                }
            }, {
                $lookup: {
                    from        : 'Project',
                    localField  : 'project',
                    foreignField: '_id',
                    as          : 'project'
                }
            }, {
                $project: {
                    dateByWeek  : 1,
                    dateByMonth : 1,
                    date        : 1,
                    year        : 1,
                    month       : 1,
                    week        : 1,
                    paidAmount  : 1,
                    project     : {$arrayElemAt: ['$project', 0]},
                    salesPersons: {
                        $filter: {
                            input: '$salesPersons',
                            as   : 'salesPerson',
                            cond : salesManagersMatch
                        }
                    }
                }
            }, {
                $project: {
                    size        : {$size: '$salesPersons'},
                    dateByWeek  : 1,
                    dateByMonth : 1,
                    date        : 1,
                    year        : 1,
                    month       : 1,
                    week        : 1,
                    paidAmount  : 1,
                    project     : '$project.name',
                    salesPersons: 1
                }
            }, {
                $match: {
                    size: {$gt: 0}
                }
            }, {
                $unwind: {
                    path                      : '$salesPersons',
                    preserveNullAndEmptyArrays: true
                }
            }, {
                $lookup: {
                    from        : 'Employees',
                    localField  : 'salesPersons.employeeId',
                    foreignField: '_id',
                    as          : 'salesPerson'
                }
            }, {
                $project: {
                    dateByWeek  : 1,
                    dateByMonth : 1,
                    date        : 1,
                    year        : 1,
                    month       : 1,
                    project     : 1,
                    week        : 1,
                    paidAmount  : 1,
                    salesPersons: 1,
                    salesPerson : {$arrayElemAt: ['$salesPerson', 0]}
                }
            }, {
                $project: {
                    dateByWeek  : 1,
                    dateByMonth : 1,
                    date        : 1,
                    year        : 1,
                    month       : 1,
                    week        : 1,
                    paidAmount  : 1,
                    project     : 1,
                    salesPersons: 1,
                    salesPerson : {
                        _id : '$salesPerson._id',
                        name: '$salesPerson.name'
                    }
                }
            }, {
                $group: {
                    _id       : null,
                    salesArray: {
                        $addToSet: {
                            _id : '$salesPerson._id',
                            name: '$salesPerson.name'
                        }
                    },
                    projects  : {$addToSet: '$project'},
                    root      : {$push: '$$ROOT'}
                }
            }, {
                $unwind: '$root'
            }, {
                $project: {
                    _id        : 0,
                    salesArray : 1,
                    projects   : 1,
                    salesPerson: '$root.salesPerson',
                    paidAmount : '$root.paidAmount',
                    year       : '$root.year',
                    month      : '$root.month',
                    week       : '$root.week',
                    dateByWeek : '$root.dateByWeek',
                    dateByMonth: '$root.dateByMonth'
                }
            }, {
                $group: groupPaymentObject
            }, {
                $unwind: '$root'
            }, {
                $group: {
                    _id        : {
                        _id : '$root.salesPerson._id',
                        name: '$root.salesPerson.name',
                        date: '$_id'
                    },
                    paidBySales: {$sum: '$root.paidAmount'},
                    projects   : {$first: '$root.projects'},
                    salesArray : {$first: '$root.salesArray'},
                    root       : {$push: '$$ROOT'}
                }
            }, {
                $unwind: '$root'
            }, {
                $project: {
                    _id        : 0,
                    salesPerson: '$_id._id',
                    paidBySales: 1,
                    salesArray : 1,
                    projects   : 1,
                    date       : '$_id.date',
                    paid       : '$root.paid',
                    year       : '$root.root.year',
                    month      : '$root.root.month',
                    week       : '$root.root.week'
                }
            }, {
                $group: {
                    _id        : {
                        date: '$date',
                        paid: '$paid'
                    },
                    paidBySales: {
                        $addToSet: {
                            salesPerson: '$$ROOT.salesPerson',
                            paidBySales: '$$ROOT.paidBySales'
                        }
                    },
                    salesArray : {$first: '$salesArray'},
                    projects   : {$first: '$projects'}
                }
            }, {
                $project: {
                    date       : '$_id.date',
                    paid       : '$_id.paid',
                    salesArray : 1,
                    projects   : 1,
                    paidBySales: 1,
                    _id        : 0
                }
            }], parallelCb);

        };

        function revenueGrouper(parallelCb) {
            var salesManagerMatch = {
                $or: [{
                    $and: [{
                        $eq: ['$startDateCond', null]
                    }, {
                        $eq: ['$endDateCond', null]
                    }]
                }, {
                    $and: [{
                        $eq: ['$startDateCond', null]
                    }, {
                        $gte: ['$endDateCond', '$dateByWeek']
                    }]
                }, {
                    $and: [{
                        $lte: ['$startDateCond', '$dateByWeek']
                    }, {
                        $eq: ['$endDateCond', null]
                    }]
                }, {
                    $and: [{
                        $lte: ['$startDateCond', '$dateByWeek']
                    }, {
                        $gte: ['$endDateCond', '$dateByWeek']
                    }]
                }]
            };

            Wetrack.aggregate([{
                $match: wTrackMatchObject
            }, {
                $lookup: {
                    from        : 'projectMembers',
                    localField  : 'project',
                    foreignField: 'projectId',
                    as          : 'projectMembers'
                }
            }, {
                $project: {
                    salesPersons: {
                        $filter: {
                            input: '$projectMembers',
                            as   : 'projectMember',
                            cond : {$eq: ['$$projectMember.projectPositionId', objectId(CONSTANTS.SALESMANAGER)]}
                        }
                    },
                    dateByWeek  : 1,
                    dateByMonth : 1,
                    revenue     : 1
                }
            }, {
                $unwind: {
                    path                      : '$salesPersons',
                    preserveNullAndEmptyArrays: true
                }
            }, {
                $project: {
                    startDateCond: {
                        $let: {
                            vars: {
                                startDate: {$ifNull: ['$salesPersons.startDate', null]}
                            },
                            in  : {$cond: [{$eq: ['$$startDate', null]}, null, {$add: [{$multiply: [{$year: '$$startDate'}, 100]}, {$week: '$$startDate'}]}]}
                        }
                    },

                    endDateCond: {
                        $let: {
                            vars: {
                                endDate: {$ifNull: ['$salesPersons.endDate', null]}
                            },
                            in  : {$cond: [{$eq: ['$$endDate', null]}, null, {$add: [{$multiply: [{$year: '$$endDate'}, 100]}, {$week: '$$endDate'}]}]}
                        }
                    },

                    salesPersons: '$salesPersons.employeeId',
                    dateByWeek  : 1,
                    dateByMonth : 1,
                    revenue     : 1
                }
            }, {
                $project: {
                    isValid     : salesManagerMatch,
                    salesPersons: 1,
                    dateByWeek  : 1,
                    dateByMonth : 1,
                    revenue     : 1
                }
            }, {
                $group: groupWetrackObject
            }, {
                $unwind: '$root'
            }, {
                $group: {
                    _id           : {
                        _id : '$root.salesPersons',
                        date: '$_id'
                    },
                    revenueBySales: {$sum: '$root.revenue'},
                    root          : {$push: '$$ROOT'}
                }
            }, {
                $unwind: '$root'
            }, {
                $project: {
                    _id           : 0,
                    salesPerson   : '$_id._id',
                    revenueBySales: 1,
                    date          : '$_id.date',
                    revenue       : '$root.revenue'
                }
            }, {
                $lookup: {
                    from        : 'Employees',
                    localField  : 'salesPerson',
                    foreignField: '_id',
                    as          : 'salesPerson'
                }
            }, {
                $project: {
                    salesPerson   : {$arrayElemAt: ['$salesPerson', 0]},
                    revenueBySales: 1,
                    date          : 1,
                    revenue       : 1
                }
            }, {
                $project: {
                    salesPerson   : {
                        _id : '$salesPerson._id',
                        name: '$salesPerson.name'
                    },
                    revenueBySales: 1,
                    date          : 1,
                    revenue       : 1
                }
            }, {
                $group: {
                    _id       : null,
                    salesArray: {
                        $addToSet: '$salesPerson'
                    },
                    root      : {$push: '$$ROOT'}
                }
            }, {
                $unwind: '$root'
            }, {
                $project: {
                    _id           : 0,
                    salesArray    : 1,
                    revenueBySales: '$root.revenueBySales',
                    date          : '$root.date',
                    revenue       : '$root.revenue',
                    salesPerson   : '$root.salesPerson._id'
                }
            }, {
                $group: {
                    _id           : {
                        date   : '$date',
                        revenue: '$revenue'
                    },
                    revenueBySales: {
                        $addToSet: {
                            salesPerson   : '$$ROOT.salesPerson',
                            revenueBySales: '$$ROOT.revenueBySales'
                        }
                    },
                    salesArray    : {$first: '$salesArray'}
                }
            }, {
                $project: {
                    date          : '$_id.date',
                    revenue       : '$_id.revenue',
                    revenueBySales: 1,
                    _id           : 0,
                    salesArray    : 1
                }
            }], parallelCb);

        };

        async.parallel({
            /*invoiced: invoiceGrouper,*/
            paid: paymentGrouper,
            /* revenue : revenueGrouper*/
        }, function (err, response) {
            var sales;
            var _sales;
            var suppliers;

            /*function mergeByProperty(arr1, arr2, prop) {
             _.each(arr2, function (arr2obj) {
             var arr1obj = _.find(arr1, function (arr1obj) {
             return arr1obj[prop] === arr2obj[prop];
             });

             if (arr1obj) {
             _.extend(arr1obj, arr2obj);
             } else {
             arr1.push(arr2obj);
             }

             });
             }

             if (err) {
             return next(err);
             }

             sales = response.invoiced[0] ? response.invoiced[0].salesArray : [];
             _sales = response.paid[0] ? response.paid[0].salesArray : [];
             sales = sales.concat(_sales);
             /!*_sales = response.revenue[0] ? response.revenue[0].salesArray : [];
             sales = sales.concat(_sales);*!/
             sales = _.uniq(sales, function (elm) {
             if (elm._id) {
             return elm._id.toString();
             }
             });

             suppliers = response.invoiced[0] ? response.invoiced[0].suppliersArray : [];
             suppliers = _.uniq(suppliers, function (elm) {
             if (elm._id) {
             return elm._id.toString();
             }
             });

             mergeByProperty(response.invoiced, response.paid, 'date');
             // mergeByProperty(response.invoiced, response.revenue, 'date');

             response.invoiced = _.sortBy(response.invoiced, 'date');

             // mergeByProperty(response.invoiced, response.paid, 'date');
             // mergeByProperty(response.invoiced, response.revenue, 'date');

             // response.invoiced = _.sortBy(response.invoiced, 'date');

             res.status(200).send({payments: response.invoiced, sales: sales, suppliers: suppliers});*/
            res.status(200).send(response);
        });
    };

    this.profit = function (req, res, next) {
        var JournalEntry = models.get(req.session.lastDb, 'journalEntry', journalEntry);
        var projectionContent = req.params.byContent || 'salesManager';

        projectionContent = projectionContent.toUpperCase();

        var options = req.query;
        var _dateMoment = moment();
        var _endDateMoment;
        var startDate = options.startDate;
        var endDate = options.endDate;
        var salesManagers = objectId(CONSTANTS[projectionContent]);
        var salesManagersMatch = {
            'salesPersons.projectPositionId': salesManagers
        };
        var match;

        if (!startDate && !endDate) {
            _endDateMoment = moment(_dateMoment).subtract(1, 'years');
            startDate = _dateMoment.startOf('month').hours(0).minutes(0);
            endDate = _endDateMoment.endOf('month').hours(23).minutes(59);
        } else {
            startDate = moment(new Date(startDate)).startOf('day');
            endDate = moment(new Date(endDate)).endOf('day');
        }

        startDate = startDate.toDate();
        endDate = endDate.toDate();

        salesManagersMatch.$or = [{
            'salesPersons.startDate': null,
            'salesPersons.endDate'  : null
        }, {
            'salesPersons.startDate': {$lte: endDate},
            'salesPersons.endDate'  : null
        }, {
            'salesPersons.startDate': null,
            'salesPersons.endDate'  : {$gte: startDate}
        }, {
            'salesPersons.startDate': {$lte: endDate},
            'salesPersons.endDate'  : {$gte: startDate}
        }];

        match = {
            'sourceDocument.model': 'Invoice',
            journal               : objectId('565ef6ba270f53d02ee71d65'),

            credit: {
                $exists: true,
                $ne    : 0
            },

            date: {
                $lte: endDate,
                $gte: startDate
            }
        };

        JournalEntry.aggregate([{
            $match: match
        }, {
            $lookup: {
                from        : 'Invoice',
                localField  : 'sourceDocument._id',
                foreignField: '_id',
                as          : 'invoice'
            }
        }, {
            $project: {
                credit : 1,
                date   : 1,
                project: 1,
                invoice: {$arrayElemAt: ['$invoice', 0]}
            }
        }, {
            $project: {
                credit   : 1,
                date     : 1,
                project  : '$invoice.project',
                invoiceId: '$invoice._id',
                products : '$invoice.products'
            }
        }, {
            $unwind: {
                path                      : '$products',
                preserveNullAndEmptyArrays: true
            }
        }, {
            $lookup: {
                from        : 'journalentries',
                localField  : 'products.jobs',
                foreignField: 'sourceDocument._id',
                as          : 'jobFinished'
            }
        }, {
            $unwind: {
                path                      : '$jobFinished',
                preserveNullAndEmptyArrays: true
            }
        }, {
            $match: {
                'jobFinished.journal': objectId('56f2a96f58dfeeac4be1582a'),
                'jobFinished.credit' : {
                    $exists: true,
                    $ne    : 0
                }
            }
        }, {
            $group: {
                _id    : '$invoiceId',
                project: {$first: '$project'},
                revenue: {$first: '$credit'},
                date   : {$first: '$date'},
                cost   : {$sum: '$jobFinished.credit'}
            }
        }, {
            $lookup: {
                from        : 'projectMembers',
                localField  : 'project',
                foreignField: 'projectId',
                as          : 'salesPersons'
            }
        }, {
            $unwind: {
                path                      : '$salesPersons',
                preserveNullAndEmptyArrays: true
            }
        }, {
            $match: salesManagersMatch
        }, {
            $project: {
                salesPersons: {
                    _id      : '$salesPersons.employeeId',
                    startDate: '$salesPersons.startDate',
                    endDate  : '$salesPersons.endDate'
                },

                revenueSum: '$revenue',

                profit: {$subtract: ['$revenue', '$cost']},
                credit: '$cost',
                year  : {$year: '$date'},
                month : {$month: '$date'},
                week  : {$week: '$date'},
                date  : 1
            }
        }, {
            $project: {
                isValid     : {
                    $or: [{
                        $and: [{
                            $eq: ['$salesPersons.startDate', null]
                        }, {
                            $eq: ['$salesPersons.endDate', null]
                        }]
                    }, {
                        $and: [{
                            $lte: ['$salesPersons.startDate', '$date']
                        }, {
                            $eq: ['$salesPersons.endDate', null]
                        }]
                    }, {
                        $and: [{
                            $eq: ['$salesPersons.startDate', null]
                        }, {
                            $gte: ['$salesPersons.endDate', '$date']
                        }]
                    }, {
                        $and: [{
                            $lte: ['$salesPersons.startDate', '$date']
                        }, {
                            $gte: ['$salesPersons.endDate', '$date']
                        }]
                    }]
                },
                salesPersons: '$salesPersons._id',
                revenueSum  : 1,
                profit      : 1,
                credit      : 1,
                date        : 1,
                dateByMonth : {$add: [{$multiply: ['$year', 100]}, '$month']},
                dateByWeek  : {$add: [{$multiply: ['$year', 100]}, '$week']}
            }
        }, {
            $match: {
                isValid: true
            }
        }, {
            $lookup: {
                from        : 'Employees',
                localField  : 'salesPersons',
                foreignField: '_id',
                as          : 'salesPersons'
            }
        }, {
            $project: {
                salesPersons: {$arrayElemAt: ['$salesPersons', 0]},
                revenueSum  : 1,
                profit      : 1,
                credit      : 1,
                date        : 1,
                dateByMonth : 1,
                dateByWeek  : 1
            }
        }, {
            $project: {
                salesPersons: {
                    _id : '$salesPersons._id',
                    name: {$concat: ['$salesPersons.name.first', ' ', '$salesPersons.name.last']}
                },

                revenueSum : 1,
                profit     : 1,
                credit     : 1,
                date       : 1,
                dateByMonth: 1,
                dateByWeek : 1
            }
        }, {
            $group: {
                _id         : null,
                salesArray  : {
                    $addToSet: {
                        _id : '$salesPersons._id',
                        name: '$salesPersons.name'
                    }
                },
                totalProfit : {$sum: '$profit'},
                totalRevenue: {$sum: '$revenueSum'},
                root        : {$push: '$$ROOT'}
            }
        }, {
            $unwind: '$root'
        }, {
            $project: {
                _id         : 0,
                salesArray  : 1,
                totalProfit : 1,
                totalRevenue: 1,
                salesPersons: '$root.salesPersons._id',
                profit      : '$root.profit',
                revenueSum  : '$root.revenueSum',
                dateByMonth : '$root.dateByMonth',
                dateByWeek  : '$root.dateByWeek'
            }
        }, {
            $group: {
                _id           : '$dateByMonth', // todo change dinamicly
                profitByMonth : {$sum: '$profit'},
                revenueByMonth: {$sum: '$revenueSum'},
                root          : {$push: '$$ROOT'},
                salesArray    : {$first: '$salesArray'},
                totalProfit   : {$first: '$totalProfit'},
                totalRevenue  : {$first: '$totalRevenue'}
            }
        }, {
            $unwind: '$root'
        }, {
            $project: {
                _id           : 0,
                salesPerson   : '$root.salesPersons',
                dateByMonth   : '$root.dateByMonth',
                dateByWeek    : '$root.dateByWeek',
                profit        : '$root.profit',
                revenueSum    : '$root.revenueSum',
                profitByMonth : 1,
                revenueByMonth: 1,
                totalProfit   : 1,
                totalRevenue  : 1,
                salesArray    : 1
            }
        }, {
            $group: {
                _id                : {
                    date       : '$dateByMonth',
                    salesPerson: '$salesPerson'
                },
                profitBySales      : {$sum: '$profit'},
                revenueBySales     : {$sum: '$revenueSum'},
                profitByMonth      : {$first: '$profitByMonth'},
                totalProfitBySales : {$first: '$totalProfitBySales'},
                totalRevenueBySales: {$first: '$totalRevenueBySales'},
                revenueByMonth     : {$first: '$revenueByMonth'},
                salesArray         : {$first: '$salesArray'},
                totalProfit        : {$first: '$totalProfit'},
                totalRevenue       : {$first: '$totalRevenue'},
                root               : {$push: '$$ROOT'}
            }
        }, {
            $group: {
                _id                : '$_id.salesPerson',
                totalProfitBySales : {$sum: '$profitBySales'},
                totalRevenueBySales: {$sum: '$revenueBySales'},
                root               : {$push: '$$ROOT'}
            }
        }, {
            $unwind: '$root'
        }, {
            $group: {
                _id                : '$root._id',
                profitBySales      : {$first: '$root.profitBySales'},
                revenueBySales     : {$first: '$root.revenueBySales'},
                profitByMonth      : {$first: '$root.profitByMonth'},
                totalProfitBySales : {$first: '$totalProfitBySales'},
                totalRevenueBySales: {$first: '$totalRevenueBySales'},
                revenueByMonth     : {$first: '$root.revenueByMonth'},
                salesArray         : {$first: '$root.salesArray'},
                totalProfit        : {$first: '$root.totalProfit'},
                totalRevenue       : {$first: '$root.totalRevenue'}
            }
        }, {
            $group: {
                _id: '$_id.date',

                profitBySales: {
                    $addToSet: {
                        salesPerson   : '$_id.salesPerson',
                        profitBySales : '$profitBySales',
                        revenueBySales: '$revenueBySales'
                    }
                },

                profitByMonth      : {$first: '$profitByMonth'},
                revenueByMonth     : {$first: '$revenueByMonth'},
                salesArray         : {$first: '$salesArray'},
                totalProfitBySales : {$first: '$totalProfitBySales'},
                totalRevenueBySales: {$first: '$totalRevenueBySales'},
                totalProfit        : {$first: '$totalProfit'},
                totalRevenue       : {$first: '$totalRevenue'}
            }
        }, {
            $project: {
                date               : '$_id',
                totalProfit        : 1,
                revenueByMonth     : 1,
                totalProfitBySales : 1,
                totalRevenueBySales: 1,
                totalRevenue       : 1,
                salesArray         : 1,
                profitBySales      : 1,
                profitByMonth      : 1,
                _id                : 0
            }
        }]).exec(function (err, response) {
            var sales;

            if (err) {
                return next(err);
            }

            sales = response[0] ? response[0].salesArray : [];
            response = _.sortBy(response, 'date');

            res.status(200).send({sales: sales, data: response});
        });
    };
};

module.exports = wTrack;

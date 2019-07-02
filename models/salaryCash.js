module.exports = (function () {
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var salaryCashSchema = new mongoose.Schema({
        dataKey: String,
        month  : Number,
        year   : Number,

        calc: {
            salary: Number,
            onCash: Number,
            onCard: Number
        },

        paid: {
            onCash: Number,
            onCard: Number
        },

        diff: {
            onCash: Number,
            onCard: Number,
            total : Number
        },

        employeesArray: [{
            ID: Number,

            employee: {
                _id : {type: ObjectId, ref: 'Employees', default: null},
                name: String
            },
            
            baseSalary: Number,

            calc: {
                salary: Number,
                onCash: Number,
                onCard: Number
            },

            paid: {
                onCash: Number,
                onCard: Number
            },

            diff: {
                onCash: Number,
                onCard: Number,
                total : Number
            }
        }]
    }, {collection: 'SalaryCash'});

    mongoose.model('SalaryCash', salaryCashSchema);

    if (!mongoose.Schemas) {
        mongoose.Schemas = {};
    }

    mongoose.Schemas.SalaryCash = salaryCashSchema;
})();

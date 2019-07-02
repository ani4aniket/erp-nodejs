module.exports = (function () {

    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var Schema = mongoose.Schema({
        name       : {type: String, required: true},
        date       : {type: Date, default: Date.now},
        type       : {type: String, default: ''},
        transaction: {type: String, enum: ['invoice', 'payment', 'accrual', 'writeoff'], default: 'Invoice'},
        currency   : {
            name: {type: String, default: 'USD'}
        },
        description: {type: String, default: ''},

        createdBy: {
            user: {type: ObjectId, ref: 'Users', default: null},
            date: {type: Date, default: Date.now}
        },

        editedBy: {
            user: {type: ObjectId, ref: 'Users', default: null},
            date: {type: Date}
        },

        debitAccount : {type: ObjectId, ref: 'chartOfAccount', default: null},
        creditAccount: {type: ObjectId, ref: 'chartOfAccount', default: null}

    });

    mongoose.model('journal', Schema);

    if (!mongoose.Schemas) {
        mongoose.Schemas = {};
    }

    mongoose.Schemas.journal = Schema;
})();

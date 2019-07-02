module.exports = (function () {
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var vacationSchema = new mongoose.Schema({
        ID         : Number,
        employee   : {type: ObjectId, ref: 'Employees', default: null},
        department : {type: ObjectId, ref: 'Department', default: null},
        vacations  : Object,
        month      : Number,
        year       : Number,
        vacArray   : Array,
        monthTotal : Number,
        dateByMonth: Number
    }, {collection: 'Vacation'});

    vacationSchema.set('toJSON', {virtuals: true});

    mongoose.model('Vacation', vacationSchema);

    if (!mongoose.Schemas) {
        mongoose.Schemas = {};
    }

    mongoose.Schemas.Vacation = vacationSchema;
})();

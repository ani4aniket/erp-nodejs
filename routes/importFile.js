var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var csv = require('fast-csv');
var xlsx = require('node-xlsx');
var fs = require('fs');
var importMap = require('../helpers/importer/map/csvMap');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var async = require('async');
var logWriter = require('../helpers/logger.js');
var ImportSchema = mongoose.Schemas.Imports;
var ImportHandler = require('../handlers/import');
var Uploader = require('../services/fileStorage/index');
var uploader = new Uploader();
var path = require('path');

module.exports = function (models) {
    var imports = new ImportHandler(models);

    function getExtension(filename) {
        var i = filename.lastIndexOf('.');
        return (i < 0) ? '' : filename.substr(i);
    }

    function importFileToDb(req, res, next) {
        var headers = req.headers;
        var files = req.files;
        var modelName;
        var filePath;
        var error;
        var task;
        var rows = 0;
        var collection;
        var schema;
        var Model;
        var keysAliases = [];
        var expertedKey = [];
        var userId = req.session.uId;
        var fileName;
        var timeStamp;
        var delimiter;
        var dir = path.join('importFiles', userId);
        var ImportModel = models.get(req.session.lastDb, 'Imports', ImportSchema);

        ImportModel.remove({user: userId}, function () {});

        uploader.postFile(dir, files.attachfile, {userId: userId}, function (err, file) {
            if (err) {
                return next(err);
            }

            file = file[0];

            if (req.session && req.session.loggedIn && req.session.lastDb) {

                if (headers && files && files.attachfile) {

                    filePath = decodeURIComponent(file.shortPas);
                    //filePath = files.attachfile.path;
                    modelName = headers.modelname;
                    //fileName = files.attachfile.name;
                    fileName = file.name;

                    timeStamp = headers.timestamp;
                    delimiter = headers.delimiter;

                    if(delimiter === 'undefined') {
                        delimiter = ',';
                    }

                    if (!modelName || !filePath) {
                        error = new Error((!modelName) ? 'Model name empty' : 'File path empty');
                        error.status = 400;
                        next(error);

                        return;
                    }
                    /*  task = importMap[modelName];

                     if (!task) {
                     error = new Error('Model name\"' + modelName + '\" is not valid');
                     error.status = 400;
                     next(error);

                     return;
                     }
                     aliases = task.aliases;
                     collection = task.collection;
                     schema = mongoose.Schemas[task.schema];
                     Model = models.get(req.session.lastDb, collection, schema);

                     for (var key in aliases) {
                     keysAliases.push(key);
                     expertedKey.push(aliases[key]);
                     }*/

                    switch (getExtension(filePath)) {

                        case '.csv':
                            importCsvToTemporaryCollection(res, next, file, delimiter);
                            break;
                        case '.xlsx':
                        case '.xls':
                            importXlsxToTemporaryDb(res, next, file);
                            break;
                        default:
                            error = new Error('Extension file \"' + getExtension(filePath) + '\" not support');
                            error.status = 400;
                            next(error);
                    }

                } else {
                    res.status(400).send('Bad Request');
                }
            } else {
                res.status(401).send('Unauthorized');
            }
        });


        function importCsvToTemporaryCollection(res, next, file, delimiter) {
            var headers;

            var delimiterLocal = delimiter || ',';

            var q = async.queue(function (data, callback) {
                var tasksWaterflow;

                function getData(callback) {
                    callback(null, data);
                }

                tasksWaterflow = [getData, saveItemToTemporaryDb];

                async.waterfall(tasksWaterflow, function (err) {
                    if (err) {
                        error = err;

                        /*if (err.message !== 'topology was destroyed') {
                            error = err;
                        }*/
                        //console.log(err);
                    }
                    callback();
                });
            }, 20);


            csv
                .fromPath(filePath, {delimiter: delimiterLocal})/*   //todo check validation later

                 .validate(function (data) {

                 if (!headers) {
                 headers = data;

                 if (headers.length != expertedKey.length) {
                 error = new Error('Different lengths headers');
                 error.status = 400;
                 return next(error);
                 }

                 for (var i = expertedKey.length - 1; i >= 0; i--) {

                 if (headers[i] !== expertedKey[i]) {
                 error = new Error('Field \"' + headers[i] + '\" not valid. Need ' + expertedKey[i]);
                 error.status = 400;
                 logWriter.log("importFile.js importCsvToDb " + error);

                 return next(error);
                 }
                 }
                 return false;
                 }

                 rows++;
                 return true;
                 })*/
                .on("data", function (data) {
                    q.push([data], function (err) {
                        if (err) {
                            console.log('err ', err);
                            error = err;
                            logWriter.error(error);
                        }
                    });
                });

            q.drain = function () {
                var obj = {};

                if (!error) {
                    obj.countRows = rows;
                    res.status(200).send(obj);
                } else {
                    next(error);
                }
            };
        }

        function importXlsxToTemporaryDb(res, next, file) {
            var obj = xlsx.parse(filePath);
            var sheet;
            var rows;

            if (!obj) {
                error = new Error('Parse Error');
                return next(error);
            }

            sheet = obj[0];

            if (sheet && sheet.data) {
                async.eachLimit(sheet.data, 5, function (data, cb) {
                    var tasksWaterflow;

                    if (data.length) {
                        rows++;

                        function getData(callback) {
                            callback(null, data);
                        }

                        tasksWaterflow = [getData, saveItemToTemporaryDb];

                        async.waterfall(tasksWaterflow, function (err) {

                            if (err) {
                                cb(err);
                            } else {
                                cb(null);
                            }
                        });
                    } else {
                        return cb(1);  // todo remake
                    }
                }, function (err) {
                    var obj = {};

                    if (err && err !== 1) {
                        next(err);
                    } else {
                        obj.countRows = rows;
                        res.status(200).send(obj);
                    }
                });
            } else {
                res.status(400).send('Bad request');
            }
        }

        function importCsvToDb(res, next) {
            var headers;
            var q = async.queue(function (data, callback) {
                var tasksWaterflow;

                function getData(callback) {
                    callback(null, data);
                }

                tasksWaterflow = [getData, parse, findAndReplaceObjectId, saveToDbOrUpdate];

                async.waterfall(tasksWaterflow, function (err) {
                    if (err) {
                        error = err;
                    }
                    callback();
                });
            }, 1000);

            csv
                .fromPath(filePath)
                .validate(function (data) {

                    if (!headers) {
                        headers = data;

                        if (headers.length != expertedKey.length) {
                            error = new Error('Different lengths headers');
                            error.status = 400;
                            return next(error);
                        }

                        for (var i = expertedKey.length - 1; i >= 0; i--) {

                            if (headers[i] !== expertedKey[i]) {
                                error = new Error('Field \"' + headers[i] + '\" not valid. Need ' + expertedKey[i]);
                                error.status = 400;
                                logWriter.log("importFile.js importCsvToDb " + error);

                                return next(error);
                            }
                        }
                        return false;
                    }

                    rows++;
                    return true;
                })
                .on("data", function (data) {
                    q.push([data], function (err) {
                        if (err) {
                            error = err;
                            logWriter.error(error);
                        }
                    });
                });

            q.drain = function () {
                var obj = {};

                if (!error) {
                    obj.countRows = rows;
                    res.status(200).send(obj);
                } else {
                    next(error);
                }
            };
        }

        function importXlsxToDb(res, next) {
            var obj = xlsx.parse(filePath);
            var sheet;
            var headers;

            if (!obj) {
                error = new Error('Parse Error');
                return next(error);
            }
            sheet = obj[0];

            if (sheet && sheet.data) {
                async.eachLimit(sheet.data, 100, function (data, cb) {
                        var error;
                        var tasksWaterflow;

                        if (!headers) {
                            headers = data;

                            if (headers.length !== expertedKey.length) {
                                error = new Error('Different lengths headers');
                                error.status = 400;
                                cb(error);
                            }

                            for (var i = expertedKey.length - 1; i >= 0; i--) {

                                if (headers[i] !== expertedKey[i]) {
                                    error = new Error('Field \"' + headers[i] + '\" not valid. Need \"' + expertedKey[i] + '\"');
                                    error.status = 400;
                                    cb(error);
                                }
                            }
                            cb();
                        } else {

                            rows++;

                            function getData(callback) {
                                callback(null, data);
                            }

                            tasksWaterflow = [getData, parse, findAndReplaceObjectId, saveToDbOrUpdate];

                            async.waterfall(tasksWaterflow, function (err) {

                                if (err) {
                                    cb(err);
                                } else {
                                    cb();
                                }
                            });
                        }
                    },
                    function (err) {
                        var obj = {};
                        if (err) {
                            next(err);
                        } else {
                            obj.countRows = rows;
                            res.status(200).send(obj);
                        }
                    }
                );
            } else {
                res.status(400).send('Bad request');
            }
        }

        function parse(data, callback) {
            var insertObj = {};
            var arrayKeys = task.arrayKeys;
            //console.log(data);
            //console.log(arrayKeys);

            Object.keys(data).forEach(function (key) {
                var val = data[key];

                if (val && arrayKeys && arrayKeys[keysAliases[key]] === true) {
                    if (typeof val == 'number') {
                        var arr = [];
                        arr.push(val);
                        val = arr;
                    } else {
                        val = val.split(',');
                    }
                }

                if (val) {
                    insertObj[keysAliases[key]] = val;
                }
            });

            callback(null, insertObj);
        }

        function findAndReplaceObjectId(obj, callback) {
            var findCollection;
            var collection;
            var schema;
            var Model;
            var replaceObj = obj;
            var objectIdKeyList = task.objectIdList;

            if (objectIdKeyList) {

                async.each(Object.keys(objectIdKeyList), function (key, cb) {
                        var val = obj[key];
                        var objID = [];
                        var length;

                        findCollection = importMap[objectIdKeyList[key]];

                        if (val && findCollection) {
                            collection = findCollection.collection;
                            schema = mongoose.Schemas[findCollection.schema];
                            Model = models.get(req.session.lastDb, collection, schema);

                            if (Array.isArray(val)) {
                                length = val.length;

                                if (length > 0) {
                                    async.each(Object.keys(val), function (index, calb) {
                                            Model.findOne({'ID': val[index]}, function (err, mod) {

                                                if (err) {
                                                    calb(err);
                                                } else {
                                                    if (mod) {
                                                        objID.push(mod._id);
                                                        calb();
                                                    } else {
                                                        error = new Error('ID = ' + val[index] + ' (' + key + ') not exist in BD');
                                                        error.status = 400;
                                                        calb(error);
                                                    }
                                                }
                                            });
                                        },
                                        function (err) {
                                            if (!err) {
                                                replaceObj[key] = objID;
                                                cb();
                                            } else {
                                                cb(err);
                                            }
                                        });
                                } else {
                                    cb();
                                }
                            } else {
                                Model.findOne({'ID': val}, function (err, mod) {
                                    if (err) {
                                        return cb(err);
                                    }

                                    if (!mod) {
                                        error = new Error('ID = ' + val + ' (' + key + ') not exist in BD');
                                        error.status = 400;

                                        return cb(error);
                                    }

                                    replaceObj[key] = mod._id;
                                    cb();
                                });
                            }
                        } else {
                            cb();
                        }
                    },

                    function (err) {
                        if (!err) {
                            callback(null, replaceObj);
                        } else {
                            callback(err);
                        }
                    });
            } else {
                callback(null, replaceObj);
            }
        }

        function saveToDbOrUpdate(objectToDb, callback) {
            var id = objectToDb.ID;
            var objectForSave;

            if (id) {
                Model.update({ID: id}, objectToDb, {upsert: true}, function (err) {

                    if (err) {
                        callback(err);
                    } else {
                        callback();
                    }

                });
            } else {
                objectForSave = new Model(objectToDb);
                objectForSave.save(function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback();
                    }
                });
            }
        }

        function saveItemToTemporaryDb(objectToDb, callback) {
            var importModel;
            var ImportModel = models.get(req.session.lastDb, 'Imports', ImportSchema);


            importModel = new ImportModel({
                user     : userId,
                result   : objectToDb,
                fileName : fileName,
                filePath : filePath,
                timeStamp: +timeStamp
            });

            importModel.save(callback);
        }
    }

    router.post('/', multipartMiddleware, importFileToDb);
    router.get('/imported', imports.getImportMapObject);
    router.post('/imported', imports.saveImportedData);
    router.get('/preview', imports.getForPreview);
    router.get('/history', imports.getImportHistory);
    router.get('/merge', imports.getConflictedItems);
    router.post('/merge', imports.saveMergedData);

    return router;
};

define([
    'jQuery'
], function ($) {
    'use strict';
    var getData = function (url, data, callback, context) {
        if (typeof callback !== 'function') {
            callback = function () {
            };
        }

        $.get(url, data, function (response) {
            if (context) {
                callback(response, context);
            } else {
                callback(response);
            }
        }).fail(function (err) {
            callback({error: err});
        });
    };

    var sendData = function (url, data, method, callback, options) {
        var ajaxObject;

        method = method.toUpperCase() || 'POST';
        ajaxObject = {
            url        : url,
            contentType: 'application/json',
            data       : JSON.stringify(data),
            type       : method,

            success: function (response) {
                callback(null, response);
            },

            error: function (jxhr) {
                callback(jxhr);
            }
        };

        $.ajax(ajaxObject);
    };

    var postData = function (url, data, callback) {
        sendData(url, data, 'POST', callback);
    };

    var putData = function (url, data, callback) {
        sendData(url, data, 'PUT', callback);
    };

    var patchData = function (url, data, callback, contentType) {
        sendData(url, data, 'PATCH', callback, contentType);
    };

    var deleteData = function (url, data, callback, contentType) {
        sendData(url, data, 'DELETE', callback, contentType);
    };

    return {
        getData   : getData,
        postData  : postData,
        putData   : putData,
        patchData : patchData,
        deleteData: deleteData
    };
});

define([
    'Underscore',
    'dataService',
    'text!templates/main/selectTemplate.html'
], function (_, dataService, selectTemplate) {
    var get = function (id, url, data, field, content, isCreate, canBeEmpty, parrrentContentId, defaultId, $parentContainer, setAccount) {
        defaultId = defaultId || 0;
        dataService.getData(url, data, function (response) {

            var $thisEl = content && content.$el ? content.$el : $;
            var curEl = ($parentContainer) ? $parentContainer.find(id) : $thisEl.find(id);

            content.responseObj[id] = [];
            if (canBeEmpty) {
             content.responseObj[id].push({_id: "", name: "Select"});
             }
            content.responseObj[id] = content.responseObj[id].concat(_.map(response.data, function (item) {
                return {
                    _id          : item._id,
                    name         : item[field],
                    level        : item.projectShortDesc || item.count || item.email || item.rate || '',
                    imageSrc     : item.imageSrc || '',
                    chartAccount : item.chartAccount || null,
                    currency     : item.currency || item.symbol || '',
                    account      : item.account || '',
                    debitAccount : item.debitAccount || '',
                    creditAccount: item.creditAccount || '',
                    type         : item.type || item.isDefault || ''
                };
            }));

            if (isCreate) {
                // add check on data-id exist. if not set first one in responseObj
                // if element was set from model data-id exist.
                if (!curEl.attr('data-id')) {
                    if (canBeEmpty) {   // took off element Select from responseObj, changed on default select at start
                        curEl.text('Select');
                    } else {
                        if (content.responseObj[id] && content.responseObj[id].length) {
                            curEl.text(content.responseObj[id][defaultId].name).attr('data-id', content.responseObj[id][defaultId]._id);
                            curEl.attr('data-type', content.responseObj[id][defaultId].type);

                            if (content.responseObj[id][defaultId].currency) {
                                curEl.attr('data-symbol', content.responseObj[id][defaultId].currency);
                            }
                        }
                    }
                }
            }

            if (parrrentContentId && typeof(parrrentContentId) === 'string' && parrrentContentId.split('=').length === 2) {
                parrrentContentId = parrrentContentId.split('=')[1];
            }

            if (parrrentContentId) {
                var current = _.filter(content.responseObj[id], function (item) {
                    return item._id === parrrentContentId;
                });

                if (current[0]) {
                    if (current[0].level) {
                        curEl.attr('data-level', current[0].level);
                    }

                    if (current[0].chartAccount) {
                        content.$el.find('#account').text(current[0].chartAccount.name).attr('data-id', current[0].chartAccount._id);
                    }

                    curEl.text(current[0].name).attr('data-id', current[0]._id);
                }
            }
        });
    };

    var getProductTypeOrCategory = function (id, url, data, field, content, isCreate, canBeEmpty, parrrentContentId, defaultId, $parentContainer) {
        defaultId = defaultId || 0;
        content.responseObj = {};
        dataService.getData(url, data, function (response) {
            var curEl = ($parentContainer) ? $parentContainer.find(id) : $(id);
            var defaultObj;
            var firstElement;

            content.responseObj[id] = [];
            /*if (canBeEmpty) {
             content.responseObj[id].push({_id: "", name: "Select"});
             }*/
            content.responseObj[id] = content.responseObj[id].concat(_.map(response.data, function (item) {
                return {
                    _id          : item._id,
                    name         : item[field],
                    level        : item.projectShortDesc || item.count || item.email || '',
                    imageSrc     : item.imageSrc || '',
                    chartAccount : item.chartAccount || null,
                    currency     : item.currency || item.symbol || '',
                    debitAccount : item.debitAccount || '',
                    creditAccount: item.creditAccount || '',
                    type         : item.type || ''
                };
            }));

            if (isCreate) {
                //add check on data-id exist. if not set first one in responseObj
                //if element was sat from model data-id exist.
                if (!curEl.attr('data-id')) {
                    if (canBeEmpty) {   // took off element Select from responseObj, changed on default select at start
                        curEl.text('Select');
                    } else {
                        defaultObj = _.findWhere(content.responseObj[id], {_id: defaultId});
                        if (defaultObj) {
                            curEl.text(defaultObj.name).attr('data-id', defaultObj._id);
                            curEl.attr('data-type', defaultObj.type);
                        } else {
                            firstElement = content.responseObj[id] && content.responseObj[id].length ? content.responseObj[id][0] : {
                                _id : null,
                                name: 'Select'
                            };
                            curEl.text(firstElement.name).attr('data-id', firstElement._id);
                            curEl.attr('data-type', firstElement.type);
                        }

                    }
                }
            }

            if (parrrentContentId && parrrentContentId.split('=').length === 2) {
                parrrentContentId = parrrentContentId.split('=')[1];
            }

            if (parrrentContentId) {
                var current = _.filter(content.responseObj[id], function (item) {
                    return item._id === parrrentContentId;
                });

                if (current[0].level) {
                    curEl.attr('data-level', current[0].level);
                }

                curEl.text(current[0].name).attr('data-id', current[0]._id);
            }
        });
    };

    var getParrentDepartment = function (id, url, data, content, isCreate, canBeEmpty) {
        dataService.getData(url, data, function (response) {
            content.responseObj[id] = [];
            if (canBeEmpty) {
                content.responseObj[id].push({_id: '', name: 'Select'});
            }
            content.responseObj[id] = content.responseObj[id].concat(_.map(response.data, function (item) {
                return {
                    _id             : item._id,
                    name            : item.name,
                    level           : item.nestingLevel,
                    parentDepartment: item.parentDepartment
                };
            }));

            if (isCreate) {
                $(id).text(content.responseObj[id][0].name).attr('data-id', content.responseObj[id][0]._id);
            }
        });
    };

    var getParrentCategory = function (id, url, data, content, isCreate, canBeEmpty, parrrentContentId) {
        dataService.getData(url, data, function (response) {
            content.responseObj[id] = [];
            if (canBeEmpty) {
                content.responseObj[id].push({_id: '', name: 'Select'});
            }
            content.responseObj[id] = content.responseObj[id].concat(_.map(response.data, function (item) {
                return {
                    _id      : item._id,
                    name     : item.name,
                    level    : item.nestingLevel,
                    parent   : item.parent,
                    fullName : item.fullName,
                    account  : item.account,
                    classIcon: item.classIcon
                };
            }));

            if (isCreate) {
                $(id).text(content.responseObj[id][0].name).attr("data-id", content.responseObj[id][0]._id).attr("data-level", content.responseObj[id][0].level).attr("data-fullname", content.responseObj[id][0].fullName);

                /*if (content.responseObj[id][0].classIcon) {
                 $(id).prepend('<div style="display: inline-block" class="' + content.responseObj[id][0].classIcon + '"></div>');
                 }*/
            }

            if (parrrentContentId) {
                var current = _.filter(content.responseObj[id], function (item) {
                    return item._id === parrrentContentId;
                });

                if (current[0].level) {
                    $(id).attr('data-level', current[0].level);
                }

                if (current[0].classIcon) {
                    $(id).addClass(current[0].classIcon);
                }

                if (current[0].fullName) {
                    $(id).attr('data-fullname', current[0].fullName);
                }

                $(id).text(current[0].name).attr('data-id', current[0]._id);
            }

        });
    };

    var getParrentCategoryById = function (id, url, data, content, isCreate, canBeEmpty) {
        dataService.getData(url, data, function (response) {

            content.responseObj[id] = [];
            if (canBeEmpty) {
                content.responseObj[id].push({_id: "", name: "Select"});
            }

            content.responseObj[id][0] = {
                _id     : response._id,
                name    : response.name,
                level   : response.nestingLevel,
                parent  : response.parent,
                fullName: response.fullName
            };

            if (isCreate) {
                $(id).text(content.responseObj[id][0].name).attr("data-id", content.responseObj[id][0]._id).attr("data-level", content.responseObj[id][0].level).attr("data-fullname", content.responseObj[id][0].fullName);
            }
        });
    };

    var getPriority = function (id, content, isCreate) {
        dataService.getData("/tasks/priority", {}, function (response) {
            content.responseObj[id] = _.map(response.data, function (item) {
                return {_id: item.priority, name: item.priority};
            });
            if (isCreate) {
                $(id).text(content.responseObj[id][2].name).attr("data-id", content.responseObj[id][2]._id);
            }

        });
    };

    var getWorkflow = function (nameId, statusId, url, data, field, content, isCreate, callback) {
        dataService.getData(url, data, function (response) {
            content.responseObj[nameId] = _.map(response.data, function (item) {
                return {_id: item._id, name: item[field], status: item.status};
            });
            var wNames = $.map(response.data, function (item) {
                return item.wName;
            });
            wNames = _.uniq(wNames);
            content.responseObj[statusId] = $.map(wNames, function (wName) {
                return {_id: wName, name: wName};
            });

            if (isCreate) {
                if (content.responseObj[nameId] && content.responseObj[nameId][0]) {
                    content.$el.find(nameId).text(content.responseObj[nameId][0].name).attr("data-id", content.responseObj[nameId][0]._id);
                }

                if (content.responseObj[statusId] && content.responseObj[statusId][0]) {
                    content.$el.find(statusId).text(content.responseObj[statusId][0].name).attr("data-id", content.responseObj[statusId][0]._id);
                }
            }
            if (callback) {
                callback(content.responseObj[nameId]);
            }
        });
    };

    var get2name = function (id, url, data, content, isCreate, canBeEmpty, parrrentContentId) {
        dataService.getData(url, data, function (response) {
            content.responseObj[id] = [];
            if (canBeEmpty) {
                content.responseObj[id].push({_id: "", name: "Select"});
            }
            content.responseObj[id] = content.responseObj[id].concat(_.map(response.data, function (item) {
                return {_id: item._id, name: item.name.first + " " + item.name.last};
            }));

            if (isCreate) {
                $(id).text(content.responseObj[id][0].name).attr("data-id", content.responseObj[id][0]._id);
            }
            if (parrrentContentId) {
                var current = _.filter(response.data, function (item) {
                    return item._id == parrrentContentId;
                });

                $(id).text(current[0].name.first + " " + current[0].name.last).attr("data-id", current[0]._id);
            }
        });
    };
    var getCompanies = function (id, url, data, content, isCreate, canBeEmpty, parrrentContentId) {
        dataService.getData(url, data, function (response) {
            content.responseObj[id] = [];
            if (canBeEmpty) {
                content.responseObj[id].push({_id: "", name: "Select"});
            }
            content.responseObj[id] = content.responseObj[id].concat(_.map(response.data, function (item) {
                return {_id: item._id, name: item.name.first};
            }));

            if (isCreate) {
                $(id).text(content.responseObj[id][0].name).attr("data-id", content.responseObj[id][0]._id);
            }
            if (parrrentContentId) {
                var current = _.filter(response.data, function (item) {
                    return item._id == parrrentContentId;
                });
                $(id).text(current[0].name.first).attr("data-id", current[0]._id);
            }
        });
    };

    var getProductsInfo = function (id, url, data, field, content, isCreate, canBeEmpty, parrrentContentId, defaultId) {
        dataService.getData(url, data, function (response) {
            content.responseObj[id] = [];

            if (canBeEmpty) {
                content.responseObj[id].push({_id: "", name: "Select"});
            }

            content.responseObj[id] = content.responseObj[id].concat(_.map(response.data, function (item) {
                return {
                    _id     : item._id,
                    name    : item.name,
                    level   : item.nestingLevel,
                    parent  : item.parent,
                    fullName: item.fullName
                };
            }));

            //$(id).text(content.responseObj[id][0].name).attr("data-id", content.responseObj[id][0]._id);

            if (parrrentContentId) {
                var current = _.filter(response.data, function (item) {
                    return item._id == parrrentContentId;
                });
                //$(id).text(current[0].[]).attr("data-id", current[0]._id);
            }

        });
    };

    var showSelect = function (e, prev, next, context, number) {
        e.stopPropagation();

        var targetEl = $(e.target);
        var attr = targetEl.closest('td').attr("data-content");
        var data = context.responseObj["#" + attr];
        var targetParent = $(e.target).parent();
        var elementVisible;
        var newSel;
        var parent;
        var currentPage = 1;
        var s;
        var start;
        var end;
        var allPages;
        var $curUl;
        var curUlHeight;
        var curUlPosition;
        var curUlOffset;
        var $window = $(window);

        if (!data) {
            attr = targetEl.attr("id") || targetEl.attr("data-id");
            data = context.responseObj["#" + attr];

            if (targetEl.parents('td').hasClass('jobs') && !data) {
                attr = 'jobs';
                data = context.responseObj["#" + attr];
            }
        }

        elementVisible = number || 10;

        if (targetParent.prop('tagName') !== 'TR') {
            newSel = targetParent.find(".newSelectList");
        } else {
            newSel = targetParent.find(".emptySelector");
        }

        if (prev || next) {
            newSel = $(e.target).closest(".newSelectList");
            if (!data) {
                data = context.responseObj["#" + newSel.parent().find(".current-selected").attr("id")];
            }
        }

        parent = newSel.length > 0 ? newSel.parent() : $(e.target).parent();

        if (parent.prop('tagName') === 'TR') {
            parent = $(e.target);
        }

        if (newSel.length && newSel.is(":visible") && !prev && !next) {
            newSel.remove();
            return;
        }

        $(".newSelectList").hide(); //fixed by Liliya for generateWTracks

        if ((prev || next) && newSel.length) {
            currentPage = newSel.data("page");
            newSel.remove();
        } else if (newSel.length) {
            newSel.show();
            return;
        }

        if (prev) {
            currentPage--;
        }
        if (next) {
            currentPage++;
        }

        s = "<ul class='newSelectList' data-page='1'><li class='selected' id='createJob'>Generate</li> </ul>";
        start = (currentPage - 1) * elementVisible;
        end = Math.min(currentPage * elementVisible, data ? data.length : 0);
        allPages = Math.ceil(data ? data.length : 0 / elementVisible);

        if (data && data.length) {
            parent.append(_.template(selectTemplate, {
                collection    : data.slice(start, end),
                currentPage   : currentPage,
                allPages      : allPages,
                start         : start,
                end           : end,
                dataLength    : data.length,
                elementVisible: elementVisible
            }));

            $curUl = parent.find('.newSelectList');
            curUlOffset = $curUl.offset();
            curUlPosition = $curUl.position();
            curUlHeight = $curUl.outerHeight();

            if (curUlOffset.top + curUlHeight > $window.scrollTop() + $window.height()) {
                $curUl.css({
                    top: curUlPosition.top - curUlHeight - parent.outerHeight()
                });
            }
            if (attr === 'jobs') {
                $curUl.append("<li id='createJob' class='selected'>Generate</li>");
            }

        } else if (attr === 'jobs') {
            parent.append(s);
        }

        return false;
    };

    var employeesByDep = function (options) {
        options = options || {};

        var e = options.e;
        var targetEl;
        var attr;
        var data;
        var elementVisible;
        var targetParent;
        var newSel;

        var parent;
        var currentPage = 1;
        var s;
        var start;
        var end;
        var allPages;

        if (!e) {
            return;
        }

        e.stopPropagation();

        targetEl = $(e.target);
        data = context.responseObj["#employee"];

        targetParent = targetEl.parent();

        elementVisible = number || 10;

        if (targetParent.prop('tagName') !== 'TR') {
            newSel = targetParent.find(".newSelectList");
        } else {
            newSel = targetParent.find(".emptySelector");
        }

        if (prev || next) {
            newSel = $(e.target).closest(".newSelectList");

            if (!data) {
                data = context.responseObj["#" + newSel.parent().find(".current-selected").attr("id")];
            }
        }

        parent = newSel.length > 0 ? newSel.parent() : $(e.target).parent();

        if (parent.prop('tagName') === 'TR') {
            parent = $(e.target);
        }

        if (newSel.length && newSel.is(":visible") && !prev && !next) {
            newSel.hide();
            return;
        }

        $(".newSelectList").hide();

        if ((prev || next) && newSel.length) {
            currentPage = newSel.data("page");
            newSel.remove();
        } else if (newSel.length) {
            newSel.show();
            return;
        }

        if (prev) {
            currentPage--;
        }
        if (next) {
            currentPage++;
        }

        s = "<ul class='newSelectList' data-page='" + currentPage + "'>";
        start = (currentPage - 1) * elementVisible;
        end = Math.min(currentPage * elementVisible, data.length);
        allPages = Math.ceil(data.length / elementVisible);

        parent.append(_.template(selectTemplate, {
            collection    : data.slice(start, end),
            currentPage   : currentPage,
            allPages      : allPages,
            start         : start,
            end           : end,
            dataLength    : data.length,
            elementVisible: elementVisible
        }));

        return false;
    };

    var showProductsSelect = function (e, prev, next, context) {
        var data = context.responseObj['.productsDd'];
        var elementVisible = 10;
        var $targetEl = $(e.target);
        var newSel = $targetEl.parent().find('.newSelectList');
        var parent;
        var currentPage;
        var allPages;
        var start;
        var end;
        var id;

        if (prev || next) {
            newSel = $targetEl.closest('.newSelectList');
            id = newSel.parent().find('.current-selected').attr('id') || newSel.parent().find('.current-selected').attr('data-id'); // add for Pagination
            data = context.responseObj['#' + id];
        }

        parent = newSel.length > 0 ? newSel.parent() : $(e.target).parent();
        currentPage = 1;

        if (newSel.length && newSel.is(':visible') && !prev && !next) {
            newSel.hide();
            return;
        }
        $('.newSelectList').hide();

        if ((prev || next) && newSel.length) {
            currentPage = newSel.data('page');
            newSel.remove();
        } else if (newSel.length) {
            newSel.show();

            return;
        }
        if (prev) {
            currentPage--;
        }
        if (next) {
            currentPage++;
        }

        start = (currentPage - 1) * elementVisible;
        end = Math.min(currentPage * elementVisible, data.length);
        allPages = Math.ceil(data.length / elementVisible);

        if (!data.length) {
            data.push({
                _id : 'createNewEl',
                name: 'Create New'
            });
            end = 1;
        }

        parent.append(_.template(selectTemplate, {
            collection    : data.slice(start, end),
            currentPage   : currentPage,
            allPages      : allPages,
            start         : start,
            end           : end,
            dataLength    : data.length,
            elementVisible: elementVisible
        }));
    };

    var showSelectPriority = function (e, prev, next, context) {
        var data = context.responseObj["#priority"];
        var elementVisible = 25;
        var newSel = $(e.target).parent().find(".newSelectList");
        if (prev || next) {
            newSel = $(e.target).closest(".newSelectList");
            data = context.responseObj["#" + newSel.parent().find(".current-selected").attr("id")];
        }
        var parent = newSel.length > 0 ? newSel.parent() : $(e.target).parent();
        var currentPage = 1;
        if (newSel.length && newSel.is(":visible") && !prev && !next) {
            newSel.hide();
            return;
        }
        $(".newSelectList").hide();
        if ((prev || next) && newSel.length) {
            currentPage = newSel.data("page");
            newSel.remove();
        }
        else if (newSel.length) {
            newSel.show();
            return;
        }
        if (prev) {
            currentPage--;
        }
        if (next) {
            currentPage++;
        }
        var s = "<ul class='newSelectList' data-page='" + currentPage + "'>";
        var start = (currentPage - 1) * elementVisible;
        var end = Math.min(currentPage * elementVisible, data.length);
        var allPages = Math.ceil(data.length / elementVisible);
        parent.append(_.template(selectTemplate, {
            collection    : data.slice(start, end),
            currentPage   : currentPage,
            allPages      : allPages,
            start         : start,
            end           : end,
            dataLength    : data.length,
            elementVisible: elementVisible,
            level         : data.level
        }));
    };

    var fetchWorkflow = function (data, callback) {
        if (typeof data === 'function') {
            callback = data;
            data = {wId: 'Purchase Order'};
        }

        dataService.getData('/workflows/getFirstForConvert', data, callback);
    };

    return {
        get                     : get,
        get2name                : get2name,
        getPriority             : getPriority,
        getWorkflow             : getWorkflow,
        showSelect              : showSelect,
        getParrentDepartment    : getParrentDepartment,
        getParrentCategory      : getParrentCategory,
        getCompanies            : getCompanies,
        showSelectPriority      : showSelectPriority,
        showProductsSelect      : showProductsSelect,
        fetchWorkflow           : fetchWorkflow,
        getParrentCategoryById  : getParrentCategoryById,
        getProductTypeOrCategory: getProductTypeOrCategory
//            getProductsInfo       : getProductsInfo
    };
});

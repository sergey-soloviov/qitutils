var qitcommonsModule = angular.module("qitcommonsModule", []);

qitcommonsModule.service("$qListController", ["$location", "$timeout", function ($location, $timeout) {
    return function(scope, config) {
        this.queryTimer = undefined;
        var filterName = (config.name + "Filter");

        scope.page = config.page;
        if (!angular.isNumber(scope.page)) {
            if (!isNaN(parseInt($location.search().p))) {
                scope.page = parseInt($location.search().p)
            } else {
                scope.page = 1
            }
        }
        scope.pageSize = config.pageSize || 10;
        scope.query = $location.search().q;
        var listParams = {query: scope.query, page: scope.page, pageSize: scope.pageSize};
        listParams = angular.extend(listParams, config.params);
        scope.list = config.service(listParams, config.success, config.error);

        if (config.filter) {
            if (typeof config.filter == "string") {
                $(config.filter).focus();
            } else if (config.filter.focus) {
                config.filter.focus();
            }
        }

        scope.clearFilter = function () {
            $timeout.cancel(this.queryTimer);
            scope.query = null;
            $location.search("q", undefined);
        };

        scope.typingFilter = function (query) {
            $timeout.cancel(this.queryTimer);
            this.queryTimer = $timeout(function () {
                scope.filter(query);
            }, config.typingTimeout || 1000);
        };

        scope.filter = function (query) {
            $timeout.cancel(this.queryTimer);
            if (angular.isDefined(query)) {
                scope.query = query;
            }
            if (typeof scope.query == "string" || scope.query == null) {
                $location.search("p", undefined);

                if (scope.query) {
                    $location.search("q", scope.query);
                } else {
                    $location.search("q", undefined);
                }
            }
        }
    }
}]);

qitcommonsModule.directive("qPager", ["$location", "$parse", function ($location, $parse) {
    return {
        restrict: "E",
        replace: true,
        template: '<ul class="pagination">' +
        '<li ng-repeat="page in pages" ng-class="{active: page.active, disabled: page.disabled}" ng-show="totalPages>1">' +
        '<span ng-if="page.disabled">{{page.name}}</span>' +
        '<a ng-if="!page.disabled" href="" ng-click="page.action()">{{page.name}}</a>' +
        '</li>' +
        '</ul>',
        scope: {
            totalItems: '@',
            page: "=",
            pageSize: "@",
            change: "@"
        },
        controller: function ($scope) {
            if (!$scope.change) {
                $scope.changeCallback = function (scope, data) {
                    var page = data.$page;
                    if (page == 0 || page == 1) {
                        $location.search("p", undefined);
                    } else {
                        $location.search("p", page);
                    }
                }
            } else {
                $scope.changeCallback = $parse($scope.change);
            }

            function fixParamTypes() {
                $scope.totalItems = parseInt($scope.totalItems);
                $scope.page = $scope.page;
                $scope.pageSize = parseInt($scope.pageSize);
            }

            function getTotalPages() {
                return Math.floor(($scope.totalItems + $scope.pageSize - 1) / $scope.pageSize);
            }

            function buildPagerItem(name, disabled, hrefPage) {
                return {
                    name: name,
                    active: $scope.page == name,
                    disabled: disabled,
                    action: function () {
                        $scope.changeCallback($scope.$parent, {$page: hrefPage});
                        $scope.page = hrefPage;
                    }
                };
            }

            var updatePager = function () {
                fixParamTypes();
                $scope.pages = [];
                $scope.totalPages = getTotalPages();

                var lowerEdge = $scope.page - 4;
                var upperEdge = $scope.page + 4;
                if (lowerEdge <= 0) {
                    lowerEdge = 1;
                    upperEdge = lowerEdge + 8;
                }
                if (upperEdge > $scope.totalPages) {
                    upperEdge = $scope.totalPages;
                    lowerEdge = upperEdge - 8;
                }
                if (lowerEdge <= 0) {
                    lowerEdge = 1;
                }

                $scope.pages.push(buildPagerItem("«", $scope.page == 1, $scope.page - 1));
                if (lowerEdge > 1) {
                    $scope.pages.push(buildPagerItem("1", false, 1));
                    $scope.pages.push(buildPagerItem("…", true, 0));
                }
                for (var i = lowerEdge; i <= upperEdge; i++) {
                    $scope.pages.push(buildPagerItem(i, false, i));
                }
                if (upperEdge < $scope.totalPages) {
                    $scope.pages.push(buildPagerItem("…", true, 0));
                    $scope.pages.push(buildPagerItem($scope.totalPages, false, $scope.totalPages));
                }
                $scope.pages.push(buildPagerItem("»", $scope.page == $scope.totalPages, $scope.page + 1));
            }

            $scope.$watch("totalItems", updatePager);
            $scope.$watch("page", updatePager);
            $scope.$watch("pageSize", updatePager);
        }
    }
}]);

qitcommonsModule.directive("qDualFormGroup", ["qUtils", function (qUtils) {
    return {
        restrict: "E",
        transclude: true,
        scope: {
            label: "@",
            editMode: "=",
            showLabelAttr: "@showLabel",
            panelClass: "@",
            name: "@"
        },
        template: function (element, attrs) {
            attrs.name = attrs.name || "form_" + generateUUID().replace(/[^0-9a-fA-F]/g, "");
            return '<ng-form name="' + attrs.name + '">' +
                '<div class="form-group" ng-class="styles">' +
                '<label ng-if="showLabel" class="col-sm-2 control-label">{{label}}</label>' +
                '<div ng-if="!showLabel" class="col-sm-2"></div>' +
                '<div ng-transclude>' +
                '</div>' +
                '</div>' +
                '</ng-form>';
        },
        controller: function ($scope, $element, $attrs, $transclude) {
            $scope.showLabel = qUtils.bool($scope.showLabelAttr);
            $scope.viewVisible = true;
            $scope.editVisible = true;
            $scope.styles = [$scope.panelClass];

            var transcludeElement = $element.find("div[ng-transclude]");
            var hasNoChildren = function (view) {
                var count = 0;
                var nodeName = view ? "QDUALFORMGROUPVIEW" : "QDUALFORMGROUPEDIT";
                transcludeElement.children().each(function (i, e) {
                    if (nodeName == e.nodeName.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase()) {
                        count++;
                    }
                });
                return count == 0;
            };
            var showHideMe = function () {
                if (($scope.editMode && hasNoChildren(false))
                    || (!$scope.editMode && hasNoChildren(true))) {
                    $element.hide();
                } else {
                    $element.show();
                }
            };
            var domUpdateListener = function (e) {
                if (e.target == e.currentTarget || e.target.parentElement != e.currentTarget) {
                    return;
                }
                showHideMe();
            };

            this.$watchEditMode = function (listener) {
                $scope.$watch("editMode", listener);
            };

            $scope.$watch("showLabelAttr", function (value) {
                $scope.showLabel = qUtils.bool(value);
            });

            if ($scope.name && $scope.name != "") {
                $scope.$watch($scope.name, function (value) {
                    $scope.$parent[$scope.name] = value;
                });
                $scope.$parent[$scope.name] = $scope.name;
            }
            this.$watchEditMode(showHideMe);
            transcludeElement.bind("DOMNodeInserted", domUpdateListener);
            transcludeElement.bind("DOMNodeRemoved", domUpdateListener);
        }
    }
}]);

var qDualFormGroupItem = function (template) {
    return {
        require: "^qDualFormGroup",
        restrict: "E",
        transclude: true,
        scope: {
            offset: "@",
            width: "@",
            panelClass: "@"
        },
        template: template,
        link: function (scope, element, attrs, ctrl) {
            scope.width = scope.width || 6;
            ctrl.$watchEditMode(function (value) {
                scope.editMode = value;
            });
            scope.styles = ["col-sm-" + scope.width, "col-md-" + scope.width, "col-lg-" + scope.width];
            if (scope.offset) {
                scope.styles.push("col-sm-offset-" + scope.offset);
                scope.styles.push("col-md-offset-" + scope.offset);
                scope.styles.push("col-lg-offset-" + scope.offset);
            }
            if (scope.panelClass) {
                scope.styles.push(scope.panelClass);
            }
        }
    }
};

qitcommonsModule.directive("qDualFormGroupView", function () {
    return qDualFormGroupItem('<div ng-if="!editMode" ng-class="styles"><p class="form-control-static" ng-transclude></p></div>');
});

qitcommonsModule.directive("qDualFormGroupEdit", function () {
    return qDualFormGroupItem('<div ng-if="editMode" ng-class="styles" ng-transclude></div>');
});

qitcommonsModule.directive("qMessage", function () {
    return {
        require: "^form",
        restrict: "E",
        transclude: true,
        scope: {
            "for": "@",
            "error": "@"
        },
        template: '<span class="help-block" ng-transclude></span>',
        link: function (scope, elements, attrs, ctrl) {
            var element = $("span", elements);
            scope.$watch(function () {
                return ctrl[attrs['for']].$error[attrs.error];
            }, function (value) {
                if (value) {
                    element.fadeIn();
                } else {
                    element.hide();
                }
            });
            scope.$watch(function () {
                return ctrl[attrs['for']].$dirty;
            }, function (value) {
                element.toggleClass("ng-dirty", value);
            });
            scope.$watch(function () {
                return ctrl[attrs['for']].$pristine;
            }, function (value) {
                element.toggleClass("ng-pristine", value);
            });
            scope.$watch(function () {
                return ctrl[attrs['for']].$invalid;
            }, function (value) {
                element.toggleClass("ng-invalid", value);
            });
        }
    };
});

qitcommonsModule.directive("qLabel", ["$qUtils", function ($qUtils) {
    return {
        require: "^form",
        restrict: "E",
        transclude: true,
        replace: true,
        scope: {
            "for": "@",
            "disabled": "@",
            "class": "@"
        },
        template: '<label class="q-label control-label" ng-transclude></label>',
        link: function (scope, element, attrs, ctrl) {
            if (!attrs.for) {
                throw new Error("The qLabel directive in form '" + ctrl.$name + "' with text '" + element.text() + "' should have 'for' attribute specified.");
            }
            if (!ctrl[attrs.for]) {
                throw new Error("The qLabel directive in form '" + ctrl.$name + "' with text '" + element.text() + "' references and undefined input with name '" + attrs.for + "'.");
            }
            scope.$watch("disabled", function (value) {
                if ($qUtils.bool(value, false)) {
                    element.addClass("disabled");
                } else {
                    element.removeClass("disabled");
                }
            });
            scope.$watch(function () {
                return ctrl[attrs['for']].$valid;
            }, function (value) {
                element.toggleClass("ng-valid", value);
            });
            scope.$watch(function () {
                return ctrl[attrs['for']].$dirty;
            }, function (value) {
                element.toggleClass("ng-dirty", value);
            });
            scope.$watch(function () {
                return ctrl[attrs['for']].$pristine;
            }, function (value) {
                element.toggleClass("ng-pristine", value);
            });
            scope.$watch(function () {
                return ctrl[attrs['for']].$invalid;
            }, function (value) {
                element.toggleClass("ng-invalid", value);
            });
        }
    };
}]);

qitcommonsModule.service("$qAlert", ["$timeout", function ($timeout) {

    var show = function (args, type) {
        var statusPanel = $('<div class="status-panel alert alert-dismissible fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><span class="alert-body"></span></div>');
        var statusBody = $(".alert-body", statusPanel);

        var finalMessage = args[0];
        var messageParams = args[1];
        if (args.length > 1) {
            messageParams = Array.prototype.slice.call(args, 1)
        }

        var timeout = 10000;
        if (messageParams) {
            for (var i=0;i<messageParams.length;i++) {
                if (finalMessage.indexOf("{" + i + "}") >= 0) {
                    finalMessage = finalMessage.replace("{" + i + "}", messageParams[i]);
                }
            }
            if (messageParams.length > 0 && typeof  messageParams[messageParams.length - 1] === "number") {
                timeout = messageParams[messageParams.length - 1];
            }
        }
        statusPanel.addClass("alert-" + type);
        statusBody.html(finalMessage);
        $(document.body).prepend(statusPanel);
        statusPanel.alert();
        $timeout(function () {
            statusPanel.alert('close');
        }, timeout);
    };

    return {
        success: function (message, params, timeout) {
            show(arguments, "success");
        },
        info: function (message, params, timeout) {
            show(arguments, "info");
        },
        warning: function (message, params, timeout) {
            show(arguments, "warning");
        },
        danger: function (message, params, timeout) {
            show(arguments, "danger");
        }
    };
}]);

qitcommonsModule.directive('qMagnificPopup', function () {
    var expectedOptions = function () {
        var $string = function (value) {
            return value;
        };
        var $bool = function (value) {
            value = value || "false";
            value = value.toLowerCase();
            if (value == "true" || value == "yes" || value == "t" || value == "y" || value == "1" || value == "on") {
                return true
            } else if (value == "false" || value == "no" || value == "f" || value == "n" || value == "0" || value == "off") {
                return false;
            }
            return undefined;
        };
        var $int = function (value) {
            var intVal = Integer.parseInt(value);
            if (intVal == NaN) {
                return undefind;
            } else {
                return intVal;
            }
        };
        var $func = function (value) {

        };
        var $dom = function (value) {

        };
        var $arr = function (value) {

        };
        var $mix = function () {
            var mixArgs = arguments;
            return function (value) {
                for (var i = 0; i < mixArgs.length; i++) {
                    var result = mixArgs[i](value);
                    if (result != undefined) {
                        return result;
                    }
                }
                return undefined;
            }
        };

        var rawOtions = {
            "delegate": $string,
            "type": $string,
            "disableOn": $mix($int, $func),
            "key": $string,
            "mainClass": $string,
            "midClick": $bool,
            "preloader": $bool,
            "focus": $string,
            "closeOnContentClick": $bool,
            "closeOnBgClick": $bool,
            "closeBtnInside": $bool,
            "showCloseBtn": $bool,
            "enableEscapeKey": $bool,
            "modal": $bool,
            "alignTop": $mix($bool, $string),
            "fixedContentPos": $mix($bool, $string),
            "index": $int,
            "fixedBgPos": $mix($bool, $string),
            "overflowY": $string,
            "removalDelay": $int,
            "closeMarkup": $string,
            "prependTo": $dom,
            "gallery.enabled": $bool,
            "gallery.preload": $arr,
            "gallery.navigateByImgClick": $bool,
            "gallery.arrowMarkup": $string,
            "gallery.tPrev": $string,
            "gallery.tNext": $string,
            "gallery.tCounter": $string,
            "retina.ratio": $mix($int, $func),
            "retina.replaceSrc": $func,
            "zoom.enabled": $bool,
            "zoom.duration": $string,
            "zoom.easing": $int,
            "zoom.opener": $func,
            "callbacks.open": $func,
            "callbacks.close": $func,
            "callbacks.beforeOpen": $func,
            "callbacks.elementParse": $func,
            "callbacks.change": $func,
            "callbacks.resize": $func,
            "callbacks.open": $func,
            "callbacks.beforeClose": $func,
            "callbacks.afterClose": $func,
            "callbacks.markupParse": $func,
            "callbacks.updateStatus": $func,
            "callbacks.parseAjax": $func,
            "callbacks.ajaxContentAdded": $func
        };
        var optionsByAttribute = {};


        for (var k in rawOtions) {
            var attribute = k.replace(/\./g, "").toLowerCase();
            optionsByAttribute[attribute] = {
                path: k.split("."),
                parser: rawOtions[k]
            }
        }

        return {
            setOptionByAttribute: function (options, attr, value) {
                var option = optionsByAttribute[attr.toLowerCase()];
                if (option) {
                    var currentOptionsObject = options;
                    for (var i = 0; i < option.path.length; i++) {
                        var path = option.path[i];
                        if (i != (option.path.length - 1)) {
                            currentOptionsObject[path] = {};
                            currentOptionsObject = currentOptionsObject[path];
                        } else {
                            currentOptionsObject[path] = option.parser(value);
                        }
                    }
                }
            }
        };
    }();

    return {
        restrict: 'A',
        link: function ($scope, element, attrs) {
            var options = {};
            for (var attr in attrs) {
                if (attr.match(/magnificPopup.+/)) {
                    var attrName = attr.replace(/qMagnificPopup(.)/, function (a, g1) {
                        return g1.toLowerCase();
                    });

                    expectedOptions.setOptionByAttribute(options, attrName, attrs[attr]);
                }
            }

            element.magnificPopup(options);
        }
    }
});

qitcommonsModule.service("$qUtils", function () {
    return {
        bool: function (value, def) {
            def = def || false;
            var result = value === undefined || value === null ? def : value;
            if (typeof result === "boolean") {
                return result;
            } else if (typeof result === "string") {
                result = result.toLowerCase();
                return result === "true"
                    || result === "yes"
                    || result === "on"
                    || result === "t"
                    || result === "y"
                    || result === "1";
            } else if (typeof result === "number") {
                return !isNaN(result)
                    && result !== Number.NEGATIVE_INFINITY
                    && result !== Number.POSITIVE_INFINITY
                    && result != 0;
            } else if (Array.isArray(result)) {
                return result.length > 0;
            } else if (typeof result === "object") {
                return true;
            } else {
                return def;
            }
        },

        uuid: function () {
            var d = new Date().getTime();
            var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
            return uuid;
        }
    };
});
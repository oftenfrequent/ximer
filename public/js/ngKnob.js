(function () {

    if (!window.angular) {
        throw new Error('ngKnob: angular is not on the window!');
    }

    var ngKnob = angular.module('ngKnob', []);

    var tmpl =  '<div class="ng-knob" style="transform: rotate({{ getRotation() }}deg)">' +
                    '<div class="ng-knob-tick"></div>' +
                '</div>';

    ngKnob.directive('ngKnob', function () {
        return {
            restrict: 'E',
            template: tmpl,
            require: 'ngModel',
            replace: true,
            link: function (scope, element, attrs, ngModelCtrl) {

                var min, max;

                var utilities = {
                    getPrimaryMove: function (e) {
                        var xMovement = Math.abs(e.movementX);
                        var yMovement = Math.abs(e.movementY);
                        return yMovement >= xMovement ? e.movementY * -1 : e.movementX;
                    },
                    calculateNewValue: function (change) {
                        return scope.meterValue + (change * (max / 100));
                    },
                    aboveMax: function (v) {
                        return v > parseInt(max, 10);
                    },
                    belowMin: function (v) {
                        return v < parseInt(min, 10);
                    }
                };

                var calculateChange = function (e) {

                    var change = utilities.getPrimaryMove(e);
                    var newValue = utilities.calculateNewValue(change);

                    if (utilities.aboveMax(newValue)) {
                        setMeterValue(max);
                    } else if (utilities.belowMin(newValue)) {
                        setMeterValue(min);
                    } else {
                        setMeterValue(newValue);
                    }

                };

                var setMeterValue = function (value) {
                    scope.meterValue = value;
                    ngModelCtrl.$setViewValue(value);
                };

                var removeChangeListener = function () {
                    element.off('mousemove', calculateChange);
                };

                var setChangeListener = function () {
                    element.on('mousemove', calculateChange);
                };

                min = attrs.min ? parseInt(attrs.min, 10) : 0;
                max = attrs.max ? parseInt(attrs.max, 10) : 100;

                if (attrs.width) {
                    element.css('width', attrs.width);
                }

                scope.meterValue = 0;

                scope.getRotation = function () {
                    var percentage = scope.meterValue / max;
                    return (240 * percentage) - 120;
                };

                element.on('mousedown', setChangeListener);
                element.on('mouseup', removeChangeListener);
                element.on('mouseleave', removeChangeListener);

                ngModelCtrl.$render = function () {
                    if (!ngModelCtrl.$viewValue) {
                        setMeterValue(max / 2);
                    } else {
                        scope.meterValue = ngModelCtrl.$viewValue;
                    }
                };

            }
        }
    });

})();
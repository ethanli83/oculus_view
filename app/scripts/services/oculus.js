'use strict';

angular.module('oculusViewApp')
    .service('Oculus', ['$q', '$rootScope', function Oculus($q, $rootScope) {
        // AngularJS will instantiate a singleton by calling "new" on this function
        return {
            init: function () {
                var deferred = $q.defer();

                if (!vr.isInstalled()) {
                    deferred.reject('NPVR plugin not installed!');
                }

                vr.load(function (error) {
                    $rootScope.$apply(function () {
                        if (error) {
                            deferred.reject(error);
                        }

                        deferred.resolve();
                    });
                });
                return deferred.promise;
            }
        };
    }]);

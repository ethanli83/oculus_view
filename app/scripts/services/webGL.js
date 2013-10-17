'use strict';

angular.module('oculusViewApp')
    .factory('WebGL', ['$http', '$q', function ($http, $q) {

        return {

            getShaderByUrl: function (gl, fileUrl, type) {
                var deferred = $q.defer();

                $http.get(fileUrl).then(function (res) {
                    var str = res.data;
                    var shader;
                    if (type === 'fs') {
                        shader = gl.createShader(gl.FRAGMENT_SHADER);
                    } else if (type === 'vs') {
                        shader = gl.createShader(gl.VERTEX_SHADER);
                    } else {
                        return null;
                    }

                    gl.shaderSource(shader, str);
                    gl.compileShader(shader);

                    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                        console.log(gl.getShaderInfoLog(shader));
                        return null;
                    }

                    deferred.resolve(shader);
                }, function (error) {
                    deferred.reject(error);
                });

                return deferred.promise;
            },

            getShader: function (gl, id) {
                var shaderScript = document.getElementById(id);
                if (!shaderScript) {
                    return null;
                }

                var str = '';
                var k = shaderScript.firstChild;
                while (k) {
                    if (k.nodeType === 3) {
                        str += k.textContent;
                    }
                    k = k.nextSibling;
                }

                var shader;
                if (shaderScript.type === 'x-shader/x-fragment') {
                    shader = gl.createShader(gl.FRAGMENT_SHADER);
                } else if (shaderScript.type === 'x-shader/x-vertex') {
                    shader = gl.createShader(gl.VERTEX_SHADER);
                } else {
                    return null;
                }

                gl.shaderSource(shader, str);
                gl.compileShader(shader);

                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    console.log(gl.getShaderInfoLog(shader));
                    return null;
                }

                return shader;
            },

            getProgram: function (gl, vsId, fsId) {
                var fragmentShader = this.getShader(gl, fsId);
                var vertexShader = this.getShader(gl, vsId);

                var shaderProgram = gl.createProgram();
                gl.attachShader(shaderProgram, vertexShader);
                gl.attachShader(shaderProgram, fragmentShader);
                gl.linkProgram(shaderProgram);

                if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                    console.log('Could not initialise shaders');
                }

                return shaderProgram;
            },

            getProgramByUrl: function (gl, vsUrl, fsUrl) {
                var deferred = $q.defer();

                var self = this;
                var vertexShader, fragmentShader;
                this.getShaderByUrl(gl, vsUrl, 'vs').
                    then(function (vsShader) {
                        vertexShader = vsShader;
                        return self.getShaderByUrl(gl, fsUrl, 'fs');
                    }).
                    then(function (fsShader) {
                        fragmentShader = fsShader;

                        var shaderProgram = gl.createProgram();
                        gl.attachShader(shaderProgram, vertexShader);
                        gl.attachShader(shaderProgram, fragmentShader);
                        gl.linkProgram(shaderProgram);

                        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                            console.log('Could not initialise shaders');
                        }

                        deferred.resolve(shaderProgram);
                    }, function (error) {
                        deferred.reject(error);
                    });

                return deferred.promise;
            }

        };
    }]);

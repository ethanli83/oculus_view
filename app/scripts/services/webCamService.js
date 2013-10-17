'use strict';

angular.module('oculusViewApp')
    .service('WebCamService', ['$q', '$rootScope', 'WebGL', function WebCamService($q, $rootScope, WebGL) {
        // AngularJS will instantiate a singleton by calling "new" on this function

        window.URL = window.URL || window.webkitURL;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;

        var gl, program;

        var updateAll = true,
            hmdInfo,
            lensViewportShift,
            tmpMat4f = vr.mat4f.create();
        var updateUniforms = function (drawData) {
            // Update all uniforms, if needed.
            if (updateAll || !drawData.vrState.hmd.present) {
                updateAll = false;
                hmdInfo = drawData.vrState.hmd.present ?  vr.getHmdInfo() : new vr.HmdInfo();
                gl.uniform4fv(drawData.u_hmdWarpParam, hmdInfo.distortionK);
                gl.uniform4fv(drawData.u_chromAbParam, hmdInfo.chromaAbCorrection);
            }

            var eye = drawData.eye;

            // Calculate eye uniforms for offset.
            var fullWidth = hmdInfo.resolutionHorz;
            var fullHeight = hmdInfo.resolutionVert;
            var x = eye.viewport[0];
            var y = eye.viewport[1];
            var w = eye.viewport[2];
            var h = eye.viewport[3];
            var aspect = (w * fullWidth) / (h * fullHeight);
            var scale = 1 / drawData.distortionScale * 1.5;

            // Texture matrix used to scale the input render target.
            var texMatrix = tmpMat4f;
            vr.mat4f.makeRect(texMatrix, x, y, w, h);
            gl.uniformMatrix4fv(drawData.u_texMatrix, false, texMatrix);

            // Texture matrix used to scale the input render target.
            gl.uniform2f(drawData.u_lensCenter, x + (w + eye.distortionCenterOffsetX / 2) / 2, y + h / 2);
            gl.uniform2f(drawData.u_screenCenter, x + w / 2, y + h / 2);
            gl.uniform2f(drawData.u_scale, w / 2 * scale, h / 2 * scale * aspect);
            gl.uniform2f(drawData.u_scaleIn, 2 / w, 2 / h / aspect);

            gl.uniform1f(drawData.u_offset, x * 2);
            gl.uniform1f(drawData.u_video_aspect, drawData.size.a / aspect);

            gl.viewport(x * fullWidth, 0, w * fullWidth, fullHeight);
        };

        return {
            getMediaSources: function () {
                var deferred = $q.defer();
                MediaStreamTrack.getSources(function (sources) {
                    $rootScope.$apply(function () {
                        var videoSources = sources.filter(function (s) {
                            return s.kind === 'video';
                        });
                        deferred.resolve(videoSources);
                    });

                }, function (error) {
                    $rootScope.$apply(function () {
                        deferred.reject(error);
                    });
                });

                return deferred.promise;
            },

            getVideo: function (source) {
                var deferred = $q.defer();

                if (source.kind !== 'video') {
                    deferred.reject('not a video source');
                }

                var constraints = {
                    video: { optional: [
                        { sourceId: source.id}
                    ] }
                };

                navigator.getUserMedia(constraints, function (stream) {
                    var video = document.createElement('video');
                    video.autoplay = true;
                    video.muted = true;

                    video.addEventListener('loadedmetadata', function(event){
                        $rootScope.$apply(function () {
                            var dimensions = [video.videoWidth, video.videoHeight];
                            console.log(dimensions);
                            deferred.resolve(video);
                        });
                    });

                    video.src = window.URL.createObjectURL(stream);
                }, function (error) {
                    $rootScope.$apply(function () {
                        deferred.reject('can not load the video source');
                    });
                });

                return deferred.promise;
            },

            getWebCam: function (leftEye) {
                var deferred = $q.defer();
                MediaStreamTrack.getSources(function (sources) {
                    $rootScope.$apply(function () {
                        var videoSources = sources.filter(function (s) {
                            return s.kind === 'video';
                        });

                        var source = leftEye ? videoSources[1] : videoSources[0];

                        var constraints = {
                            video: { optional: [
                                { sourceId: source.id}
                            ] }
                        };

                        navigator.getUserMedia(constraints, function (stream) {
                            var video = document.createElement('video');
                            video.autoplay = true;
                            video.muted = true;

                            video.addEventListener('loadedmetadata', function(event){
                                $rootScope.$apply(function () {
                                    var dimensions = [video.videoWidth, video.videoHeight];
                                    console.log(dimensions);
                                    deferred.resolve(video);
                                });
                            });

                            video.src = window.URL.createObjectURL(stream);
                        }, function (error) {
                            $rootScope.$apply(function () {
                                deferred.reject('can not load the video source');
                            });
                        });
                    });

                }, function (error) {
                    $rootScope.$apply(function () {
                        deferred.reject(error);
                    });
                });

                return deferred.promise;
            },

            initDrawing: function (glCtx) {
                gl = glCtx
                var deferred = $q.defer();
                WebGL.
                    getProgramByUrl(gl, 'shaders/webcam-vs-shader.glsl', 'shaders/webcam-fs-shader.glsl').
                    then(function (shaderProgram) {
                        program = shaderProgram;
                        deferred.resolve();
                    }, function (error) {
                        deferred.reject(error);
                    });

                return deferred.promise;
            },

            getDrawData: function (video) {
                var vertex = new Float32Array([
                    0, 0, 0, 0, // TL   x-x
                    1, 0, 1, 0, // TR   |/
                    0, 1, 0, 1, // BL   x
                    1, 0, 1, 0, // TR     x
                    1, 1, 1, 1, // BR    /|
                    0, 1, 0, 1  // BL   x-x
                ]);

                // provide texture coordinates for the rectangle.
                var texCoordBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, vertex, gl.STATIC_DRAW);

                // Create a texture.
                var texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);

                // Set the parameters so we can render any size image.
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                // clean binding
                gl.bindTexture(gl.TEXTURE_2D, null);

                return {
                    webCam: video,
                    texture: texture,

                    buffer: texCoordBuffer,
                    a_xy: gl.getAttribLocation(program, 'a_xy'),
                    a_uv: gl.getAttribLocation(program, 'a_uv'),
                    u_texMatrix: gl.getUniformLocation(program, 'u_texMatrix'),

                    u_tex0: gl.getUniformLocation(program, 'u_tex0'),

                    u_lensCenter: gl.getUniformLocation(program, 'u_lensCenter'),
                    u_screenCenter: gl.getUniformLocation(program, 'u_screenCenter'),
                    u_scale: gl.getUniformLocation(program, 'u_scale'),
                    u_scaleIn: gl.getUniformLocation(program, 'u_scaleIn'),
                    u_hmdWarpParam: gl.getUniformLocation(program, 'u_hmdWarpParam'),
                    u_chromAbParam: gl.getUniformLocation(program, 'u_chromAbParam'),

                    u_offset: gl.getUniformLocation(program, 'u_offset'),
                    u_video_aspect: gl.getUniformLocation(program, 'u_video_aspect'),
                };
            },

            drawWebCam: function (drawData) {
                gl.useProgram(program);

                updateUniforms(drawData);

                var a_xy = drawData.a_xy;
                var a_uv = drawData.a_uv;
                gl.enableVertexAttribArray(a_xy);
                gl.enableVertexAttribArray(a_uv);

                gl.bindBuffer(gl.ARRAY_BUFFER, drawData.buffer);

                gl.vertexAttribPointer(a_xy, 2, gl.FLOAT, false, 4 * 4, 0);
                gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 4 * 4, 2 * 4);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, drawData.texture);

                gl.uniform1i(drawData.u_tex0, 0);

                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, drawData.webCam);

                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
        };
    }]);

'use strict';

// oculus view use three js to render scenes in to canvas
// there are two scenes:
//     it first render a 3d-scene which contains generated 3d objects
//     this directive renders the 3d-scene in to a texture which is used in
//     rendering the screen scene
//     the screen scene contains 3d object and also web cam view for each eye
// the screen scene is rendered by oculus stereo renderer which creates view
// for each eye with distortion correction
angular.module('oculusViewApp')
    .directive('oculusView', ['WebCamService', 'Oculus', 'WebGL', '$q', function (WebCamService, Oculus, WebGL, $q) {
        return {
            templateUrl: 'views/oculus-view.html',
            replace: true,
            restrict: 'E',
            link: function postLink(scope, element) {

                var domObject = element[0];
                var scene3d, camera3d, renderer,
                    gl, program,
                    canvas, leftCamDrawData, rightCamDrawData,
                    effect, controls, time = Date.now(),
                    hands = [], scale = 0.2, offset = 90,
                    mScale = 2;

                scope.swapCams = function () {
                    var cam = leftCamDrawData;
                    leftCamDrawData = rightCamDrawData;
                    rightCamDrawData = cam;
                };

                Oculus.init().then(function () {
                    initView();
                    animateView();
                });

                var leapToScene = function (leapPosition) {
                    var x = leapPosition[0];
                    var y = leapPosition[1] - 200;
                    var z = leapPosition[2];
                    var toReturn = new THREE.Vector3(x * scale, y * scale, z * scale - offset);
                    return toReturn
                }

                var initView = function () {

                    /* set up 3d scene rendering and manipulating 3d objects */

                    scene3d = new THREE.Scene();
                    camera3d = new THREE.PerspectiveCamera(30, domObject.offsetWidth / domObject.offsetHeight, 0.1, 10000);
                    scene3d.add(camera3d);

                    // add lighting
                    var light = new THREE.DirectionalLight(0xffffff);
                    light.position.set(-1, 1, 1).normalize();
                    scene3d.add(light);

                    // create leap motion hands
                    var handGeo = new THREE.SphereGeometry(5, 10, 10);
                    var fingerGeo = new THREE.SphereGeometry(3, 10, 10);
                    var fingerMaterial = new THREE.MeshLambertMaterial({
                        color: 0xffffff,
                        wireframe: true,
                        wireframeLinewidth: 2
                    });

                    for (var i = 0; i < 2; i++) {
                        var hand = new THREE.Mesh(handGeo, fingerMaterial);
                        hand.visible = false;

                        hand.fingers = [];
                        for (var j = 0; j < 5; j++) {
                            var finger = new THREE.Mesh(fingerGeo, fingerMaterial);
                            finger.visible = false;
                            scene3d.add(finger);
                            hand.fingers.push(finger);
                        }
                        scene3d.add(hand);
                        hands.push(hand);
                    }


                    var drawMaterial = new THREE.LineBasicMaterial({
                        color: 0xffffff,
                        opacity: 0.5
                    });

                    var dtoMaterial = new THREE.MeshLambertMaterial({
                        color: 0xffffff,
                        wireframe: true,
                        wireframeLinewidth: 2
                    });

                    var container = new THREE.Object3D();
                    scene3d.add(container);

                    var choosing, pPoint, cPoint, lPosition, fHistory = [];
                    var vector_dis = function (vec1, vec2) {
                        return Math.sqrt(Math.pow(vec1.x - vec2.x, 2) + Math.pow(vec1.y - vec2.y, 2) + Math.pow(vec1.z - vec2.z, 2));
                    }
                    var finger_valid = function (arr, n) {
                        for (var i = 0; i < arr.length; i++) {
                            var obj = arr[i];
                            if (obj !== n)
                                return false;
                        }
                        return true;
                    }

                    // the LeapMotion update function
                    Leap.loop(
                        {
                            enableGestures: false,
                            frameEventName: 'animationFrame'
                        },
                        function (frame) {
                            for (var i = 0; i < 2; i++) {
                                var handMesh = hands[i];
                                handMesh.visible = false;

                                var handData = frame.hands[i];
                                if (handData) {
                                    handMesh.position = leapToScene(handData.palmPosition);

                                    handData.visiableFingers = 0;
                                    for (var j = 0; j < 5; j++) {
                                        var fingerMesh = handMesh.fingers[j];
                                        fingerMesh.visible = false;
                                        var pointer = handData.fingers[j];
                                        if (pointer) {
                                            fingerMesh.position = leapToScene(pointer.tipPosition);
                                            var d = vector_dis(fingerMesh.position, handMesh.position);
                                            if (d > 13) {
                                                fingerMesh.visible = true;
                                                handData.visiableFingers++;
                                            }
                                        }
                                    }

                                    handMesh.visible = true;
                                } else {
                                    for (var j = 0; j < 5; j++) {
                                        var fingerMesh = handMesh.fingers[j];
                                        fingerMesh.visible = false;
                                    }
                                }
                            }


                            if (frame.hands.length === 1) {

                                var handData = frame.hands[0];
                                var handMesh = hands[0];

                                fHistory.unshift(handData.visiableFingers);
                                if (fHistory.length > 5)
                                    fHistory.pop();

                                if (finger_valid(fHistory, 1) && handData.visiableFingers === 1) {
                                    // enter choose point mode
                                    choosing = true;
                                } else if (choosing && finger_valid(fHistory, 2) && handData.visiableFingers === 2) {
                                    // enter draw point mode
                                    choosing = false;

                                    var mesh = handMesh.fingers[0];
                                    var geo = new THREE.SphereGeometry(3, 8, 8);
                                    cPoint = new THREE.Mesh(geo, dtoMaterial);
                                    cPoint.position = mesh.position.clone();
                                    cPoint.position.x -= container.position.x;
                                    cPoint.position.y -= container.position.y;
                                    cPoint.position.z -= container.position.z;

                                    // if there was a point been drawn, draw a line
                                    // from previous point to current point
                                    // otherwise, just add current point into the scene
                                    if (pPoint) {
                                        var lineGeo = new THREE.Geometry();
                                        lineGeo.vertices.push(pPoint.position);
                                        lineGeo.vertices.push(cPoint.position);
                                        var line = new THREE.Line(lineGeo, drawMaterial);
                                        scene3d.add(line);
                                        container.add(line);
                                    }

                                    scene3d.add(cPoint);
                                    container.add(cPoint);
                                    pPoint = cPoint;
                                } else if (handData.visiableFingers > 3) {
                                    // enter pan mode
                                    if (lPosition) {
                                        var p = handMesh.position;
                                        var dx = p.x - lPosition.x,
                                            dy = p.y - lPosition.y,
                                            dz = p.z - lPosition.z;
                                        container.position.x += dx * mScale;
                                        container.position.y += dy * mScale;
                                        container.position.z += dz * mScale;
                                    }
                                    lPosition = handMesh.position;
                                } else {
                                    lPosition = null;
                                }
                            } else {
                                lPosition = null;
                            }
                        });

                    renderer = new THREE.WebGLRenderer({
                        devicePixelRatio: 1,
                        alpha: true,
                        antialias: true
                    });

                    renderer.setSize(domObject.offsetWidth, domObject.offsetHeight);
                    domObject.appendChild(renderer.domElement);

                    var geo = new THREE.SphereGeometry(10, 8, 8);
                    var mes = new THREE.Mesh(geo, dtoMaterial);
                    mes.position.x = 0;
                    mes.position.y = 0;
                    mes.position.z = -100;
                    scene3d.add(mes);
                    container.add(mes);

                    effect = new THREE.OculusRiftEffect(renderer);
                    controls = new THREE.OculusRiftControls(camera3d);
                    scene3d.add(controls.getObject());

                    canvas = document.getElementsByClassName('eye-view')[0];
                    var vrResolutionW = vr.HmdInfo.DEFAULT.resolutionHorz;
                    var vrResolutionH = vr.HmdInfo.DEFAULT.resolutionVert;
                    gl = canvas.getContext('experimental-webgl');

                    WebCamService.
                        initDrawing(gl).
                        then(function () {
                            return WebCamService.getWebCam(true);
                        }).
                        then(function (video) {
                            leftCamDrawData = WebCamService.getDrawData(video);
                            canvas.width = vrResolutionW;
                            canvas.height = vrResolutionH;
                            leftCamDrawData.size = {
                                w: canvas.width,
                                h: canvas.height,
                                a: video.videoHeight / video.videoWidth
                            }
                            return WebCamService.getWebCam(false);
                        }).
                        then(function (video) {
                            rightCamDrawData = WebCamService.getDrawData(video);
                            rightCamDrawData.size = {
                                w: canvas.width,
                                h: canvas.height,
                                a: video.videoHeight / video.videoWidth
                            }
                            drawEyeViews();
                        });
                };

                var animateView = function () {
                    renderView();
                    requestAnimationFrame(animateView);
                };

                var vrState = new vr.State();
                var drawEyeViews = function () {
                    var params = effect.getStereoParams();
                    if (leftCamDrawData) {
                        leftCamDrawData.vrState = vrState;
                        leftCamDrawData.eye = params.eyes[0];
                        leftCamDrawData.interpupillaryDistance = params.interpupillaryDistance;
                        leftCamDrawData.distortionScale = params.distortionScale;
                        WebCamService.drawWebCam(leftCamDrawData);
                    }
                    if (rightCamDrawData) {
                        rightCamDrawData.vrState = vrState;
                        rightCamDrawData.eye = params.eyes[1];
                        rightCamDrawData.interpupillaryDistance = params.interpupillaryDistance;
                        rightCamDrawData.distortionScale = params.distortionScale;
                        WebCamService.drawWebCam(rightCamDrawData);
                    }
                    requestAnimationFrame(drawEyeViews);
                }

                var renderView = function () {
                    camera3d.lookAt(scene3d.position);

                    var polled = vr.pollState(vrState);
                    //controls.isOnObject( true );
                    controls.update(Date.now() - time, polled ? vrState : null);
                    effect.render(scene3d, camera3d, polled ? vrState : null);

                    time = Date.now();
                };
            }
        };
    }]);

/*global define*/
define([
        '../../Core/Cartesian3',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Ellipsoid',
        '../../Core/Extent',
        '../../Core/jsonp',
        '../../Core/Math',
        '../../Core/Matrix4',
        '../../Scene/Camera',
        '../../Scene/CameraColumbusViewMode',
        '../../Scene/CameraFlightPath',
        '../../Scene/PerspectiveFrustum',
        '../../Scene/SceneMode',
        '../createCommand',
        '../../ThirdParty/knockout',
        '../../ThirdParty/when'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Extent,
        jsonp,
        CesiumMath,
        Matrix4,
        Camera,
        CameraColumbusViewMode,
        CameraFlightPath,
        PerspectiveFrustum,
        SceneMode,
        createCommand,
        knockout,
        when) {
    "use strict";

    /**
     * The view model for {@link HomeButton}.
     * @alias HomeButtonViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use.
     * @param {SceneTransitioner} [transitioner] The scene transitioner instance to use.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to be viewed when in home position.
     * @param {Number} [flightDuration] The duration of the camera flight in milliseconds
     *
     * @exception {DeveloperError} scene is required.
     */
    var GeocodingWidgetViewModel = function(scene, ellipsoid, flightDuration) {
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        flightDuration = defaultValue(flightDuration, 1500);

        this._scene = scene;
        this._ellipsoid = ellipsoid;
        this._flightDuration = flightDuration;
        this._searchText = '';
        this._resultText = '';

        var that = this;
        this._searchCommand = createCommand(function() {
            var promise = jsonp('http://dev.virtualearth.net/REST/v1/Locations', {
                parameters : {
                    query : that._searchText,
                    key : 'AkMnCOd4RF1U7D7qgdBz3Fk1aJB3rgCCI_DO841suDGxqOg0SMICTE8Ivy5HhAf5'

                },
                callbackParameterName : 'jsonp'
            });

            when(promise, function(result) {
                that._searchText = result.resourceSets[0].resources[0].name;
                var bbox = result.resourceSets[0].resources[0].bbox;
                var south = bbox[0];
                var west = bbox[1];
                var north = bbox[2];
                var east = bbox[3];
                var extent = Extent.fromDegrees(west, south, east, north);

                var position = that._scene.getCamera().controller.getExtentCameraCoordinates(extent);
                var surfaceNormal = that._ellipsoid.geodeticSurfaceNormal(position);

                var description = {
                    destination : position,
                    duration : that._flightDuration,
                    up : Cartesian3.UNIT_Z,
                    direction : surfaceNormal.negate()
                };

                var flight = CameraFlightPath.createAnimation(scene, description);
                scene.getAnimations().add(flight);
            });
        });

        this._inputKeypressCommand = createCommand(function(data, event) {
           if (event.which === 13) {
               that._searchCommand();
           }
           return true;
        });

        /**
         * Gets or sets the tooltip.  This property is observable.
         *
         * @type {String}
         */
        this.tooltip = 'View Home';

        knockout.track(this, ['tooltip', '_searchText']);
    };

    defineProperties(GeocodingWidgetViewModel.prototype, {
        searchText : {
            get : function() { return this._searchText; },
            set : function(value) { this._searchText = value; }
        },

        /**
         * Gets the scene transitioner being used by the scene.
         * If a transitioner is assigned, any running morphs will be completed
         * when the home button is pressed.  The transitioner must be using
         * the same Scene instance as the scene property.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {SceneTransitioner}
         */
        sceneTransitioner : {
            get : function() {
                return this._transitioner;
            }
        },

        /**
         * Gets the scene to control.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },

        /**
         * Gets the ellipsoid to be viewed when in home position.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {Ellipsoid}
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        },

        /**
         * Gets the Command that is executed when the button is clicked.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {Command}
         */
        search : {
            get : function() {
                return this._searchCommand;
            }
        },

        inputKeypress : {
            get : function() {
                return this._inputKeypressCommand;
            }
        },

        /**
         * Gets or sets the the duration of the camera flight in milliseconds.
         * A value of zero causes the camera to instantly switch to home view.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {Number}
         */
        flightDuration : {
            get : function() {
                return this._flightDuration;
            },
            set : function(value) {
                if (value < 0) {
                    throw new DeveloperError('value must be positive.');
                }
                this._flightDuration = value;
            }
        }
    });

    return GeocodingWidgetViewModel;
});

L.Control.SliderControl = L.Control.extend({
    options: {
        position: 'topleft',
        layer: null,
        timeAttribute: 'time',
        isEpoch: false,     // whether the time attribute is seconds elapsed from epoch
        startTimeIdx: 0,    // where to start looking for a timestring
        timeStrLength: 19,  // the size of  yyyy-mm-dd hh:mm:ss - if millis are present this will be larger
        maxValue: -1,
        minValue: 0,
        showAllOnStart: false,
        markers: null,
        range: false,
        follow: 0,
        sameDate: false,
        alwaysShowDate : false,
        rezoom: null,
        orderMarkers: true,
        orderDesc: false,
        popupOptions: {},
        popupContent: '',
        showAllPopups: true,
        showPopups: true,
    },

    initialize: function (options) {
        L.Util.setOptions(this, options);
        this._layer = this.options.layer;
        L.extend(this, L.Mixin.Events);
        },

    onAdd: function (map) {
        this.options.map = map;
        // Create a control sliderContainer with a jquery ui slider
        this.container = L.DomUtil.create('div', '', this._container);
        this.sliderBoxContainer = L.DomUtil.create('div', 'slider', this.container);
       var sliderContainer = L.DomUtil.create('div', 'slider', this._container);
       $(sliderContainer).append('<div id="slider-min"></div><div id="leaflet-slider" style="width:200px; inline-block; margin: 0 5px 0 5px;"></div><div id="slider-max"></div><div id="slider-current"><span class="start-time"></span> - <span class="end-time"></span></div>');
       
       


        $(sliderContainer).mousedown(function () {
            map.dragging.disable();
        });
        
        $(document).mouseup(function () {
            map.dragging.enable();
            //Hide the slider timestamp if not range and option alwaysShowDate is set on false
            if (options.range || !options.alwaysShowDate) {
                $('#slider-timestamp').html('');
            }
        });


        var options = this.options;
        this.options.markers = [];

        function compare( a, b ) {
            var valA = null;
            var valB = null;

            if(a.feature && a.feature.properties && a.feature.properties[options.timeAttribute]){
                valA = a.feature.properties[options.timeAttribute];
            }else if(a.options[options.timeAttribute]){
                valA = a.options[options.timeAttribute];
            }
            if(b.feature && b.feature.properties && b.feature.properties[options.timeAttribute]){
                valB = b.feature.properties[options.timeAttribute];
            }else if(b.options[options.timeAttribute]){
                valB = b.options[options.timeAttribute];
            }
            if(valA && valB) {
                if (valA < valB) {
                    return -1;
                }
                if (valA > valB) {
                    return 1;
                }
            }
            return 0;
        }

        //If a layer has been provided: calculate the min and max values for the slider
        if (this._layer) {
            var index_temp = 0;
            var templayers = [];
            this._layer.eachLayer(function (layer) {
                templayers.push(layer);
            });

            if(options.orderMarkers){
                templayers = templayers.sort(compare);

                if(options.orderDesc){
                    templayers = templayers.reverse();
                }
            }

            var that = this;
            templayers.forEach(function (layer){


                if(layer instanceof L.LayerGroup) {
                    layer.getLayers().forEach(function (l) {
                        l = that._setPopupProperty(l);
                    });
                }else{
                    layer = that._setPopupProperty(layer);
                }
                options.markers[index_temp] = layer;

                ++index_temp;
            });

            options.maxValue = index_temp - 1;
            this.options = options;
        } else {
            console.log("Error: You have to specify a layer via new SliderControl({layer: your_layer});");
        }
            $('#slider-min', sliderContainer).html(this.options.markers[this.options.minValue].feature.properties[this.options.timeAttribute]);
        $('#slider-max', sliderContainer).html(this.options.markers[this.options.maxValue].feature.properties[this.options.timeAttribute]);
                this.$currentStartDiv = $('#slider-current .start-time', sliderContainer);
        this.$currentEndDiv = $('#slider-current .end-time', sliderContainer);
        this._updateCurrentDiv(0,1);

        return sliderContainer;
    },
    _updateCurrentDiv: function (startIdx, endIdx) {
this.$currentStartDiv.html(this.options.markers[startIdx].feature.properties[this.options.timeAttribute]);
        this.$currentEndDiv.html(this.options.markers[endIdx].feature.properties[this.options.timeAttribute]);
    },

    onRemove: function (map) {
        //Delete all markers which where added via the slider and remove the slider div
        for (i = this.options.minValue; i <= this.options.maxValue; i++) {
            map.removeLayer(this.options.markers[i]);
        }
        $('#leaflet-slider').remove();

        map.off('mouseup',this.clearTimestamp,this);

    },

        startSlider: function () {
        self = this;
        _options = this.options;
        _extractTimestamp = this.extractTimestamp
        var index_start = _options.minValue;
        if (_options.showAllOnStart) {
            index_start = _options.maxValue;
            if (_options.range) _options.values = [_options.minValue, _options.maxValue];
            else _options.value = _options.maxValue;
        }
        $("#leaflet-slider").slider({
            range: _options.range,
            value: _options.value,
            values: _options.values,
            min: _options.minValue,
            max: _options.maxValue,
            step: 1,
            slide: function (e, ui) {
                var map = _options.map;
                var fg = L.featureGroup();
                if ( !! _options.markers[ui.value]) {
                    // If there is no time property, this line has to be removed (or exchanged with a different property)
                    if (_options.markers[ui.value].feature !== undefined) {
                        if (_options.markers[ui.value].feature.properties[_options.timeAttribute]) {
                            if (_options.markers[ui.value]) $('#slider-timestamp').html(
                            _extractTimestamp(_options.markers[ui.value].feature.properties[_options.timeAttribute], _options));
                        } else {
                            console.error("Time property " + _options.timeAttribute + " not found in data");
                        }
                    } else {
                        // set by leaflet Vector Layers
                        if (_options.markers[ui.value].options[_options.timeAttribute]) {
                            if (_options.markers[ui.value]) $('#slider-timestamp').html(
                            _extractTimestamp(_options.markers[ui.value].options[_options.timeAttribute], _options));
                        } else {
                            console.error("Time property " + _options.timeAttribute + " not found in data");
                        }
                    }

                    var i;
                    // clear markers
                    for (i = _options.minValue; i <= _options.maxValue; i++) {
                        if (_options.markers[i]) map.removeLayer(_options.markers[i]);
                    }
                    if (_options.range) {
                        // jquery ui using range
                        for (i = ui.values[0]; i <= ui.values[1]; i++) {
                            if (_options.markers[i]) {
                                map.addLayer(_options.markers[i]);
                                fg.addLayer(_options.markers[i]);
                            }
                        }
                        self._updateCurrentDiv(ui.values[0], ui.values[1]);
                    } else if (_options.follow) {
                        for (i = ui.value - _options.follow + 1; i <= ui.value; i++) {
                            if (_options.markers[i]) {
                                map.addLayer(_options.markers[i]);
                                fg.addLayer(_options.markers[i]);
                            }
                        }
                    } else {
                        for (i = _options.minValue; i <= ui.value; i++) {
                            if (_options.markers[i]) {
                                map.addLayer(_options.markers[i]);
                                fg.addLayer(_options.markers[i]);
                            }
                        }
                    }
                };
                if (_options.rezoom) {
                    map.fitBounds(fg.getBounds(), {
                        maxZoom: _options.rezoom
                    });
                }
            }
        });
        if (!_options.range && _options.alwaysShowDate) {
            $('#slider-timestamp').html(_extractTimeStamp(_options.markers[index_start].feature.properties[_options.timeAttribute], _options));
        }
        for (i = _options.minValue; i <= index_start; i++) {
            _options.map.addLayer(_options.markers[i]);
        }

        for (i = _options.minValue; i <= index_start; i++) {
            _options.map.addLayer(_options.markers[i]);
        }
        
        if (_options.alwaysShowDate) {
            sliderContainer.style.display = "block";

            if(_options.markers[index_start].feature !== undefined) {
                if(_options.markers[index_start].feature.properties[_options.timeAttribute]){
                    if(_options.markers[index_start]){
                        $('#slider-timestamp').html(_extractTimestamp(_options.markers[index_start].feature.properties[_options.timeAttribute], _options));
                    }
                }else {
                    console.error("Time property "+ _options.timeAttribute +" not found in data");
                }
            }else {
                // set by leaflet Vector Layers
                if(_options.markers [index_start].options[_options.timeAttribute]){
                    if(_options.markers[index_start]){
                        $('#slider-timestamp').html( _extractTimestamp(_options.markers[index_start].options[_options.timeAttribute], _options));
                    }
                }else {
                    console.error("Time property "+ _options.timeAttribute +" not found in data");
                }
            }
        }
        var markers = [];
        for (i = _options.minValue; i <= index_start; i++) {
            markers.push(_options.markers[i]);
            _options.map.addLayer(_options.markers[i]);
        }
        if(_options.showPopups) {
            this._openPopups(markers);
        }
        this.fire('rangechanged',{
            markers: markers,
        });
    },
    clearTimestamp: function(){
        //Hide the slider timestamp if not range and option alwaysShowDate is set on false
        if (!this.options.alwaysShowDate) {
            this.sliderContainer.innerHTML = "";
            this.sliderContainer.style.display = "none";
        }
    },

    extractTimestamp: function(time, options) {
        if (options.isEpoch) {
            time = (new Date(parseInt(time))).toString(); // this is local time
        }
        return time.substr(options.startTimeIdx, options.startTimeIdx + options.timeStrLength);
    },

    setPosition: function (position) {
        var map = this._map;

        if (map) {
            map.removeControl(this);
        }

        this.options.position = position;

        if (map) {
            map.addControl(this);
        }
        this.startSlider();
        return this;
    },

    _setPopupProperty: function(marker){
        if (marker._popup) {
            marker._orgpopup = marker._popup;
        }
        return marker;
    },

    _openPopups: function(markers) {
        var options = this.options;
        var that = this;
        markers.forEach(function (marker) {
            if(marker instanceof L.LayerGroup){
                that._openPopups(marker.getLayers());
            }else {
                if (marker._orgpopup) {
                    marker._popup = marker._orgpopup;
                    if (options.showAllPopups) {
                        marker._popup.options.autoClose = false;
                    }
                    marker.openPopup();
                } else if (options.popupContent) {
                    var popupOptions = options.popupOptions;
                    if (options.showAllPopups) {
                        popupOptions.autoClose = false;
                    }
                    marker.bindPopup(options.popupContent, popupOptions).openPopup();
                }
            }
        });
    },

});


L.control.sliderControl = function (options) {
    return new L.Control.SliderControl(options);
};
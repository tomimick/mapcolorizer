/*
 * Map colorizer - a jQuery plugin.
 *
 * https://github.com/tomimick/mapcolorizer
 *
 * Depends on Leaflet + jQuery libs.
 *
 * Polygon data is provided in GeoJSON format.
 *
 * Works with no background map image, with a static image, or with
 * tile servers.
 *
 * Created by Tomi.Mickelsson@iki.fi on Nov 2013
 * http://tomicloud.com
 *
 * License: MIT
 */
(function($) {


    // common constants

    // color scale from green to red
    var color_scale9 = ['#006400', '#528a44', '#8bb07f', '#c5d7be', '#ffffff', '#ebc3b9', '#d18978', '#b14f3b', '#8b0000']; // white in middle
    var color_scale10 = ['#006400', '#4b853e', '#7fa772', '#b1caa9', '#e5ede2', '#f7e4e0', '#e3b0a3', '#ca7c6a', '#ad4935', '#8b0000'];

    // brownish scale
//    var color_scale10 = ['#ffffe0', '#ffe2bd', '#ffc39c', '#ffa480', '#ff7f6a', '#f9575c', '#e63652', '#cb1942', '#ac0528', '#8b0000'];


    // constructor function for the logical object bound to a
    // single DOM element
    function MapColorizer(elem, options) {

        // remember this object as self
        var self = this;
        // remember the DOM element that this object is bound to
        self.$elem = $(elem);
        self.$elem.addClass("mapcolorizer");

        // default options, can be overridden by user
        var defaults = {
            url_geoson: "", // url to fetch geojson polygons
            style_func: styleFunc, // styles for areas
            style_hover: {weight: 3, color: "#000"}, // hover style
            min_zoom: 3, // min zoom level
            max_zoom: 9, // max zoom level
            show_full_screen_toggle : true, // show fullscreen toggler
            on_click: onClick, // event handler
            on_mouse_over: onMouseOver, // event handler
            on_mouse_out: onMouseOut, // event handler
            scale_mode: 2, // color scale count: 1 or 2
            color_scale: color_scale10, // array of colors
            overlay_opacity: 1, // background image/tiles opacity
            area_list: null // list of area ids to show, null=all
        };

        // mix in the passed-in options with the default options
        self.options = $.extend({}, defaults, options);
        var OPT = self.options; // shortcut


        // PRIVATE DATA
        // self.map; // the map
        // self.arealayer; // gson layer containing polygons
        // self.datamap; // data to visualize, map: datamap.areacode -> val
        // self.hover_mark; // area name on hover
        // self.overlay; // tiles or background image
        // self.geodata;  // area polygons as geojson


        // Initialize the plugin. Callback is called when geojson is loaded.
        function init(cb) {
            console.debug("init ");

            self.datamap = [];

            if (self.geodata) {
                // could share same data in the future...
                draw(self.$elem);
                if (cb)
                    cb();
            } else {
                $.getJSON(OPT.url_geoson, function(json) {
                    self.geodata = json;

                    draw(self.$elem);

                    if (cb)
                        cb();
                });
            }
        }

        // creates the loaded geojson polygon layer
        function draw(div) {

            // add geojson polygon layer
            self.arealayer = L.geoJson(self.geodata.features, {
                style: OPT.style_func,
                filter: function (feature, layer) {
                    if (!OPT.area_list)
                        return true; // no filter

                    // show this area?
                    for (var i = 0; i < OPT.area_list.length; i++) {
                        if (feature.properties.code == OPT.area_list[i])
                            return true;
                    }
                    return false;
                },
                onEachFeature: function (feature, layer) {
                    // layer.bindPopup(feature.properties.name);

                    layer.on({
                        mouseover: OPT.on_mouse_over || nop,
                        mouseout: OPT.on_mouse_out || nop,
                        click: OPT.on_click || nop
                    });
                }
            });

            // create the map
            var divid = div.attr("id");
            self.map = L.map(divid, {maxZoom: OPT.max_zoom,
                minZoom: OPT.min_zoom});
//                zoomAnimationThreshold: 3});
            self.arealayer.addTo(self.map);

            zoomToFit();

            addZoomFit();

            if (OPT.show_full_screen_toggle)
                addFullscreen();
        }

        // Set tile server type: osm,mapquest,cloudmade,custom.
        // If custom, options specifies options.
        function setTileServer(type, options) {
            console.debug("setTileServer " + type);

            // remove previous layer first
            if (self.overlay)
                self.map.removeLayer(self.overlay);

            var url, attr;

            var subdomains = "abc";

            if (type == "osm") {
                // OpenStreetMap
                url = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';
                attr = '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>';
            } else if (type == "mapquest") {
                // MapQuest
                url = 'http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png';
                attr = '&copy; <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">, <a href="http://osm.org/copyright">OpenStreetMap</a>';
                subdomains = "1234";
            } else if (type == "cloudmade") {
                // cloudmade.com, requires a customer key
                url = 'http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png';
                attr = '&copy; OpenStreetMap, Imagery &copy; CloudMade';
            } else if (type == "kapsi.fi") {
                // only in Finland: kartat.kapsi.fi, maanmittauslaitos
                url = 'http://tiles.kartat.kapsi.fi/peruskartta/{z}/{x}/{y}.jpg';
                attr = '&copy; <a href="http://www.maanmittauslaitos.fi/">Maanmittauslaitos</a>';
            } else if (type == "custom") {
                self.overlay = L.tileLayer(url, options).addTo(self.map);
                return;
            } else {
                console.debug("unknown type " + type);
                return;
            }

            self.overlay = L.tileLayer(url, {
                attribution: attr,
                subdomains: subdomains,
                key: options ? options.key : "",
                //styleId: 22677
                opacity: OPT.overlay_opacity
            }).addTo(self.map);
        }

        // Set a background image.
        function setImage(url, coords) {
            console.debug("setImage " + url);

            // remove previous layer first
            if (self.overlay)
                self.map.removeLayer(self.overlay);

            self.overlay = L.imageOverlay(url, coords,
                {opacity: OPT.overlay_opacity}).addTo(self.map).bringToBack();
        }

        // Zooms to fit all polygons in map.
        function zoomToFit() {
//            var options = {padding: [-10,-10]};
            self.map.fitBounds(self.arealayer.getBounds());
            //, options); //.pad(-0.1));
        }

        // zooms to given area
        function zoomToArea(e) {
            self.map.fitBounds(e.target.getBounds());
        }

        // sets the style for each polygon
        function styleFunc(feature) {
            return {
                fillColor: get_area_color(feature.properties),
                weight: 1,
                opacity: 1,
                color: '#333',
                fillOpacity: 0.7
            };
        }

        function hilightArea(e) {
            unhighlightArea(e);

            var layer = e.target;
            var prop = layer.feature.properties;

            layer.setStyle(OPT.style_hover);

            var value = parseFloat(self.datamap[prop.code]);
            if (!value)
                value = 0;

            value = self.datamin ? "&nbsp;"+value : "";
            var ico = L.divIcon({className: 'areanamehover',
                                "html": "<span>"+prop.name + value + "</span>"});

            self.hover_mark = L.marker(layer.getBounds().getCenter(),
                                {icon: ico, clickable: false}).addTo(self.map);
        }

        function onClick(e) {
            // hilight for touch-based devices with no hover
            if (L.Browser.touch)
                hilightArea(e);

            zoomToArea(e);
        }

        function onMouseOver(e) {
            hilightArea(e);
        }

        function onMouseOut(e) {
            unhighlightArea(e);
        }

        function unhighlightArea(e) {
            // reset to normal colors
            self.arealayer.resetStyle(e.target);

            // remove area name
            if (self.hover_mark) {
                self.map.removeLayer(self.hover_mark);
                self.hover_mark = null;
            }
        }

        // find min,max,avg values from loaded data set
        function calculate_bounds(data) {
            var min = 1000000000, max = -1000000000, count = 0, sum = 0;
            self.dataavg = 0;
            for (i in data) {
                if (data.hasOwnProperty(i)) {
                    var d  = parseFloat(data[i]);
                    if (!d)
                        continue;
                    if (d < min)
                        min = d;
                    if (d > max) // can't use else if single val
                        max = d;

                    sum += d;
                    count++;
                }
            }
            self.datamin = min;
            self.datamax = max;
            self.dataavg = count ? parseFloat(sum/count).toFixed(2) : 0;

            console.debug("bounds: " + self.datamin + " - " + self.datamax +
                         " avg: " + self.dataavg);
        }


        // calculates area color:
        // scale 1: one even color scale
        // scale 2: green colors for <= avg, red colors for > avg
        function get_area_color(properties) {
            if (!self.datamin)
                return "#ffffff";

            var value = self.datamap[properties.code];
//            if (!value)
//                console.debug("no data ", properties.code, properties.name);

            if (!value || !parseFloat(value) || value == self.dataavg)
                return "#ffffff";

            var scaled;
            if (OPT.scale_mode == 1) {
                // 1 scale
                scaled = (value-self.datamin)/(self.datamax-self.datamin);
            } else {
                // 2 scales: below and above avg
                if (value <= self.dataavg)
                    scaled = (value-self.datamin)/(self.dataavg-self.datamin)/2;
                else
                    scaled = 0.5 + (value-self.dataavg)/(self.datamax-self.dataavg)/2;
            }

            // 0.999 so the index doesn't overflow
            var i = Math.floor(scaled * 0.999 * OPT.color_scale.length);
//            console.debug(""+properties.name+value, scaled, i);
            return OPT.color_scale[i];
        }


        // Load JSON data. If data is a string, it is an URL to the JSON
        // file to be loaded. If data is an object, it is used directly.
        // Callback is called when data is loaded.
        function loadData(data, cb) {
            console.debug("loadData");

            if (!data) {
                // no data, clear all colors
                self.datamap = [];
                self.datamin = 0;
                if (cb)
                    cb({min:0, max:0, avg:0});

                self.arealayer.setStyle(OPT.style_func);

                if (self.namegroup)
                    showNames(true, false);

                self.$elem.removeClass("wait");
                return;
            }

            if (jQuery.type(data) != "string") {
                // json given directly
                data_loaded(data, cb);
            } else {
                // load json from url
                self.$elem.addClass("wait");

                $.getJSON(data, function(json) {
                    data_loaded(json, cb);
                });
            }
        }

        // called when data loaded
        function data_loaded(json, cb) {
            self.datamap = json;

            // calculate bounds and colorize
            calculate_bounds(self.datamap);
            self.arealayer.setStyle(OPT.style_func);

            // setLegend();

            self.$elem.removeClass("wait");

            // provide bounds to app
            if (cb && self.dataavg)
                cb({min:self.datamin, max:self.datamax, avg:self.dataavg});
            else
                cb({min:-1, max:-1, avg:-1});

            // update names
            if (self.namegroup)
                showNames(true, true);
        }

        // Set function that returns a JSON object that defines the
        // style of polygons.
        function setStyle(func) {
            self.arealayer.setStyle(func);
        }

        // Add legend for the map as HTML.
        function setLegend(html) {
            if (self.legend)
                self.map.removeControl(self.legend);

            var legend = L.control({position: 'bottomright'});

            legend.onAdd = function(map) {

                var div = L.DomUtil.create('div', 'info legend');
                div.innerHTML = html;
                return div;
            };

            self.map.addControl(legend);
            self.legend = legend;
        }

        // add zoom to fit control
        function addZoomFit() {
            var legend = L.control({position: 'topleft'});

            legend.onAdd = function(map) {
                var div = L.DomUtil.create('div', 'zoomfit info');
                div.innerHTML = '&#9632;';

                L.DomEvent.addListener(div, 'click', function (e) {
                    zoomToFit();
                    L.DomEvent.stopPropagation(e);
                });
                return div;
            };

            self.map.addControl(legend);
        }

        // add fullscreen control
        function addFullscreen() {
            var ctrl = L.control({position: 'topright'});

            ctrl.onAdd = function(map) {
                var div = L.DomUtil.create('div', 'info full');
                div.innerHTML = '<span>&#8596;</span>';

                L.DomEvent.addListener(div, 'click', function (e) {
                    self.$elem.toggleClass("fullscreen");
                    refresh();
                    L.DomEvent.stopPropagation(e);
                });
                return div;
            };

            self.map.addControl(ctrl);

            // ESC key
            self.$elem.keyup(function(e) {
                if (e.keyCode == 27) {
                    self.$elem.removeClass("fullscreen");
                    refresh();
                }
            });
        }

        // Show or hide names of polygons. The name is centered in the middle
        // of the polygon.
        // showvalue: append the data value after name.
        function showNames(show, showvalue) {
            if (self.namegroup) {
                self.map.removeLayer(self.namegroup);
                self.namegroup = null;
            }

            if (!show)
                return;

            var names = [];
            self.arealayer.eachLayer(function (layer) {
                var prop = layer.feature.properties;

                var val = parseFloat(self.datamap[prop.code]);
                if (!val)
                    val = 0;

                var value = showvalue && self.datamin ? "&nbsp;"+val : "";
                var ico = L.divIcon({className: 'areaname',
                                    "html": prop.name + value});
                var marker = L.marker(layer.getBounds().getCenter(),
                                    {icon: ico, clickable: false}).addTo(self.map);
                names.push(marker);
            });

            self.namegroup = L.layerGroup(names).addTo(self.map);
        }

        // no operation
        function nop() { }


        // Provide access to internal objects, for quick hackability.
        // (Purists don't like this leak, but I'm sure the API is not perfect
        // and I don't have time to perfect it.)
        function getSelf() {
            return self;
        }

        // Let map resize itself if map container size has changed.
        function refresh() {
            if (self.map)
                setTimeout(function() {
                    self.map.invalidateSize(true);
                }, 1000); // delay is problematic...

//            L.Util.requestAnimFrame(self.map.invalidateSize,
//                                    self.map,!1, self.map._container);
        }

        // define the public API
        var API = {};
        API.init = init;
        API.loadData = loadData;
        API.setTileServer = setTileServer;
        API.setImage = setImage;
        API.showNames = showNames;
        API.zoomToFit = zoomToFit;
        API.setStyle = setStyle;
        API.setLegend = setLegend;
        API.refresh = refresh;
        API.getSelf = getSelf;
        return API;
    }

    // attach the plugin to jquery namespace
    $.fn.mapcolorizer = function(options) {
        return this.each(function() {
            // prevent multiple instantiation
            if (!$(this).data('mapcolorizer'))
                $(this).data('mapcolorizer', new MapColorizer(this, options));
        });
    };
})(jQuery);


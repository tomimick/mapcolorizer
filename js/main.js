
// kuntakartta.org main

(function($) {

    var map;

    $(document).ready(function() {
        main();
    });

    function main() {
        console.debug("main");

        set_map_height();

        // change dataset
        $("#dataset").change(function() {
            var sel = $(this).val();
            console.debug("change " + sel);

            if (window.location.hash != sel)
                window.location = sel;
        });

        // change background image/tiles
        $("#overlaytype").change(function() {
            var sel = $(this).val();

            if (sel == "img") {
                var url = "img/Finland-yleiskartta.jpg";
                var bounds = [[70.9,17.1],[59.34, 33.05]];
                map.setImage(url, bounds);
            } else {
                map.setTileServer(sel);
            }
        });

        // show/hide names
        $("#names").click(function() {
            var sel = $(this).prop("checked");
            map.showNames(sel, true);
        });

        // display error
        $(document).ajaxError(function() {
            $("#errtxt").show();
        });

        // hash in url changed
        $(window).on('hashchange', function () {
            console.debug("hashchange");
            load_data();
        });

        var options = {url_geoson: "data/kuntarajat-ok.geojson"};
        map = $("#map").mapcolorizer(options).data("mapcolorizer");
        map.init(function() {

            //select_tile_server();

            map.refresh();

            load_data();
        });

        set_drop_target();
    }

    // load json data depending on select#dataset value
    function load_data(json_dropped) {
        var h = window.location.hash;
        if (!h)
            h = "#2014-tulovero";

        $("#dataset option[value='"+h+"']").prop('selected', true);

        var fname = h.slice(1);
        if (!fname)
            fname = null;

        $("#errtxt").hide();

        if (fname == "none")
            fname = null;
        else
            fname = "data/" + fname + ".json";

        if (json_dropped) {
            fname = json_dropped;
            json_dropped = null;
        }

        map.loadData(fname, function(bounds){
            $("#dmin").text(bounds.min);
            $("#dmax").text(bounds.max);
            $("#davg").text(bounds.avg);

            // remove spinner
            $("body").addClass("ready");

            animate_pieces();
        });
    }

    // adjusts the height of map, extending almost to page bottom
    function set_map_height() {
        var h = $(window).height() - $("#map").offset().top - 70;
        if (h < 300)
            h = 300;
        $("#map").height(h);
    }

    // .json files dropped into map area loaded too
    function set_drop_target() {

        var doc = $("#map").get(0);

        doc.ondragover = function (e) {
            console.debug("ondragover");
            $(this).addClass("filedrop");
            e.preventDefault();
            return false;
        };
        doc.ondrop = function(e) {
            console.debug("ondrop");
            $(this).removeClass("filedrop");

            var file = e.dataTransfer.files[0];
            var reader = new FileReader();

            reader.onload = function(event) {
                console.log("onload", event.target);

                // try parsing the json
                try {
                    json_dropped = $.parseJSON(reader.result);
                    load_data(json_dropped);
                } catch (e) {
                    $("#errtxt").show();
                }
            };
            reader.readAsText(file);
            e.preventDefault();
            return false;
        };
    }

    // animate areas in if first time + load tiles
    var firsttime = true;
    function animate_pieces() {
        if (!firsttime)
            return;

        firsttime = false;
        $("#map g").each(function(i){
            var t = $(this);
            t.css("webkitTransitionDelay", Math.random()+"s");
            t.css("TransitionDelay", Math.random()+"s");
        });
        $("#map").addClass("animend");

        setTimeout(function() {
            // remove anim styles just in case
            $("#map").removeClass("animstart animend");

            // finally load tiles
            select_tile_server();
        }, 2000);
    }

    function select_tile_server() {
        $("#overlaytype option[value=mapquest]").prop('selected', true);
        $("#overlaytype").change();
    }

})(jQuery);



// kuntakartta.org dev samples

(function($) {

    $(document).ready(function() {
        main();
    });

    function main() {
//        case1();
//        case2();
//        case3();

        // run on demand
        $(".case").append("<a href='#' class='demo'>Demo</a>");
        $(".case .demo").click(function(){
            var id = $(this).parent().attr("id");
            $(this).remove();

            if (id == "map1")
                case1();
            else if (id == "map2")
                case2();
            else
                case3();
            return false;
        });
    }

    function case1() {

        var options = {url_geoson: "data/kuntarajat-ok.geojson"};
        var map = $("#map1").mapcolorizer(options).data("mapcolorizer");
        map.init(function() {
            map.loadData("data/2014-tulovero.json");
            map.setTileServer("mapquest");
        });
    }

    function case2() {
        // some data
        var data = {area049:50, area091: 12, area638: 110,
            area224: 35, area710: 100, area505: 70};

        // color scale
        var colors = ['#ffffe0', '#ffe2bd', '#ffc39c', '#ffa480',
            '#ff7f6a', '#f9575c', '#e63652', '#cb1942', '#ac0528', '#8b0000'];

        var options = {url_geoson: "data/kuntarajat-uusimaa.geojson",
            color_scale: colors};
        var map = $("#map2").mapcolorizer(options).data("mapcolorizer");
        map.init(function() {
            map.showNames(true, true);
            map.loadData(data);
        });
    }

    function case3() {
        var active_opt = "1";

        // show only these areas of whole uusimaa
        var arealist = [
            "area927", // vihti
            "area257", // knummi
            "area049", // espoo
            "area235", // kauniainen
            "area091", // hki
            "area092", // vantaa
            "area753", // sipoo
            "area106", // hyvinkaa
            "area543", // nurmijarvi
            "area858", // tuusula
            "area245", // kerava
            "area186", // jarvenpaa
            "area505", // mantsala
            "area611"  // pornainen
        ];

        // specify colors for each option
        var colors = {
            "1": {area927:0, area257:0, area049:0, area235:0, area091:1,
                  area092:2, area753:3, area106:3, area543:3, area858:3,
                  area245:3, area186:3, area505:3, area611:3},
            "2": {area927:0, area257:1, area049:1, area235:1, area091:1,
                  area092:1, area753:1, area106:0, area543:0, area858:0,
                  area245:0, area186:0, area505:0, area611:0},
            "3": {area927:0, area257:0, area049:0, area235:0, area091:0,
                  area092:0, area753:0, area106:0, area543:0, area858:0,
                  area245:0, area186:0, area505:0, area611:0}
        };

        var cols = ["#aaf", "yellow", "#faa", "#afa"];

        // return color based on 'opt'
        function style(area) {
            var code = area.properties.code;
            var colorindex = colors[active_opt][code];
            var color = cols[colorindex];
            return {
                color: "#333",
                weight: 2,
                opacity: 1.0,
                fillOpacity: 1.0,
                fillColor: color
            };
        }

        // init map
        var options = {url_geoson: "data/kuntarajat-uusimaa.geojson",
            style_func: style, "area_list":arealist,
            min_zoom: 8};
        var map = $("#map3").mapcolorizer(options).data("mapcolorizer");
        map.init(function() {
            map.showNames(true, true);
        });

        // change option
        $("a[data-opt]").click(function(){
            active_opt = $(this).attr("data-opt");
            map.setStyle(style); // set new styles
            return false;
        });
    }

})(jQuery);


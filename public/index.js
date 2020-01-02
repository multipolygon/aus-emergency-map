/* globals
   L Vue
   axios tokml togpx
*/

(
    function() {
        var lmap = L.map(
            'lmap',
            {
                center: [-37, 145],
                zoom: 8,
                scrollWheelZoom: true,
                fullscreenControl: true,
                fullscreenControlOptions: {
                    position: 'topright'
                },
            }
        );

        L.tileLayer(
            'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
            {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }
        ).addTo(lmap);

        var llocation = L.layerGroup().addTo(lmap);

        lmap.on(
            'locationfound',
            function (e) {
                llocation.clearLayers();
                L.circleMarker(e.latlng, { radius: e.accuracy / 2, color: '#FF0000', fillColor: '#FF0000' })
                    .addTo(llocation);
            }
        );

        lmap.locate({ watch: true });

        var userZoom = false;
        var autoZoom = false;

        lmap.on(
            'zoomend',
            function () {
                if (autoZoom) {
                    autoZoom = false;
                } else {
                    userZoom = true;
                }
            }
        );

        var lgeo = L.layerGroup().addTo(lmap);

        //////////////////////////////////

        intial = false;

        new Vue({
            el: '#panel',
            data: {
                showPanel: false,
                geo: {},
                filters: {
                    'feedType': {
                        'incident': true,
                    },
                    'category1': {
                        'Fire': intial,
                    },
                    'category2': {
                        'Bushfire': intial,
                    },
                    'status': {
                        'Under Control': intial,
                        'Contained': intial,
                        'Not Yet Under Control': intial,
                        'Responding': intial,
                        'Out Of Control': intial,
                        'Being Controlled': intial,
                    },
                },
                filtersCount: {},
            },
            computed: {
                filtersSelected: function () {
                    var vm = this;
                    return Object.keys(vm.filters).reduce(
                        function(filters, filter) {
                            options = Object.keys(vm.filters[filter]).filter(
                                function (option) {
                                    return vm.filters[filter][option];
                                }
                            );
                            if (options.length > 0) {
                                filters[filter] = options;
                            }
                            return filters;
                        },
                        {}
                    );
                },
                counts: function () {
                    var vm = this;
                    return Object.keys(vm.filters).reduce(
                        function (filters, filter) {
                            filters[filter] = vm.geoFeatures.reduce(
                                function (counts, feature) {
                                    if (feature.properties.hasOwnProperty(filter)) {
                                        var option = feature.properties[filter];
                                        counts[option] = (counts[option] || 0) + 1;
                                    }
                                    return counts;
                                },
                                {}
                            );
                            return filters;
                        },
                        {}
                    );
                },
                geoFeatures: function () {
                    var vm = this;
                    if (vm.geo.features) {
                        return vm.geo.features.filter(
                            function (feature) {
                                return Object.keys(vm.filtersSelected).reduce(
                                    function (show, filter) {
                                        return show && vm.filtersSelected[filter].indexOf(feature.properties[filter]) != -1;
                                    },
                                    true
                                );
                            }
                        ).sort(
                            function (a, b) {
                                return (b.properties.resources || 0) - (a.properties.resources || 0);
                            }
                        );
                    } else {
                        return [];
                    }
                },
                totalResources: function () {
                    return this.geoFeatures.reduce(
                        function (n, feature) {
                            if (feature.properties.hasOwnProperty('resources')) {
                                n += feature.properties.resources;
                            }
                            return n;
                        },
                        0
                    );
                },
            },
            watch: {
                showPanel: function (showPanel) {
                    var div = document.getElementById("lmap");
                    if (showPanel) {
                        div.classList.remove('full');
                        div.classList.add('split');
                    } else {
                        div.classList.remove('split');
                        div.classList.add('full');
                    }
                },
                geo: {
                    deep: false,
                    handler: function () {
                        this.updateFilters();
                    }
                },
                filters: {
                    deep: true,
                    handler: function () {
                        this.updateMap();
                        this.filtersCount;
                    }
                },
            },
            methods: {
                togglePanel: function () {
                    this.showPanel = !this.showPanel;
                },
                fetch: function () {
                    var vm = this;
                    axios.get('./osom-geojson.json')
                        .then(function (response) {
                            vm.geo = response.data;
                        })
                        .catch(function () {
                            alert('Sorry, unable to load data!');
                        });
                },
                updateFilters: function () {
                    var vm = this;
                    vm.filters = Object.keys(vm.filters).reduce(
                        function (filters, filter) {
                            filters[filter] = vm.geo.features.reduce(
                                function (options, feature) {
                                    if (feature.properties.hasOwnProperty(filter)) {
                                        var option = feature.properties[filter];
                                        options[option] = vm.filters[filter][option] === true;
                                    }
                                    return options;
                                },
                                {}
                            );
                            return filters;
                        },
                        {}
                    );
                },
                updateMap: function () {
                    var vm = this;
                    lgeo.clearLayers();
                    //https://leafletjs.com/examples/geojson/
                    var bounds = L.geoJSON({
                        "type": "FeatureCollection",
                        "features": vm.geoFeatures,
                        "properties": {},
                    }, {
                        style: function(feature) {
                            switch (feature.properties.feedType) {
                            case 'warning': return { color: "#777700" };
                            case 'incident':   return { color: "#0000ff" };
                            case 'burn-area': return { color: "#770000" };
                            }
                        }
                    }).addTo(lgeo).getBounds();
                    if (!userZoom) {
                        autoZoom = true;
                        lmap.fitBounds(bounds);
                    }
                },
            },
            created: function () {
                var vm = this;
                vm.fetch()
                setInterval(
                    function () {
                        vm.fetch();
                    },
                    5 * 60 * 1000
                );
            }
        });
    }
)();

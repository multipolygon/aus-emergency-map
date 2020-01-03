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
        
        var lTargetMarker = L.layerGroup().addTo(lmap);

        //////////////////////////////////

        filtersDefault = {
            'feedType': [],
            'category1': ['Evacuate Immediately', 'Fire'],
            'category2': [],
            'status': ['Severe', 'Not Yet Under Control', 'Out Of Control'],
        };

        new Vue({
            el: '#panel',
            data: {
                showPanel: true,
                geo: {
                    features: [],
                },
                maxAge: 6, // hours
                filters: {},
                filtersSelected: {},
                featureSelected: 0,
                dateLocale: "en-AU",
                dateOptions: {
                    dateStyle: "short",
                    timeStyle: "short",
                    hour12: true,
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                },
            },
            computed: {
                filtersCount: function (vm) {
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
                maxAgeDate: function () {
                    return new Date(new Date() - this.maxAge * 60 * 60 * 1000);
                },
                activeFilters: function (vm) {
                    return Object.keys(vm.filtersSelected).filter(
                        function (filter) {
                            return vm.filtersSelected[filter].length > 0;
                        }
                    );
                },                
                geoFeatures: function (vm) {
                    return vm.geo.features.filter(
                        function (feature) {
                            return feature.properties.hasOwnProperty('updated') &&
                                new Date(feature.properties.updated) > vm.maxAgeDate &&
                                vm.activeFilters.reduce(
                                    function (show, filter) {
                                        return show &&
                                            vm.filtersSelected[filter].indexOf(feature.properties[filter]) != -1;
                                    },
                                    true
                                );
                        }
                    ).sort(
                        function (a, b) {
                            var a = a.properties;
                            var b = b.properties;
                            if (a.hasOwnProperty('updated') && b.hasOwnProperty('updated')) {
                                return new Date(b.updated) - new Date(a.updated);
                            } else if (a.hasOwnProperty('updated')) {
                                return -1
                            } else {
                                return 1
                            }
                        }
                    );
                },
                totalResources: function (vm) {
                    return vm.geoFeatures.reduce(
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
                geoFeatures: {
                    deep: false,
                    handler: function () {
                        this.updateMap();
                    }
                },
            },
            methods: {
                debug: function () {
                },
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
                    Object.keys(filtersDefault).forEach(
                        function (filter) {
                            if (!vm.filters.hasOwnProperty(filter)) {
                                vm.filters[filter] = new Set(filtersDefault[filter]);
                            }
                            vm.geo.features.forEach(
                                function (feature) {
                                    if (feature.properties.hasOwnProperty(filter)) {
                                        vm.filters[filter].add(feature.properties[filter]);
                                    }
                                },
                            );
                        },
                    );
                },
                updateMap: function () {
                    var vm = this;
                    lgeo.clearLayers();
                    if (vm.geoFeatures.length > 0) {
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
                            },
                            onEachFeature: function (feature, layer) {
                                layer.on('click', function () {
                                    vm.selectFeature(feature);
                                }).bindPopup(function () {
                                    return vm.fhtml(feature, ['sourceTitle', 'location', 'sizeFmt', 'updated']);
                                }, {
                                    autoPan: false,
                                    closeButton: true,
                                    closeOnEscapeKey: true,
                                    closeOnClick: true,
                                });
                            },
                        }).addTo(lgeo).getBounds();
                        if (!userZoom) {
                            autoZoom = true;
                            lmap.fitBounds(bounds, { maxZoom: 10, animate: true, duration: 1 });
                        }
                    }
                },
                selectFeature: function (feature) {
                    this.featureSelected = this.fid(feature);
                    var lgeo = L.geoJSON(feature);
                    var bounds = lgeo.getBounds()
                    lmap.fitBounds(bounds, { maxZoom: 10, animate: true, duration: 1 });
                    lTargetMarker.clearLayers();
                    L.circleMarker(
                        bounds.getCenter(),
                        {
                            radius: 30,
                            color: '#FFFFE0',
                            fillColor: '#FFFFE0'
                        }
                    ).addTo(lTargetMarker);
                },
                fid: function (feature) {
                    return feature.properties.sourceFeed + feature.properties.id;
                },
                fdate: function (feature) {
                    if (feature.properties.hasOwnProperty('updated')) {
                        return (new Date(feature.properties.updated)).toLocaleString(
                            this.dateLocale,
                            this.dateOptions
                        );
                    } else {
                        return '';
                    }
                },
                fhtml: function (feature, keys) {
                    var vm = this;
                    var s = [];
                    keys.forEach(
                        function (k) {
                            if (k == 'updated') {
                                s.push(vm.fdate(feature))
                            } else if (feature.properties.hasOwnProperty(k)) {
                                s.push(feature.properties[k]);
                            }
                        }
                    )
                    return s.join('<br>');
                },
            },
            created: function () {
                var vm = this;
                vm.filtersSelected = filtersDefault;
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

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

        new Vue({
            el: '#panel',
            data () {
                return {
                    showPanel: true,
                    dataLoading: false,
                    dataAlert: false,
                    geo: {
                        features: [],
                    },
                    maxAge: 6, // hours
                    sortBy: 'updated',
                    filterTree: {},
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
                    feedTypeLabel: {
                        warning: 'Warning',
                        incident: 'Incident',
                        'burn-area': 'Burn Area',
                    },
                };
            },
            computed: {
                maxAgeDate: function (vm) {
                    return new Date(new Date() - vm.maxAge * 60 * 60 * 1000);
                },
                geoFeaturesMaxAge: function (vm) {
                    return vm.geo.features.filter(
                        function (feature) {
                            return feature.properties.hasOwnProperty('updated') &&
                                new Date(feature.properties.updated) > vm.maxAgeDate;
                        }
                    );
                },
                geoFeatures: function (vm) {
                    return vm.geoFeaturesMaxAge.filter(
                        function (feature) {
                            var p = feature.properties;
                            return p.hasOwnProperty('updated') &&
                                new Date(p.updated) > vm.maxAgeDate &&
                                vm.filterTree[p.feedType]._show &&
                                vm.filterTree[p.feedType].category[p.category1]._show &&
                                vm.filterTree[p.feedType].category[p.category1][p.category2]._show &&
                                vm.filterTree[p.feedType].status[p.status]._show;
                        }
                    ).sort(
                        function (a, b) {
                            var k = vm.sortBy;
                            var a = a.properties;
                            var b = b.properties;
                            if (b[k] == a[k]) {
                                k = 'updated';
                            }
                            if (a.hasOwnProperty(k) && b.hasOwnProperty(k)) {
                                if (k == 'created' || k == 'updated') {
                                    return new Date(b[k]) - new Date(a[k]);
                                } else {
                                    return parseFloat(b[k]) - parseFloat(a[k]);
                                }
                            } else if (a.hasOwnProperty(k)) {
                                return -1;
                            } else {
                                return 1;
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
                geoFeaturesMaxAge: {
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
                showInfo: function () {
                    this.showPanel = true;
                    setTimeout(
                        function () {
                            document.getElementById("info").scrollIntoView({ behavior: 'smooth' });
                        },
                        100
                    );
                },
                fetchData: function () {
                    var vm = this;
                    if (!vm.dataLoading) {
                        vm.dataLoading = true;
                        axios.get('./osom-geojson.json')
                            .then(function (response) {
                                vm.geo = response.data;
                                vm.dataAlert = false;
                                vm.dataLoaded()
                            })
                            .catch(function () {
                                vm.dataAlert = true;
                                vm.dataLoaded()
                            });
                    }
                },
                dataLoaded: function () {
                    var vm = this;
                    setTimeout(
                        function () {
                            vm.dataLoading = false;
                        },
                        2000
                    );
                },
                updateFilters: function () {
                    var vm = this;
                    vm.filterSet(vm.filterTree, 'count', 0);
                    vm.geoFeaturesMaxAge.forEach(
                        function (feature) {
                            var p = feature.properties;
                            
                            if (!(p.feedType in vm.filterTree)) {
                                vm.$set(
                                    vm.filterTree,
                                    p.feedType,
                                    { _show: true, category: {}, status: {} }
                                );
                            }
                            
                            if (!(p.category1 in vm.filterTree[p.feedType].category)) {
                                vm.$set(
                                    vm.filterTree[p.feedType].category,
                                    p.category1,
                                    { _show: true }
                                );
                            }

                            if (!(p.category2 in vm.filterTree[p.feedType].category[p.category1])) {
                                vm.$set(
                                    vm.filterTree[p.feedType].category[p.category1],
                                    p.category2,
                                    { _show: true, count: 1 }
                                );
                            } else {
                                vm.filterTree[p.feedType].category[p.category1][p.category2].count += 1;
                            }

                            if (!(p.status in vm.filterTree[p.feedType].status)) {
                                vm.$set(
                                    vm.filterTree[p.feedType].status,
                                    p.status,
                                    { _show: true, count: 1 }
                                );
                            } else {
                                vm.filterTree[p.feedType].status[p.status].count += 1;
                            }
                        },
                    );
                },
                filterSet: function (obj, prop, val) {
                    var vm = this;
                    if (typeof obj === 'object') {
                        if (prop in obj) {
                            obj[prop] = val;
                        }
                        for (var k in obj) {
                            if (k != prop) {
                                vm.filterSet(obj[k], prop, val);
                            }
                        }
                    }
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
                        autoZoom = true;
                        lmap.fitBounds(bounds, { maxZoom: 10, animate: true, duration: 1 });
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
                animateIf: function (opt) {
                    return 'animation-play-state: ' + (opt ? 'running' : 'paused');
                },
            },
            created: function () {
                var vm = this;
                vm.fetchData()
                setInterval(
                    function () {
                        vm.fetchData();
                    },
                    5 * 60 * 1000
                );
            }
        });
    }
)();

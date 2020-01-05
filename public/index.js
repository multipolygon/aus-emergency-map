/* globals
   L Vue
   axios tokml togpx
*/

var lmap = L.map(
    'map',
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
    '//{s}.tile.osm.org/{z}/{x}/{y}.png',
    {
        subdomains: 'abc',
        attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
    }
).addTo(lmap);

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

var mapColor = {
    warning: "#FFFF00",
    incident: "#0000FF",
    'burn-area': "#333333",
}

var vue = new Vue({
    el: '#vue',
    data () {
        return {
            showPanel: true,
            data: {
                vic: {
                    _show: true,
                    label: 'Victoria',
                    loading: false,
                    alert: false,
                    features: [],
                },
                nsw: {
                    _show: true,
                    label: 'New South Wales',
                    loading: false,
                    alert: false,
                    features: [],
                },
            },
            maxAge: 6, // hours
            fadeWithAge: true,
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
            mapDataBounds: null,
            userLocation: null,
        };
    },
    computed: {
        geoFeaturesMaxAge: function (vm) {
            var now = new Date();
            var maxAge = vm.maxAge * 60 * 60 * 1000;
            return vm.data.vic.features.concat(vm.data.nsw.features).filter(
                function (feature) {
                    if (feature.properties.hasOwnProperty('updated')) {
                        try {
                            var age = now - (new Date(feature.properties.updated));
                        } catch {
                            return false;
                        }
                        if (age < maxAge) {
                            feature.properties._opacity = age <= 0 ? 1 : 1 - (age / maxAge / 1.1);
                            return true;
                        }
                    }
                    return false;
                }
            );
        },
        geoFeatures: function (vm) {
            return vm.geoFeaturesMaxAge.filter(
                function (feature) {
                    var p = feature.properties;
                    return vm.data[p._data_src]._show &&
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
            var vm = this;
            var div = document.getElementById("page");
            if (showPanel) {
                div.classList.remove('full');
                div.classList.add('split');
            } else {
                div.classList.remove('split');
                div.classList.add('full');
            }
            setTimeout(
                function() {
                    lmap.invalidateSize(true);
                    setTimeout(
                        function () {
                            vm.updateMap();
                        },
                        250
                    );
                },
                750
            );
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
        fadeWithAge: function () {
            this.updateMap();
        }
    },
    methods: {
        debug: function () {
        },
        togglePanel: function () {
            this.showPanel = !this.showPanel;
        },
        parseHtmlKeyPairs: function (html) {
            return html.split('<br />').reduce(
                function (obj, line) {
                    var pair = line.split(':');
                    var k = pair.shift().trim().toLowerCase();
                    obj[k] = pair.join(':').trim();
                    return obj;
                },
                {}
            );
        },
        fetchData: function (src) {
            var vm = this;
            if (src === undefined) {
                vm.fetchData('vic');
                setTimeout(
                    function() {
                        vm.fetchData('nsw');
                    },
                    1000
                );
            } else {
                if (!vm.data[src].loading) {
                    vm.data[src].loading = true;
                    axios.get('./' + src + '.json')
                        .then(function (response) {
                            vm.data[src].features = response.data.features;
                            vm.data[src].features.forEach(
                                function (i) {
                                    var p = i.properties;
                                    p._data_src = src;
                                    if (src == 'nsw') {
                                        var d = vm.parseHtmlKeyPairs(p.description);
                                        p.id = p.guid;
                                        p.sourceTitle = p.title;
                                        p.created = p.pubDate;
                                        p.updated = d.updated || p.pubDate;
                                        p.feedType = p.category == 'Not Applicable' ? 'incident' : 'warning';
                                        p.category1 = p.category == 'Not Applicable' ? (d.fire == 'Yes' ? 'Fire' : 'Other') : p.category;
                                        p.category2 = d.type || 'Other';
                                        p.status = d.status || 'Other';
                                        p.location = d.location || 'Unknown';
                                        p.size = parseFloat(d.size || 0);
                                    }
                                    p.feedType = p.feedType.toLowerCase()
                                    p.category1 = p.category1.toLowerCase();
                                    p.category2 = p.category2.toLowerCase();
                                    p.status = p.status.toLowerCase();
                                    if (p.category1 == 'accident / rescue') p.category1 = 'rescue';
                                    if (p.category2 == 'bush fire') p.category2 = 'bushfire';
                                }
                            );
                            vm.data[src].alert = false;
                            vm.dataLoaded(src);
                        })
                        .catch(function () {
                            vm.data[src].alert = true;
                            vm.dataLoaded(src);
                        });
                }
            }
        },
        dataLoaded: function (src) {
            var vm = this;
            setTimeout(
                function () {
                    vm.data[src].loading = false;
                },
                2000
            );
        },
        setObj: function (obj, prop, val) {
            if (!(prop in obj)) {
                this.$set(obj, prop, val);
            }
            return obj[prop];
        },
        updateFilters: function () {
            var vm = this;
            vm.filterSet(vm.filterTree, 'count', 0);
            vm.geoFeaturesMaxAge.forEach(
                function (feature) {
                    var p = feature.properties;
                    var type = vm.setObj(vm.filterTree, p.feedType, { _show: true, category: {}, status: {} });
                    var cat = vm.setObj(type.category, p.category1, { _show: true });
                    var subcat = vm.setObj(cat, p.category2, { _show: true, count: 0 });
                    var stat = vm.setObj(type.status, p.status, { _show: true, count: 0 });
                    subcat.count += 1;
                    stat.count += 1;
                }
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
            var maxAge = vm.maxAge * 60 * 60 * 1000;
            lgeo.clearLayers();
            if (vm.geoFeatures.length > 0) {
                //https://leafletjs.com/examples/geojson/
                vm.mapDataBounds = L.geoJSON({
                    "type": "FeatureCollection",
                    "features": vm.geoFeatures,
                    "properties": {},
                }, {
                    pointToLayer: function(feature, latlng) {
                        return L.circleMarker(latlng, { radius: 7 });
                    },
                    style: function(feature) {
                        return {
                            weight: 2,
                            color: mapColor[feature.properties.feedType] || mapColor['incident'],
                            opacity: (vm.fadeWithAge ? feature.properties._opacity : 1) * (feature.geometry.type == 'Point' ? 1 : 0.4),
                            fillOpacity: (vm.fadeWithAge ? feature.properties._opacity : 1) * (feature.geometry.type == 'Point' ? 0.8 : 0.3),
                        }
                    },
                    onEachFeature: function (feature, layer) {
                        layer.on('click', function () {
                            vm.selectFeature(feature, true);
                        }).bindPopup(function () {
                            return vm.fhtml(feature, ['sourceTitle', 'location', 'updated']);
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
                    lmap.stop();
                    vm.zoomMap();
                }
            }
        },
        zoomMap: function () {
            if (this.mapDataBounds) {
                lmap.fitBounds(this.mapDataBounds, { maxZoom: 10, animate: true, duration: 1 });
            };
        },
        resetZoom: function () {
            userZoom = false;
            this.zoomMap();
        },
        zoomToUserLocation: function () {
            userZoom = true;
            lmap.locate({ setView: true, maxZoom: 10, duration: 1 });
        },
        selectFeature: function (feature, scroll) {
            var fid = this.fid(feature);
            this.featureSelected = fid;
            var lgeo = L.geoJSON(feature);
            var bounds = lgeo.getBounds()
            lmap.fitBounds(bounds, { maxZoom: 10, animate: true, duration: 1 });
            lTargetMarker.clearLayers();
            L.circleMarker(
                bounds.getCenter(),
                {
                    radius: 30,
                    opacity: 0.4,
                    color: '#FFFF00',
                    fillColor: 'transparent',
                }
            ).addTo(lTargetMarker);
            if (scroll && this.showPanel) {
                this.scrollTo("featureListItem" + fid);
            }
        },
        fid: function (feature) {
            var p = feature.properties;
            return p._data_src + p.id;
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
        scrollTo: function (id) {
            this.showPanel = true;
            setTimeout(
                function () {
                    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
                },
                100
            );
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

var llocation = L.layerGroup().addTo(lmap);

lmap.on(
    'locationfound',
    function (e) {
        vue.userLocation = true;
        llocation.clearLayers();
        L.circleMarker(
            e.latlng,
            {
                radius: e.accuracy / 2,
                opacity: 0.4,
                color: '#00FF00',
                fillColor: 'transparent',
            }
        ).addTo(llocation);
    }
);

lmap.on(
    'locationerror',
    function (e) {
        vue.userLocation = false;
        llocation.clearLayers();
    }
);

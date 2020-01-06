/* globals
   L Vue axios
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

Vue.component('checkbox-toggles', {
    props: ['obj', 'parents'],
    methods: {
        click: function (val) {
            objTreeSetProp(this.obj, '_show', val);
            if (val && this.parents) {
                this.parents.forEach(
                    function (p) {
                        p._show = true;
                    }
                );
            }
        },
    },
    template: '<span class="show-all"><span class="mdi mdi-playlist-check" v-on:click.prevent="click(true)">&nbsp;</span><span class="mdi mdi-playlist-remove" v-on:click.prevent="click(false)"></span></span>',
});

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
            loadDefault: true,
            filterTree: {
                incident: { _show: true, _color: "#CC3333", category: {}, status: {} },
                warning: { _show: true, _color: "#FFAA1D", category: {}, status: {} },
                other: { _show: true, _color: "#2981CA", category: {}, status: {} },
            },
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
            sharable: false,
        };
    },
    computed: {
        maxAge_ms: function (vm) {
            return vm.maxAge * 60 * 60 * 1000;
        },
        featuresAgeFiltered: function (vm) {
            return Object.keys(vm.data).reduce(
                function (features, src) {
                    return features.concat(
                        vm.data[src].features.filter(
                            function (feature) {
                                return feature.properties._age < vm.maxAge_ms;
                            }
                        )
                    );
                },
                []
            );
        },
        featuresSorted : function (vm) {
            return vm.featuresAgeFiltered.sort(
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
        featuresFiltered: function (vm) {
            return vm.featuresAgeFiltered.filter(
                function (feature) {
                    var p = feature.properties;
                    return vm.data[p._data_src]._show &&
                        vm.filterTree[p.feedType]._show &&
                        vm.filterTree[p.feedType].category[p.category1]._show &&
                        vm.filterTree[p.feedType].category[p.category1][p.category2]._show &&
                        vm.filterTree[p.feedType].status[p.status]._show;
                }
            )
        },
        totalResources: function (vm) {
            return vm.featuresFiltered.reduce(
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
        filterTree: {
            deep: true,
            handler: function () {
                this.saveFilterTree();
            }
        },
        featuresAgeFiltered: {
            deep: false,
            handler: function () {
                this.updateFilterTree();
            }
        },
        featuresFiltered: {
            deep: false,
            handler: function () {
                this.updateMap();
                this.updateFilterTreeCounts();
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
        parseHtmlData: function (html) {
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
                            var now = new Date();
                            vm.data[src].features = response.data.features;
                            vm.data[src].features.forEach(
                                function (i) {
                                    var p = i.properties;
                                    p._data_src = src;
                                    p._age = 0;
                                    if (p.hasOwnProperty('updated')) {
                                        try {
                                            p._age = now - (new Date(p.updated));
                                        } catch {
                                            // console.log('date parse error');
                                        }
                                    }
                                    if (src == 'nsw') {
                                        var d = vm.parseHtmlData(p.description);
                                        p.id = p.guid;
                                        p.sourceTitle = p.title;
                                        p.created = p.pubDate;
                                        p.updated = d.updated || p.pubDate;
                                        p.feedType = 'incident';
                                        p.category1 = d.fire == 'Yes' ? 'Fire' : 'Other';
                                        p.category2 = d.type || 'Other';
                                        p.status = d.status || 'Other';
                                        p.location = d.location || 'Unknown';
                                        p.size = parseFloat(d.size || 0);
                                    }
                                    p.feedType = p.feedType.toLowerCase()
                                    p.category1 = p.category1.toLowerCase();
                                    p.category2 = p.category2.toLowerCase();
                                    p.status = p.status.toLowerCase();
                                    if (!(p.feedType in vm.filterTree)) p.feedType = 'other';
                                    if (p.category1 == 'accident / rescue') p.category1 = 'rescue';
                                    if (p.category2 == 'bush fire') p.category2 = 'bushfire';
                                    if (p.category1 == 'met') {
                                        p.feedType = 'warning';
                                        p.category1 = 'weather';
                                    }
                                    p._geom_type = i.geometry.type;
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
        saveFilterTree: function () {
            var vm = this;
            var json = JSON.stringify(objPack(vm.filterTree, '_show', true));
            var param = encodeURIComponent(json);
            vm.sharable = param.length < 1000;
            history.replaceState("", document.title, window.location.pathname + (vm.sharable ? '?filter=' + param : ''));
            Cookies.set('filter', json, { expires: 30 * 24 * 60 * 60 });
        },
        loadFilterTree: function () {
            var vm = this;
            var param = getSearchParam('filter');
            var obj = null;
            if (!param) {
                param = Cookies('filter');
            }
            if (param) {
                obj = JSON.parse(param);
                if (obj && typeof obj === 'object') {
                    objTreeSetProp(vm.filterTree, '_show', false);
                    objUnpack(obj, vm.filterTree, '_show', true);
                    vm.loadDefault = false;
                }
            }
        },
        updateFilterTree: function () {
            var vm = this;
            vm.featuresAgeFiltered.forEach(
                function (feature) {
                    var p = feature.properties;
                    var type = vm.filterTree[p.feedType];
                    var cat = vm.setObj(type.category, p.category1, { _show: vm.loadDefault && type._show });
                    var subcat = vm.setObj(cat, p.category2, { _show: vm.loadDefault && cat._show });
                    var stat = vm.setObj(type.status, p.status, { _show: vm.loadDefault && type._show });
                }
            );
        },
        updateFilterTreeCounts: function () {
            var vm = this;
            objTreeSetProp(vm.filterTree, '_count', 0, true);
            objTreeSetProp(vm.filterTree, '_resources', 0, true);
            vm.featuresFiltered.forEach(
                function (feature) {
                    var p = feature.properties;
                    var type = vm.filterTree[p.feedType];
                    var cat = type.category[p.category1];
                    var subcat = cat[p.category2];
                    var stat = type.status[p.status];
                    type._count += 1;
                    cat._count += 1;
                    subcat._count += 1;
                    stat._count += 1;
                    var r = 'resources' in p ? parseInt(p.resources) : 0;
                    vm.filterTree._resources += r;
                    type._resources += r;
                    cat._resources += r;
                    subcat._resources += r;
                    stat._resources += r;
                }
            );
        },
        updateMap: function () {
            var vm = this;
            lgeo.clearLayers();
            if (vm.featuresFiltered.length > 0) {
                //https://leafletjs.com/examples/geojson/
                vm.mapDataBounds = L.geoJSON({
                    "type": "FeatureCollection",
                    "features": vm.featuresFiltered,
                    "properties": {},
                }, {
                    pointToLayer: function(feature, latlng) {
                        if (feature.properties._geom_type == 'Point') {
                            return L.circleMarker(latlng, { radius: 7 });
                        }
                    },
                    style: function(feature) {
                        var p = feature.properties;
                        var opacity = vm.fadeWithAge && p._age > 0 ? 1 - (p._age / vm.maxAge_ms) : 1;
                        return {
                            weight: (p._geom_type == 'Point' ? 0 : 2),
                            color: vm.filterTree[p.feedType]._color,
                            opacity: opacity,
                            fillOpacity: opacity * (p._geom_type == 'Point' ? 1 : 0.3),
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
        vm.loadFilterTree()
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
                radius: 7,
                color: '#00FF00',
                opacity: 1,
                fillOpacity: 0.9,
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

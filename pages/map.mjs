import axios from 'axios';
import L from 'leaflet';
import {
    objMerge,
    objTreeSetProp,
    objTreeHasValue,
    objPack,
    getSearchParam,
} from '../components/utils.mjs';
import { localSet, localGet, localRemove } from '../components/storage.mjs';
import CheckboxToggles from '~/components/checkbox-toggles.vue';
import FilterCounts from '~/components/filter-counts.vue';

const ausBounds = L.latLngBounds(
    {
        lat: -8,
        lng: 156,
    },
    {
        lat: -45,
        lng: 110,
    },
);

const timeFormat = 'h:mma DD MMM YYYY z';

const defaultFilterTree = {
    incident: { _show: true, _color: '#CC3333', _icon: 'fire-truck', category: {}, status: {} },
    warning: { _show: true, _color: '#FFAA1D', _icon: 'alert', category: {}, status: {} },
    other: { _show: true, _color: '#2981CA', _icon: 'information', category: {}, status: {} },
};

const _lightningImageUrl =
    'https://images.lightningmaps.org/blitzortung/oceania/index.php?map=australia_big&period=24&transparent';

const lightningImageUrl = () => _lightningImageUrl + '&t' + new Date().getTime();

const lightningImageBounds = L.latLngBounds(
    {
        lat: -8,
        lng: 159,
    },
    {
        lat: -45,
        lng: 109,
    },
);

export default {
    layout: 'split-page-map',
    components: {
        CheckboxToggles,
        FilterCounts,
    },
    data() {
        return {
            showPanel: true,
            feeds: {
                vic: {
                    label: 'Vic',
                    link: 'https://emergency.vic.gov.au',
                    loading: false,
                    error: false,
                    features: [],
                },
                nsw: {
                    label: 'NSW',
                    link: 'https://www.rfs.nsw.gov.au',
                    loading: false,
                    error: false,
                    features: [],
                },
                wa: {
                    label: 'WA incidents',
                    link: 'https://www.emergency.wa.gov.au',
                    loading: false,
                    error: false,
                    features: [],
                },
                wa_warn: {
                    label: 'WA warnings',
                    link: 'https://www.emergency.wa.gov.au',
                    loading: false,
                    error: false,
                    features: [],
                },
                // sa_warn: {
                //     label: 'SA warnings',
                //     link: 'https://apps.geohub.sa.gov.au/CFSMap/index.html',
                //     loading: false,
                //     error: false,
                //     features: [],
                // },
                sa_cfs: {
                    label: 'SA CFS',
                    link: 'https://apps.geohub.sa.gov.au/CFSMap/index.html',
                    loading: false,
                    error: false,
                    type: 'document',
                    features: [],
                },
                sa_mfs: {
                    label: 'SA MFS',
                    link: 'https://apps.geohub.sa.gov.au/CFSMap/index.html',
                    loading: false,
                    error: false,
                    type: 'document',
                    features: [],
                },
                tas: {
                    label: 'Tas',
                    link: 'http://www.fire.tas.gov.au/Show?pageId=colGMapBushfires',
                    loading: false,
                    error: false,
                    type: 'document',
                    features: [],
                },
                tas_warn: {
                    label: 'Tas warnings',
                    link: 'http://www.fire.tas.gov.au/Show?pageId=colGMapBushfires',
                    loading: false,
                    error: false,
                    type: 'document',
                    features: [],
                },
                qld: {
                    label: 'Qld',
                    link: 'https://www.ruralfire.qld.gov.au/map/Pages/default.aspx',
                    loading: false,
                    error: false,
                    type: 'document',
                    features: [],
                },
            },
            feedsSelected: [],
            maxAge: 24, // hours
            fadeWithAge: true,
            showResources: false,
            showLightning: false,
            sortBy: null,
            loadDefault: true,
            filterTree: {},
            featureSelected: 0,
            mapBounds: {
                watchZone: null,
                features: null,
            },
            userLocation: null,
            shareableUrl: null,
            mapDelay: 2000,
        };
    },
    computed: {
        feedLoading() {
            const vm = this;
            return Object.keys(vm.feeds).reduce(function(val, src) {
                return val || vm.feeds[src].loading;
            }, false);
        },
        feedError() {
            const vm = this;
            return Object.keys(vm.feeds).reduce(function(val, src) {
                return val || vm.feeds[src].error;
            }, false);
        },
        filterTreeActive(vm) {
            for (const k in vm.filterTree) {
                if (
                    objTreeHasValue(vm.filterTree[k].category, '_show', true) &&
                    objTreeHasValue(vm.filterTree[k].status, '_show', true)
                ) {
                    return true;
                }
            }
            return false;
        },
        filterTreeRootKeys(vm) {
            return vm.getKeys(vm.filterTree, ['incident', 'warning', 'other']);
        },
        maxAge_ms(vm) {
            return vm.maxAge * 60 * 60 * 1000;
        },
        featuresAgeFiltered(vm) {
            return Object.keys(vm.feeds).reduce(function(features, src) {
                return features.concat(
                    vm.feeds[src].features.filter(function(feature) {
                        const p = feature.properties;
                        p._opacity = p._age > 0 ? 1 - p._age / vm.maxAge_ms / 1.1 : 1;
                        return p._age < vm.maxAge_ms;
                    }),
                );
            }, []);
        },
        featuresSorted(vm) {
            const k = vm.sortBy;
            return vm.featuresFiltered.sort(function(a, b) {
                a = a.properties;
                b = b.properties;
                if (k === '_age' || a[k] === b[k]) {
                    return a._age - b._age;
                } else if (k in a && k in b) {
                    return parseFloat(b[k]) - parseFloat(a[k]);
                } else if (k in a) {
                    return -1;
                } else {
                    return 1;
                }
            });
        },
        featuresFilteredByProperty(vm) {
            return vm.featuresAgeFiltered.filter(function(feature) {
                const p = feature.properties;
                return (
                    vm.feedsSelected.includes(p._feed_src) &&
                    vm.filterTree[p.feedType]._show &&
                    vm.filterTree[p.feedType].category[p.category]._show &&
                    vm.filterTree[p.feedType].category[p.category][p.subcategory]._show &&
                    vm.filterTree[p.feedType].status[p.status]._show
                );
            });
        },
        featuresFilteredByWatchZone(vm) {
            return vm.featuresFilteredByProperty.filter(function(feature) {
                const p = feature.properties;
                if (!('_geo_bounds' in p)) {
                    p._geo_bounds = Object.freeze(L.geoJSON(feature).getBounds());
                }
                return vm.mapBounds.watchZone.intersects(p._geo_bounds);
            });
        },
        featuresFiltered(vm) {
            if (vm.mapBounds.watchZone === null) {
                return vm.featuresFilteredByProperty;
            } else {
                return vm.featuresFilteredByWatchZone;
            }
        },
        totalResources(vm) {
            return vm.featuresFiltered.reduce(function(n, feature) {
                if ('resources' in feature.properties) {
                    const r = parseInt(feature.properties.resources) || 0;
                    n += r;
                }
                return n;
            }, 0);
        },
        maxResources(vm) {
            return vm.featuresFiltered.reduce(function(n, feature) {
                if ('resources' in feature.properties) {
                    const r = parseInt(feature.properties.resources) || 0;
                    if (r > n) {
                        return r;
                    }
                }
                return n;
            }, 0);
        },
    },
    watch: {
        showPanel(showPanel) {
            const vm = this;
            const div = document.getElementById('page');
            if (showPanel) {
                div.classList.remove('full');
                div.classList.add('split');
            } else {
                div.classList.remove('split');
                div.classList.add('full');
            }
            vm.mapDelay = 750;
            vm.updateMap();
        },
        filterTree: {
            deep: true,
            handler() {
                this.saveFilterTree();
            },
        },
        featuresAgeFiltered: {
            deep: false,
            handler() {
                this.updateFilterTree();
            },
        },
        featuresFiltered: {
            deep: false,
            handler() {
                this.updateMap();
                this.updateFilterTreeCounts();
            },
        },
        fadeWithAge(val) {
            this.updateMap();
            localSet('fadeWithAge', val);
        },
        showResources(val) {
            this.updateMap();
            localSet('showResources2', val);
        },
        showLightning(val) {
            if (window.lmap && window.lightningLayer) {
                if (val) {
                    window.lightningLayer.addTo(window.lmap);
                    window.lightningLayer.setUrl(lightningImageUrl());
                } else {
                    window.lightningLayer.remove();
                }
            }
            localSet('showLightning', val);
        },
        maxAge(val) {
            localSet('maxAge', val);
        },
        feedsSelected(now, old) {
            for (const src of now) {
                if (!old.includes(src)) {
                    this.fetchFeed(src);
                }
            }
            if (now.length === Object.keys(this.feeds).length) {
                localRemove('feedsSelected');
            } else {
                localSet('feedsSelected', now);
            }
        },
        mapBounds: {
            deep: true,
            handler(bounds) {
                if (bounds.watchZone === null) {
                    localRemove('watchZone');
                } else {
                    localSet('watchZone', bounds.watchZone);
                }
            },
        },
        sortBy(val) {
            localSet('sortBy', val);
        },
    },
    methods: {
        debug() {},
        togglePanel() {
            this.showPanel = !this.showPanel;
        },
        timestamps(now, dt) {
            if (dt.isValid()) {
                return {
                    _age: now - dt,
                    _date_f: dt.format(timeFormat),
                };
            } else {
                return {
                    _age: 0,
                    _date_f: 'Invalid date',
                };
            }
        },
        fetchFeed(src) {
            const vm = this;
            vm.mapDelay = 2000;
            if (src === undefined) {
                if (vm.showLightning && window.lightningLayer) {
                    window.lightningLayer.setUrl(lightningImageUrl());
                }
                for (src of vm.feedsSelected) {
                    vm.fetchFeed(src);
                }
            } else if (src in vm.feeds && !vm.feeds[src].loading) {
                vm.feeds[src].loading = true;
                axios
                    .get(`https://data.emergencymap.app/data/${src}.geo.json`, {
                        responseType: 'json',
                    })
                    .then(function(response) {
                        const now = new Date();
                        vm.feeds[src].features = response.data.features.map(
                            ({ properties, ...feature }) => ({
                                ...feature,
                                properties: {
                                    _feed_src: src,
                                    ...vm.timestamps(
                                        now,
                                        vm.$moment(properties.updated, vm.$moment.ISO_8601),
                                    ),
                                    ...properties,
                                },
                            }),
                        );
                        vm.feeds[src].error = false;
                        vm.feedLoaded(src);
                    })
                    .catch(() => {
                        // console.warn('Error: ' + src);
                        // console.log('error', src);
                        // console.log(err);
                        vm.feeds[src].error = true;
                        vm.feedLoaded(src);
                    });
            }
        },
        feedLoaded(src) {
            const vm = this;
            window.setTimeout(function() {
                vm.feeds[src].loading = false;
            }, 2000);
        },
        setObj(obj, prop, val) {
            if (!(prop in obj)) {
                this.$set(obj, prop, val);
            }
            return obj[prop];
        },
        setAdd(obj, prop, n) {
            if (prop in obj) {
                obj[prop] += n;
            } else {
                this.$set(obj, prop, n);
            }
        },
        saveFilterTree() {
            const vm = this;
            const param = encodeURIComponent(JSON.stringify(objPack(vm.filterTree, '_show', true)));
            if (param.length < 1000) {
                vm.shareableUrl = window.location.host + '?filter=' + param;
            } else {
                vm.shareableUrl = null;
            }
            localSet('filterTree', vm.filterTree);
        },
        loadFilterTree() {
            const vm = this;
            const param = getSearchParam('filter');
            if (param) {
                window.history.pushState('', document.title, '/');
                const obj = JSON.parse(param);
                if (obj !== null) {
                    vm.loadDefault = false;
                    vm.filterTree = defaultFilterTree;
                    objTreeSetProp(vm.filterTree, '_show', false);
                    objMerge(obj, vm.filterTree, function(source, target, key) {
                        if (key === '_show') {
                            if ('_show' in target) {
                                target._show = true;
                            } else {
                                vm.$set(target, '_show', true);
                            }
                        } else if (key in target) {
                            if ('_show' in target) {
                                target._show = true;
                            }
                        } else {
                            vm.$set(target, key, { _show: true });
                        }
                    });
                }
            } else {
                vm.filterTree = localGet('filterTree', defaultFilterTree);
            }
        },
        updateFilterTree() {
            const vm = this;
            objTreeSetProp(vm.filterTree, '_count_all', 0);
            Object.values(vm.feeds).forEach(function(obj) {
                vm.setObj(obj, '_count_all', 0);
                obj._count_all = 0;
            });
            vm.featuresAgeFiltered.forEach(function(feature) {
                const p = feature.properties;
                const type = vm.filterTree[p.feedType];
                const cat = vm.setObj(type.category, p.category, {
                    _show: vm.loadDefault && type._show,
                });
                const subcat = vm.setObj(cat, p.subcategory, {
                    _show: vm.loadDefault && cat._show,
                });
                const stat = vm.setObj(type.status, p.status, {
                    _show: vm.loadDefault && type._show,
                });
                vm.setAdd(vm.feeds[p._feed_src], '_count_all', 1);
                vm.setAdd(type, '_count_all', 1);
                vm.setAdd(cat, '_count_all', 1);
                vm.setAdd(subcat, '_count_all', 1);
                vm.setAdd(stat, '_count_all', 1);
            });
        },
        updateFilterTreeCounts() {
            const vm = this;
            objTreeSetProp(vm.filterTree, '_count', 0);
            objTreeSetProp(vm.filterTree, '_resources', 0);
            Object.values(vm.feeds).forEach(function(obj) {
                vm.setObj(obj, '_count', 0);
                obj._count = 0;
                vm.setObj(obj, '_resources', 0);
                obj._resources = 0;
            });
            vm.featuresFiltered.forEach(function(feature) {
                const p = feature.properties;
                const type = vm.filterTree[p.feedType];
                const cat = type.category[p.category];
                const subcat = cat[p.subcategory];
                const stat = type.status[p.status];
                vm.setAdd(vm.feeds[p._feed_src], '_count', 1);
                vm.setAdd(type, '_count', 1);
                vm.setAdd(cat, '_count', 1);
                vm.setAdd(subcat, '_count', 1);
                vm.setAdd(stat, '_count', 1);
                const r = 'resources' in p ? parseInt(p.resources) : 0;
                vm.filterTree._resources += r;
                vm.setAdd(vm.feeds[p._feed_src], '_resources', r);
                vm.setAdd(type, '_resources', r);
                vm.setAdd(cat, '_resources', r);
                vm.setAdd(subcat, '_resources', r);
                vm.setAdd(stat, '_resources', r);
            });
        },
        updateMap() {
            const vm = this;
            window.clearTimeout(vm._updateMapTimeout);
            vm._updateMapTimeout = window.setTimeout(function() {
                vm._updateMap();
            }, vm.mapDelay);
        },
        _updateMap() {
            const vm = this;
            vm.mapDelay = 500;
            window.lmap.invalidateSize(true);
            window.lgeo.clearLayers();
            if (vm.mapBounds.watchZone !== null) {
                L.rectangle(vm.mapBounds.watchZone, {
                    weight: 4,
                    color: '#00EE00',
                    opacity: 0.7,
                    fillColor: 'transparent',
                }).addTo(window.lgeo);
            }
            if (vm.featuresFiltered.length > 0) {
                // https://leafletjs.com/examples/geojson/
                const geo = L.geoJSON(
                    {
                        type: 'FeatureCollection',
                        features: vm.featuresFiltered,
                        properties: {},
                    },
                    {
                        pointToLayer(feature, latlng) {
                            const p = feature.properties;
                            const icon = L.divIcon({
                                className:
                                    'map-icon feature-' +
                                    p.feedType +
                                    ' mdi mdi-' +
                                    vm.filterTree[p.feedType]._icon +
                                    ' op' +
                                    Math.round(10 * (vm.fadeWithAge ? p._opacity : 1)),
                                iconSize: [20, 20],
                                iconAnchor: [10, 10],
                            });
                            return L.featureGroup([L.marker(latlng, { icon })]);
                        },
                        style(feature) {
                            const p = feature.properties;
                            return {
                                weight: 2,
                                color: vm.filterTree[p.feedType]._color,
                                opacity: (vm.fadeWithAge ? p._opacity : 1) * 0.4,
                                fillOpacity: (vm.fadeWithAge ? p._opacity : 1) * 0.2,
                            };
                        },
                        onEachFeature(feature, layer) {
                            layer
                                .on('click', function() {
                                    vm.selectFeature(feature, true, false);
                                })
                                .bindPopup(
                                    function() {
                                        return vm.fhtml(feature, {
                                            Name: 'sourceTitle',
                                            Updated: '_date_f',
                                            Location: 'location',
                                            Resources: 'resources',
                                            Category: 'category',
                                            Subcategory: 'subcategory',
                                            Status: 'status',
                                            Size: 'size',
                                        });
                                    },
                                    {
                                        autoPan: true,
                                        closeButton: true,
                                        closeOnEscapeKey: true,
                                        closeOnClick: true,
                                    },
                                );
                            const p = feature.properties;
                            if (
                                vm.showResources &&
                                'resources' in p &&
                                'getBounds' in layer &&
                                vm.maxResources !== 0
                            ) {
                                L.circleMarker(layer.getBounds().getCenter(), {
                                    color: '#90EE90',
                                    radius:
                                        ((parseInt(p.resources) || 0) / vm.maxResources) * 50 + 12,
                                    opacity: (vm.fadeWithAge ? p._opacity : 1) * 0.9,
                                    fillOpacity: (vm.fadeWithAge ? p._opacity : 1) * 0.7,
                                }).addTo(layer);
                            }
                        },
                    },
                ).addTo(window.lgeo);
                vm.mapBounds.features = Object.freeze(geo.getBounds());
                if (!window.lmapUserZoom) {
                    window.lmapAutoZoom = true;
                    window.lmap.stop();
                    vm.zoomMap();
                }
            }
        },
        zoomMap() {
            if (this.mapBounds.features !== null) {
                window.lmap.fitBounds(this.mapBounds.features, {
                    padding: [20, 20],
                    maxZoom: 10,
                    animate: true,
                    duration: 1,
                });
            }
        },
        resetZoom() {
            window.lmapUserZoom = false;
            this.zoomMap();
        },
        zoomToUserLocation() {
            window.lmapUserZoom = true;
            window.lmap.locate({ setView: true, maxZoom: 10, duration: 1 });
        },
        updateWatchZone() {
            if (this.mapBounds.watchZone === null) {
                this.mapBounds.watchZone = Object.freeze(window.lmap.getBounds());
            } else if (confirm('Remove active watch zone?')) {
                this.mapBounds.watchZone = null;
            }
        },
        selectFeature(feature, scroll, zoom) {
            const fid = this.fid(feature);
            this.featureSelected = fid;
            const geo = L.geoJSON(feature);
            const bounds = geo.getBounds();
            if (zoom) {
                window.lmap.flyToBounds(bounds, {
                    maxZoom: 8,
                    padding: [20, 20],
                    animate: true,
                    duration: 1,
                });
            }
            window.lTargetMarker.clearLayers();
            L.circleMarker(bounds.getCenter(), {
                radius: 30,
                opacity: 0.4,
                color: '#FFFF00',
                fillColor: 'transparent',
            }).addTo(window.lTargetMarker);
            if (scroll && this.showPanel) {
                this.scrollTo('featureListItem' + fid);
            }
        },
        fid(feature) {
            const p = feature.properties;
            return p._feed_src + p.id;
        },
        fhtml(feature, keys) {
            const s = [];
            for (const label in keys) {
                const k = keys[label];
                if (k in feature.properties) {
                    s.push('<strong>' + label + '</strong>: ' + feature.properties[k]);
                }
            }
            return s.join('<br>');
        },
        scrollTo(id) {
            this.showPanel = true;
            window.setTimeout(function() {
                const e = document.getElementById(id);
                if (e) {
                    e.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        },
        getKeys(obj, keys) {
            return keys.map(function(k) {
                return { key: k, val: obj[k] };
            });
        },
        sortKeys(obj) {
            return Object.keys(obj)
                .sort()
                .map(function(k) {
                    return { key: k, val: obj[k] };
                });
        },
        reloadApp() {
            window.location.reload();
        },
        clearLocalStorage() {
            window.localStorage.clear();
        },
        alert(s) {
            alert(s);
        },
        prompt(s, val) {
            prompt(s, val);
        },
        feedErrorAlert(s) {
            alert(
                s +
                    Object.values(this.feeds)
                        .filter((i) => i.error)
                        .map((i) => i.label)
                        .join(', '),
            );
        },
        locationFound(e) {
            this.userLocation = true;
            window.llocation.clearLayers();
            const icon = L.divIcon({
                className: 'map-icon feature-current-location mdi mdi-home',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
            });
            L.marker(e.latlng, { icon }).addTo(window.llocation);
        },
        locationError(e) {
            this.userLocation = false;
            window.llocation.clearLayers();
        },
    },
    created() {
        const vm = this;

        try {
            window.applicationCache.addEventListener('updateready', vm.reloadApp);
            if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
                vm.reloadApp();
            }
        } catch (e) {}

        try {
            vm.showPanel =
                (window.innerWidth ||
                    document.documentElement.clientWidth ||
                    document.body.clientWidth ||
                    600) >= 600;
        } catch (e) {}

        const watchZone = localGet('watchZone', null);

        if (watchZone !== null) {
            vm.mapBounds.watchZone = Object.freeze(
                L.latLngBounds(watchZone._northEast, watchZone._southWest),
            );
        }

        vm.maxAge = localGet('maxAge', 24);
        vm.fadeWithAge = localGet('fadeWithAge', true);
        vm.showResources = localGet('showResources2', false);
        vm.showLightning = localGet('showLightning', false);
        vm.sortBy = localGet('sortBy', '_age');
        vm.loadFilterTree();
        vm.feedsSelected = localGet('feedsSelected', Object.keys(vm.feeds));
    },
    mounted() {
        const vm = this;

        if (document.getElementById('map').children.length > 0) {
            // console.log('Map already initialised!');
        } else {
            window.lmap = L.map('map', {
                center: ausBounds.getCenter(),
                zoom: 5,
                scrollWheelZoom: true,
                // maxBounds: ausBounds,
            });

            window.lmapUserZoom = false;
            window.lmapAutoZoom = false;

            window.lmap.on('zoomend', function() {
                if (window.lmapAutoZoom) {
                    window.lmapAutoZoom = false;
                } else {
                    window.lmapUserZoom = true;
                }
            });

            window.lgeo = L.layerGroup().addTo(window.lmap);
            window.lTargetMarker = L.layerGroup().addTo(window.lmap);
            window.llocation = L.layerGroup().addTo(window.lmap);

            const osmBaseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                subdomains: 'abc',
                attribution:
                    'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
            }).addTo(window.lmap);

            const thuderforestBaseLayer = window.L.tileLayer(
                `https://tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=${process.env.TF_API_KEY}`,
                {
                    attribution:
                        '<a href="https://www.thunderforest.com/maps/landscape/">thunderforest.com</a>',
                },
            );

            window.lightningLayer = L.imageOverlay(lightningImageUrl(), lightningImageBounds, {
                opacity: 0.6,
                className: 'lightning-image-overlay',
            });

            L.control
                .layers(
                    {
                        Streetmap: osmBaseLayer,
                        Landscape: thuderforestBaseLayer,
                    },
                    {
                        Lightning: window.lightningLayer,
                    },
                    {
                        autoZIndex: false,
                        hideSingleBase: true,
                    },
                )
                .addTo(window.lmap);
        }

        window.lmap.on('locationfound', vm.locationFound);
        window.lmap.on('locationerror', vm.locationError);

        window.fetchTimer = window.setInterval(function() {
            vm.fetchFeed();
        }, 5 * 60 * 1000);
    },
    unmounted() {
        const vm = this;
        window.lmap.off('locationfound', vm.locationFound);
        window.lmap.off('locationerror', vm.locationError);
        clearInterval(window.fetchTimer);
    },
};

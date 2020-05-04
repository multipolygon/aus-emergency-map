import axios from 'axios';
import L from 'leaflet';
import toGeoJSON from '@mapbox/togeojson';
import CheckboxToggles from '~/components/checkbox-toggles.vue';
import FilterCounts from '~/components/filter-counts.vue';

var ausBounds = L.latLngBounds(
  {
    "lat": -8.671039380459929,
    "lng": 156.18524544032667
  },
  {
    "lat": -45.27710831357647,
    "lng": 110.48212044032667
  }
);

var lmap = L.map(
  'map',
  {
    center: ausBounds.getCenter(),
    zoom: 5,
    scrollWheelZoom: true,
    maxBounds: ausBounds,
  }
);

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

const timeFormat = 'h:mma DD MMM YYYY z';

var defaultFilterTree = {
  incident: { _show: true, _color: "#CC3333", _icon: 'fire-truck', category: {}, status: {} },
  warning: { _show: true, _color: "#FFAA1D", _icon: 'alert', category: {}, status: {} },
  other: { _show: true, _color: "#2981CA", _icon: 'information', category: {}, status: {} },
};

export default {
  components: {
    CheckboxToggles,
    FilterCounts,
  },
  data () {
    return {
      showPanel: true,
      feeds: {
        vic: {
          url: 'vic.geo.json',
          label: 'Vic',
          link: 'https://emergency.vic.gov.au',
          loading: false,
          error: false,
          features: [],
        },
        nsw: {
          url: 'nsw.geo.json',
          label: 'NSW',
          link: 'https://www.rfs.nsw.gov.au',
          loading: false,
          error: false,
          features: [],
        },
        wa: {
          url: 'wa.geo.json',
          label: 'WA incidents',
          link: 'https://www.emergency.wa.gov.au',
          loading: false,
          error: false,
          features: [],
        },
        wa_warn: {
          url: 'wa-warn.geo.json',
          label: 'WA warnings',
          link: 'https://www.emergency.wa.gov.au',
          loading: false,
          error: false,
          features: [],
        },
        sa_warn: {
          url: 'sa-warn.geo.json',
          label: 'SA warnings',
          link: 'https://apps.geohub.sa.gov.au/CFSMap/index.html',
          loading: false,
          error: false,
          features: [],
        },
        sa_cfs: {
          url: 'sa-cfs.kml',
          label: 'SA CFS',
          link: 'https://apps.geohub.sa.gov.au/CFSMap/index.html',
          loading: false,
          error: false,
          type: 'document',
          features: [],
        },
        sa_mfs: {
          url: 'sa-mfs.kml',
          label: 'SA MFS',
          link: 'https://apps.geohub.sa.gov.au/CFSMap/index.html',
          loading: false,
          error: false,
          type: 'document',
          features: [],
        },
        tas: {
          url: 'tas.kml',
          label: 'Tas',
          link: 'http://www.fire.tas.gov.au/Show?pageId=colGMapBushfires',
          loading: false,
          error: false,
          type: 'document',
          features: [],
        },
        tas_warn: {
          url: 'tas-warn.kml',
          label: 'Tas warnings',
          link: 'http://www.fire.tas.gov.au/Show?pageId=colGMapBushfires',
          loading: false,
          error: false,
          type: 'document',
          features: [],
        },
        qld: {
          url: 'qld.kml',
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
      lightning: [],
    };
  },
  computed: {
    feedLoading: function () {
      var vm = this;
      return Object.keys(vm.feeds).reduce(
        function (val, src) {
          return val || vm.feeds[src].loading;
        },
        false
      );
    },
    feedError: function () {
      var vm = this;
      return Object.keys(vm.feeds).reduce(
        function (val, src) {
          return val || vm.feeds[src].error;
        },
        false
      );
    },
    filterTreeActive: function (vm) {
      for (var k in vm.filterTree) {
        if (objTreeHasValue(vm.filterTree[k].category, '_show', true) && objTreeHasValue(vm.filterTree[k].status, '_show', true)) {
          return true;
        }
      }
      return false;
    },
    maxAge_ms: function (vm) {
      return vm.maxAge * 60 * 60 * 1000;
    },
    lightningAgeFiltered: function (vm) {
      if (vm.feedsSelected.includes('lightning')) {
        var now = new Date();
        return vm.lightning.filter(
          function (i) {
            const age = now - vm.$moment.unix(i.unixTime);
            i._opacity = (age > 0) ? (1 - (age / vm.maxAge_ms / 1.1)) : 1;
            return age < vm.maxAge_ms;
          }
        );
      } else {
        return [];
      }
    },
    featuresAgeFiltered: function (vm) {
      return Object.keys(vm.feeds).reduce(
        function (features, src) {
          return features.concat(
            vm.feeds[src].features.filter(
              function (feature) {
                var p = feature.properties;
                p._opacity = (p._age > 0) ? (1 - (p._age / vm.maxAge_ms / 1.1)) : 1;
                return p._age < vm.maxAge_ms;
              }
            )
          );
        },
        []
      );
    },
    featuresSorted : function (vm) {
      var k = vm.sortBy;
      return vm.featuresFiltered.sort(
        function (a, b) {
          a = a.properties;
          b = b.properties;
          if (k === '_age' || a[k] === b[k]) {
            return a._age - b._age;
          } else if ((k in a) && (k in b)) {
            return parseFloat(b[k]) - parseFloat(a[k]);
          } else if (k in a) {
            return -1;
          } else {
            return 1;
          }
        }
      );
    },
    featuresFilteredByProperty: function (vm) {
      return vm.featuresAgeFiltered.filter(
        function (feature) {
          var p = feature.properties;
          return vm.feedsSelected.includes(p._feed_src) &&
            vm.filterTree[p.feedType]._show &&
            vm.filterTree[p.feedType].category[p.category1]._show &&
            vm.filterTree[p.feedType].category[p.category1][p.category2]._show &&
            vm.filterTree[p.feedType].status[p.status]._show;
        }
      );
    },
    featuresFilteredByWatchZone: function (vm) {
      return vm.featuresFilteredByProperty.filter(
        function (feature) {
          var p = feature.properties;
          if (!('_geo_bounds' in p)) {
            p._geo_bounds = Object.freeze(L.geoJSON(feature).getBounds());
          }
          return vm.mapBounds.watchZone.intersects(p._geo_bounds);
        }
      );
    },
    featuresFiltered: function (vm) {
      if (vm.mapBounds.watchZone === null) {
        return vm.featuresFilteredByProperty;
      } else {
        return vm.featuresFilteredByWatchZone;
      }
    },
    totalResources: function (vm) {
      return vm.featuresFiltered.reduce(
        function (n, feature) {
          if ('resources' in feature.properties) {
            var r = parseInt(feature.properties.resources) || 0;
            n += r;
          }
          return n;
        },
        0
      );
    },
    maxResources: function (vm) {
      return vm.featuresFiltered.reduce(
        function (n, feature) {
          if ('resources' in feature.properties) {
            var r = parseInt(feature.properties.resources) || 0;
            if (r > n) {
              return r;
            }
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
      vm.mapDelay = 750;
      vm.updateMap();
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
    lightningAgeFiltered: {
      deep: false,
      handler: function () {
        this.updateMap();
      }
    },
    fadeWithAge: function (val) {
      this.updateMap();
      localSet('fadeWithAge', val);
    },
    showResources: function (val) {
      this.updateMap();
      localSet('showResources', val);
    },
    maxAge: function (val) {
      localSet('maxAge', val);
    },
    feedsSelected: function (now, old) {
      for (var src of now) {
        if (!old.includes(src)) {
          this.fetchFeed(src);
        }
      }
      if (now.length == Object.keys(this.feeds).length) {
        localRemove('feedsSelected');
      } else {
        localSet('feedsSelected', now);
      }
    },
    mapBounds: {
      deep: true,
      handler: function (bounds) {
        if (bounds.watchZone === null) {
          localRemove('watchZone');
        } else {
          localSet('watchZone', bounds.watchZone);
        }
      }
    },
    sortBy: function (val) {
      localSet('sortBy', val);
    },
  },
  methods: {
    debug: function () {
    },
    togglePanel: function () {
      this.showPanel = !this.showPanel;
    },
    fetchFeed: function (src) {
      var vm = this;
      vm.mapDelay = 2000;
      if (src === undefined) {
        for (src of vm.feedsSelected) {
          vm.fetchFeed(src);
        }
      } else {
        if ((src in vm.feeds) && !vm.feeds[src].loading) {
          vm.feeds[src].loading = true;
          axios.get('./data/' + vm.feeds[src].url, { responseType: vm.feeds[src].type || 'json' })
            .then(function (response) {
              var now = new Date();
              if (src == 'lightning') {
                vm.lightning = Object.values(response.data).filter(
                  i => ausBounds.contains(L.latLng([i.lat, i.long]))
                );
              } else if (vm.feeds[src].type == 'document') {
                vm.feeds[src].features = toGeoJSON.kml(response.data).features;
              } else {
                vm.feeds[src].features = response.data.features;
              }
              vm.feeds[src].features.forEach(
                function (i) {
                  var p = i.properties;
                  p._feed_src = src;
                  if (src == 'vic') {
                    p.updated = vm.$moment.tz(p.updated, vm.$moment.ISO_8601, "Australia/Melbourne");
                  } else if (src == 'nsw') {
                    var d = parseHtmlData(p.description);
                    p.id = p.guid;
                    p.sourceTitle = p.title;
                    p.created = p.pubDate;
                    p.updated = vm.$moment.tz(d.updated, "D MMM YYYY HH:mm", "Australia/Sydney");
                    p.feedType = 'incident';
                    p.category1 = (d.fire == 'Yes') ? 'fire' : 'other';
                    p.category2 = d.type || 'other';
                    p.status = d.status || 'other';
                    p.location = d.location || 'Unknown';
                    p.size = parseFloat(d.size || 0);
                  } else if (src == 'wa' || src == 'wa_warn') {
                    p.id = String(p.incidentEventsId || 0) + String(p.messageId || 0);
                    p.sourceTitle = p.locationSuburb;
                    p.created = p.startTime;
                    if (src == 'wa') {
                      p.updated = vm.$moment.tz(p.lastUpdatedTime, "YYYY-MM-DD HH:mm:ss", "Australia/Perth");
                    } else {
                      p.updated = vm.$moment.tz(p.lastUpdatedTime, "DD-MM-YY hh:mm:ss a", "Australia/Perth");
                    }
                    p.feedType = (src == 'wa_warn') ? 'warning' : 'incident';
                    p.category1 = (p.type == 'Bushfire') ? 'fire' : 'other';
                    p.category2 = p.type || 'other';
                    p.status = p.status || 'other';
                    p.location = p.locationSuburb;
                    p.size = p.areaBurnt;
                  } else if (src == 'sa_warn') {
                    p.id = String(p.incident_id || 0) + String(p.objectid || 0);
                    p.sourceTitle = p.icon;
                    p.updated = vm.$moment.tz(p.last_edited_date, "x", "Australia/Adelaide");
                    p.feedType = 'warning';
                    p.category1 = p.icon;
                    p.category2 = 'other';
                    p.status = 'other';
                  } else if (src == 'sa_cfs' || src == 'sa_mfs') {
                    d = parseHtmlData(p.description, '<br>');
                    p.id = i.id;
                    p.sourceTitle = p.name;
                    p.updated = vm.$moment.tz(d['first reported'], "dddd DD MMM YYYY HH:mm:ss", "Australia/Adelaide");
                    p.feedType = 'incident';
                    p.category1 = p.styleUrl.replace('#','').replace('ClosedIcon','').replace('OpenIcon','').replace('SafeIcon','');
                    p.category2 = p.description.split('<br>',1)[0];
                    p.status = d.status;
                  } else if (src == 'qld') {
                    p.id = p.Master_Incident_Number;
                    p.sourceTitle = p.Location;
                    p.updated = vm.$moment.tz(p.LastUpdate, "YYYYMMDDHHmmss", "Australia/Brisbane");
                    p.feedType = 'incident';
                    p.category1 = 'other';
                    p.category2 = p.IncidentType;
                    p.status = p.CurrentStatus;
                    p.location = p.Region;
                    p.description = p.MediaMessage;
                    p.resources = parseInt(p.VehiclesOnRoute) + parseInt(p.VehiclesOnScene);
                  } else if (src == 'tas') {
                    d = parseTasDescription(p.description);
                    p.id = i.id + p.name;
                    p.sourceTitle = p.name;
                    p.updated = vm.$moment.tz(d['Last Update'], "DD-MMM-YYYY hh:mm a", "Australia/Hobart");
                    p.feedType = (src == 'tas') ? 'incident' : 'warning';
                    p.category1 = d.Type.includes('FIRE') ? 'fire' : 'other';
                    p.category2 = d.Type;
                    p.status = d.Status;
                    p.size = d.Size;
                  } else if (src == 'tas_warn') {
                    p.id = i.id;
                    p.sourceTitle = 'Unknown';
                    p.updated = vm.$moment();
                    p.feedType = 'other';
                    p.category1 = 'other';
                    p.category2 = 'other';
                    p.status = 'other';
                  }
                  p.feedType = p.feedType.toLowerCase();
                  p.category1 = p.category1.toLowerCase();
                  p.category2 = p.category2.toLowerCase();
                  p.status = p.status.toLowerCase();
                  if (!(p.feedType in vm.filterTree)) {p.feedType = 'other';}
                  if (p.category1 == 'accident / rescue') {p.category1 = 'rescue';}
                  if (p.category2 == 'bush fire') {p.category2 = 'bushfire';}
                  if (p.category1 == 'met') {
                    p.feedType = 'warning';
                    p.category1 = 'weather';
                  }
                  if (p.updated.isValid()) {
                    p._age = now - p.updated;
                    p._date_f = p.updated.format(timeFormat);
                  } else {
                    p._age = 0;
                    p._date_f = 'Invalid date';
                  }
                }
              );
              vm.feeds[src].error = false;
              vm.feedLoaded(src);
            })
            .catch(function (err) {
              // console.warn('Error: ' + src);
              console.log('error', src);
              console.log(err);
              vm.feeds[src].error = true;
              vm.feedLoaded(src);
            });
        }
      }
    },
    feedLoaded: function (src) {
      var vm = this;
      setTimeout(
        function () {
          vm.feeds[src].loading = false;
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
    setAdd: function(obj, prop, n) {
      if (prop in obj) {
        obj[prop] += n;
      } else {
        this.$set(obj, prop, n);
      }
    },
    saveFilterTree: function () {
      var vm = this;
      var param = encodeURIComponent(JSON.stringify(objPack(vm.filterTree, '_show', true)));
      if (param.length < 1000) {
        vm.shareableUrl = window.location.host + '?filter=' + param;
      } else {
        vm.shareableUrl = null;
      }
      localSet('filterTree', vm.filterTree);
    },
    loadFilterTree: function () {
      var vm = this;
      var param = getSearchParam('filter');
      if (param) {
        history.pushState("", document.title, '/');
        var obj = JSON.parse(param);
        if (obj !== null) {
          vm.loadDefault = false;
          vm.filterTree = defaultFilterTree;
          objTreeSetProp(vm.filterTree, '_show', false);
          objMerge(
            obj,
            vm.filterTree,
            function (source, target, key) {
              if (key === '_show') {
                if ('_show' in target) {
                  target._show = true;
                } else {
                  vm.$set(target, '_show', true);
                }
              } else {
                if (key in target) {
                  if ('_show' in target) {
                    target._show = true;
                  }
                } else {
                  vm.$set(target, key, { _show: true });
                }
              }
            }
          );
        }
      } else {
        vm.filterTree = localGet('filterTree', defaultFilterTree);
      }
    },
    updateFilterTree: function () {
      var vm = this;
      objTreeSetProp(vm.filterTree, '_count_all', 0);
      Object.values(vm.feeds).forEach(
        function (obj) {
          vm.setObj(obj, '_count_all', 0);
          obj._count_all = 0;
        }
      );
      vm.featuresAgeFiltered.forEach(
        function (feature) {
          var p = feature.properties;
          var type = vm.filterTree[p.feedType];
          var cat = vm.setObj(type.category, p.category1, { _show: vm.loadDefault && type._show });
          var subcat = vm.setObj(cat, p.category2, { _show: vm.loadDefault && cat._show });
          var stat = vm.setObj(type.status, p.status, { _show: vm.loadDefault && type._show });
          vm.setAdd(vm.feeds[p._feed_src], '_count_all', 1);
          vm.setAdd(type, '_count_all', 1);
          vm.setAdd(cat, '_count_all', 1);
          vm.setAdd(subcat, '_count_all', 1);
          vm.setAdd(stat, '_count_all', 1);
        }
      );
    },
    updateFilterTreeCounts: function () {
      var vm = this;
      objTreeSetProp(vm.filterTree, '_count', 0);
      objTreeSetProp(vm.filterTree, '_resources', 0);
      Object.values(vm.feeds).forEach(
        function (obj) {
          vm.setObj(obj, '_count', 0);
          obj._count = 0;
          vm.setObj(obj, '_resources', 0);
          obj._resources = 0;
        }
      );
      vm.featuresFiltered.forEach(
        function (feature) {
          var p = feature.properties;
          var type = vm.filterTree[p.feedType];
          var cat = type.category[p.category1];
          var subcat = cat[p.category2];
          var stat = type.status[p.status];
          vm.setAdd(vm.feeds[p._feed_src], '_count', 1);
          vm.setAdd(type, '_count', 1);
          vm.setAdd(cat, '_count', 1);
          vm.setAdd(subcat, '_count', 1);
          vm.setAdd(stat, '_count', 1);
          var r = ('resources' in p) ? parseInt(p.resources) : 0;
          vm.filterTree._resources += r;
          vm.setAdd(vm.feeds[p._feed_src], '_resources', r);
          vm.setAdd(type, '_resources', r);
          vm.setAdd(cat, '_resources', r);
          vm.setAdd(subcat, '_resources', r);
          vm.setAdd(stat, '_resources', r);
        }
      );
    },
    updateMap: function () {
      var vm = this;
      clearTimeout(vm._updateMapTimeout);
      vm._updateMapTimeout = setTimeout(function () { vm._updateMap(); }, vm.mapDelay);
    },
    _updateMap: function () {
      var vm = this;
      vm.mapDelay = 500;
      lmap.invalidateSize(true);
      lgeo.clearLayers();
      vm.lightningAgeFiltered.forEach(
        function (i) {
          var icon = L.divIcon({
            className: 'map-icon feature-lightning mdi mdi-flash op' + Math.round(10 * (vm.fadeWithAge ? i._opacity : 1)),
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          L.marker(L.latLng([i.lat, i.long]), { icon: icon })
            .bindPopup('Lightning strike at ' + vm.$moment.unix(i.unixTime).format(timeFormat))
            .addTo(lgeo);
        }
      );
      if (vm.mapBounds.watchZone !== null) {
        L.rectangle(vm.mapBounds.watchZone, {
          weight: 4,
          color: "#00EE00",
          opacity: 0.7,
          fillColor: 'transparent',
        }).addTo(lgeo);
      }
      if (vm.featuresFiltered.length > 0) {
        //https://leafletjs.com/examples/geojson/
        var geo = L.geoJSON({
          "type": "FeatureCollection",
          "features": vm.featuresFiltered,
          "properties": {},
        }, {
          pointToLayer: function(feature, latlng) {
            var p = feature.properties;
            var icon = L.divIcon({
              className: 'map-icon feature-' + p.feedType + ' mdi mdi-' + vm.filterTree[p.feedType]._icon + ' op' + Math.round(10 * (vm.fadeWithAge ? p._opacity : 1)),
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });
            return L.featureGroup([L.marker(latlng, { icon: icon })]);
          },
          style: function(feature) {
            var p = feature.properties;
            return {
              weight: 2,
              color: vm.filterTree[p.feedType]._color,
              opacity: (vm.fadeWithAge ? p._opacity : 1) * 0.4,
              fillOpacity: (vm.fadeWithAge ? p._opacity : 1) * 0.2,
            };
          },
          onEachFeature: function (feature, layer) {
            layer.on('click', function () {
              vm.selectFeature(feature, true, false);
            }).bindPopup(function () {
              return vm.fhtml(feature, {
                Name: 'sourceTitle',
                Updated: '_date_f',
                Location: 'location',
                Resources: 'resources',
                Category: 'category1',
                Subcategory: 'category2',
                Status: 'status',
                Size: 'size',
              });
            }, {
              autoPan: true,
              closeButton: true,
              closeOnEscapeKey: true,
              closeOnClick: true,
            });
            var p = feature.properties;
            if (vm.showResources && 'resources' in p && 'getBounds' in layer && vm.maxResources != 0) {
              L.circleMarker(
                layer.getBounds().getCenter(), {
                  color: '#90EE90',
                  radius: (parseInt(p.resources) || 0) / vm.maxResources * 50 + 12,
                  opacity: (vm.fadeWithAge ? p._opacity : 1) * 0.9,
                  fillOpacity: (vm.fadeWithAge ? p._opacity : 1) * 0.7,
                }
              ).addTo(layer);
            }
          },
        }).addTo(lgeo);
        vm.mapBounds.features = Object.freeze(geo.getBounds());
        if (!userZoom) {
          autoZoom = true;
          lmap.stop();
          vm.zoomMap();
        }
      }
    },
    zoomMap: function () {
      if (this.mapBounds.features !== null) {
        lmap.fitBounds(this.mapBounds.features, { padding: [20,20], maxZoom: 10, animate: true, duration: 1 });
      }
    },
    resetZoom: function () {
      userZoom = false;
      this.zoomMap();
    },
    zoomToUserLocation: function () {
      userZoom = true;
      lmap.locate({ setView: true, maxZoom: 10, duration: 1 });
    },
    updateWatchZone: function () {
      if (this.mapBounds.watchZone === null) {
        this.mapBounds.watchZone = Object.freeze(lmap.getBounds());
      } else {
        if (confirm('Remove active watch zone?')) {
          this.mapBounds.watchZone = null;
        }
      }
    },
    selectFeature: function (feature, scroll, zoom) {
      var fid = this.fid(feature);
      this.featureSelected = fid;
      var geo = L.geoJSON(feature);
      var bounds = geo.getBounds();
      if (zoom) {
        lmap.flyToBounds(bounds, { maxZoom: 8, padding: [20, 20], animate: true, duration: 1 });
      }
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
      return p._feed_src + p.id;
    },
    fhtml: function (feature, keys) {
      var s = [];
      for (var label in keys) {
        var k = keys[label];
        if (k in feature.properties) {
          s.push('<strong>' + label + '</strong>: ' + feature.properties[k]);
        }
      }
      return s.join('<br>');
    },
    scrollTo: function (id) {
      this.showPanel = true;
      setTimeout(
        function () {
          var e = document.getElementById(id);
          if (e) {
            e.scrollIntoView({ behavior: 'smooth' });
          }
        },
        100
      );
    },
    getKeys: function (obj, keys) {
      return keys.map(
        function (k) {
          return { key: k, val: obj[k] };
        }
      );
    },
    sortKeys: function (obj) {
      return Object.keys(obj).sort().map(
        function (k) {
          return { key: k, val: obj[k] };
        }
      );
    },
    reloadApp: function () {
      window.location.reload();
    },
    clearLocalStorage: function () {
      localStorage.clear();
    },
    alert: function (s) {
      alert(s);
    },
    prompt: function (s, val) {
      prompt(s, val);
    },
    feedErrorAlert: function (s) {
      alert(s + Object.values(this.feeds).filter(i => i.error).map(i => i.label).join(', '));
    },
  },
  created: function () {
    var vm = this;
    try {
      window.applicationCache.addEventListener('updateready', vm.reloadApp);
      if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
        vm.reloadApp();
      }
    } catch (e) { }
    try {
      vm.showPanel = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 600) >= 600;
    } catch (e) { }
    var watchZone = localGet('watchZone', null);
    if (watchZone !== null) {
      vm.mapBounds.watchZone = Object.freeze(L.latLngBounds(watchZone._northEast, watchZone._southWest));
    }
    vm.maxAge = localGet('maxAge', 24);
    vm.fadeWithAge = localGet('fadeWithAge', true);
    vm.showResources = localGet('showResources', false);
    vm.sortBy = localGet('sortBy', '_age');
    vm.loadFilterTree();
    vm.feedsSelected = localGet('feedsSelected', Object.keys(vm.feeds));

    setInterval(
      function () {
        vm.fetchFeed();
      },
      5 * 60 * 1000
    );

    // Tiles must be added last to avoid blocking entire page:
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        subdomains: 'abc',
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
      }
    ).addTo(lmap);

    var llocation = L.layerGroup().addTo(lmap);

    lmap.on(
      'locationfound',
      function (e) {
        vm.userLocation = true;
        llocation.clearLayers();
        var icon = L.divIcon({
          className: 'map-icon feature-current-location mdi mdi-home',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        L.marker(e.latlng, { icon: icon }).addTo(llocation);
      }
    );

    lmap.on(
      'locationerror',
      function () {
        vm.userLocation = false;
        llocation.clearLayers();
      }
    );
  }
};

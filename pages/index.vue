<style src="./index.css"></style>
<script src="./index.mjs"></script>

<template>
  <div>
    <div id="sidebar">
      <div title="Menu" id="panelToggle" class="circle button" v-on:click.prevent="togglePanel()">
        <div class="mdi mdi-menu-open"></div>
      </div>
      <div class="spacer"></div>
      <div title="Warning, all filters are deselected!" v-if="!filterTreeActive" class="circle alert overlay" v-on:click="alert('Warning, all filters are deselected!')">
        <div class="mdi mdi-close-box-multiple blink"></div>
      </div>
      <div v-else>
        <div title="Incidents" v-if="filterTree.incident._show" v-on:click.prevent="scrollTo('panelFilters-incident')" class="circle feature-incident">{{ filterTree.incident._count || 0 }}</div>
        <div title="Resources" v-if="showResources" v-on:click.prevent="scrollTo('panelFilters-incident')" class="circle feature-resources">{{ filterTree._resources || 0 }}</div>
        <div title="Warnings" v-if="filterTree.warning._show" v-on:click.prevent="scrollTo('panelFilters-warning')" class="circle feature-warning">{{ filterTree.warning._count || 0 }}</div>
        <div title="Other" v-if="filterTree.other._show" v-on:click.prevent="scrollTo('panelFilters-other')" class="circle feature-other">{{ filterTree.other._count || 0 }}</div>
      </div>
      <div title="Some data failed to download" v-if="feedError" class="circle alert" v-on:click="feedErrorAlert('The following data source failed to download: ')">
        <div class="mdi mdi-alert"></div>
      </div>
      <div title="Reload" class="circle button" v-on:click.prevent="fetchFeed()" v-bind:class="'animate rotate ' + (feedLoading ? 'running' : 'paused')">
        <div class="mdi mdi-refresh"></div>
      </div>
      <div class="spacer"></div>
      <div title="Zoom map to show all data" class="circle button small" v-on:click.prevent="resetZoom()">
        <div class="mdi mdi-fit-to-page"></div>
      </div>
      <div title="Zoom map to current location" class="circle button small" v-on:click.prevent="zoomToUserLocation()">
        <div v-if="userLocation === null" class="mdi mdi-map-marker"></div>
        <div v-if="userLocation === true" class="mdi mdi-map-marker-check"></div>
        <div v-if="userLocation === false" class="mdi mdi-map-marker-alert-outline"></div>
      </div>
      <div title="Set/remove watch zone" class="circle button small" v-on:click.prevent="updateWatchZone()" v-bind:class="mapBounds.watchZone !== null ? 'activeWatchZone' : ''">
        <div class="mdi mdi-crop-free"></div>
      </div>
      <div class="spacer"></div>
      <div title="Filters" class="circle button small" v-on:click.prevent="scrollTo('panelFilters')">
        <div class="mdi mdi-checkbox-marked"></div>
      </div>
      <div title="List" class="circle button small" v-on:click.prevent="scrollTo('panelList')">
        <div class="mdi mdi-view-list"></div>
      </div>
      <div title="Info" class="circle button small" v-on:click.prevent="scrollTo('panelInfo')">
        <div class="mdi mdi-help-circle"></div>
      </div>
      <div title="Share URL" v-if="shareableUrl" class="circle button small" v-on:click.prevent="prompt('Shareable URL for currently selected filters:', [shareableUrl])">
        <div class="mdi mdi-link-box-variant"></div>
      </div>
    </div>
    <div id="panel">
      <span id="panelTop"></span>
      <h1 v-on:click.prevent="debug()" style="font-size: 120%;">Australian Emergency Map</h1>
      <h2 id="panelFilters">Filters</h2>
      <p>
        Max age:
        <input type="number" min="0" max="200" step="1" v-model.lazy="maxAge" style="width: 3em;">
        hours
      </p>
      <p>
        <input type="range" min="0" value="10" max="200" step="1" v-model.lazy="maxAge" title="Max age (hours)">
      </p>
      <ol>
        <li>
          <label>
            <input type="checkbox" v-model="fadeWithAge">
            Fade-out with age
          </label>
        </li>
        <li>
          <label>
            <input type="checkbox" v-model="showResources">
            Show resources
          </label>
          <small v-if="filterTree._resources" class="badge feature-resources">{{ filterTree._resources }}</small>
        </li>
      </ol>
      <p>
        <button v-on:click.prevent="updateWatchZone()" v-bind:class="mapBounds.watchZone !== null ? 'activeWatchZone' : ''">
          <span v-if="mapBounds.watchZone === null">Set</span>
          <span v-else>Remove</span>
          watch zone
        </button>
      </p>
      <ol class="filterTree">
        <li>
          <label>
            <input type="checkbox" checked disabled>
            <strong>Data Source</strong>
          </label>
          <ol>
            <li v-for="i in sortKeys(feeds)" v-bind:key="i.key">
              <label>
                <input type="checkbox" v-model="feedsSelected" v-bind:value="i.key">
                {{ i.val.label }}
              </label>
              <small><a v-bind:href="i.val.link" target="_blank"><span class="mdi mdi-link-variant show-all"></span></a></small>
              <filter-counts v-bind:obj="i.val" v-bind:resources="showResources" cls="source"></filter-counts>
            </li>
          </ol>
        </li>
        <li v-for="feedType in getKeys(filterTree, ['incident', 'warning', 'other'])" v-if="feedType.key[0] != '_'" v-bind:key="feedType.key">
          <label v-bind:id="'panelFilters-' + feedType.key">
            <input type="checkbox" v-model="feedType.val._show">
            <strong>{{ feedType.key }}</strong>
          </label>
          <checkbox-toggles v-bind:obj="feedType.val"></checkbox-toggles>
          <filter-counts v-bind:obj="feedType.val" v-bind:resources="showResources" v-bind:cls="feedType.key"></filter-counts>
          <ol>
            <li>
              <em>Category</em>
              <checkbox-toggles v-bind:obj="feedType.val.category" v-bind:parents="[feedType.val]"></checkbox-toggles>
              <ol>
                <li v-for="category in sortKeys(feedType.val.category)" v-if="category.key[0] != '_'" v-bind:key="feedType.key + category.key">
                  <label>
                    <input type="checkbox" v-model="category.val._show" v-on:change.lazy="feedType.val._show = feedType.val._show || category.val._show">
                    {{ category.key }}
                  </label>
                  <checkbox-toggles v-bind:obj="category.val" v-bind:parents="[feedType.val, category.val]"></checkbox-toggles>
                  <filter-counts v-bind:obj="category.val" v-bind:resources="showResources" v-bind:cls="feedType.key"></filter-counts>
                  <ol>
                    <li v-for="subcat in sortKeys(category.val)" v-bind:key="feedType.key + category.key + subcat.key">
                      <label v-if="subcat.key[0] != '_'">
                        <input type="checkbox" v-model="subcat.val._show" v-on:change.lazy="feedType.val._show = category.val._show = feedType.val._show || category.val._show || subcat.val._show">
                        {{ subcat.key }}
                        <filter-counts v-bind:obj="subcat.val" v-bind:resources="showResources" v-bind:cls="feedType.key"></filter-counts>
                      </label>
                    </li>
                  </ol>
                </li>
              </ol>
            </li>
            <li>
              <em>Status</em>
              <checkbox-toggles v-bind:obj="feedType.val.status" v-bind:parents="[feedType.val]"></checkbox-toggles>
              <ol>
                <li v-for="status in sortKeys(feedType.val.status)" v-bind:key="feedType.key + status.key">
                  <label v-if="status.key[0] != '_'">
                    <input type="checkbox" v-model="status.val._show" v-on:change.lazy="feedType.val._show = feedType.val._show || status.val._show">
                    {{ status.key }}
                    <filter-counts v-bind:obj="status.val" v-bind:resources="showResources" v-bind:cls="feedType.key"></filter-counts>
                  </label>
                </li>
              </ol>
            </li>
          </ol>
        </li>
      </ol>
      <h2 id="panelList">List</h2>
      <p>
        Total Resources:
        <span class="badge feature-resources"><span class="mdi mdi-fire-truck"></span>{{ filterTree._resources }}</span>
      </p>
      <p>
        Sort:
        <select v-model="sortBy">
          <option value="_age">date-time</option>
          <option>resources</option>
          <option>size</option>
        </select>
      </p>
      <ol>
        <li v-for="feature in featuresSorted" v-bind:key="fid(feature)" v-bind:id="'featureListItem' + fid(feature)" v-on:click="selectFeature(feature, false, true)" v-bind:class="'feature ' + (fid(feature) == featureSelected ? 'selected' : '')">
          <h3>{{ feature.properties.sourceTitle }}</h3>
          <p>
            {{ feature.properties._date_f }}
          </p>
          <p v-html="feature.properties.location"></p>
          <p v-if="feature.properties.resources">
            Resources:
            <span class="badge feature-resources"><span class="mdi mdi-fire-truck"></span> {{ feature.properties.resources }}</span>
          </p>
          <p v-if="feature.properties.size">
            Size: {{ feature.properties.size }}
          </p>
          <div v-if="fid(feature) == featureSelected">
            <p v-if="feature.properties.text" v-text="feature.properties.text"></p>
            <p v-else-if="feature.properties.description" v-html="feature.properties.description"></p>
            <p>
              <a v-if="feature.properties.link || feature.properties.url" v-bind:href="feature.properties.link || feature.properties.url" target="_blank">
                more information
              </a>
            </p>
          </div>
        </li>
      </ol>
      <p v-if="featuresFiltered.length == 0">No items.</p>
      <div id="panelInfo">
        <h2>About This</h2>
        <p>
          This map is in no way officially affiliated with any emergency services, state government or data source.
        </p>
        <p>
          Do not use this app as a warning or alert service. Use it only as an analysis tool for the raw data and for seeing a big-picture overview.
        </p>
        <p>
          This is a non-commercial, volunteer project. <a href="https://github.com/reillybeacom/aus-emergency-map">Source code</a> is available and feedback or contributions welcome.
        </p>
        <p>
          The layout works best on desktop, but it is also great on tablet or mobile where it can be added to the home screen.
        </p>
        <p>
          For an overview of features please see the
          <a href="./user_guide/index.html" target="_blank">User Guide</a>.
        </p>
        <p>Built with free, open-source, community-driven software:</p>
        <ul>
          <li>
            <a href="http://leafletjs.com/">Leaflet</a>
          </li>
          <li>
            <a href="https://www.openstreetmap.org/about">OpenStreetMap</a>
          </li>
          <li>
            <a href="https://vuejs.org/">Vue.js</a>
          </li>
          <li>
            <a href="https://www.mozilla.org/en-US/firefox/">Firefox</a>
          </li>
        </ul>
        <p class="noselect">
          Contact:<br/>
          aem<span class="mdi mdi-at"></span>reillybeacom.net
        </p>
        <p style="font-size: 70%; color: grey;">
          Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>
        </p>
        <p style="font-size: 70%; color: grey;">
          THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
          IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
          AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
          LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
          OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
          THE SOFTWARE.
        </p>
        <p>
          <small>
            <button v-on:click.prevent="reloadApp">Reload App</button>
          </small>
        </p>
        <p>
          <small>
            <button v-on:click.prevent="clearLocalStorage">Clear Saved Settings</button>
          </small>
        </p>
        <br/>
        <br/>
      </div>
    </div>
  </div>
</template>

<style src="./map.css"></style>
<script src="./map.mjs"></script>

<template>
    <div>
        <div id="sidebar">
            <div id="panelToggle" title="Menu" class="circle button" @click.prevent="togglePanel()">
                <div class="mdi mdi-menu-open"></div>
            </div>
            <div class="spacer"></div>
            <div
                v-if="!filterTreeActive"
                title="Warning, all filters are deselected!"
                class="circle alert overlay"
                @click="alert('Warning, all filters are deselected!')"
            >
                <div class="mdi mdi-close-box-multiple blink"></div>
            </div>
            <div v-else>
                <div
                    v-if="filterTree.incident._show"
                    title="Incidents"
                    class="circle feature-incident"
                    @click.prevent="scrollTo('panelFilters-incident')"
                >
                    {{ filterTree.incident._count || 0 }}
                </div>
                <div
                    v-if="showResources"
                    title="Resources"
                    class="circle feature-resources"
                    @click.prevent="scrollTo('panelFilters-incident')"
                >
                    {{ filterTree._resources || 0 }}
                </div>
                <div
                    v-if="filterTree.warning._show"
                    title="Warnings"
                    class="circle feature-warning"
                    @click.prevent="scrollTo('panelFilters-warning')"
                >
                    {{ filterTree.warning._count || 0 }}
                </div>
                <div
                    v-if="filterTree.other._show"
                    title="Other"
                    class="circle feature-other"
                    @click.prevent="scrollTo('panelFilters-other')"
                >
                    {{ filterTree.other._count || 0 }}
                </div>
            </div>
            <div
                v-if="feedError"
                title="Some data failed to download"
                class="circle alert"
                @click="feedErrorAlert('The following data source failed to download: ')"
            >
                <div class="mdi mdi-alert"></div>
            </div>
            <div
                title="Reload"
                class="circle button"
                :class="'animate rotate ' + (feedLoading ? 'running' : 'paused')"
                @click.prevent="fetchFeed()"
            >
                <div class="mdi mdi-refresh"></div>
            </div>
            <div class="spacer"></div>
            <div
                title="Zoom map to show all data"
                class="circle button small"
                @click.prevent="resetZoom()"
            >
                <div class="mdi mdi-fit-to-page"></div>
            </div>
            <div
                title="Zoom map to current location"
                class="circle button small"
                @click.prevent="zoomToUserLocation()"
            >
                <div v-if="userLocation === null" class="mdi mdi-map-marker"></div>
                <div v-if="userLocation === true" class="mdi mdi-map-marker-check"></div>
                <div v-if="userLocation === false" class="mdi mdi-map-marker-alert-outline"></div>
            </div>
            <div
                title="Set/remove watch zone"
                class="circle button small"
                :class="mapBounds.watchZone !== null ? 'activeWatchZone' : ''"
                @click.prevent="updateWatchZone()"
            >
                <div class="mdi mdi-crop-free"></div>
            </div>
            <div class="spacer"></div>
            <div
                title="Filters"
                class="circle button small"
                @click.prevent="scrollTo('panelFilters')"
            >
                <div class="mdi mdi-checkbox-marked"></div>
            </div>
            <div title="List" class="circle button small" @click.prevent="scrollTo('panelList')">
                <div class="mdi mdi-view-list"></div>
            </div>
            <div title="Information" class="circle button small">
                <a href="/#user-guide"><div class="mdi mdi-help-circle"></div></a>
            </div>
            <div
                v-if="shareableUrl"
                title="Share URL"
                class="circle button small"
                @click.prevent="
                    prompt('Shareable URL for currently selected filters:', [shareableUrl])
                "
            >
                <div class="mdi mdi-link-box-variant"></div>
            </div>
        </div>
        <div id="panel">
            <span id="panelTop"></span>
            <h1 style="font-size: 120%;" @click.prevent="debug()">
                Australian National<br />Emergency Map
            </h1>
            <p>Australia-wide live emergency incident map covering all states and territories.</p>
            <h2 id="panelFilters">Data Filters</h2>
            <p>
                Max age:
                <input
                    v-model.lazy="maxAge"
                    type="number"
                    min="0"
                    max="200"
                    step="1"
                    style="width: 3em;"
                />
                hours
            </p>
            <p>
                <input
                    v-model.lazy="maxAge"
                    type="range"
                    min="0"
                    value="10"
                    max="200"
                    step="1"
                    title="Max age (hours)"
                />
            </p>
            <ol>
                <li>
                    <label>
                        <input v-model="fadeWithAge" type="checkbox" />
                        Fade-out with age
                    </label>
                </li>
                <li>
                    <label>
                        <input v-model="showResources" type="checkbox" />
                        Show resources
                    </label>
                    <small v-if="filterTree._resources" class="badge feature-resources">{{
                        filterTree._resources
                    }}</small>
                </li>
                <li>
                    <label
                        title="LightningMaps.org CC BY-SA 4.0 / Lightning data by Blitzortung.org and contributors"
                    >
                        <input v-model="showLightning" type="checkbox" />
                        Show lightning
                    </label>
                    <small>
                        <a
                            href="http://www.lightningmaps.org/blitzortung/oceania/index.php?bo_page=map&bo_period=24&bo_showmap=australia_big"
                            target="_blank"
                            title="LightningMaps.org CC BY-SA 4.0 / Lightning data by Blitzortung.org and contributors"
                        >
                            <span class="mdi mdi-link-variant"></span>
                        </a>
                    </small>
                </li>
            </ol>
            <p>
                <button
                    :class="mapBounds.watchZone !== null ? 'activeWatchZone' : ''"
                    @click.prevent="updateWatchZone()"
                >
                    <span v-if="mapBounds.watchZone === null">Set</span>
                    <span v-else>Remove</span>
                    watch zone
                </button>
            </p>
            <ol class="filterTree">
                <li>
                    <label>
                        <input type="checkbox" checked disabled />
                        <strong>Data Source</strong>
                    </label>
                    <ol>
                        <li v-for="i in sortKeys(feeds)" :key="i.key">
                            <label>
                                <input v-model="feedsSelected" type="checkbox" :value="i.key" />
                                {{ i.val.label }}
                            </label>
                            <small
                                ><a :href="i.val.link" target="_blank"
                                    ><span class="mdi mdi-link-variant show-all"></span></a
                            ></small>
                            <filter-counts
                                :obj="i.val"
                                :resources="showResources"
                                cls="source"
                            ></filter-counts>
                        </li>
                    </ol>
                </li>
                <li v-for="feedType in filterTreeRootKeys" :key="feedType.key">
                    <div v-if="feedType.key[0] != '_'">
                        <label :id="'panelFilters-' + feedType.key">
                            <input v-model="feedType.val._show" type="checkbox" />
                            <strong>{{ feedType.key }}</strong>
                        </label>
                        <checkbox-toggles :obj="feedType.val"></checkbox-toggles>
                        <filter-counts
                            :obj="feedType.val"
                            :resources="showResources"
                            :cls="feedType.key"
                        ></filter-counts>
                        <ol>
                            <li>
                                <em>Category</em>
                                <checkbox-toggles
                                    :obj="feedType.val.category"
                                    :parents="[feedType.val]"
                                ></checkbox-toggles>
                                <ol>
                                    <li
                                        v-for="category in sortKeys(feedType.val.category)"
                                        :key="feedType.key + category.key"
                                    >
                                        <div v-if="category.key[0] != '_'">
                                            <label>
                                                <input
                                                    v-model="category.val._show"
                                                    type="checkbox"
                                                    @change="
                                                        feedType.val._show =
                                                            feedType.val._show || category.val._show
                                                    "
                                                />
                                                {{ category.key }}
                                            </label>
                                            <checkbox-toggles
                                                :obj="category.val"
                                                :parents="[feedType.val, category.val]"
                                            ></checkbox-toggles>
                                            <filter-counts
                                                :obj="category.val"
                                                :resources="showResources"
                                                :cls="feedType.key"
                                            ></filter-counts>
                                            <ol>
                                                <li
                                                    v-for="subcat in sortKeys(category.val)"
                                                    :key="feedType.key + category.key + subcat.key"
                                                >
                                                    <label v-if="subcat.key[0] != '_'">
                                                        <input
                                                            v-model="subcat.val._show"
                                                            type="checkbox"
                                                            @change="
                                                                feedType.val._show = category.val._show =
                                                                    feedType.val._show ||
                                                                    category.val._show ||
                                                                    subcat.val._show
                                                            "
                                                        />
                                                        {{ subcat.key }}
                                                        <filter-counts
                                                            :obj="subcat.val"
                                                            :resources="showResources"
                                                            :cls="feedType.key"
                                                        ></filter-counts>
                                                    </label>
                                                </li>
                                            </ol>
                                        </div>
                                    </li>
                                </ol>
                            </li>
                            <li>
                                <em>Status</em>
                                <checkbox-toggles
                                    :obj="feedType.val.status"
                                    :parents="[feedType.val]"
                                ></checkbox-toggles>
                                <ol>
                                    <li
                                        v-for="status in sortKeys(feedType.val.status)"
                                        :key="feedType.key + status.key"
                                    >
                                        <label v-if="status.key[0] != '_'">
                                            <input
                                                v-model="status.val._show"
                                                type="checkbox"
                                                @change="
                                                    feedType.val._show =
                                                        feedType.val._show || status.val._show
                                                "
                                            />
                                            {{ status.key }}
                                            <filter-counts
                                                :obj="status.val"
                                                :resources="showResources"
                                                :cls="feedType.key"
                                            ></filter-counts>
                                        </label>
                                    </li>
                                </ol>
                            </li>
                        </ol>
                    </div>
                </li>
            </ol>
            <h2 id="panelList">List</h2>
            <p>
                Total Resources:
                <span class="badge feature-resources"
                    ><span class="mdi mdi-fire-truck"></span>{{ filterTree._resources }}</span
                >
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
                <li
                    v-for="feature in featuresSorted"
                    :id="'featureListItem' + fid(feature)"
                    :key="fid(feature)"
                    :class="'feature ' + (fid(feature) == featureSelected ? 'selected' : '')"
                    @click="selectFeature(feature, false, true)"
                >
                    <h3>{{ feature.properties.sourceTitle }}</h3>
                    <p>
                        {{ feature.properties._date_f }}
                    </p>
                    <p v-html="feature.properties.location"></p>
                    <p v-if="feature.properties.resources">
                        Resources:
                        <span class="badge feature-resources"
                            ><span class="mdi mdi-fire-truck"></span>
                            {{ feature.properties.resources }}</span
                        >
                    </p>
                    <p v-if="feature.properties.size">Size: {{ feature.properties.size }}</p>
                    <div v-if="fid(feature) == featureSelected">
                        <p v-if="feature.properties.text" v-text="feature.properties.text"></p>
                        <p
                            v-else-if="feature.properties.description"
                            v-html="feature.properties.description"
                        ></p>
                        <p>
                            <a
                                v-if="feature.properties.link || feature.properties.url"
                                :href="feature.properties.link || feature.properties.url"
                                target="_blank"
                            >
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
                    This map is in no way officially affiliated with any emergency services, state
                    government or data source.
                </p>
                <p>
                    Do not use this app as a warning or alert service. Use it only as an analysis
                    tool for the raw data and for seeing a big-picture overview.
                </p>
                <p>
                    This is a volunteer-time project effort.
                    <a href="https://github.com/multipolygon/aus-emergency-map">Source code</a> is
                    available and feedback or contributions are welcome.
                </p>
                <p>
                    The app layout works best on desktop, but it is also great on tablet or mobile
                    where it can be added to the home screen.
                </p>
                <p>
                    Built with non-commercial, open-source, democratic, free (as in freedom of
                    information), community-controlled software:
                    <a href="https://www.openstreetmap.org/about">OpenStreetMap</a>,
                    <a href="http://leafletjs.com/">Leaflet</a>,
                    <a href="https://vuejs.org/">Vue.js</a> and
                    <a href="https://www.mozilla.org/en-US/firefox/">Firefox</a>.
                </p>
                <p>Email: <em>contact@multipolygon.net</em></p>
                <p style="color: grey;">
                    Map data &copy;
                    <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors,
                    <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>
                </p>
                <p style="color: grey;">
                    LightningMaps.org CC BY-SA 4.0 / Lightning data by Blitzortung.org and
                    contributors.
                </p>
                <p style="font-size: 70%; color: grey;">
                    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
                    FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
                    COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
                    IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
                    CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                </p>
                <p>
                    <small>
                        <button @click.prevent="reloadApp">Reload App</button>
                    </small>
                </p>
                <p>
                    <small>
                        <button @click.prevent="clearLocalStorage">Clear Saved Settings</button>
                    </small>
                </p>
                <br />
                <br />
            </div>
        </div>
    </div>
</template>

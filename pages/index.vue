<style src="./index.css"></style>

<template>
    <div id="container">
        <div id="content">
            <div style="color: #CC3333; font-size: 50px; line-height: 50px; transform: scaleX(-1);">
                <span class="mdi mdi-fire-truck"></span>
            </div>
            <h1 style="color: #CC3333">
                Australia Wide Emergency Map
            </h1>
            <p>
                <strong
                    >Australian live emergency incident map covering all states and
                    territories.</strong
                                    >
            </p>
            <p>
                <a href="/map" class="button">
                    <span class="mdi mdi-open-in-new"></span>
                    Launch the Map
                </a>
            </p>
            <div class="images">
                <img src="/user_guide/category-status-filter.jpg" alt="" />
                <img src="/user_guide/controls.jpg" alt="" />
                <img src="/user_guide/max-age.jpg" alt="" />
                <img src="/user_guide/resource-circle.jpg" alt="" />
                <img src="/user_guide/side-panel.jpg" alt="" />
                <img src="/user_guide/sort-resources.jpg" alt="" />
                <img src="/user_guide/warnings.jpg" alt="" />
                <img src="/user_guide/watch-zone.jpg" alt="" />
            </div>
            <div style="text-align: center; color: grey;">
                <small>
                    <span class="mdi mdi-hand-pointing-left"></span>
                    <em>scroll</em>
                    <span class="mdi mdi-hand-pointing-right"></span>
                </small>
            </div>
            <br />
            <p>
                Incident data is collated directly from:
                <em>emergency.vic.gov.au</em> (Victoria), <em>rfs.nsw.gov.au</em> (New South Wales),
                <em>emergency.wa.gov.au</em> (Western Australia), <em>geohub.sa.gov.au</em>,
                <em>data.eso.sa.gov.au</em> (South Australia), <em>fire.tas.gov.au</em> (Tasmania),
                and <em>qfes.qld.gov.au</em> (Queensland).
            </p>
            <br />
            <p style="color: #CC3333">
                <strong>
                    Do not use this app as a warning or alert service. Do not use this app for
                    safety of life decisions. Use it only as a data analysis tool and for seeing
                    a big-picture overview.
                </strong>
            </p>
            <br />
            <p>
                This map is in no way officially affiliated with any emergency services, state
                government or data source.
            </p>
            <p>
                For local updates and alerts, please refer to your state emergency or fire
                service.
            </p>
            <p>
                This is a non-commercial, volunteer-time project.
                <a href="https://github.com/multipolygon/aus-emergency-map">Source code</a> is
                available and feedback or contributions are welcome.
            </p>
            <p>
                The layout works best on desktop, but it is also great on tablet or mobile where
                it can be added to the home screen.
            </p>
            <p>
                For an overview of features please see the
                <a href="./user_guide/index.html" target="_blank">User Guide</a>.
            </p>
            <p>
                Built with free, open-source, community-driven software:
                <a href="http://leafletjs.com/">Leaflet</a>,
                <a href="https://www.openstreetmap.org/about">OpenStreetMap</a>,
                <a href="https://vuejs.org/">Vue.js</a> and
                <a href="https://www.mozilla.org/en-US/firefox/">Firefox</a>.
            </p>
            <p>Contact: <em>mail/@/multipolygon.net</em></p>
            <br />
            <p style="font-size: 70%; color: grey;">
                Map data &copy;
                <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors,
                <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>
            </p>
            <p style="font-size: 70%; color: grey;">
                THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
                FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
                COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
                IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
                CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
            </p>
        </div>
    </div>
</template>

const title = 'Australia Wide Emergency Map';
const description = 'Australian live emergency incident map covering all states and territories.';
const host = 'https://australia.emergencymap.app';

export default {
    /*
     ** Headers of the page
     */
    ssr: false,
    target: 'static',
    env: {
        TF_API_KEY: process.env.TF_API_KEY,
    },
    head: {
        title,
        meta: [
            { charset: 'utf-8' },
            {
                hid: 'description',
                name: 'description',
                content: description,
            },
        ],
        script: [],
        link: [
            { rel: 'icon', type: 'image/png', href: '/icons/transparent/icon128.png' },
            { rel: 'shortcut icon', type: 'image/png', href: '/icons/transparent/icon128.png' },
        ],
    },
    /*
     ** Customize the progress-bar color
     */
    loading: { color: '#fff' },
    /*
     ** Global CSS
     */
    css: [
        'normalize.css/normalize.css',
        './style/mdi/css/materialdesignicons.min.css',
        // 'leaflet-fullscreen/dist/leaflet.fullscreen.css',
        // 'leaflet.markercluster/dist/MarkerCluster.css',
        // 'leaflet.markercluster/dist/MarkerCluster.Default.css',
        'leaflet/dist/leaflet.css',
        './app.css',
    ],
    /*
     ** Plugins to load before mounting the App
     */
    plugins: [],
    /*
     ** Nuxt.js dev-modules
     */
    buildModules: [
        // Doc: https://github.com/nuxt-community/eslint-module
        // '@nuxtjs/eslint-module',
        // Doc: https://github.com/nuxt-community/stylelint-module
        // '@nuxtjs/stylelint-module'
        '@nuxtjs/moment',
    ],
    /*
     ** Nuxt.js modules
     */
    modules: [
        // Doc: https://axios.nuxtjs.org/usage
        '@nuxtjs/axios',
        '@nuxtjs/pwa',
    ],
    /*
     ** Axios module configuration
     ** See https://axios.nuxtjs.org/options
     */
    axios: {},
    /*
     ** Build configuration
     */
    moment: {
        timezone: {
            matchZones: /Australia\/(Melbourne|Sydney|Perth|Adelaide|Brisbane|Hobart)/,
            startYear: 2019,
            endYear: 2030,
        },
    },
    pwa: {
        workbox: {},
        meta: {
            ogHost: host,
            mobileAppIOS: true,
            name: title,
            author: '-',
            description,
            theme_color: '#FFF',
            nativeUI: true,
        },
        icon: {},
        manifest: {
            name: title,
            short_name: 'Emergency Map',
            description,
            start_url: '../map/',
            theme_color: '#FFF',
        },
    },
    build: {
        /*
         ** You can extend webpack config here
         */
        extend(config, ctx) {},
    },
};

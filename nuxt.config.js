export default {
    mode: 'spa',
    /*
     ** Headers of the page
     */
    head: {
        title: 'Aus Emergency Map',
        meta: [
            { charset: 'utf-8' },
            {
                hid: 'description',
                name: 'description',
                content: 'Australian Emergency Services Incident Map',
            },
        ],
        script: [{ src: '/utils.js' }],
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
        '@mdi/font/css/materialdesignicons.min.css',
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
            mobileApp: true,
            mobileAppIOS: true,
            theme_color: '#FFF',
            ogSiteName: 'Aus Emergency Map',
            ogTitle: 'Aus Emergency Map',
            nativeUI: true,
        },
        icon: {},
        manifest: {
            name: 'Aus Emergency Map',
            short_name: 'Emergency Map',
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

export default {
  mode: 'spa',
  /*
   ** Headers of the page
   */
  head: {
    title: process.env.npm_package_name || '',
    meta: [
      { charset: 'utf-8' },
      {
        hid: 'description',
        name: 'description',
        content: process.env.npm_package_description || ''
      }
    ],
    script: [
      { src: '/utils.js' },
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    ]
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
    }
  },
  pwa: {
    workbox: {
    },
    meta: {
      viewport: 'width=device-width, initial-scale=1, user-scalable=0',
    },
    icon: {
    },
    manifest: {
    },
  },
  build: {
    /*
     ** You can extend webpack config here
     */
    extend(config, ctx) {}
  }
}

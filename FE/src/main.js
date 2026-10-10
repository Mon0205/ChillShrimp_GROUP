import { createApp } from 'vue'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import App from './App.vue'
import './styles/interface.css'
import './styles/tables.css'
import router from './router/index.js'
import { installSessionHandling } from './composables/auth.js'

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'chillShrimp',
    themes: {
      chillShrimp: {
        dark: false,
        colors: {
          background: '#F5F8F7', surface: '#FFFFFF', primary: '#087F6E',
          secondary: '#06685B', success: '#087F6E', error: '#C83D4D', info: '#2479A8',
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'lg', elevation: 0 },
    VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VSelect: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VCard: { rounded: 'lg' },
  },
})

installSessionHandling(router)
createApp(App).use(vuetify).use(router).mount('#app')

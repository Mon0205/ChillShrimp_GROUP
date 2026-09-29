import { createApp } from 'vue'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import App from './App.vue'
import router from './router/index.js'
import { installSessionHandling } from './composables/auth.js'

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'chillShrimp',
    themes: {
      chillShrimp: {
        dark: false,
        colors: {
          background: '#F0FDFA', surface: '#FFFFFF', primary: '#087F6E',
          secondary: '#06685B', success: '#087F6E', error: '#C83D4D', info: '#2479A8',
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'lg', fontWeight: 700 },
    VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VSelect: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VCard: { rounded: 'xl' },
  },
})

installSessionHandling(router)
createApp(App).use(vuetify).use(router).mount('#app')

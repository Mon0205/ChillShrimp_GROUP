import { createApp } from 'vue'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import App from './App.vue'
import './styles.css'

const vuetify = createVuetify({ theme: { defaultTheme: 'light' } })

createApp(App).use(vuetify).mount('#app')

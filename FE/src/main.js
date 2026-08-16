import { createApp } from 'vue'
import { createVuestic } from 'vuestic-ui'
import 'vuestic-ui/css'
import App from './App.vue'
import router from './router/index.js'
import './styles.css'

createApp(App).use(createVuestic()).use(router).mount('#app')

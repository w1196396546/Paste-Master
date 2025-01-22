import { createApp } from 'vue'
import QuickAccess from './renderer/views/QuickAccess.vue'
import { createPinia } from 'pinia'

const app = createApp(QuickAccess)
const pinia = createPinia()

app.use(pinia)
app.mount('#app') 
// 應用程式入口：註冊 Pinia 與全域 Sass。
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.sass'
createApp(App).use(createPinia()).mount('#app')

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';
import './styles/theme.css';
import './styles/medical-bay-theme.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// 应用星际医疗舱主题
app.config.globalProperties.$theme = 'medical-bay';

app.mount('#app');

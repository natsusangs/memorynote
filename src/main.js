import Vue from 'vue'
import App from './App.vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import axios from 'axios'
import router from './router'
import store from './store'

// 设置axios的baseURL
axios.defaults.baseURL = 'http://localhost:8088'
Vue.prototype.$http = axios

// 使用ElementUI
Vue.use(ElementUI)

// 设置Vue的config.productionTip为false
Vue.config.productionTip = false

// 从localStorage恢复登录状态
function restoreLoginState() {
  const token = localStorage.getItem('token')
  const userInfo = localStorage.getItem('userInfo')
  
  if (token && userInfo) {
    try {
      const user = JSON.parse(userInfo)
      store.commit('setUser', user)
      store.commit('setUid', user.id)
      console.log('登录状态已恢复:', user)
    } catch (error) {
      console.error('恢复登录状态失败:', error)
      // 清除无效的localStorage数据
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
    }
  }
}

// 在创建Vue实例前恢复登录状态
restoreLoginState()

// 创建Vue实例并挂载到#app
new Vue({
  router,
  store,
  render: h => h(App),
  mounted() {
    // 调试用：检查store是否正确注入
    console.log('Store in Vue instance:', this.$store)
    console.log('Current user:', this.$store.state.user)
    console.log('Current uid:', this.$store.state.uid)
  }
}).$mount('#app')

import Vue from 'vue'
import Vuex from 'vuex'

// 确保Vuex被正确使用
Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        count: 0,
        user: null,
        uid: null,
        isLoggedIn: false
    },
    mutations: {
        increment(state) {
            state.count++
        },
        setUser(state, user) {
            state.user = user
            state.isLoggedIn = !!user
            console.log('User set in store:', user)
        },
        setUid(state, uid) {
            state.uid = uid
            console.log('UID set in store:', uid)
        },
        // 新增：清除登录状态
        clearLoginState(state) {
            state.user = null
            state.uid = null
            state.isLoggedIn = false
        },
        // 新增：设置完整登录状态
        setLoginState(state, { user, uid }) {
            state.user = user
            state.uid = uid
            state.isLoggedIn = true
        }
    },
    actions: {
        // 登录action
        login({ commit }, { user, token }) {
            // 保存到localStorage
            localStorage.setItem('token', token)
            localStorage.setItem('userInfo', JSON.stringify(user))
            
            // 更新store状态
            commit('setLoginState', { user, uid: user.id })
        },
        
        // 登出action
        logout({ commit }) {
            // 清除localStorage
            localStorage.removeItem('token')
            localStorage.removeItem('userInfo')
            localStorage.removeItem('savedUsername')
            localStorage.removeItem('savedPassword')
            
            // 清除store状态
            commit('clearLoginState')
        },
        
        // 恢复登录状态action
        restoreLoginState({ commit }) {
            const token = localStorage.getItem('token')
            const userInfo = localStorage.getItem('userInfo')
            
            if (token && userInfo) {
                try {
                    const user = JSON.parse(userInfo)
                    commit('setLoginState', { user, uid: user.id })
                    return true
                } catch (error) {
                    console.error('恢复登录状态失败:', error)
                    // 清除无效数据
                    localStorage.removeItem('token')
                    localStorage.removeItem('userInfo')
                    return false
                }
            }
            return false
        }
    },
    getters: {
        getUser: state => state.user,
        getUid: state => state.uid,
        isLoggedIn: state => state.isLoggedIn,
        // 获取用户名
        getUsername: state => state.user?.username || '',
        // 检查是否有有效token
        hasValidToken: state => {
            return state.isLoggedIn && !!localStorage.getItem('token')
        }
    }
})
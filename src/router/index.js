import VueRouter from "vue-router";
import Vue from "vue";
import UserMain from "../components/UserMain.vue";
import Login from "../components/Login.vue";
import PhotoGallery from "../components/PhotoGallery.vue";
import Register from "../components/Register.vue";
import AlbumView from "../components/AlbumView.vue";
import RouteView from "../components/RouteView.vue";
import store from "../store";

//注册VueRouter
Vue.use(VueRouter);

const router = new VueRouter({
    routes: [
        { 
            path: "/",
            redirect: "/login"
        },
        {
            path: "/login",
            component: Login,
            meta: { requiresGuest: true } // 需要未登录状态
        },
        {
            path: "/userMain",
            component: UserMain,
            meta: { requiresAuth: true } // 需要登录状态
        },
        {
            path: "/photoGallery",
            component: PhotoGallery,
            meta: { requiresAuth: true } // 需要登录状态
        },
        {
            path: "/albumView",
            component: AlbumView,
            meta: { requiresAuth: true }
        },
        {
            path: "/routeView",
            component: RouteView,
            meta: { requiresAuth: true }
        },
        {
            path: "/register",
            component: Register,
            meta: { requiresGuest: true } // 需要未登录状态
        }
    ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
    // 先尝试恢复登录状态
    if (!store.state.isLoggedIn) {
        store.dispatch('restoreLoginState')
    }
    
    const isLoggedIn = store.getters.isLoggedIn
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
    const requiresGuest = to.matched.some(record => record.meta.requiresGuest)
    
    if (requiresAuth && !isLoggedIn) {
        // 需要登录但未登录，跳转到登录页
        next('/login')
    } else if (requiresGuest && isLoggedIn) {
        // 需要未登录状态但已登录，跳转到主页
        next('/userMain')
    } else {
        // 正常通行
        next()
    }
})

export default router;


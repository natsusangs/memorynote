<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
import Login from './components/Login.vue'
import UserMain from './components/UserMain.vue'
import PhotoGallery from './components/PhotoGallery.vue'
import Register from './components/Register.vue'
import RouteView from './components/RouteView.vue'

export default {
  name: 'App',
  components: {
    Login,
    UserMain,
    PhotoGallery,
    Register,
    RouteView
  }
}
</script>

<style>
/* 强制重置所有可能影响布局的样式 */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  height: 100%;
  overflow-x: hidden;
}

body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  position: relative;
}

/* 确保router-view也填满 */
#app > div {
  height: 100vh;
  width: 100vw;
}
</style>

<template>
    <div class="login-container">
      <!-- 背景动画 -->
      <div class="bg-animation">
        <div class="bg-bubble" v-for="i in 5" :key="i"></div>
      </div>
      
      <!-- 登录框 -->
      <div class="login-box">
        <div class="login-header">
          <div class="login-logo">
            📝
          </div>
          <h1 class="login-title">Welcome to MemoryNote</h1>
          <p class="login-subtitle">MemoryNote</p>
        </div>
        
        <el-form 
          ref="loginForm"
          :model="loginForm" 
          :rules="loginRules"
          label-width="0"
          @submit.native.prevent="handleLogin"
        >
          <!-- 用户名 -->
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="Please enter your username"
              size="large"
              clearable
              prefix-icon="el-icon-user"
              @focus="clearError"
            >
            </el-input>
          </el-form-item>
          
          <!-- 密码 -->
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="Please enter your password"
              size="large"
              show-password
              prefix-icon="el-icon-lock"
              @focus="clearError"
              @keyup.enter.native="submitForm"
            >
            </el-input>
          </el-form-item>
          
          <!-- 验证码 -->
          <el-form-item prop="captcha">
            <div class="captcha-group">
              <el-input
                v-model="loginForm.captcha"
                placeholder="Please enter the verification code"
                size="large"
                maxlength="4"
                clearable
                prefix-icon="el-icon-key"
                @focus="clearError"
                @keyup.enter.native="submitForm"
              >
              </el-input>
              <div 
                class="captcha-image"
                @click="refreshCaptcha"
                :title="'Please click to refresh the verification code'"
              >
                {{ captchaText }}
              </div>
            </div>
          </el-form-item>
          
          <!-- 记住密码 -->
          <el-form-item>
            <div class="form-options">
              <el-checkbox v-model="loginForm.remember">Remember password</el-checkbox>
              <el-link type="primary" :underline="false" @click="registerAccount">Register</el-link>
            </div>
          </el-form-item>
          
          <!-- 登录按钮 -->
          <el-form-item>
            <el-button 
              type="primary"
              size="large"
              class="login-btn"
              :loading="loading"
              @click="submitForm"
            >
              {{ loading ? 'Logging in...' : 'Login' }}
            </el-button>
          </el-form-item>
        </el-form>
        
      </div>
    </div>
  </template>
  
  <script>
  import axios from 'axios'
  
  export default {
    name: 'Login',
    
    data() {
      return {
        // 表单数据
        loginForm: {
          username: '',
          password: '',
          captcha: '',
          remember: false
        },
        
        // 表单验证规则
        loginRules: {
          username: [
            { required: true, message: 'Please enter your username', trigger: 'blur' },
            { min: 3, max: 20, message: 'The username must be between 3 and 20 characters', trigger: 'blur' }
          ],
          password: [
            { required: true, message: 'Please enter your password', trigger: 'blur' },
            { min: 6, message: 'The password must be at least 6 characters', trigger: 'blur' }
          ],
          captcha: [
            { required: true, message: 'Please enter the verification code', trigger: 'blur' },
            { len: 4, message: 'The verification code must be 4 characters', trigger: 'blur' }
          ]
        },
        
        // 其他状态
        captchaText: '',
        loading: false
      }
    },
    
    mounted() {
      this.refreshCaptcha()
      this.loadSavedCredentials()
    },
    
    methods: {
      // 生成验证码
      refreshCaptcha() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let captcha = ''
        for (let i = 0; i < 4; i++) {
          captcha += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        this.captchaText = captcha
      },
      
      // 加载保存的登录信息
      loadSavedCredentials() {
        const savedUsername = localStorage.getItem('savedUsername')
        const savedPassword = localStorage.getItem('savedPassword')
        if (savedUsername && savedPassword) {
          this.loginForm.username = savedUsername
          this.loginForm.password = savedPassword
          this.loginForm.remember = true
        }
      },
      
      // 提交表单
      submitForm() {
        this.$refs.loginForm.validate((valid) => {
          if (valid) {
            this.handleLogin()
          }
        })
      },
      
      // 处理登录
      async handleLogin() {
        // 验证验证码
        if (this.loginForm.captcha.toUpperCase() !== this.captchaText) {
          this.$message.error('The verification code is incorrect')
          this.refreshCaptcha()
          this.loginForm.captcha = ''
          return
        }
        
        this.loading = true
        
        try {
          const response = await axios.post('/login', {
            username: this.loginForm.username,
            password: this.loginForm.password
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
          
          if (response.data.success) {
            // 使用store action处理登录
            this.$store.dispatch('login', {
              user: response.data.userInfo,
              token: response.data.token
            })
            
            // 处理记住密码
            if (this.loginForm.remember) {
              localStorage.setItem('savedUsername', this.loginForm.username)
              localStorage.setItem('savedPassword', this.loginForm.password)
            } else {
              localStorage.removeItem('savedUsername')
              localStorage.removeItem('savedPassword')
            }
            
            this.$message.success('登录成功')
            
            // 跳转到主页
            if (this.$route.path !== '/userMain') {
              this.$router.push('/userMain').catch(err => {
                if (err.name !== 'NavigationDuplicated') {
                  console.error('Navigation error:', err)
                }
              })
            }
          } else {
            this.$message.error(response.data.message || '登录失败')
            this.refreshCaptcha()
            this.loginForm.captcha = ''
          }
        } catch (error) {
          console.error('Login error:', error)
          const errorMsg = error.response?.data?.message || '网络错误，请稍后重试'
          this.$message.error(errorMsg)
          this.refreshCaptcha()
          this.loginForm.captcha = ''
        } finally {
          this.loading = false
        }
      },
      
      // 清除错误
      clearError() {
        this.$refs.loginForm.clearValidate()
      },
      
      // 忘记密码
      handleForgotPassword() {
        this.$message.info('Please contact the administrator to reset the password')
        // 实际项目中可以跳转到找回密码页面
        // this.$router.push('/forgot-password')
      },

      registerAccount() {
        this.$router.push('/register')
      }
    }
  }
  </script>
  
  <style scoped>
  /* 容器样式 */
  .login-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: auto;
  }
  
  /* 背景动画 */
  .bg-animation {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  
  .bg-bubble {
    position: absolute;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
    animation: float 20s infinite ease-in-out;
  }
  
  .bg-bubble:nth-child(1) {
    width: 80px;
    height: 80px;
    left: 10%;
    animation-delay: 0s;
  }
  
  .bg-bubble:nth-child(2) {
    width: 120px;
    height: 120px;
    left: 20%;
    bottom: -120px;
    animation-delay: 2s;
  }
  
  .bg-bubble:nth-child(3) {
    width: 60px;
    height: 60px;
    left: 60%;
    animation-delay: 4s;
  }
  
  .bg-bubble:nth-child(4) {
    width: 100px;
    height: 100px;
    right: 10%;
    bottom: -100px;
    animation-delay: 6s;
  }
  
  .bg-bubble:nth-child(5) {
    width: 150px;
    height: 150px;
    left: 70%;
    animation-delay: 8s;
  }
  
  @keyframes float {
    0% {
      transform: translateY(100vh) rotate(0deg);
      opacity: 0;
    }
    10% {
      opacity: 0.4;
    }
    90% {
      opacity: 0.4;
    }
    100% {
      transform: translateY(-100vh) rotate(720deg);
      opacity: 0;
    }
  }
  
  /* 登录框 */
  .login-box {
    position: relative;
    width: 90%;
    max-width: 420px;
    padding: 30px 40px;
    margin: 20px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    z-index: 10;
    animation: slideIn 0.6s ease-out;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* 登录头部 */
  .login-header {
    text-align: center;
    margin-bottom: 30px;
  }
  
  .login-logo {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    color: white;
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }
  
  .login-logo i {
    font-size: 40px;
  }
  
  .login-title {
    font-size: 28px;
    color: #333;
    font-weight: 600;
    margin-bottom: 10px;
  }
  
  .login-subtitle {
    font-size: 14px;
    color: #666;
  }
  
  /* 表单样式 */
  .el-form {
    margin-top: 20px;
  }
  
  .el-form-item {
    margin-bottom: 22px;
  }
  
  /* 输入框样式 */
  .el-input >>> .el-input__inner {
    height: 45px;
    line-height: 45px;
    border-radius: 8px;
    padding-left: 45px;
    background: #f8f9fa;
    border: 2px solid transparent;
    transition: all 0.3s;
  }
  
  .el-input >>> .el-input__inner:focus {
    background: white;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  .el-input >>> .el-input__prefix {
    left: 15px;
    font-size: 18px;
    color: #909399;
  }
  
  .el-input.is-focus >>> .el-input__prefix {
    color: #667eea;
  }
  
  /* 验证码组 */
  .captcha-group {
    display: flex;
    gap: 12px;
    width: 100%;
  }
  
  .captcha-group .el-input {
    flex: 1;
  }
  
  .captcha-image {
    width: 120px;
    height: 45px;
    background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0),
                linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    letter-spacing: 8px;
    color: #333;
    cursor: pointer;
    user-select: none;
    position: relative;
    overflow: hidden;
    transition: all 0.3s;
    border: 2px solid #dcdfe6;
  }
  
  .captcha-image:hover {
    transform: scale(1.05);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    border-color: #667eea;
  }
  
  /* 表单选项 */
  .form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .el-checkbox {
    color: #666;
  }
  
  .el-checkbox >>> .el-checkbox__input.is-checked .el-checkbox__inner {
    background-color: #667eea;
    border-color: #667eea;
  }
  
  .el-checkbox >>> .el-checkbox__input.is-checked + .el-checkbox__label {
    color: #667eea;
  }
  
  .el-link {
    font-size: 14px;
  }
  
  /* 登录按钮 */
  .login-btn {
    width: 100%;
    height: 45px;
    font-size: 16px;
    font-weight: 600;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s;
  }
  
  .login-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
  }
  
  .login-btn:active {
    transform: translateY(0);
  }
  
  .login-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s;
  }
  
  .login-btn:hover::before {
    left: 100%;
  }
  
  /* 分隔线 */
  .divider {
    text-align: center;
    margin: 30px 0 20px;
    position: relative;
  }
  
  .divider::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 100%;
    height: 1px;
    background: #e1e8ed;
  }
  
  .divider-text {
    background: rgba(255, 255, 255, 0.95);
    padding: 0 16px;
    font-size: 14px;
    color: #999;
    position: relative;
  }
  
  /* 社交登录 */
  .social-login {
    display: flex;
    gap: 16px;
  }
  
  .social-btn {
    flex: 1;
    height: 40px;
    background: white;
    color: #666;
    border: 2px solid #e1e8ed;
    border-radius: 8px;
    font-size: 14px;
    padding: 0 15px;
  }
  
  .social-btn:hover {
    color: #667eea;
    border-color: #667eea;
    background: white;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
  
  .social-btn i {
    margin-right: 5px;
    font-size: 16px;
  }
  
  /* Element UI 样式覆盖 */
  .el-form-item__error {
    padding-top: 2px;
  }
  
  .el-button--primary:focus,
  .el-button--primary:hover {
    background: linear-gradient(135deg, #7b8cee 0%, #8759b4 100%);
    border: none;
  }
  
  /* 响应式设计 */
  /* 超大屏幕 */
  @media (min-width: 1920px) {
    .login-box {
      width: 460px;
      padding: 50px;
    }
    
    .login-logo {
      width: 100px;
      height: 100px;
    }
    
    .login-logo i {
      font-size: 50px;
    }
    
    .login-title {
      font-size: 32px;
    }
  }
  
  /* 大屏幕 */
  @media (max-width: 1440px) {
    .login-box {
      width: 420px;
      padding: 40px;
    }
  }
  
  /* 中等屏幕 */
  @media (max-width: 1024px) {
    .login-box {
      width: 380px;
      padding: 35px;
    }
    
    .login-title {
      font-size: 26px;
    }
  }
  
  /* 平板竖屏 */
  @media (max-width: 768px) {
    .login-box {
      width: 90%;
      max-width: 380px;
      padding: 30px;
    }
    
    .login-logo {
      width: 70px;
      height: 70px;
    }
    
    .login-logo i {
      font-size: 35px;
    }
    
    .login-title {
      font-size: 24px;
    }
    
    .login-subtitle {
      font-size: 13px;
    }
    
    .captcha-image {
      width: 110px;
      font-size: 22px;
    }
  }
  
  /* 手机横屏 */
  @media (max-width: 640px) {
    .login-container {
      padding: 20px;
    }
    
    .login-box {
      width: 100%;
      max-width: 360px;
      padding: 25px;
    }
    
    .login-header {
      margin-bottom: 30px;
    }
    
    .el-form-item {
      margin-bottom: 18px;
    }
  }
  
  /* 手机竖屏 */
  @media (max-width: 480px) {
    .login-box {
      width: 100%;
      padding: 20px;
      border-radius: 15px;
    }
    
    .login-logo {
      width: 60px;
      height: 60px;
      margin-bottom: 15px;
    }
    
    .login-logo i {
      font-size: 30px;
    }
    
    .login-title {
      font-size: 22px;
      margin-bottom: 8px;
    }
    
    .social-login {
      flex-direction: column;
    }
    
    .social-btn {
      width: 100%;
    }
    
    .captcha-group {
      flex-direction: column;
      gap: 10px;
    }
    
    .captcha-image {
      width: 100%;
      height: 50px;
    }
    
    .form-options {
      font-size: 13px;
    }
    
    .divider {
      margin: 20px 0 15px;
    }
  }
  
  /* 超小屏幕 */
  @media (max-width: 360px) {
    .login-container {
      padding: 10px;
    }
    
    .login-box {
      padding: 15px;
    }
    
    .login-title {
      font-size: 20px;
    }
    
    .el-input >>> .el-input__inner {
      height: 40px;
      line-height: 40px;
      font-size: 14px;
    }
    
    .login-btn {
      height: 40px;
      font-size: 15px;
    }
  }
  
  /* 高度适配 - 充分利用屏幕空间 */
  @media (max-height: 800px) {
    .login-box {
      padding: 25px 35px;
    }
    
    .login-header {
      margin-bottom: 25px;
    }
    
    .login-logo {
      width: 70px;
      height: 70px;
      margin-bottom: 15px;
    }
    
    .el-form-item {
      margin-bottom: 18px;
    }
    
    .divider {
      margin: 20px 0 15px;
    }
  }
  
  @media (max-height: 700px) {
    .login-box {
      padding: 20px 30px;
    }
    
    .login-header {
      margin-bottom: 20px;
    }
    
    .login-logo {
      width: 60px;
      height: 60px;
      margin-bottom: 10px;
    }
    
    .login-logo i {
      font-size: 30px;
    }
    
    .login-title {
      font-size: 24px;
      margin-bottom: 5px;
    }
    
    .el-form-item {
      margin-bottom: 16px;
    }
    
    .el-input >>> .el-input__inner {
      height: 40px;
      line-height: 40px;
    }
    
    .captcha-image {
      height: 40px;
    }
    
    .divider {
      margin: 15px 0 10px;
    }
  }
  
  @media (max-height: 600px) {
    .login-container {
      padding: 10px;
    }
    
    .login-box {
      padding: 15px 25px;
    }
    
    .login-logo {
      width: 50px;
      height: 50px;
      margin-bottom: 10px;
    }
    
    .login-logo i {
      font-size: 25px;
    }
    
    .login-title {
      font-size: 22px;
    }
    
    .login-subtitle {
      font-size: 12px;
    }
    
    .el-form-item {
      margin-bottom: 14px;
    }
    
    .form-options {
      margin-bottom: 14px;
    }
    
    .login-btn {
      height: 38px;
    }
    
    .social-btn {
      height: 35px;
    }
  }
  
  /* 横屏模式优化 */
  @media (orientation: landscape) and (max-height: 500px) {
    .login-box {
      display: flex;
      align-items: center;
      padding: 15px 30px;
      max-width: 800px;
    }
    
    .login-header {
      flex: 0 0 200px;
      margin-bottom: 0;
      margin-right: 30px;
    }
    
    .el-form {
      flex: 1;
      margin-top: 0;
    }
    
    .divider,
    .social-login {
      display: none;
    }
  }
  </style>
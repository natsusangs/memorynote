<template>
    <div class="register-container">
      <!-- 背景动画 -->
      <div class="bg-animation">
        <div class="bg-bubble" v-for="i in 5" :key="i"></div>
      </div>
      
      <!-- 注册框 -->
      <div class="register-box">
        <div class="register-header">
          <div class="register-logo">
            ✏️
          </div>
          <h1 class="register-title">Create Account</h1>
          <p class="register-subtitle">Join MemoryNote</p>
        </div>
        
        <el-form 
          ref="registerForm"
          :model="registerForm" 
          :rules="registerRules"
          label-width="0"
          @submit.native.prevent="handleRegister"
        >
          <!-- 用户名 -->
          <el-form-item prop="username">
            <el-input
              v-model="registerForm.username"
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
              v-model="registerForm.password"
              type="password"
              placeholder="Please enter your password"
              size="large"
              show-password
              prefix-icon="el-icon-lock"
              @focus="clearError"
            >
            </el-input>
          </el-form-item>
          
          <!-- 确认密码 -->
          <el-form-item prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              placeholder="Please confirm your password"
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
                v-model="registerForm.captcha"
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
          
          <!-- 用户协议 -->
          <el-form-item prop="agreement">
            <el-checkbox v-model="registerForm.agreement" class="agreement-checkbox">
              I have read and agree to the 
              <el-link type="primary" :underline="false" @click="showTerms">Terms of Service</el-link>
              and 
              <el-link type="primary" :underline="false" @click="showPrivacy">Privacy Policy</el-link>
            </el-checkbox>
          </el-form-item>
          
          <!-- 注册按钮 -->
          <el-form-item>
            <el-button 
              type="primary"
              size="large"
              class="register-btn"
              :loading="loading"
              @click="submitForm"
            >
              {{ loading ? 'Creating...' : 'Register' }}
            </el-button>
          </el-form-item>
          
          <!-- 返回登录 -->
          <div class="login-link">
            Already have an account? 
            <el-link type="primary" :underline="false" @click="backToLogin">Login now</el-link>
          </div>
        </el-form>
      </div>
    </div>
  </template>
  
  <script>
  import axios from 'axios'
  
  export default {
    name: 'Register',
    
    data() {
      // 自定义验证规则
      const validatePassword = (rule, value, callback) => {
        if (value === '') {
          callback(new Error('Please enter your password'))
        } else {
          if (this.registerForm.confirmPassword !== '') {
            this.$refs.registerForm.validateField('confirmPassword')
          }
          callback()
        }
      }
      
      const validateConfirmPassword = (rule, value, callback) => {
        if (value === '') {
          callback(new Error('Please confirm your password'))
        } else if (value !== this.registerForm.password) {
          callback(new Error('The two passwords do not match'))
        } else {
          callback()
        }
      }
      
      const validateAgreement = (rule, value, callback) => {
        if (!value) {
          callback(new Error('Please agree to the terms of service'))
        } else {
          callback()
        }
      }
      
      return {
        // 表单数据
        registerForm: {
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          captcha: '',
          agreement: false
        },
        
        // 表单验证规则
        registerRules: {
          username: [
            { required: true, message: 'Please enter your username', trigger: 'blur' },
            { min: 3, max: 20, message: 'The username must be between 3 and 20 characters', trigger: 'blur' },
            { pattern: /^[a-zA-Z0-9_]+$/, message: 'Username can only contain letters, numbers and underscores', trigger: 'blur' }
          ],
          password: [
            { required: true, validator: validatePassword, trigger: 'blur' },
            { min: 6, message: 'The password must be at least 6 characters', trigger: 'blur' },
            { pattern: /^(?=.*[a-zA-Z])(?=.*\d)/, message: 'Password must contain both letters and numbers', trigger: 'blur' }
          ],
          confirmPassword: [
            { required: true, validator: validateConfirmPassword, trigger: 'blur' }
          ],
          captcha: [
            { required: true, message: 'Please enter the verification code', trigger: 'blur' },
            { len: 4, message: 'The verification code must be 4 characters', trigger: 'blur' }
          ],
          agreement: [
            { required: true, validator: validateAgreement, trigger: 'change' }
          ]
        },
        
        // 其他状态
        captchaText: '',
        loading: false
      }
    },
    
    mounted() {
      this.refreshCaptcha()
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
      
      // 提交表单
      submitForm() {
        this.$refs.registerForm.validate((valid) => {
          if (valid) {
            this.handleRegister()
          }
        })
      },
      
      // 处理注册
      async handleRegister() {
        // 验证验证码
        if (this.registerForm.captcha.toUpperCase() !== this.captchaText) {
          this.$message.error('The verification code is incorrect')
          this.refreshCaptcha()
          this.registerForm.captcha = ''
          return
        }
        
        this.loading = true
        
        try {
          // 调用后端API
          const response = await axios.post('/register', {
            username: this.registerForm.username,
            password: this.registerForm.password
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
          
          // 检查注册结果
          if (response.data.success) {
            this.$message.success('Registration successful! Redirecting to login...')
            
            // 延迟跳转到登录页
            setTimeout(() => {
              this.$router.push('/login')
            }, 1500)
          } else {
            this.$message.error(response.data.message || 'Registration failed')
            this.refreshCaptcha()
            this.registerForm.captcha = ''
          }
          
        } catch (error) {
          console.error('Registration error:', error)
          const errorMsg = error.response?.data?.message || 'Network error, please try again later'
          this.$message.error(errorMsg)
          this.refreshCaptcha()
          this.registerForm.captcha = ''
        } finally {
          this.loading = false
        }
      },
      
      // 清除错误
      clearError() {
        this.$refs.registerForm.clearValidate()
      },
      
      // 返回登录
      backToLogin() {
        this.$router.push('/login')
      },
      
      // 显示服务条款
      showTerms() {
        this.$message.info('Terms of Service page is under construction')
        // 实际项目中可以跳转到服务条款页面或弹出模态框
        // this.$router.push('/terms')
      },
      
      // 显示隐私政策
      showPrivacy() {
        this.$message.info('Privacy Policy page is under construction')
        // 实际项目中可以跳转到隐私政策页面或弹出模态框
        // this.$router.push('/privacy')
      }
    }
  }
  </script>
  
  <style scoped>
  /* 容器样式 */
  .register-container {
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
  
  /* 注册框 */
  .register-box {
    position: relative;
    width: 90%;
    max-width: 460px;
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
  
  /* 注册头部 */
  .register-header {
    text-align: center;
    margin-bottom: 30px;
  }
  
  .register-logo {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }
  
  .register-title {
    font-size: 28px;
    color: #333;
    font-weight: 600;
    margin-bottom: 10px;
  }
  
  .register-subtitle {
    font-size: 14px;
    color: #666;
  }
  
  /* 表单样式 */
  .el-form {
    margin-top: 20px;
  }
  
  .el-form-item {
    margin-bottom: 20px;
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
  
  /* 用户协议 */
  .agreement-checkbox {
    line-height: 1.5;
    color: #666;
  }
  
  .agreement-checkbox >>> .el-checkbox__label {
    white-space: normal;
    line-height: 1.5;
  }
  
  .agreement-checkbox .el-link {
    margin: 0 2px;
  }
  
  /* 注册按钮 */
  .register-btn {
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
  
  .register-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
  }
  
  .register-btn:active {
    transform: translateY(0);
  }
  
  .register-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s;
  }
  
  .register-btn:hover::before {
    left: 100%;
  }
  
  /* 登录链接 */
  .login-link {
    text-align: center;
    margin-top: 20px;
    font-size: 14px;
    color: #666;
  }
  
  .login-link .el-link {
    margin-left: 5px;
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
  
  .el-checkbox >>> .el-checkbox__input.is-checked .el-checkbox__inner {
    background-color: #667eea;
    border-color: #667eea;
  }
  
  .el-checkbox >>> .el-checkbox__input.is-checked + .el-checkbox__label {
    color: #666;
  }
  
  /* 响应式设计 */
  /* 超大屏幕 */
  @media (min-width: 1920px) {
    .register-box {
      width: 500px;
      padding: 50px;
    }
    
    .register-logo {
      width: 100px;
      height: 100px;
    }
    
    .register-title {
      font-size: 32px;
    }
  }
  
  /* 大屏幕 */
  @media (max-width: 1440px) {
    .register-box {
      max-width: 460px;
      padding: 40px;
    }
  }
  
  /* 中等屏幕 */
  @media (max-width: 1024px) {
    .register-box {
      max-width: 420px;
      padding: 35px;
    }
    
    .register-title {
      font-size: 26px;
    }
  }
  
  /* 平板竖屏 */
  @media (max-width: 768px) {
    .register-box {
      width: 90%;
      max-width: 400px;
      padding: 30px;
    }
    
    .register-logo {
      width: 70px;
      height: 70px;
    }
    
    .register-title {
      font-size: 24px;
    }
    
    .register-subtitle {
      font-size: 13px;
    }
    
    .captcha-image {
      width: 110px;
      font-size: 22px;
    }
  }
  
  /* 手机横屏 */
  @media (max-width: 640px) {
    .register-container {
      padding: 20px;
    }
    
    .register-box {
      width: 100%;
      max-width: 380px;
      padding: 25px;
    }
    
    .register-header {
      margin-bottom: 25px;
    }
    
    .el-form-item {
      margin-bottom: 16px;
    }
  }
  
  /* 手机竖屏 */
  @media (max-width: 480px) {
    .register-box {
      width: 100%;
      padding: 20px;
      border-radius: 15px;
    }
    
    .register-logo {
      width: 60px;
      height: 60px;
      margin-bottom: 15px;
    }
    
    .register-title {
      font-size: 22px;
      margin-bottom: 8px;
    }
    
    .captcha-group {
      flex-direction: column;
      gap: 10px;
    }
    
    .captcha-image {
      width: 100%;
      height: 50px;
    }
    
    .agreement-checkbox {
      font-size: 13px;
    }
    
    .login-link {
      font-size: 13px;
    }
  }
  
  /* 超小屏幕 */
  @media (max-width: 360px) {
    .register-container {
      padding: 10px;
    }
    
    .register-box {
      padding: 15px;
    }
    
    .register-title {
      font-size: 20px;
    }
    
    .el-input >>> .el-input__inner {
      height: 40px;
      line-height: 40px;
      font-size: 14px;
    }
    
    .register-btn {
      height: 40px;
      font-size: 15px;
    }
  }
  
  /* 高度适配 - 充分利用屏幕空间 */
  @media (max-height: 800px) {
    .register-box {
      padding: 25px 35px;
    }
    
    .register-header {
      margin-bottom: 20px;
    }
    
    .register-logo {
      width: 60px;
      height: 60px;
      margin-bottom: 15px;
    }
    
    .el-form-item {
      margin-bottom: 16px;
    }
  }
  
  @media (max-height: 700px) {
    .register-box {
      padding: 20px 30px;
    }
    
    .register-logo {
      width: 50px;
      height: 50px;
      margin-bottom: 10px;
    }
    
    .register-title {
      font-size: 24px;
      margin-bottom: 5px;
    }
    
    .el-form-item {
      margin-bottom: 14px;
    }
    
    .el-input >>> .el-input__inner {
      height: 40px;
      line-height: 40px;
    }
    
    .captcha-image {
      height: 40px;
    }
  }
  
  /* 横屏模式优化 */
  @media (orientation: landscape) and (max-height: 600px) {
    .register-container {
      padding: 10px;
    }
    
    .register-box {
      display: flex;
      align-items: flex-start;
      padding: 15px 30px;
      max-width: 900px;
    }
    
    .register-header {
      flex: 0 0 180px;
      margin-bottom: 0;
      margin-right: 30px;
      padding-top: 20px;
    }
    
    .el-form {
      flex: 1;
      margin-top: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0 20px;
    }
    
    .el-form .el-form-item {
      width: calc(50% - 10px);
      margin-bottom: 12px;
    }
    
    .el-form .el-form-item:nth-child(5),
    .el-form .el-form-item:nth-child(6),
    .el-form .el-form-item:nth-child(7),
    .el-form .el-form-item:nth-child(8) {
      width: 100%;
    }
    
    .login-link {
      width: 100%;
      margin-top: 10px;
    }
  }
  </style>
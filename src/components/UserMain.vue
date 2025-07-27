<template>
  <div class="memory-note-container">
    <!-- 顶部导航栏 -->
    <header class="header">
      <div class="logo">
        <div class="logo-icon">📝</div>
        <div class="logo-text">MemoryNote</div>
      </div>
      <div class="user-info">
        <div class="avatar">👤</div>
        <div class="user-details">
        <div class="greeting">{{ greeting }}</div>
          <div class="user-actions">
            <button class="logout-btn" @click="handleLogout" title="Logout">
              <span class="logout-icon">🚪</span>
              <span class="logout-text">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="main-content">
      <div class="welcome-section">
        <h1 class="welcome-title">Welcome to MemoryNote</h1>
        <p class="welcome-subtitle">Click the icons below to start your memory journey</p>
      </div>

      <div class="features-grid">
        <!-- 功能卡片 -->
        <div
          v-for="(feature, index) in features"
          :key="feature.id"
          class="feature-card"
          :class="{ 'hovered': hoveredCard === feature.id }"
          :style="{ animationDelay: `${index * 0.1}s` }"
          @click="handleFeatureClick(feature.id)"
          @mouseenter="hoveredCard = feature.id"
          @mouseleave="hoveredCard = null"
          @keypress.enter.space.prevent="handleFeatureClick(feature.id)"
          tabindex="0"
        >
          <div class="feature-icon" :class="feature.iconClass">
            {{ feature.icon }}
          </div>
          <h2 class="feature-title">{{ feature.title }}</h2>
          <p class="feature-description">{{ feature.description }}</p>
        </div>
      </div>
    </main>

    <!-- 帮助按钮 -->
    <div class="help-button" @click="showHelp">
      <span>?</span>
      <span class="tooltip">Need help?</span>
    </div>

    <!-- 优化的上传弹窗 -->
    <div v-if="showUploadModal" class="upload-modal" @click="closeUploadModal">
      <div class="upload-modal-content" @click.stop>
        <div class="upload-modal-header">
          <h2>📸 Upload Photos</h2>
          <button class="close-button" @click="closeUploadModal">×</button>
        </div>

        <div class="upload-body">
          <!-- 文件上传区域 -->
          <div 
            class="file-drop-zone"
            :class="{ 
              'drag-over': isDragOver, 
              'upload-error': uploadError,
              'upload-success': uploadSuccess 
            }"
            @drop="handleDrop"
            @dragover.prevent="isDragOver = true"
            @dragleave="isDragOver = false"
            @click="triggerFileInput"
          >
            <input 
              ref="fileInput"
              type="file"
              multiple
              accept="image/*,.jpg,.jpeg,.png,.gif,.webp"
              @change="handleFileSelect"
              class="hidden-file-input"
            />
            
            <div v-if="selectedFiles.length === 0" class="drop-zone-content">
              <div class="upload-icon-large">📁</div>
              <h3>Drag and drop photos here or click to select</h3>
              <p>Supports JPG, PNG, GIF formats, max 10MB per file</p>
              <button class="select-files-btn">Select Files</button>
            </div>

            <!-- 图片预览区域 -->
            <div v-else class="image-preview-section">
              <div class="preview-header">
                <h3>Selected {{ selectedFiles.length }} photos</h3>
                <div class="preview-actions">
                  <button @click="selectMoreFiles" class="add-more-btn">Add more</button>
                  <button @click="clearAllFiles" class="clear-all-btn">Clear all</button>
                </div>
              </div>
              
              <div class="image-preview-grid">
                <div 
                  v-for="(file, index) in selectedFiles" 
                  :key="index"
                  class="image-preview-item"
                  :class="{ 'processing': file.processing, 'error': file.error }"
                >
                  <img :src="file.preview" :alt="file.name" class="preview-image" />
                  <div class="image-overlay">
                    <div class="image-info">
                      <span class="image-name">{{ file.name }}</span>
                      <span class="image-size">{{ formatFileSize(file.size) }}</span>
                    </div>
                    <div class="image-actions">
                      <button 
                        @click="removeFile(index)"
                        class="remove-image-btn"
                        :disabled="isUploading"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  <!-- 文件状态指示器 -->
                  <div v-if="file.processing" class="file-status processing">
                    <div class="spinner"></div>
                  </div>
                  <div v-if="file.error" class="file-status error">
                    <span>❌</span>
                    <span class="error-message">{{ file.error }}</span>
                  </div>
                  <div v-if="file.success" class="file-status success">
                    <span>✅</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 上传选项 -->
          <div v-if="selectedFiles.length > 0" class="upload-options">
            <div class="option-group">
              <label>
                <input type="checkbox" v-model="compressImages">
                Compress images (reduce file size)
              </label>
            </div>
            <div class="option-group">
              <label>
                <input type="checkbox" v-model="generateThumbnails">
                Generate thumbnails
              </label>
            </div>
          </div>

          <!-- 上传操作区域 -->
          <div class="upload-actions">
            <button 
              @click="closeUploadModal"
              class="cancel-btn"
              :disabled="isUploading"
            >
              Cancel
            </button>
            <button 
              @click="submitUpload"
              :disabled="selectedFiles.length === 0 || isUploading || hasErrors"
              class="upload-btn"
              :class="{ 'uploading': isUploading }"
            >
              <span v-if="isUploading" class="upload-spinner">⏳</span>
              <span v-else-if="uploadSuccess">✅</span>
              <span v-else>📤</span>
              {{ getUploadButtonText() }}
            </button>
          </div>

          <!-- 上传进度 -->
          <div v-if="isUploading" class="upload-progress">
            <div class="progress-header">
              <span>Upload progress</span>
              <span>{{ uploadProgress }}%</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill"
                :style="{ width: uploadProgress + '%' }"
              ></div>
            </div>
            <div class="progress-details">
              <span>{{ currentFileIndex }}/{{ selectedFiles.length }} files</span>
              <span>{{ formatFileSize(uploadedBytes) }}/{{ formatFileSize(totalBytes) }}</span>
            </div>
          </div>

          <!-- 错误信息显示 -->
          <div v-if="uploadError" class="error-message-box">
            <h4>❌ Upload failed</h4>
            <p>{{ uploadError }}</p>
            <button @click="retryUpload" class="retry-btn">Retry</button>
          </div>

          <!-- 成功信息显示 -->
          <div v-if="uploadSuccess" class="success-message-box">
            <h4>✅ Upload success</h4>
            <p>Successfully uploaded {{ successCount }} photos</p>
            <div class="success-actions">
              <button @click="viewPhotos" class="view-photos-btn">View photos</button>
              <button @click="uploadMore" class="upload-more-btn">Upload more</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'UserMain',
  
  data() {
    return {
      greeting: '',
      hoveredCard: null,
      features: [
        {
          id: 'album-view',
          icon: '🌍',
          title: 'Smart Album Browser',
          description: 'Experience 3D carousel with location-based photo filtering',
          iconClass: 'icon-purple'
        },
        {
          id: 'photoGallery',
          icon: '📷',
          title: 'Album Management',
          description: 'Manage album to organize your precious memories',
          iconClass: 'icon-pink'
        },
        {
          id: 'upload-photos',
          icon: '📤',
          title: 'Upload Photos',
          description: 'Upload new photos to your memory collection',
          iconClass: 'icon-orange'
        },
        {
          id: 'RouteView',
          icon: '🚗',
          title: 'Days Route View',
          description: 'Choose the day to view your route',
          iconClass: 'icon-blue'
        },
        {
          id: 'device-settings',
          icon: '📱',
          title: 'Device Management',
          description: 'View and manage your device information',
          iconClass: 'icon-green'
        }
      ],
      
      // 上传相关数据
      showUploadModal: false,
      isDragOver: false,
      selectedFiles: [],
      isUploading: false,
      uploadProgress: 0,
      
      // 用户信息
      currentUser: {
        uid: 'user_123456', // 这里应该从登录状态获取
        username: 'Zhang'
      },
      
      // 上传增强功能
      compressImages: true,
      generateThumbnails: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      
      // 上传状态
      uploadError: null,
      uploadSuccess: false,
      successCount: 0,
      currentFileIndex: 0,
      uploadedBytes: 0,
      totalBytes: 0,
      
      // 文件验证
      hasErrors: false
    }
  },

  mounted() {
    this.updateGreeting()
  },

  methods: {
    updateGreeting() {
      const hour = new Date().getHours()
      const username = this.$store.state.user?.username || 'User'
      if (hour < 12) {
        this.greeting = 'Good morning, ' + username
      } else if (hour < 18) {
        this.greeting = 'Good afternoon, ' + username
      } else {
        this.greeting = 'Good evening, ' + username
      }
    },

    // 新增：处理退出登录
    async handleLogout() {
      try {
        // 确认退出
        const confirmed = confirm('Are you sure you want to logout?')
        if (!confirmed) {
          return
        }

        // 可以选择是否调用后端登出接口
        try {
          await axios.post('/logout', {}, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        } catch (error) {
          console.warn('Backend logout interface call failed, but continue local logout:', error)
        }

        // 使用store action清除登录状态
        this.$store.dispatch('logout')
        
        // 显示退出成功消息
        this.$message.success('Logout success')
        
        // 跳转到登录页
        this.$router.push('/login').catch(err => {
          if (err.name !== 'NavigationDuplicated') {
            console.error('Navigation error:', err)
          }
        })
        
      } catch (error) {
        console.error('Logout failed:', error)
        this.$message.error('Logout failed, please try again')
      }
    },

    // 统一处理功能点击
    handleFeatureClick(featureId) {
      const feature = this.features.find(f => f.id === featureId)
      console.log(`Click ${feature.title}`)
      
      switch(featureId) {
        case 'album-view':
          this.$router.push('/albumView')
          break
        case 'photoGallery':
          this.$router.push('/photoGallery')
          break
        case 'upload-photos':
          this.openUploadModal()
          break
        case 'RouteView':
          this.$router.push('/routeView')
          break
        case 'device-settings':
          this.showUserInfo()
          break
        default:
          alert(`${feature.title} page is under development`)
      }
    },

    showUserInfo() {
      const userId = this.$store.state.uid || this.$store.state.user?.id
      const username = this.$store.state.user?.username || 'Unknown User'

      const userMessage =  `User device information:
      
      Username: ${username}
      Device ID: ${userId || 'Not available'}`
      
      alert(userMessage)

      console.log(`Device ID: ${userId}`)
    },

    showHelp() {
      alert('If you need help, please contact:\nEmail: natsu6sang@gmail.com\nOr click any feature icon to start using')
    },

    // 上传弹窗相关方法
    openUploadModal() {
      this.showUploadModal = true
      this.resetUploadData()
    },

    closeUploadModal() {
      this.showUploadModal = false
      this.resetUploadData()
    },

    resetUploadData() {
      this.selectedFiles = []
      this.isDragOver = false
      this.isUploading = false
      this.uploadProgress = 0
      this.uploadError = null
      this.uploadSuccess = false
      this.successCount = 0
      this.currentFileIndex = 0
      this.uploadedBytes = 0
      this.totalBytes = 0
      this.hasErrors = false
    },

    triggerFileInput() {
      this.$refs.fileInput.click()
    },

    handleFileSelect(event) {
      const files = Array.from(event.target.files)
      this.processFiles(files)
      // 清空input以便重复选择同一文件
      event.target.value = ''
    },

    handleDrop(event) {
      event.preventDefault()
      this.isDragOver = false
      const files = Array.from(event.dataTransfer.files)
      this.processFiles(files)
    },

    processFiles(files) {
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length === 0) {
        this.$message.warning('Please select image files');
        return;
      }

      let hasNewErrors = false;
      
      imageFiles.forEach(file => {
        if (!this.allowedTypes.includes(file.type)) {
          this.$message.error(`Unsupported file type: ${file.name}`);
          hasNewErrors = true;
          return;
        }

        if (file.size > this.maxFileSize) {
          this.$message.error(`File ${file.name} exceeds ${this.formatFileSize(this.maxFileSize)} limit`);
          hasNewErrors = true;
          return;
        }

        const exists = this.selectedFiles.some(existing => 
          existing.name === file.name && existing.size === file.size
        );
        
        if (exists) {
          this.$message.warning(`File ${file.name} has already been added`);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          this.selectedFiles.push({
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            preview: e.target.result,
            processing: false,
            error: null,
            success: false
          });
          this.calculateTotalBytes();
        };
        reader.readAsDataURL(file);
      });

      this.hasErrors = hasNewErrors;
    },

    calculateTotalBytes() {
      this.totalBytes = this.selectedFiles.reduce((total, file) => total + file.size, 0);
    },

    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    getUploadButtonText() {
      if (this.isUploading) {
        return `Uploading... ${this.currentFileIndex}/${this.selectedFiles.length}`;
      }
      if (this.uploadSuccess) {
        return 'Upload success';
      }
      return `Upload ${this.selectedFiles.length} photos`;
    },

    selectMoreFiles() {
      this.$refs.fileInput.click();
    },

    async submitUpload() {
      if (this.selectedFiles.length === 0) {
        this.$message.warning('Please select the photos to upload');
        return;
      }

      this.isUploading = true;
      this.uploadProgress = 0;
      this.uploadError = null;
      this.uploadSuccess = false;
      this.currentFileIndex = 0;
      this.uploadedBytes = 0;

      try {
        this.selectedFiles.forEach(file => {
          file.processing = true;
          file.error = null;
          file.success = false;
        });

        const uploadData = await this.prepareUploadData();
        const result = await this.sendToServer(uploadData);

        if (result.success) {
          this.uploadSuccess = true;
          this.successCount = result.count;
          this.$message.success(`Successfully uploaded ${result.count} photos!`);
          
          this.selectedFiles.forEach(file => {
            file.processing = false;
            file.success = true;
          });

          setTimeout(() => {
            if (this.uploadSuccess) {
              this.closeUploadModal();
            }
          }, 3000);

        } else {
          throw new Error(result.message || 'Upload failed');
        }

      } catch (error) {
        console.error('Upload failed:', error);
        this.uploadError = error.message || 'Network error, please try again';
        
        this.selectedFiles.forEach(file => {
          file.processing = false;
          file.error = this.uploadError;
        });

        this.$message.error(this.uploadError);
      } finally {
        this.isUploading = false;
      }
    },

    async prepareUploadData() {
      const formData = new FormData();
      
      formData.append('uid', this.$store.state.uid);
      formData.append('username', this.$store.state.user.username);
      formData.append('uploadTime', new Date().toISOString());
      formData.append('compressImages', this.compressImages);
      formData.append('generateThumbnails', this.generateThumbnails);
      
      this.selectedFiles.forEach((fileData, index) => {
        formData.append('files', fileData.file);
        formData.append(`fileInfo[${index}]`, JSON.stringify({
          originalName: fileData.name,
          size: fileData.size,
          type: fileData.type,
          index: index
        }));
      });

      return formData;
    },

    async sendToServer(formData) {
      try {
        const response = await axios.post('/uploadPhotos', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 300000,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.lengthComputable) {
              this.uploadProgress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              this.uploadedBytes = progressEvent.loaded;
              
              this.currentFileIndex = Math.min(
                Math.floor((progressEvent.loaded / progressEvent.total) * this.selectedFiles.length) + 1,
                this.selectedFiles.length
              );
            }
          }
        });

        return response.data;
      } catch (error) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Upload timeout, please check the network connection');
        }
        if (error.response) {
          throw new Error(error.response.data.message || 'Server error');
        }
        throw new Error('Network connection failed');
      }
    },

    retryUpload() {
      this.uploadError = null;
      this.submitUpload();
    },

    uploadMore() {
      this.resetUploadData();
      this.uploadSuccess = false;
    },

    viewPhotos() {
      this.closeUploadModal();
      this.$router.push('/photoGallery');
    },

    removeFile(index) {
      this.selectedFiles.splice(index, 1)
    },

    clearAllFiles() {
      this.selectedFiles = []
    }
  }
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 方案一：使用伪元素创建全屏背景 */
.memory-note-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: #333;
  position: relative;
}

/* 创建覆盖整个页面的背景层 */
.memory-note-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  z-index: -1;
}

/* 顶部导航栏 */
.header {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 10;
}

.logo {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logo-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.logo-text {
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
  background: #f8f9fa;
  padding: 10px 20px;
  border-radius: 50px;
}

.avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  font-weight: 600;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.greeting {
  font-size: 16px;
  color: #555;
  font-weight: 500;
}

.user-actions {
  display: flex;
  gap: 10px;
}

/* 退出登录按钮样式 */
.logout-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
  outline: none;
}

.logout-btn:hover {
  background: linear-gradient(135deg, #ff5252 0%, #e53e3e 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.logout-btn:active {
  transform: translateY(0);
}

.logout-icon {
  font-size: 14px;
}

.logout-text {
  font-size: 12px;
}

/* 主要内容区域 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* 改为顶部对齐，避免内容过多时的布局问题 */
  padding: 40px 20px;
  position: relative;
  z-index: 1;
}

.welcome-section {
  text-align: center;
  margin-bottom: 60px;
  animation: fadeIn 0.8s ease-out;
}

.welcome-title {
  font-size: 42px;
  font-weight: 700;
  color: #333;
  margin-bottom: 15px;
}

.welcome-subtitle {
  font-size: 24px;
  color: #666;
  line-height: 1.6;
}

/* 功能卡片网格 - 修改为上三下二布局 */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 30px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

/* 第二行的两个卡片居中显示 */
.feature-card:nth-child(4) {
  grid-column: 1 / 2;
}

.feature-card:nth-child(5) {
  grid-column: 3 / 4;
}

.feature-card {
  background: white;
  border-radius: 20px;
  padding: 40px 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out both;
  outline: none;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
  transform: scale(0);
  transition: transform 0.5s ease;
}

.feature-card.hovered::before,
.feature-card:hover::before {
  transform: scale(1);
}

.feature-card:hover,
.feature-card.hovered {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.feature-card:focus {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.feature-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: white;
  position: relative;
  z-index: 1;
}

.icon-purple {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.icon-pink {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.icon-orange {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
}

.icon-blue {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.icon-green {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.feature-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
  position: relative;
  z-index: 1;
}

.feature-description {
  font-size: 16px;
  color: #666;
  line-height: 1.5;
  position: relative;
  z-index: 1;
}

/* 上传照片按钮 */
.upload-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.upload-button:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

/* 帮助按钮 */
.help-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  z-index: 9999;
  pointer-events: auto;
  border: none;
  outline: none;
}

.help-button:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.help-button .tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  bottom: 70px;
  right: 0;
  white-space: nowrap;
}

.help-button:hover .tooltip {
  opacity: 1;
}

/* 上传弹窗样式 */
.upload-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.upload-modal-content {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.upload-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 30px;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
}

.upload-modal-header h2 {
  color: #333;
  font-size: 24px;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 30px;
  color: #999;
  cursor: pointer;
  padding: 5px;
  line-height: 1;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #333;
  background: #e9ecef;
}

.upload-body {
  padding: 30px;
  flex: 1;
  overflow-y: auto;
}

/* 文件上传区域 */
.file-drop-zone {
  border: 3px dashed #ddd;
  border-radius: 15px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f9f9f9;
  margin-bottom: 30px;
}

.file-drop-zone:hover,
.file-drop-zone.drag-over {
  border-color: #667eea;
  background: #f0f2ff;
}

.hidden-file-input {
  display: none;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.upload-icon-large {
  font-size: 64px;
  opacity: 0.6;
}

.drop-zone-content h3 {
  font-size: 20px;
  color: #333;
  margin: 0;
}

.drop-zone-content p {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.select-files-btn {
  padding: 12px 30px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.select-files-btn:hover {
  background: #5a6fd8;
  transform: translateY(-2px);
}

/* 图片预览区域 */
.image-preview-section {
  text-align: left;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.preview-header h3 {
  color: #333;
  font-size: 18px;
}

.preview-actions {
  display: flex;
  gap: 10px;
}

.clear-all-btn {
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-all-btn:hover {
  background: #c82333;
}

.image-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.image-preview-item {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.image-preview-item:hover {
  transform: scale(1.05);
}

.preview-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: white;
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: end;
}

.image-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.image-name {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.image-size {
  font-size: 11px;
  color: #666;
}

.image-actions {
  display: flex;
  gap: 8px;
}

.remove-image-btn {
  width: 20px;
  height: 20px;
  background: rgba(255, 0, 0, 0.8);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-image-btn:hover {
  background: rgba(255, 0, 0, 1);
}

.add-more-btn {
  padding: 10px 20px;
  background: #f8f9fa;
  border: 2px dashed #ccc;
  color: #666;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-more-btn:hover {
  border-color: #667eea;
  color: #667eea;
  background: #f0f2ff;
}

/* 上传操作区域 */
.upload-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 20px;
}

.cancel-btn,
.upload-btn {
  padding: 12px 30px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: #f8f9fa;
  color: #666;
  border: 2px solid #e1e1e1;
}

.cancel-btn:hover {
  background: #e9ecef;
}

.upload-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.upload-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 上传进度 */
.upload-progress {
  margin-top: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 14px;
  color: #666;
}

/* 上传选项 */
.upload-options {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
  margin: 20px 0;
}

.option-group {
  margin-bottom: 10px;
}

.option-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

/* 文件状态指示器 */
.file-status {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 错误和成功消息框 */
.error-message-box,
.success-message-box {
  padding: 20px;
  border-radius: 10px;
  margin-top: 20px;
}

.error-message-box {
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
}

.success-message-box {
  background: #efe;
  border: 1px solid #cfc;
  color: #363;
}

.success-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.retry-btn,
.view-photos-btn,
.upload-more-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.retry-btn {
  background: #dc3545;
  color: white;
}

.view-photos-btn {
  background: #007bff;
  color: white;
}

.upload-more-btn {
  background: #28a745;
  color: white;
}

/* 上传状态样式 */
.upload-error {
  border-color: #dc3545 !important;
  background: #fee !important;
}

.upload-success {
  border-color: #28a745 !important;
  background: #efe !important;
}

.image-preview-item.error {
  border: 2px solid #dc3545;
}

.image-preview-item.processing {
  opacity: 0.7;
}

.upload-btn.uploading {
  background: #17a2b8;
}

.upload-spinner {
  animation: spin 1s linear infinite;
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(3, 1fr);
    max-width: 700px;
  }
  
  .feature-card:nth-child(4),
  .feature-card:nth-child(5) {
    grid-column: auto;
  }
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    max-width: 400px;
    gap: 20px;
  }
  
  .feature-card:nth-child(4),
  .feature-card:nth-child(5) {
    grid-column: 1;
    grid-row: auto;
  }
  
  .feature-card {
    min-height: 240px;
    padding: 30px 20px;
  }
  
  .welcome-title {
    font-size: 32px;
  }

  .welcome-subtitle {
    font-size: 18px;
  }

  .feature-title {
    font-size: 20px;
  }

  .feature-description {
    font-size: 14px;
  }

  .main-content {
    padding: 30px 15px;
  }

  .upload-modal-content {
    margin: 10px;
    max-height: 95vh;
  }

  .upload-body {
    padding: 20px;
  }

  .image-preview-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }

  .user-info {
    gap: 10px;
    padding: 8px 15px;
  }
  
  .greeting {
    font-size: 14px;
  }
  
  .logout-btn {
    padding: 4px 8px;
    font-size: 11px;
  }
  
  .logout-text {
    display: none; /* 小屏幕下只显示图标 */
  }
  
  .logout-icon {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .header {
    padding: 15px 20px;
  }
  
  .logo-text {
    font-size: 24px;
  }
  
  .welcome-title {
    font-size: 28px;
  }
  
  .welcome-subtitle {
    font-size: 16px;
  }

  .upload-modal-header {
    padding: 20px;
  }

  .file-drop-zone {
    padding: 30px 15px;
  }

  .user-details {
    align-items: flex-end;
  }
  
  .greeting {
    font-size: 12px;
  }
}
</style>
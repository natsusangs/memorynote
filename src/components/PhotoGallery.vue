<template>
    <div class="photo-gallery-container">
      <!-- 顶部导航 -->
      <header class="gallery-header">
        <div class="header-left">
          <button class="back-button" @click="goBack">
            <span class="back-icon">←</span>
            <span>Back</span>
          </button>
          <h1 class="page-title">📸 My Album</h1>
        </div>
        <div class="header-right">
          <button class="view-toggle" @click="toggleView">
            <span v-if="viewMode === 'grid'">📅</span>
            <span v-else>📱</span>
            {{ viewMode === 'grid' ? 'Timeline View' : 'Grid View' }}
          </button>
          <button class="time-index-toggle" @click="toggleTimeIndex">
            <span>🕒</span>
            {{ showTimeIndex ? 'Hide Time Index' : 'Show Time Index' }}
          </button>
          <button class="select-mode-toggle" @click="toggleSelectMode" :class="{ active: selectMode }">
            <span>✅</span>
            {{ selectMode ? 'Cancel Selection' : 'Select Mode' }}
          </button>
          <button 
            v-if="selectMode && selectedPhotos.length > 0" 
            class="delete-selected-btn"
            @click="deleteSelectedPhotos"
          >
            <span>🗑️</span>
            Delete Selected ({{ selectedPhotos.length }})
          </button>
        </div>
      </header>
  
      <!-- 时间索引侧边栏 -->
      <div class="time-index-sidebar" :class="{ 'visible': showTimeIndex }">
        <div class="time-index-header">
          <h3>📅 Time Index</h3>
          <button class="close-index" @click="toggleTimeIndex">×</button>
        </div>
        
        <!-- 快速时间选择 -->
        <div class="quick-time-selectors">
          <button 
            v-for="period in quickTimePeriods" 
            :key="period.id"
            class="quick-time-btn"
            :class="{ active: selectedPeriod === period.id }"
            @click="selectQuickPeriod(period.id)"
          >
            <span class="period-icon">{{ period.icon }}</span>
            <span class="period-label">{{ period.label }}</span>
            <span class="period-count">({{ period.count }})</span>
          </button>
        </div>
  
        <!-- 年份选择器 -->
        <div class="year-selector">
          <h4>Browse by Year</h4>
          <div class="year-list">
            <div 
              v-for="year in availableYears" 
              :key="year.year"
              class="year-item"
              :class="{ active: selectedYear === year.year }"
              @click="selectYear(year.year)"
            >
              <span class="year-label">{{ year.year }}</span>
              <span class="year-count">{{ year.count }} photos</span>
              
              <!-- 月份展开 -->
              <div v-if="selectedYear === year.year" class="month-list">
                <div 
                  v-for="month in year.months" 
                  :key="month.month"
                  class="month-item"
                  :class="{ active: selectedMonth === month.month }"
                  @click.stop="selectMonth(year.year, month.month)"
                >
                  <span>{{ getMonthName(month.month) }}</span>
                  <span>({{ month.count }})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <!-- 时间线滑块 -->
        <div class="timeline-slider">
          <h4>Timeline Navigation</h4>
          <input 
            type="range" 
            :min="timelineRange.min" 
            :max="timelineRange.max" 
            v-model="timelinePosition"
            @input="updateTimelineView"
            class="timeline-input"
          />
          <div class="timeline-labels">
            <span>{{ formatTimelineDate(timelineRange.min) }}</span>
            <span>{{ formatTimelineDate(timelineRange.max) }}</span>
          </div>
          <div class="current-timeline-date">
            Current: {{ formatTimelineDate(timelinePosition) }}
          </div>
        </div>
      </div>
  
      <!-- 主内容区域 -->
      <main class="main-content" :class="{ 'with-sidebar': showTimeIndex }">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading photos...</p>
        </div>
  
        <!-- 错误状态 -->
        <div v-else-if="error" class="error-state">
          <div class="error-icon">❌</div>
          <h3>Loading Failed</h3>
          <p>{{ error }}</p>
          <button @click="retryLoad" class="retry-btn">Retry</button>
        </div>
  
        <!-- 正常内容 -->
        <template v-else>
          <!-- 当前视图信息 -->
          <div class="view-info">
            <div class="view-title">
              <h2>{{ currentViewTitle }}</h2>
              <p class="view-subtitle">{{ currentViewSubtitle }}</p>
            </div>
            <div class="view-stats">
              <span class="photo-count">📷 {{ filteredPhotos.length }} photos</span>
              <span class="date-range">{{ currentDateRange }}</span>
              <span v-if="selectMode" class="selected-count">
                Selected: {{ selectedPhotos.length }}
              </span>
            </div>
          </div>
  
          <!-- 时间线视图 -->
          <div v-if="viewMode === 'timeline'" class="timeline-view">
            <div 
              v-for="group in timelineGroups" 
              :key="group.date"
              class="timeline-group"
            >
              <div class="timeline-date-header">
                <h3>{{ group.displayDate }}</h3>
                <span class="group-count">{{ group.photos.length }} photos</span>
              </div>
              <div class="timeline-photos">
                <div 
                  v-for="photo in group.photos" 
                  :key="photo.id"
                  class="timeline-photo"
                  :class="{ selected: isPhotoSelected(photo.id) }"
                  @click="handlePhotoClick(photo)"
                >
                  <img :src="photo.thumbnail" :alt="photo.description" @error="handleImageError($event)" />
                  <div class="photo-time">{{ formatTime(photo.date) }}</div>
                  <div v-if="selectMode" class="photo-checkbox" @click.stop="togglePhotoSelection(photo)">
                    <input 
                      type="checkbox" 
                      :checked="isPhotoSelected(photo.id)"
                      @change="togglePhotoSelection(photo)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          <!-- 网格视图 -->
          <div v-else class="grid-view">
            <div class="photo-grid">
              <div 
                v-for="photo in paginatedPhotos" 
                :key="photo.id"
                class="photo-item"
                :class="{ selected: isPhotoSelected(photo.id) }"
                @click="handlePhotoClick(photo)"
              >
                <img :src="photo.thumbnail" :alt="photo.description" @error="handleImageError($event)" />
                <div class="photo-overlay">
                  <div class="photo-date">{{ formatDate(photo.date) }}</div>
                  <div class="photo-time">{{ formatTime(photo.date) }}</div>
                  <div v-if="photo.location" class="photo-location">📍 {{ photo.location }}</div>
                </div>
                <div v-if="selectMode" class="photo-checkbox" @click.stop="togglePhotoSelection(photo)">
                  <input 
                    type="checkbox" 
                    :checked="isPhotoSelected(photo.id)"
                    @change="togglePhotoSelection(photo)"
                  />
                </div>
              </div>
            </div>
  
            <!-- 分页控件 -->
            <div class="pagination" v-if="totalPages > 1">
              <button 
                @click="previousPage" 
                :disabled="currentPage === 1"
                class="pagination-btn"
              >
                ← Previous
              </button>
              <span class="page-info">
                Page {{ currentPage }} of {{ totalPages }}
              </span>
              <button 
                @click="nextPage" 
                :disabled="currentPage === totalPages"
                class="pagination-btn"
              >
                Next →
              </button>
            </div>
          </div>
  
          <!-- 空状态 -->
          <div v-if="!loading && !error && filteredPhotos.length === 0" class="empty-state">
            <div class="empty-icon">📷</div>
            <h3>No Photos Found</h3>
            <p>No photos found in this time period</p>
            <button @click="resetFilters" class="reset-btn">View All Photos</button>
          </div>
        </template>
      </main>
  
      <!-- 快速操作按钮 -->
      <div class="quick-actions">
        <button @click="goToToday" class="quick-action-btn today">
          <span>📅</span>
          Today
        </button>
        <button @click="goToLatest" class="quick-action-btn latest">
          <span>⭐</span>
          Latest
        </button>
        <template v-if="selectMode">
          <button @click="selectAllCurrentPage" class="quick-action-btn select-all">
            <span>✅</span>
            Select All
          </button>
          <button @click="deselectAll" class="quick-action-btn deselect-all">
            <span>❌</span>
            Deselect All
          </button>
        </template>
      </div>
    </div>
  </template>
  
  <script>
  import axios from 'axios'
  
  export default {
    name: 'PhotoGallery',
    
    data() {
      return {
        // 视图模式
        viewMode: 'grid', // 'grid' 或 'timeline'
        showTimeIndex: false,
        
        // 选择模式
        selectMode: false,
        selectedPhotos: [],
        
        // 时间筛选
        selectedPeriod: 'all',
        selectedYear: null,
        selectedMonth: null,
        timelinePosition: 0,
        
        // 分页
        currentPage: 1,
        photosPerPage: 24,
        
        // 快速时间选择
        quickTimePeriods: [
          { id: 'all', label: 'All', icon: '📚', count: 0 },
          { id: 'today', label: 'Today', icon: '☀️', count: 0 },
          { id: 'week', label: 'This Week', icon: '📅', count: 0 },
          { id: 'month', label: 'This Month', icon: '🗓️', count: 0 },
          { id: 'year', label: 'This Year', icon: '📆', count: 0 }
        ],
        
        // 照片数据
        allPhotos: [],
        
        // 加载状态
        loading: false,
        error: null,
        deleting: false
      }
    },
  
    computed: {
      // 可用的年份列表
      availableYears() {
        const yearMap = new Map()
        
        this.allPhotos.forEach(photo => {
          const date = new Date(photo.date)
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          
          if (!yearMap.has(year)) {
            yearMap.set(year, { year, count: 0, months: new Map() })
          }
          
          const yearData = yearMap.get(year)
          yearData.count++
          
          if (!yearData.months.has(month)) {
            yearData.months.set(month, { month, count: 0 })
          }
          yearData.months.get(month).count++
        })
        
        // 转换为数组并排序
        return Array.from(yearMap.values())
          .sort((a, b) => b.year - a.year)
          .map(yearData => ({
            ...yearData,
            months: Array.from(yearData.months.values()).sort((a, b) => b.month - a.month)
          }))
      },
  
      // 时间线范围
      timelineRange() {
        if (this.allPhotos.length === 0) {
          const now = Date.now()
          return { min: now, max: now }
        }
        
        const dates = this.allPhotos.map(p => new Date(p.date).getTime())
        return {
          min: Math.min(...dates),
          max: Math.max(...dates)
        }
      },
  
      // 筛选后的照片
      filteredPhotos() {
        let photos = [...this.allPhotos]
        
        // 根据快速时间选择筛选
        if (this.selectedPeriod !== 'all') {
          photos = this.filterByPeriod(photos, this.selectedPeriod)
        }
        
        // 根据年月筛选
        if (this.selectedYear) {
          photos = photos.filter(photo => {
            const date = new Date(photo.date)
            const yearMatch = date.getFullYear() === this.selectedYear
            const monthMatch = !this.selectedMonth || (date.getMonth() + 1) === this.selectedMonth
            return yearMatch && monthMatch
          })
        }
        
        // 按日期排序（最新在前）
        return photos.sort((a, b) => new Date(b.date) - new Date(a.date))
      },
  
      // 分页后的照片
      paginatedPhotos() {
        const start = (this.currentPage - 1) * this.photosPerPage
        return this.filteredPhotos.slice(start, start + this.photosPerPage)
      },
  
      // 时间线分组
      timelineGroups() {
        const groups = new Map()
        
        this.filteredPhotos.forEach(photo => {
          const date = new Date(photo.date)
          const dateKey = date.toDateString()
          
          if (!groups.has(dateKey)) {
            groups.set(dateKey, {
              date: dateKey,
              displayDate: this.formatDate(photo.date),
              photos: []
            })
          }
          
          groups.get(dateKey).photos.push(photo)
        })
        
        return Array.from(groups.values()).sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        )
      },
  
      // 总页数
      totalPages() {
        return Math.ceil(this.filteredPhotos.length / this.photosPerPage)
      },
  
      // 当前视图标题
      currentViewTitle() {
        if (this.selectedYear && this.selectedMonth) {
          return `${this.getMonthName(this.selectedMonth)} ${this.selectedYear}`
        } else if (this.selectedYear) {
          return `${this.selectedYear}`
        } else {
          const period = this.quickTimePeriods.find(p => p.id === this.selectedPeriod)
          return period ? period.label : 'All Photos'
        }
      },
  
      // 当前视图副标题
      currentViewSubtitle() {
        if (this.selectedPeriod === 'today') {
          return this.formatDate(new Date().toISOString())
        } else if (this.selectedPeriod === 'week') {
          const weekStart = this.getWeekStart()
          const weekEnd = new Date()
          return `${this.formatDate(weekStart.toISOString())} - ${this.formatDate(weekEnd.toISOString())}`
        }
        return 'Sorted by date'
      },
  
      // 当前日期范围
      currentDateRange() {
        if (this.filteredPhotos.length === 0) return ''
        
        const dates = this.filteredPhotos.map(p => new Date(p.date))
        const oldest = new Date(Math.min(...dates))
        const newest = new Date(Math.max(...dates))
        
        if (this.isSameDay(oldest, newest)) {
          return this.formatDate(newest.toISOString())
        }
        
        return `${this.formatDate(oldest.toISOString())} - ${this.formatDate(newest.toISOString())}`
      }
    },
  
    watch: {
      selectedPeriod() {
        this.currentPage = 1
        this.updateQuickPeriodCounts()
      },
      
      selectedYear() {
        this.currentPage = 1
        this.selectedMonth = null
      },
      
      selectedMonth() {
        this.currentPage = 1
      }
    },
  
    mounted() {
      this.initializePhotos()
    },
  
    methods: {
      // 初始化照片数据
      async initializePhotos() {
        if (!this.$store.state.uid) {
          this.error = 'User not logged in, please login first'
          return
        }
  
        this.loading = true
        this.error = null
  
        try {
          const response = await axios.get(`/photos/${this.$store.state.uid}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
  
          if (response.data.success) {
            this.allPhotos = this.transformPhotosData(response.data.photos)
            this.updateQuickPeriodCounts()
            this.timelinePosition = this.timelineRange.max
          } else {
            this.error = response.data.message || 'Failed to load photos'
          }
        } catch (error) {
          console.error('Failed to load photos:', error)
          this.error = error.response?.data?.message || 'Network error, please check connection'
        } finally {
          this.loading = false
        }
      },
  
      // 转换后端照片数据到前端格式
      transformPhotosData(photos) {
        return photos.map(photo => ({
          id: photo.id,
          // 假设后端提供了静态文件访问路径，如果没有需要根据实际情况调整
          thumbnail: this.getImageUrl(photo.path),
          fullsize: this.getImageUrl(photo.path),
          date: photo.gpsTime || photo.uploadTime, // 优先使用拍摄时间，否则使用上传时间
          description: `Photo ${photo.id}`,
          location: this.parseGpsData(photo.gpsData),
          originalPath: photo.path,
          uploadTime: photo.uploadTime
        })).sort((a, b) => new Date(b.date) - new Date(a.date))
      },
  
      // 获取图片URL
      getImageUrl(path) {
        if (!path) {
          console.warn('Path is empty')
          return this.getDefaultImage()
        }
        
        // 如果已经是完整URL，直接返回
        if (path.startsWith('http')) {
          return path
        }
        
        // 清理路径，确保没有开头的斜杠
        let cleanPath = path.startsWith('/') ? path.substring(1) : path
        
        // 构造URL - 使用正确的 /upload/ 路径
        const baseUrl = axios.defaults.baseURL // http://localhost:8088
        const imageUrl = `${baseUrl}/upload/${cleanPath}`
        
        console.log('Final image URL:', imageUrl)
        return imageUrl
      },
  
      // 解析GPS数据
      parseGpsData(gpsData) {
        if (!gpsData) return null
        
        try {
          // 如果gpsData是JSON字符串
          if (typeof gpsData === 'string') {
            const parsed = JSON.parse(gpsData)
            if (parsed.address) {
              return parsed.address
            }
            if (parsed.latitude && parsed.longitude) {
              return `${parsed.latitude.toFixed(4)}, ${parsed.longitude.toFixed(4)}`
            }
          }
          // 如果已经是对象
          if (typeof gpsData === 'object') {
            if (gpsData.address) {
              return gpsData.address
            }
            if (gpsData.latitude && gpsData.longitude) {
              return `${gpsData.latitude.toFixed(4)}, ${gpsData.longitude.toFixed(4)}`
            }
          }
          return gpsData.toString()
        } catch (e) {
          console.warn('Failed to parse GPS data:', e)
          return gpsData
        }
      },
  
      // 处理图片加载错误
      handleImageError(event) {
        const failedUrl = event.target.src
        console.error('❌ Image loading failed:', failedUrl)
        
        // 获取原始路径
        const originalPath = event.target.dataset.originalPath
        if (originalPath && !event.target.dataset.retried) {
          event.target.dataset.retried = 'true'
          
          // 尝试其他可能的路径配置
          const alternatives = [
            `${axios.defaults.baseURL}/uploads/${originalPath}`,  // 复数形式
            `${axios.defaults.baseURL}/static/${originalPath}`,   // 静态资源
            `${axios.defaults.baseURL}/files/${originalPath}`,    // 文件目录
            `${axios.defaults.baseURL}/${originalPath}`,          // 直接路径
          ]
          
          console.log('🔄 Trying alternative path:', alternatives[0])
          event.target.src = alternatives[0]
          return
        }
        
        // 最终失败，显示占位图
        console.log('🚫 All paths failed, showing placeholder')
        event.target.src = this.getDefaultImage()
      },
  
      // 重新加载
      retryLoad() {
        this.initializePhotos()
      },
  
      // 查看照片
      viewPhoto(photo) {
        // 创建详细的照片查看弹窗
        const photoInfo = [
          `Taken: ${this.formatDate(photo.date)} ${this.formatTime(photo.date)}`,
          photo.location ? `Location: ${photo.location}` : '',
          `Uploaded: ${this.formatDate(photo.uploadTime)} ${this.formatTime(photo.uploadTime)}`
        ].filter(info => info).join('\n')
  
        // 可以在这里实现图片预览弹窗
        if (confirm(`${photoInfo}\n\nView full size in new window?`)) {
          window.open(photo.fullsize, '_blank')
        }
      },
  
      // 处理照片点击事件
      handlePhotoClick(photo) {
        if (this.selectMode) {
          this.togglePhotoSelection(photo)
        } else {
          this.viewPhoto(photo)
        }
      },
  
      // 切换视图模式
      toggleView() {
        this.viewMode = this.viewMode === 'grid' ? 'timeline' : 'grid'
      },
  
      // 切换时间索引显示
      toggleTimeIndex() {
        this.showTimeIndex = !this.showTimeIndex
      },
  
      // 选择快速时间段
      selectQuickPeriod(periodId) {
        this.selectedPeriod = periodId
        this.selectedYear = null
        this.selectedMonth = null
      },
  
      // 选择年份
      selectYear(year) {
        this.selectedYear = this.selectedYear === year ? null : year
        this.selectedPeriod = 'all'
      },
  
      // 选择月份
      selectMonth(year, month) {
        this.selectedYear = year
        this.selectedMonth = this.selectedMonth === month ? null : month
        this.selectedPeriod = 'all'
      },
  
      // 更新时间线视图
      updateTimelineView() {
        const targetDate = new Date(parseInt(this.timelinePosition))
        this.selectedPeriod = 'all'
        this.selectedYear = targetDate.getFullYear()
        this.selectedMonth = targetDate.getMonth() + 1
      },
  
      // 根据时间段筛选照片
      filterByPeriod(photos, period) {
        const now = new Date()
        
        switch (period) {
          case 'today':
            return photos.filter(photo => this.isSameDay(new Date(photo.date), now))
          case 'week':
            const weekStart = this.getWeekStart()
            return photos.filter(photo => new Date(photo.date) >= weekStart)
          case 'month':
            return photos.filter(photo => {
              const photoDate = new Date(photo.date)
              return photoDate.getMonth() === now.getMonth() && 
                     photoDate.getFullYear() === now.getFullYear()
            })
          case 'year':
            return photos.filter(photo => 
              new Date(photo.date).getFullYear() === now.getFullYear()
            )
          default:
            return photos
        }
      },
  
      // 更新快速时间段计数
      updateQuickPeriodCounts() {
        this.quickTimePeriods.forEach(period => {
          if (period.id === 'all') {
            period.count = this.allPhotos.length
          } else {
            period.count = this.filterByPeriod(this.allPhotos, period.id).length
          }
        })
      },
  
      // 重置筛选
      resetFilters() {
        this.selectedPeriod = 'all'
        this.selectedYear = null
        this.selectedMonth = null
        this.currentPage = 1
      },
  
      // 跳转到今天
      goToToday() {
        this.selectedPeriod = 'today'
        this.selectedYear = null
        this.selectedMonth = null
        this.currentPage = 1
      },
  
      // 跳转到最新
      goToLatest() {
        this.selectedPeriod = 'all'
        this.selectedYear = null
        this.selectedMonth = null
        this.currentPage = 1
      },
  
      // 分页控制
      previousPage() {
        if (this.currentPage > 1) {
          this.currentPage--
        }
      },
  
      nextPage() {
        if (this.currentPage < this.totalPages) {
          this.currentPage++
        }
      },
  
      // 返回
      goBack() {
        this.$router.push('/userMain')
      },
  
      // 工具方法
      formatDate(dateString) {
        const date = new Date(dateString)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
      },
  
      formatTime(dateString) {
        const date = new Date(dateString)
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      },
  
      formatTimelineDate(timestamp) {
        const date = new Date(parseInt(timestamp))
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${months[date.getMonth()]} ${date.getFullYear()}`
      },

      // 获取月份名称
      getMonthName(monthNumber) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
        return months[monthNumber - 1] || monthNumber
      },
  
      isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate()
      },
  
      getWeekStart() {
        const now = new Date()
        const day = now.getDay()
        const diff = now.getDate() - day + (day === 0 ? -6 : 1)
        const weekStart = new Date(now.setDate(diff))
        weekStart.setHours(0, 0, 0, 0)
        return weekStart
      },
  
      getDefaultImage() {
        // 实现获取默认占位图的逻辑
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEZhaWxlZCB0byBMb2FkPC90ZXh0Pjwvc3ZnPg=='
      },
  
      // 切换选择模式
      toggleSelectMode() {
        this.selectMode = !this.selectMode
        if (!this.selectMode) {
          this.selectedPhotos = []
        }
      },
  
      // 检查照片是否被选中
      isPhotoSelected(photoId) {
        return this.selectedPhotos.includes(photoId)
      },
  
      // 切换照片选择状态
      togglePhotoSelection(photo) {
        if (!this.selectMode) return
        
        const photoId = photo.id
        const index = this.selectedPhotos.indexOf(photoId)
        
        if (index > -1) {
          this.selectedPhotos.splice(index, 1)
        } else {
          this.selectedPhotos.push(photoId)
        }
      },
  
            // 删除选中的照片
      async deleteSelectedPhotos() {
        if (this.selectedPhotos.length === 0) {
          alert('Please select photos to delete first')
          return
        }

        const confirmMessage = `Are you sure you want to delete ${this.selectedPhotos.length} selected photos?\nThis action cannot be undone!`
        if (!confirm(confirmMessage)) {
          return
        }
  
        this.deleting = true
  
        try {
          // 确保用户ID存在
          const userId = this.$store.state.uid || this.$store.state.id
          if (!userId) {
            throw new Error('User ID not found')
          }
          
          console.log('Sending DELETE request with params:', {
            uid: userId,
            photoIds: this.selectedPhotos
          })
          
          // 手动构建查询字符串，避免axios的默认数组处理产生非法字符
          const queryParams = new URLSearchParams()
          queryParams.append('uid', userId)
          this.selectedPhotos.forEach(photoId => {
            queryParams.append('photoIds', photoId)
          })
          
          const queryString = queryParams.toString()
          console.log('Query string:', queryString)
          
          // 发送DELETE请求，使用手动构建的查询字符串
          const response = await axios.delete(`/photos?${queryString}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
  
          if (response.data.success) {
            // 从本地数据中移除已删除的照片
            this.allPhotos = this.allPhotos.filter(photo => 
              !this.selectedPhotos.includes(photo.id)
            )
            
            // 清空选择
            this.selectedPhotos = []
            
            // 更新计数
            this.updateQuickPeriodCounts()
            
            // 如果当前页没有照片了，回到上一页
            if (this.paginatedPhotos.length === 0 && this.currentPage > 1) {
              this.currentPage--
            }
            
            alert(`Successfully deleted ${response.data.deletedCount || this.selectedPhotos.length} photos`)
          } else {
            throw new Error(response.data.message || 'Delete failed')
          }
        } catch (error) {
          console.error('Failed to delete photos:', error)
          alert(`Delete failed: ${error.response?.data?.message || error.message || 'Network error'}`)
        } finally {
          this.deleting = false
        }
      },
  
      // 全选当前页照片
      selectAllCurrentPage() {
        if (!this.selectMode) return
        
        this.paginatedPhotos.forEach(photo => {
          if (!this.isPhotoSelected(photo.id)) {
            this.selectedPhotos.push(photo.id)
          }
        })
      },
  
      // 取消全选
      deselectAll() {
        this.selectedPhotos = []
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
  
  .photo-gallery-container {
    min-height: 100vh;
    background: #f5f6fa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
    display: flex;
    flex-direction: column;
  }
  
  /* 顶部导航 */
  .gallery-header {
    background: white;
    padding: 20px 30px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  
  .back-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #f0f0f0;
    border: none;
    border-radius: 25px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .back-button:hover {
    background: #e0e0e0;
    transform: translateX(-3px);
  }
  
  .page-title {
    font-size: 28px;
    color: #333;
  }
  
  .header-right {
    display: flex;
    gap: 10px;
  }
  
  .view-toggle, .time-index-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 25px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .view-toggle:hover, .time-index-toggle:hover {
    background: #f0f0f0;
    border-color: #667eea;
  }
  
  /* 选择模式和删除按钮样式 */
  .select-mode-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 25px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .select-mode-toggle:hover {
    background: #f0f0f0;
    border-color: #667eea;
  }
  
  .select-mode-toggle.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }
  
  .delete-selected-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 25px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .delete-selected-btn:hover {
    background: #c82333;
    transform: scale(1.05);
  }
  
  .delete-selected-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
    transform: none;
  }
  
  /* 时间索引侧边栏 */
  .time-index-sidebar {
    position: fixed;
    top: 0;
    right: -400px;
    width: 400px;
    height: 100vh;
    background: white;
    box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
    transition: right 0.3s ease;
    z-index: 200;
    overflow-y: auto;
  }
  
  .time-index-sidebar.visible {
    right: 0;
  }
  
  .time-index-header {
    padding: 20px;
    background: #667eea;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .time-index-header h3 {
    font-size: 20px;
  }
  
  .close-index {
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 5px;
  }
  
  /* 快速时间选择 */
  .quick-time-selectors {
    padding: 20px;
    border-bottom: 1px solid #eee;
  }
  
  .quick-time-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 15px;
    margin-bottom: 10px;
    background: #f8f9fa;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .quick-time-btn:hover {
    background: #e9ecef;
  }
  
  .quick-time-btn.active {
    background: #667eea;
    color: white;
  }
  
  .period-icon {
    font-size: 18px;
  }
  
  .period-label {
    font-weight: 500;
  }
  
  .period-count {
    font-size: 14px;
    opacity: 0.8;
  }
  
  /* 年份选择器 */
  .year-selector {
    padding: 20px;
    border-bottom: 1px solid #eee;
  }
  
  .year-selector h4 {
    margin-bottom: 15px;
    color: #333;
  }
  
  .year-item {
    margin-bottom: 10px;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
  }
  
  .year-item > div:first-child {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    background: #f8f9fa;
    transition: background 0.3s ease;
  }
  
  .year-item:hover > div:first-child {
    background: #e9ecef;
  }
  
  .year-item.active > div:first-child {
    background: #667eea;
    color: white;
  }
  
  .month-list {
    background: #fff;
    border-top: 1px solid #eee;
  }
  
  .month-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 25px;
    cursor: pointer;
    transition: background 0.3s ease;
  }
  
  .month-item:hover {
    background: #f0f0f0;
  }
  
  .month-item.active {
    background: #e3f2fd;
    color: #1976d2;
  }
  
  /* 时间线滑块 */
  .timeline-slider {
    padding: 20px;
  }
  
  .timeline-slider h4 {
    margin-bottom: 15px;
    color: #333;
  }
  
  .timeline-input {
    width: 100%;
    margin-bottom: 10px;
  }
  
  .timeline-labels {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #666;
    margin-bottom: 10px;
  }
  
  .current-timeline-date {
    text-align: center;
    font-weight: 500;
    color: #667eea;
  }
  
  /* 主内容区域 */
  .main-content {
    flex: 1;
    padding: 20px 30px;
    transition: margin-right 0.3s ease;
  }
  
  .main-content.with-sidebar {
    margin-right: 400px;
  }
  
  /* 视图信息 */
  .view-info {
    background: white;
    padding: 20px;
    border-radius: 15px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .view-title h2 {
    font-size: 24px;
    color: #333;
    margin-bottom: 5px;
  }
  
  .view-subtitle {
    color: #666;
    font-size: 14px;
  }
  
  .view-stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
  }
  
  .photo-count, .date-range {
    font-size: 14px;
    color: #555;
  }
  
  /* 已选择计数样式 */
  .selected-count {
    font-size: 14px;
    color: #667eea;
    font-weight: 500;
  }
  
  /* 时间线视图 */
  .timeline-view {
    background: white;
    border-radius: 15px;
    overflow: hidden;
  }
  
  .timeline-group {
    border-bottom: 1px solid #f0f0f0;
  }
  
  .timeline-group:last-child {
    border-bottom: none;
  }
  
  .timeline-date-header {
    background: #f8f9fa;
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .timeline-date-header h3 {
    color: #333;
    font-size: 18px;
  }
  
  .group-count {
    color: #666;
    font-size: 14px;
  }
  
  .timeline-photos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
    padding: 20px;
  }
  
  .timeline-photo {
    position: relative;
    cursor: pointer;
    border-radius: 8px;
    overflow: hidden;
    transition: transform 0.3s ease;
  }
  
  .timeline-photo:hover {
    transform: scale(1.05);
  }
  
  .timeline-photo.selected {
    transform: scale(1.05);
    box-shadow: 0 0 0 3px #667eea;
  }
  
  .timeline-photo img {
    width: 100%;
    height: 120px;
    object-fit: cover;
  }
  
  .photo-time {
    position: absolute;
    bottom: 5px;
    right: 5px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
  }
  
  /* 照片复选框样式 */
  .photo-checkbox {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 10;
    cursor: pointer;
  }
  
  .photo-checkbox input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    transform: scale(1.2);
    accent-color: #667eea;
  }
  
  /* 网格视图 */
  .grid-view {
    background: white;
    border-radius: 15px;
    padding: 20px;
  }
  
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }
  
  .photo-item {
    position: relative;
    cursor: pointer;
    border-radius: 12px;
    overflow: hidden;
    transition: transform 0.3s ease;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .photo-item:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  }
  
  .photo-item.selected {
    transform: translateY(-5px);
    box-shadow: 0 0 0 3px #667eea, 0 5px 20px rgba(0, 0, 0, 0.15);
  }
  
  .photo-item img {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }
  
  .photo-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    color: white;
    padding: 15px;
  }
  
  .photo-date {
    font-weight: 500;
    margin-bottom: 2px;
  }
  
  .photo-time {
    font-size: 12px;
    opacity: 0.9;
  }
  
  /* 分页 */
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-top: 30px;
  }
  
  .pagination-btn {
    padding: 10px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .pagination-btn:hover:not(:disabled) {
    background: #5a6fd8;
  }
  
  .pagination-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .page-info {
    color: #666;
    font-size: 14px;
  }
  
  /* 空状态 */
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    background: white;
    border-radius: 15px;
  }
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 20px;
  }
  
  .empty-state h3 {
    color: #333;
    margin-bottom: 10px;
  }
  
  .empty-state p {
    color: #666;
    margin-bottom: 30px;
  }
  
  .reset-btn {
    padding: 12px 30px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .reset-btn:hover {
    background: #5a6fd8;
    transform: scale(1.05);
  }
  
  /* 快速操作按钮 */
  .quick-actions {
    position: fixed;
    bottom: 30px;
    left: 30px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .quick-action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 25px;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
  }
  
  .quick-action-btn:hover {
    background: #5a6fd8;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }
  
  .quick-action-btn.today {
    background: #f093fb;
  }
  
  .quick-action-btn.today:hover {
    background: #e081ea;
  }
  
  .quick-action-btn.select-all {
    background: #28a745;
  }
  
  .quick-action-btn.select-all:hover {
    background: #218838;
  }
  
  .quick-action-btn.deselect-all {
    background: #6c757d;
  }
  
  .quick-action-btn.deselect-all:hover {
    background: #545b62;
  }
  
  /* 响应式设计 */
  @media (max-width: 768px) {
    .time-index-sidebar {
      width: 100%;
      right: -100%;
    }
  
    .main-content.with-sidebar {
      margin-right: 0;
    }
  
    .view-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;
    }
  
    .photo-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 15px;
    }
  
    .timeline-photos {
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    }
  
    .quick-actions {
      bottom: 20px;
      left: 20px;
    }
  }
  
  /* 新增加载状态样式 */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    background: white;
    border-radius: 15px;
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .loading-state p {
    color: #666;
    font-size: 16px;
  }
  
  /* 错误状态样式 */
  .error-state {
    text-align: center;
    padding: 60px 20px;
    background: white;
    border-radius: 15px;
  }
  
  .error-icon {
    font-size: 64px;
    margin-bottom: 20px;
  }
  
  .error-state h3 {
    color: #dc3545;
    margin-bottom: 10px;
  }
  
  .error-state p {
    color: #666;
    margin-bottom: 30px;
  }
  
  .retry-btn {
    padding: 12px 30px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .retry-btn:hover {
    background: #c82333;
    transform: scale(1.05);
  }
  
  /* 位置信息样式 */
  .photo-location {
    font-size: 11px;
    opacity: 0.8;
    margin-top: 2px;
  }
  </style>
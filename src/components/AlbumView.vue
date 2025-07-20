<template>
  <div class="album-view-container">
    <!-- 顶部导航 -->
    <header class="album-header">
      <div class="header-left">
        <button class="back-button" @click="goBack">
          <span class="back-icon">←</span>
          <span>Back</span>
        </button>
        <h1 class="page-title">🌍 Smart Album Browser</h1>
      </div>
      
      <div class="header-controls">
        <button class="filter-toggle" @click="toggleFilters" :class="{ active: showFilters }">
          <span>🔍</span>
          {{ showFilters ? 'Hide Filters' : 'Show Filters' }}
        </button>
      </div>
    </header>

    <!-- 推荐横幅 -->
    <div v-if="recentTrip" class="recommendation-banner" @click="viewRecentTrip">
      <div class="banner-content">
        <div class="banner-icon">✈️</div>
        <div class="banner-info">
          <h3>Recent Trip: {{ recentTrip.location }}</h3>
          <p>{{ recentTrip.photoCount }} photos • {{ formatDateRange(recentTrip.startDate, recentTrip.endDate) }}</p>
        </div>
        <div class="banner-action">
          <span>View Photos</span>
          <span class="arrow">→</span>
        </div>
      </div>
    </div>

    <!-- 筛选面板 -->
    <div class="filter-panel" :class="{ visible: showFilters }">
      <div class="filter-content">
        <!-- Time Filters -->
        <div class="filter-group">
          <label>📅 Time Range</label>
          <div class="filter-options">
            <select v-model="selectedTimeRange" @change="applyFilters">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            
            <div v-if="selectedTimeRange === 'custom'" class="custom-date-range">
              <input type="date" v-model="customStartDate" @change="applyFilters">
              <span>to</span>
              <input type="date" v-model="customEndDate" @change="applyFilters">
            </div>
          </div>
        </div>

        <!-- Location Filters -->
        <div class="filter-group">
          <label>🌍 Location Filters</label>
          <div class="location-filters">
            <select v-model="selectedCountry" @change="onCountryChange">
              <option value="all">All Countries</option>
              <option v-for="country in availableCountries" :key="country" :value="country">
                {{ country }}
              </option>
            </select>
            
            <select v-model="selectedRegion" @change="onRegionChange" :disabled="selectedCountry === 'all'">
              <option value="all">All States/Regions</option>
              <option v-for="region in availableRegions" :key="region" :value="region">
                {{ region }}
              </option>
            </select>
            
            <select v-model="selectedCity" @change="onCityChange" :disabled="selectedRegion === 'all'">
              <option value="all">All Cities</option>
              <option v-for="city in availableCities" :key="city" :value="city">
                {{ city }}
              </option>
            </select>

            <select v-model="selectedDistrict" @change="onDistrictChange" :disabled="selectedCity === 'all'">
              <option value="all">All Districts</option>
              <option v-for="district in availableDistricts" :key="district" :value="district">
                {{ district }}
              </option>
            </select>

            <select v-model="selectedNeighborhood" @change="onNeighborhoodChange" :disabled="selectedDistrict === 'all'">
              <option value="all">All Neighborhoods</option>
              <option v-for="neighborhood in availableNeighborhoods" :key="neighborhood" :value="neighborhood">
                {{ neighborhood }}
              </option>
            </select>

            <select v-model="selectedStreet" @change="applyFilters" :disabled="selectedNeighborhood === 'all'">
              <option value="all">All Streets</option>
              <option v-for="street in availableStreets" :key="street" :value="street">
                {{ street }}
              </option>
            </select>
          </div>
        </div>

        <!-- Filter Statistics -->
        <div class="filter-stats">
          <span class="photo-count">Found {{ filteredPhotos.length }} photos</span>
          <span v-if="processingAddresses > 0" class="processing-status">
            Processing {{ processingAddresses }} addresses...
          </span>
          <button v-if="hasActiveFilters" @click="clearFilters" class="clear-filters-btn">
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <main class="main-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading your album...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <div class="error-icon">❌</div>
        <h3>Loading Failed</h3>
        <p>{{ error }}</p>
        <button @click="retryLoad" class="retry-btn">Retry</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredPhotos.length === 0" class="empty-state">
        <div class="empty-icon">📷</div>
        <h3>No Photos Found</h3>
        <p>Please adjust your filters or upload some photos</p>
        <button @click="clearFilters" class="clear-filters-btn">Clear Filters</button>
      </div>

      <!-- 3D轮播图区域 -->
      <div v-else class="carousel-section">
        <!-- 3D画廊 -->
        <div class="gallery-3d">
          <div 
            class="photo-card"
            v-for="(photo, index) in visiblePhotos"
            :key="photo.id"
            :class="getCardClass(index)"
            :style="getCardStyle(index)"
            @click="selectPhoto(index)"
          >
            <div class="photo-wrapper">
              <img 
                :src="getImageUrl(photo.path)" 
                :alt="photo.description"
                @error="handleImageError($event)"
                @load="handleImageLoad($event)"
              />
              <div class="photo-overlay">
                <div class="photo-info">
                  <div class="photo-date">{{ formatDate(photo.date) }}</div>
                  <div v-if="photo.fullAddress" class="photo-location">
                    📍 {{ photo.fullAddress }}
                  </div>
                  <div v-else-if="photo.coordinates" class="photo-coordinates">
                    🌐 {{ photo.coordinates }}
                  </div>
                  <!-- 显示结构化地址信息 -->
                  <div v-if="photo.neighborhood || photo.district" class="photo-address-details">
                    <span v-if="photo.neighborhood" class="address-neighborhood">🏘️ {{ photo.neighborhood }}</span>
                    <span v-if="photo.district && photo.district !== photo.neighborhood" class="address-district">🏛️ {{ photo.district }}</span>
                    <span v-if="photo.city && photo.region" class="address-hierarchy">{{ photo.city }}, {{ photo.region }}</span>
                  </div>
                </div>
                
                                 <!-- Address Loading Status -->
                 <div v-if="photo.addressLoading" class="address-loading">
                   <div class="mini-spinner"></div>
                   <span>Resolving...</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Control Panel - Below 3D Gallery -->
        <div class="control-panel">
          <!-- Current Photo Info -->
          <div class="current-photo-info">
            <h3>{{ currentPhoto?.description || `Photo ${currentIndex + 1}` }}</h3>
            <div class="photo-details">
              <span class="photo-index">{{ currentIndex + 1 }} / {{ filteredPhotos.length }}</span>
              <span class="photo-date">{{ formatDateTime(currentPhoto?.date) }}</span>
              <span v-if="currentPhoto?.fullAddress" class="photo-address">
                📍 {{ currentPhoto.fullAddress }}
              </span>
              <span v-else-if="currentPhoto?.coordinates" class="photo-coordinates">
                🌐 {{ currentPhoto.coordinates }}
              </span>
            </div>
          </div>

          <!-- Playback Controls -->
          <div class="playback-controls">
            <button @click="previousPhoto" class="control-btn" :disabled="filteredPhotos.length <= 1">
              <span>⏮</span>
            </button>
            
            <button @click="togglePlayback" class="play-pause-btn">
              <span v-if="isPlaying">⏸</span>
              <span v-else>▶</span>
            </button>
            
            <button @click="nextPhoto" class="control-btn" :disabled="filteredPhotos.length <= 1">
              <span>⏭</span>
            </button>
            
            <div class="speed-control">
              <label>Speed:</label>
              <select v-model="playbackSpeed" @change="updatePlaybackSpeed">
                <option value="500">2x</option>
                <option value="1000">1x</option>
                <option value="2000">0.5x</option>
                <option value="3000">0.33x</option>
              </select>
            </div>
          </div>

          <!-- 进度条 -->
          <div class="progress-bar" @click="handleProgressBarClick" ref="progressBar">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
            <div class="progress-indicator" 
              :style="{ left: progressPercentage + '%' }"
              @mousedown="startDragging"
              @touchstart="startDragging"
            ></div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'AlbumView',
  
  data() {
    return {
      // 照片数据
      allPhotos: [],
      filteredPhotos: [],
      currentIndex: 0,
      
      // 状态管理
      loading: false,
      error: null,
      
      // 筛选相关
      showFilters: false,
      selectedTimeRange: 'all',
      selectedCountry: 'all',
      selectedRegion: 'all',
      selectedCity: 'all',
      selectedDistrict: 'all',
      selectedNeighborhood: 'all',
      selectedStreet: 'all',
      customStartDate: '',
      customEndDate: '',
      
      // 地址数据
      availableCountries: [],
      availableRegions: [],
      availableCities: [],
      availableDistricts: [],
      availableNeighborhoods: [],
      availableStreets: [],
      addressCache: new Map(),
      processingAddresses: 0,
      
      // 轮播控制
      isPlaying: false,
      playbackSpeed: 1000,
      playbackTimer: null,
      
      // 3D效果配置
      visiblePhotoCount: 5,
      
      // 推荐功能
      recentTrip: null,
      isDragging: false,
      dragStartX: 0,
      dragStartProgress: 0,
    }
  },

  computed: {
    currentPhoto() {
      return this.filteredPhotos[this.currentIndex]
    },

    visiblePhotos() {
      if (this.filteredPhotos.length === 0) return []
      
      const photos = []
      const total = this.filteredPhotos.length
      const half = Math.floor(this.visiblePhotoCount / 2)
      
      for (let i = 0; i < this.visiblePhotoCount; i++) {
        let index = (this.currentIndex - half + i + total) % total
        photos.push(this.filteredPhotos[index])
      }
      
      return photos
    },

    progressPercentage() {
      if (this.filteredPhotos.length <= 1) return 0
      return (this.currentIndex / (this.filteredPhotos.length - 1)) * 100
    },

    hasActiveFilters() {
      return this.selectedTimeRange !== 'all' || 
             this.selectedCountry !== 'all' || 
             this.selectedRegion !== 'all' || 
             this.selectedCity !== 'all' ||
             this.selectedDistrict !== 'all' ||
             this.selectedNeighborhood !== 'all' ||
             this.selectedStreet !== 'all'
    }
  },

  watch: {
    currentIndex() {
      this.updateVisiblePhotos()
    }
  },

  mounted() {
    this.initializeAlbum()
    this.loadGoogleMapsAPI()
    // 添加全局事件监听
    window.addEventListener('mousemove', this.handleDrag)
    window.addEventListener('mouseup', this.stopDragging)
    window.addEventListener('touchmove', this.handleDrag)
    window.addEventListener('touchend', this.stopDragging)
  },

  beforeDestroy() {
    this.stopPlayback()
    // 移除全局事件监听
    window.removeEventListener('mousemove', this.handleDrag)
    window.removeEventListener('mouseup', this.stopDragging)
    window.removeEventListener('touchmove', this.handleDrag)
    window.removeEventListener('touchend', this.stopDragging)
  },

  methods: {
    // 初始化相册
    async initializeAlbum() {
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
          this.detectRecentTrip()
          this.applyFilters()
          // 延迟处理地址，避免阻塞UI
          setTimeout(() => this.processAllAddresses(), 1000)
        } else {
          this.error = response.data.message || 'Failed to fetch photos'
        }
      } catch (error) {
        console.error('Failed to fetch photos:', error)
        this.error = error.response?.data?.message || 'Network error, please check connection'
      } finally {
        this.loading = false
      }
    },

    // 加载Google Maps API
    loadGoogleMapsAPI() {
      if (window.google && window.google.maps) {
        return
      }

      const script = document.createElement('script')
      // 使用环境变量或默认的API key
      const apiKey = process.env.VUE_APP_GOOGLE_MAPS_API_KEY

      if (!apiKey) {
        console.error('Google Maps API key not found in environment variables')
        return
      }

      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`
      script.async = true
      script.defer = true
              script.onerror = () => {
          console.warn('Google Maps API loading failed, address resolution will be unavailable')
        }
      document.head.appendChild(script)
    },

    // 转换照片数据
    transformPhotosData(photos) {
      return photos.map(photo => {
        const gpsData = this.parseGpsData(photo.gps_data || photo.gpsData)
        
        return {
          id: photo.id,
          path: photo.path,
          date: photo.gps_time || photo.gpsTime || photo.created_time || photo.uploadTime,
          description: `Photo ${photo.id}`,
          // GPS相关
          latitude: gpsData?.latitude,
          longitude: gpsData?.longitude,
          coordinates: gpsData ? `${gpsData.latitude.toFixed(4)}, ${gpsData.longitude.toFixed(4)}` : null,
          // 地址相关
          fullAddress: null,
          country: null,
          region: null,
          city: null,
          district: null,
          neighborhood: null,
          street: null,
          addressLoading: false
        }
      }).sort((a, b) => new Date(a.date) - new Date(b.date))
    },

    // 获取图片URL
    getImageUrl(path) {
      if (!path) return this.getDefaultImage()
      if (path.startsWith('http')) return path
      
      const cleanPath = path.startsWith('/') ? path.substring(1) : path
      return `${axios.defaults.baseURL}/upload/${cleanPath}`
    },

    // 解析GPS数据
    parseGpsData(gpsData) {
      if (!gpsData) return null
      
      try {
        let parsed = gpsData
        if (typeof gpsData === 'string') {
          parsed = JSON.parse(gpsData)
        }
        
        if (parsed && typeof parsed === 'object' && parsed.latitude && parsed.longitude) {
          return {
            latitude: parseFloat(parsed.latitude),
            longitude: parseFloat(parsed.longitude)
          }
        }
              } catch (e) {
          console.warn('GPS data parsing failed:', e)
        }
      return null
    },

    // 批量处理所有地址
    async processAllAddresses() {
      if (!window.google || !window.google.maps) {
        console.warn('Google Maps API not loaded, skipping address resolution')
        this.buildLocationHierarchy()
        return
      }

      const photosWithGPS = this.allPhotos.filter(photo => photo.latitude && photo.longitude)
      
      for (const photo of photosWithGPS) {
        await this.resolvePhotoAddress(photo)
        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      this.buildLocationHierarchy()
    },

    // 解析单张照片的地址
    async resolvePhotoAddress(photo) {
      if (!photo.latitude || !photo.longitude) return
      
      if (!window.google || !window.google.maps) return
      
      const cacheKey = `${photo.latitude.toFixed(6)},${photo.longitude.toFixed(6)}`
      
      // 检查缓存
      if (this.addressCache.has(cacheKey)) {
        const cachedAddress = this.addressCache.get(cacheKey)
        this.applyAddressToPhoto(photo, cachedAddress)
        return
      }

      photo.addressLoading = true
      this.processingAddresses++

      try {
        const address = await this.reverseGeocode(photo.latitude, photo.longitude)
        
        // 缓存结果
        this.addressCache.set(cacheKey, address)
        this.applyAddressToPhoto(photo, address)
        
              } catch (error) {
          console.warn('Address resolution failed:', error)
        } finally {
        photo.addressLoading = false
        this.processingAddresses--
      }
    },

    // Google Maps反向地理编码
    async reverseGeocode(lat, lng) {
      return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
          reject(new Error('Google Maps API not loaded'))
          return
        }

        const geocoder = new google.maps.Geocoder()
        const latlng = { lat: parseFloat(lat), lng: parseFloat(lng) }

        geocoder.geocode({ location: latlng }, (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            const result = results[0]
            const addressComponents = result.address_components
            
            // 添加调试日志查看实际地址组件结构
            console.log('Address Components for:', result.formatted_address)
            addressComponents.forEach((comp, index) => {
              console.log(`${index}: ${comp.long_name} - Types: [${comp.types.join(', ')}]`)
            })
            
            // 特殊处理您的地址进行调试
            if (result.formatted_address.includes('Harland Square') || result.formatted_address.includes('Woodhouse')) {
              console.log('🔍 DEBUGGING YOUR ADDRESS:', result.formatted_address)
              console.log('📍 All components:')
              addressComponents.forEach((comp, index) => {
                console.log(`  [${index}] "${comp.long_name}" -> ${comp.types.join(', ')}`)
              })
            }
            
            // 智能地址解析 - 根据国家调整层级映射
            const country = this.extractAddressComponent(addressComponents, 'country')
            const isUK = country && (country.includes('Kingdom') || country.includes('UK') || country.includes('England') || country.includes('Scotland') || country.includes('Wales'))
            
            let address = {
              fullAddress: result.formatted_address,
              country: country,
              // 英国地址特殊处理 - Region层级
              region: isUK ? 
                (this.extractAddressComponent(addressComponents, 'administrative_area_level_1') || // West Yorkshire
                 this.extractAddressComponent(addressComponents, 'administrative_area_level_2')) :
                this.extractAddressComponent(addressComponents, 'administrative_area_level_1'),
              // City层级 - 主要城市
              city: this.extractAddressComponent(addressComponents, 'locality') || 
                     this.extractAddressComponent(addressComponents, 'postal_town') ||
                     this.extractAddressComponent(addressComponents, 'administrative_area_level_3'),
              // District层级 - 可能是市政区或更大的行政区
              district: this.extractAddressComponent(addressComponents, 'administrative_area_level_2') ||
                       this.extractAddressComponent(addressComponents, 'administrative_area_level_3') ||
                       this.extractAddressComponent(addressComponents, 'sublocality_level_1'),
              // Neighborhood层级 - 社区/地区名称（如Woodhouse）
              neighborhood: this.extractNeighborhoodFromFormattedAddress(result.formatted_address) ||
                           this.extractAddressComponent(addressComponents, 'sublocality_level_1') ||
                           this.extractAddressComponent(addressComponents, 'neighborhood') ||
                           this.extractAddressComponent(addressComponents, 'sublocality_level_2') ||
                           this.extractAddressComponent(addressComponents, 'sublocality') ||
                           this.extractMultipleAddressComponents(addressComponents, ['sublocality', 'political']),
              // Street层级 - 具体街道（如Harland Square）
              street: this.extractAddressComponent(addressComponents, 'route') ||
                     this.extractStreetFromFormattedAddress(result.formatted_address)
            }
            
            // 英国地址后处理：确保层级关系正确
            if (isUK) {
              address = this.postProcessUKAddress(address, addressComponents)
            }
            
            console.log('Parsed Address:', address)
            resolve(address)
          } else {
            reject(new Error(`Geocoding failed: ${status}`))
          }
        })
      })
    },

    // 提取地址组件
    extractAddressComponent(components, type) {
      const component = components.find(comp => comp.types.includes(type))
      return component ? component.long_name : null
    },

    // 提取包含多个类型的地址组件
    extractMultipleAddressComponents(components, types) {
      const component = components.find(comp => 
        types.every(type => comp.types.includes(type))
      )
      return component ? component.long_name : null
    },

    // 从route信息中提取neighborhood信息
    getNeighborhoodFromRoute(components) {
      // 查找route类型的组件，这可能包含街道或地区名称
      const routeComponent = components.find(comp => comp.types.includes('route'))
      if (routeComponent) {
        // 对于英国地址，如果route包含常见的地区词汇，可能是neighborhood
        const routeName = routeComponent.long_name
        if (this.isLikelyNeighborhood(routeName)) {
          return routeName
        }
      }
      
      // 查找premise或establishment类型
      const premiseComponent = components.find(comp => 
        comp.types.includes('establishment') || comp.types.includes('premise')
      )
      if (premiseComponent && premiseComponent.long_name !== components[0]?.long_name) {
        return premiseComponent.long_name
      }
      
      return null
    },

    // 判断是否可能是neighborhood名称
    isLikelyNeighborhood(name) {
      // 英国常见的地区名称模式
      const neighborhoodPatterns = [
        /.*\s(Green|Park|Hill|Common|Heath|Wood|Field|Vale|Grove|Gardens?)$/i,
        /^(Old|New|Upper|Lower|North|South|East|West)\s/i,
        /.*\s(Street|Road|Lane|Avenue|Close|Square|Place|Way|Drive|Court|Crescent)$/i
      ]
      
      // 如果名称匹配这些模式，可能是neighborhood而不是具体街道
      return neighborhoodPatterns.some(pattern => pattern.test(name)) && 
             name.length > 3 && name.length < 50
    },

    // 从格式化地址中提取neighborhood（英国特殊处理）
    extractNeighborhoodFromFormattedAddress(formattedAddress) {
      // 英国地址格式通常是：街道号 + 街道名, 地区名, 城市名 邮编, 国家
      // 例如：42 Harland Square, Woodhouse, Leeds LS2 9EB, UK
      
      if (!formattedAddress) return null
      
      const parts = formattedAddress.split(',').map(part => part.trim())
      
      // 如果地址有至少4个部分（街道，地区，城市，国家），第二个部分可能是neighborhood
      if (parts.length >= 4) {
        const potentialNeighborhood = parts[1]
        
        // 验证这个部分不是邮编或其他明显不是neighborhood的内容
        if (potentialNeighborhood && 
            !this.isPostalCode(potentialNeighborhood) && 
            !this.isCity(potentialNeighborhood) &&
            potentialNeighborhood.length > 2 && 
            potentialNeighborhood.length < 30) {
          return potentialNeighborhood
        }
      }
      
      // 如果有3个部分，检查是否中间的是neighborhood
      if (parts.length === 3) {
        const potentialNeighborhood = parts[1]
        const lastPart = parts[2]
        
        // 如果最后一部分包含国家代码，中间部分可能是neighborhood
        if (lastPart.includes('UK') || lastPart.includes('United Kingdom')) {
          const addressBeforeCountry = lastPart.replace(/,?\s*(UK|United Kingdom).*$/i, '').trim()
          const subParts = addressBeforeCountry.split(' ')
          
          // 如果有多个词，第一个可能是neighborhood，其余是城市+邮编
          if (subParts.length > 2) {
            return potentialNeighborhood
          }
        }
      }
      
      return null
    },

    // 从格式化地址中提取街道
    extractStreetFromFormattedAddress(formattedAddress) {
      // 从完整地址中提取第一部分作为街道地址
      // 例如：42 Harland Square, Woodhouse, Leeds LS2 9EB, UK -> 42 Harland Square
      
      if (!formattedAddress) return null
      
      const parts = formattedAddress.split(',').map(part => part.trim())
      
      if (parts.length > 0) {
        const streetPart = parts[0]
        
        // 验证这是一个有效的街道地址（包含数字或常见街道词汇）
        if (streetPart && 
            (streetPart.match(/\d/) || // 包含数字
             streetPart.match(/\b(street|road|avenue|lane|square|place|drive|court|crescent|way|close|gardens?|park|hill|green|common|heath|wood|field|vale|grove)\b/i))) {
          return streetPart
        }
      }
      
      return null
    },

    // 判断是否是邮编
    isPostalCode(text) {
      // 英国邮编格式检查
      const ukPostalPattern = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i
      return ukPostalPattern.test(text.replace(/\s+/g, ' ').trim())
    },

    // 判断是否是已知城市
    isCity(text) {
      const commonUKCities = [
        'London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 'Sheffield', 
        'Bristol', 'Edinburgh', 'Glasgow', 'Cardiff', 'Belfast', 'Newcastle',
        'Nottingham', 'Leicester', 'Coventry', 'Bradford', 'Stoke-on-Trent',
        'Wolverhampton', 'Plymouth', 'Southampton', 'Reading', 'Derby',
        'Aberdeen', 'Brighton', 'Hull', 'Swansea', 'Oxford', 'Cambridge'
      ]
      return commonUKCities.some(city => 
        text.toLowerCase().includes(city.toLowerCase())
      )
    },

    // 英国地址后处理 - 确保正确的层级关系
    postProcessUKAddress(address, addressComponents) {
      // 英国地址层级映射表
      const ukHierarchy = {
        'West Yorkshire': ['Leeds', 'Bradford', 'Wakefield', 'Kirklees', 'Calderdale'],
        'Greater Manchester': ['Manchester', 'Bolton', 'Bury', 'Oldham', 'Rochdale', 'Salford', 'Stockport', 'Tameside', 'Trafford', 'Wigan'],
        'South Yorkshire': ['Sheffield', 'Barnsley', 'Doncaster', 'Rotherham'],
        'North Yorkshire': ['York', 'Harrogate', 'Scarborough', 'Selby'],
        'Greater London': ['London', 'Westminster', 'Camden', 'Islington', 'Hackney', 'Tower Hamlets', 'Greenwich', 'Lewisham'],
        'West Midlands': ['Birmingham', 'Coventry', 'Dudley', 'Sandwell', 'Solihull', 'Walsall', 'Wolverhampton'],
        'Merseyside': ['Liverpool', 'Knowsley', 'St Helens', 'Sefton', 'Wirral'],
        'Tyne and Wear': ['Newcastle', 'Gateshead', 'North Tyneside', 'South Tyneside', 'Sunderland']
      }

      // 如果有城市但没有正确的region，尝试从层级表中查找
      if (address.city && (!address.region || address.region === address.city)) {
        for (const [county, cities] of Object.entries(ukHierarchy)) {
          if (cities.some(city => 
            address.city.toLowerCase().includes(city.toLowerCase()) ||
            city.toLowerCase().includes(address.city.toLowerCase())
          )) {
            address.region = county
            console.log(`✅ Fixed UK hierarchy: ${address.city} → ${county}`)
            break
          }
        }
      }

      // 如果district被错误地赋值为neighborhood类型的地址，重新分配
      if (address.district && address.neighborhood && address.district === address.neighborhood) {
        // 如果district和neighborhood相同，可能district字段被错误赋值
        // 保留neighborhood，清空district或寻找更合适的district
        address.district = null
        console.log(`⚠️ Cleared duplicate district/neighborhood: ${address.neighborhood}`)
      }

      // 验证neighborhood不应该与city相同
      if (address.neighborhood && address.city && address.neighborhood === address.city) {
        address.neighborhood = null
        console.log(`⚠️ Removed duplicate neighborhood/city: ${address.city}`)
      }

      // 特殊处理：根据您的地址示例调整
      // 42 Harland Square, Woodhouse, Leeds LS2 9EB, UK
      // 正确层级应该是：
      // Region: West Yorkshire
      // City: Leeds  
      // District: (可能为空或Leeds的区域)
      // Neighborhood: Woodhouse
      // Street: 42 Harland Square

      return address
    },

    // 应用地址到照片
    applyAddressToPhoto(photo, address) {
      photo.fullAddress = address.fullAddress
      photo.country = address.country
      photo.region = address.region
      photo.city = address.city
      photo.district = address.district
      photo.neighborhood = address.neighborhood
      photo.street = address.street
    },

    // 构建位置层级结构
    buildLocationHierarchy() {
      const countries = new Set()
      const regions = new Set()
      const cities = new Set()
      const districts = new Set()
      const neighborhoods = new Set()
      const streets = new Set()

      this.allPhotos.forEach(photo => {
        if (photo.country) countries.add(photo.country)
        if (photo.region && (this.selectedCountry === 'all' || photo.country === this.selectedCountry)) {
          regions.add(photo.region)
        }
        if (photo.city && (this.selectedRegion === 'all' || photo.region === this.selectedRegion)) {
          cities.add(photo.city)
        }
        if (photo.district && (this.selectedCity === 'all' || photo.city === this.selectedCity)) {
          districts.add(photo.district)
        }
        if (photo.neighborhood && (this.selectedDistrict === 'all' || photo.district === this.selectedDistrict)) {
          neighborhoods.add(photo.neighborhood)
        }
        if (photo.street && (this.selectedNeighborhood === 'all' || photo.neighborhood === this.selectedNeighborhood)) {
          streets.add(photo.street)
        }
      })

      this.availableCountries = Array.from(countries).sort()
      this.availableRegions = Array.from(regions).sort()
      this.availableCities = Array.from(cities).sort()
      this.availableDistricts = Array.from(districts).sort()
      this.availableNeighborhoods = Array.from(neighborhoods).sort()
      this.availableStreets = Array.from(streets).sort()
    },

    // 检测最近旅行
    detectRecentTrip() {
      if (this.allPhotos.length === 0) return

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      // 获取最近30天的照片
      const recentPhotos = this.allPhotos.filter(photo => {
        const photoDate = new Date(photo.date)
        return photoDate >= thirtyDaysAgo
      })

      if (recentPhotos.length === 0) return

      // 按地点分组（假设用户居住在当前最多照片的城市）
      const locationGroups = {}
      recentPhotos.forEach(photo => {
        if (photo.city) {
          const key = photo.city
          if (!locationGroups[key]) {
            locationGroups[key] = {
              location: photo.city,
              photos: [],
              startDate: photo.date,
              endDate: photo.date
            }
          }
          locationGroups[key].photos.push(photo)
          
          // 更新日期范围
          if (new Date(photo.date) < new Date(locationGroups[key].startDate)) {
            locationGroups[key].startDate = photo.date
          }
          if (new Date(photo.date) > new Date(locationGroups[key].endDate)) {
            locationGroups[key].endDate = photo.date
          }
        }
      })

      // 找到照片最多的地点作为旅行
      let mostPhotosTrip = null
      let maxPhotos = 0

      Object.values(locationGroups).forEach(group => {
        if (group.photos.length > maxPhotos && group.photos.length >= 3) {
          maxPhotos = group.photos.length
          mostPhotosTrip = {
            location: group.location,
            photoCount: group.photos.length,
            startDate: group.startDate,
            endDate: group.endDate,
            photos: group.photos
          }
        }
      })

      this.recentTrip = mostPhotosTrip
    },

    // 应用筛选
    applyFilters() {
      let filtered = [...this.allPhotos]

      // 时间筛选
      if (this.selectedTimeRange !== 'all') {
        filtered = this.filterByTimeRange(filtered, this.selectedTimeRange)
      }

      // 地址筛选
      if (this.selectedCountry !== 'all') {
        filtered = filtered.filter(photo => photo.country === this.selectedCountry)
      }
      if (this.selectedRegion !== 'all') {
        filtered = filtered.filter(photo => photo.region === this.selectedRegion)
      }
      if (this.selectedCity !== 'all') {
        filtered = filtered.filter(photo => photo.city === this.selectedCity)
      }
      if (this.selectedDistrict !== 'all') {
        filtered = filtered.filter(photo => photo.district === this.selectedDistrict)
      }
      if (this.selectedNeighborhood !== 'all') {
        filtered = filtered.filter(photo => photo.neighborhood === this.selectedNeighborhood)
      }
      if (this.selectedStreet !== 'all') {
        filtered = filtered.filter(photo => photo.street === this.selectedStreet)
      }

      this.filteredPhotos = filtered
      this.currentIndex = 0
      this.stopPlayback()
    },

    // 按时间范围筛选
    filterByTimeRange(photos, range) {
      const now = new Date()
      
      switch (range) {
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
        case 'custom':
          if (this.customStartDate && this.customEndDate) {
            const start = new Date(this.customStartDate)
            const end = new Date(this.customEndDate)
            end.setHours(23, 59, 59, 999)
            return photos.filter(photo => {
              const photoDate = new Date(photo.date)
              return photoDate >= start && photoDate <= end
            })
          }
          return photos
        default:
          return photos
      }
    },

    // 获取卡片样式类
    getCardClass(index) {
      const half = Math.floor(this.visiblePhotoCount / 2)
      const position = index - half
      
      return {
        'center': position === 0,
        'left-1': position === -1,
        'left-2': position === -2,
        'right-1': position === 1,
        'right-2': position === 2,
        'hidden': Math.abs(position) > 2
      }
    },

    // 获取卡片样式
    getCardStyle(index) {
      const half = Math.floor(this.visiblePhotoCount / 2)
      const position = index - half
      
      const baseStyle = {
        zIndex: 100 - Math.abs(position),
        opacity: Math.abs(position) > 2 ? 0 : 1 - Math.abs(position) * 0.2
      }

      switch (position) {
        case 0:
          return {
            ...baseStyle,
            transform: 'translateX(0) translateZ(100px) scale(1.1)',
            zIndex: 200
          }
        case -1:
          return {
            ...baseStyle,
            transform: 'translateX(-200px) translateZ(0px) scale(0.9) rotateY(25deg)'
          }
        case 1:
          return {
            ...baseStyle,
            transform: 'translateX(200px) translateZ(0px) scale(0.9) rotateY(-25deg)'
          }
        case -2:
          return {
            ...baseStyle,
            transform: 'translateX(-350px) translateZ(-50px) scale(0.75) rotateY(45deg)'
          }
        case 2:
          return {
            ...baseStyle,
            transform: 'translateX(350px) translateZ(-50px) scale(0.75) rotateY(-45deg)'
          }
        default:
          return {
            ...baseStyle,
            transform: 'scale(0)',
            opacity: 0
          }
      }
    },

    // 选择照片
    selectPhoto(index) {
      const half = Math.floor(this.visiblePhotoCount / 2)
      const position = index - half
      
      if (position !== 0) {
        this.currentIndex = (this.currentIndex + position + this.filteredPhotos.length) % this.filteredPhotos.length
      }
    },

    // 播放控制
    togglePlayback() {
      if (this.isPlaying) {
        this.stopPlayback()
      } else {
        this.startPlayback()
      }
    },

    startPlayback() {
      if (this.filteredPhotos.length <= 1) return
      
      this.isPlaying = true
      this.playbackTimer = setInterval(() => {
        this.nextPhoto()
      }, this.playbackSpeed)
    },

    stopPlayback() {
      this.isPlaying = false
      if (this.playbackTimer) {
        clearInterval(this.playbackTimer)
        this.playbackTimer = null
      }
    },

    updatePlaybackSpeed() {
      if (this.isPlaying) {
        this.stopPlayback()
        this.startPlayback()
      }
    },

    nextPhoto() {
      if (this.filteredPhotos.length > 0) {
        this.currentIndex = (this.currentIndex + 1) % this.filteredPhotos.length
      }
    },

    previousPhoto() {
      if (this.filteredPhotos.length > 0) {
        this.currentIndex = (this.currentIndex - 1 + this.filteredPhotos.length) % this.filteredPhotos.length
      }
    },

    updateVisiblePhotos() {
      this.$nextTick(() => {
        // 触发重新渲染3D效果
      })
    },

    // 筛选相关方法
    onCountryChange() {
      this.selectedRegion = 'all'
      this.selectedCity = 'all'
      this.selectedDistrict = 'all'
      this.selectedNeighborhood = 'all'
      this.selectedStreet = 'all'
      this.buildLocationHierarchy()
      this.applyFilters()
    },

    onRegionChange() {
      this.selectedCity = 'all'
      this.selectedDistrict = 'all'
      this.selectedNeighborhood = 'all'
      this.selectedStreet = 'all'
      this.buildLocationHierarchy()
      this.applyFilters()
    },

    onCityChange() {
      this.selectedDistrict = 'all'
      this.selectedNeighborhood = 'all'
      this.selectedStreet = 'all'
      this.buildLocationHierarchy()
      this.applyFilters()
    },

    onDistrictChange() {
      this.selectedNeighborhood = 'all'
      this.selectedStreet = 'all'
      this.buildLocationHierarchy()
      this.applyFilters()
    },

    onNeighborhoodChange() {
      this.selectedStreet = 'all'
      this.buildLocationHierarchy()
      this.applyFilters()
    },

    toggleFilters() {
      this.showFilters = !this.showFilters
    },

    clearFilters() {
      this.selectedTimeRange = 'all'
      this.selectedCountry = 'all'
      this.selectedRegion = 'all'
      this.selectedCity = 'all'
      this.selectedDistrict = 'all'
      this.selectedNeighborhood = 'all'
      this.selectedStreet = 'all'
      this.customStartDate = ''
      this.customEndDate = ''
      this.buildLocationHierarchy()
      this.applyFilters()
    },

    // 推荐功能
    viewRecentTrip() {
      if (!this.recentTrip) return
      
      this.selectedCountry = 'all'
      this.selectedRegion = 'all'
      this.selectedCity = this.recentTrip.location
      this.selectedDistrict = 'all'
      this.selectedNeighborhood = 'all'
      this.selectedStreet = 'all'
      this.applyFilters()
      this.recentTrip = null
    },

    // 工具方法
    retryLoad() {
      this.initializeAlbum()
    },

    goBack() {
      this.$router.push('/userMain')
    },

    getDefaultImage() {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzZjNzU3ZCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Image Load Failed</text></svg>'
    },

    handleImageError(event) {
      event.target.src = this.getDefaultImage()
    },

    handleImageLoad(event) {
      event.target.style.opacity = '1'
    },

    formatDate(dateString) {
      const date = new Date(dateString)
      return `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日`
    },

    formatDateTime(dateString) {
      const date = new Date(dateString)
      return `${this.formatDate(dateString)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    },

    formatDateRange(startDate, endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (start.toDateString() === end.toDateString()) {
        return this.formatDate(startDate)
      } else {
        return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`
      }
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

    // 处理进度条点击
    handleProgressBarClick(event) {
      if (this.filteredPhotos.length <= 1) return
      
      const progressBar = this.$refs.progressBar
      const rect = progressBar.getBoundingClientRect()
      const x = event.clientX - rect.left
      const percentage = (x / rect.width) * 100
      const newIndex = Math.round((percentage / 100) * (this.filteredPhotos.length - 1))
      
      this.currentIndex = Math.max(0, Math.min(newIndex, this.filteredPhotos.length - 1))
    },

    // 开始拖动
    startDragging(event) {
      if (this.filteredPhotos.length <= 1) return
      
      this.isDragging = true
      this.dragStartX = event.type.includes('mouse') ? event.clientX : event.touches[0].clientX
      this.dragStartProgress = this.progressPercentage
      
      // 停止自动播放
      if (this.isPlaying) {
        this.stopPlayback()
      }
      
      event.preventDefault()
    },

    // 处理拖动
    handleDrag(event) {
      if (!this.isDragging) return
      
      const progressBar = this.$refs.progressBar
      if (!progressBar) return
      
      const rect = progressBar.getBoundingClientRect()
      const currentX = event.type.includes('mouse') ? event.clientX : event.touches[0].clientX
      const deltaX = currentX - this.dragStartX
      const deltaPercentage = (deltaX / rect.width) * 100
      
      let newPercentage = this.dragStartProgress + deltaPercentage
      newPercentage = Math.max(0, Math.min(newPercentage, 100))
      
      const newIndex = Math.round((newPercentage / 100) * (this.filteredPhotos.length - 1))
      this.currentIndex = Math.max(0, Math.min(newIndex, this.filteredPhotos.length - 1))
      
      event.preventDefault()
    },

    // 停止拖动
    stopDragging() {
      this.isDragging = false
    },
  }
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.album-view-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
  overflow-x: hidden;
}

/* 顶部导航 */
.album-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
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
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.back-button:hover {
  background: #e0e0e0;
  transform: translateX(-3px);
}

.back-icon {
  font-size: 18px;
}

.page-title {
  font-size: 28px;
  color: #333;
  font-weight: 600;
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.filter-toggle:hover, .filter-toggle.active {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

/* 推荐横幅 */
.recommendation-banner {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  color: white;
  padding: 20px 30px;
  margin: 0 20px 20px;
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
}

.recommendation-banner:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.banner-icon {
  font-size: 32px;
  background: rgba(255, 255, 255, 0.2);
  padding: 15px;
  border-radius: 50%;
}

.banner-info {
  flex: 1;
}

.banner-info h3 {
  font-size: 18px;
  margin-bottom: 5px;
  font-weight: 600;
}

.banner-info p {
  opacity: 0.9;
  font-size: 14px;
}

.banner-action {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.arrow {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.recommendation-banner:hover .arrow {
  transform: translateX(5px);
}

/* 筛选面板 */
.filter-panel {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e0e0e0;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.filter-panel.visible {
  max-height: 300px;
}

.filter-content {
  padding: 20px 30px;
  display: flex;
  gap: 30px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 200px;
}

.filter-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.filter-options, .location-filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.custom-date-range {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 8px;
}

.custom-date-range span {
  color: #666;
  font-size: 14px;
}

select, input {
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
  background: white;
}

select:focus, input:focus {
  outline: none;
  border-color: #667eea;
}

select:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.filter-stats {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
}

.photo-count {
  color: #333;
  font-weight: 500;
  font-size: 16px;
}

.processing-status {
  color: #ff9800;
  font-style: italic;
  font-size: 14px;
}

.clear-filters-btn {
  padding: 8px 16px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.clear-filters-btn:hover {
  background: #ff5252;
  transform: scale(1.05);
}

/* 主内容区域 */
.main-content {
  padding: 40px 20px;
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 状态显示 */
.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 60px 40px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(102, 126, 234, 0.2);
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon, .empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.error-state h3, .empty-state h3 {
  font-size: 24px;
  color: #333;
  margin-bottom: 15px;
}

.error-state p, .empty-state p {
  color: #666;
  font-size: 16px;
  margin-bottom: 20px;
}

.retry-btn {
  padding: 12px 30px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 16px;
}

.retry-btn:hover {
  background: #5a6fd8;
  transform: scale(1.05);
}

/* 轮播图区域 */
.carousel-section {
  width: 100%;
  max-width: 1200px;
  text-align: center;
}

/* 3D画廊 */
.gallery-3d {
  height: 500px;
  position: relative;
  perspective: 1500px;
  margin-bottom: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-card {
  position: absolute;
  width: 350px;
  height: 400px;
  transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: pointer;
  transform-style: preserve-3d;
}

.photo-wrapper {
  width: 100%;
  height: 100%;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  background: white;
  position: relative;
  transform-style: preserve-3d;
}

.photo-card:hover .photo-wrapper {
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
}

.photo-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: white;
  padding: 20px;
  text-align: left;
}

.photo-info {
  margin-bottom: 10px;
}

.photo-date {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 5px;
}

.photo-location, .photo-coordinates {
  font-size: 12px;
  opacity: 0.9;
  max-width: 280px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.photo-address-details {
  font-size: 10px;
  opacity: 0.8;
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.address-neighborhood, .address-district {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
}

.address-hierarchy {
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
  font-size: 9px;
}

/* 地址加载状态 */
.address-loading {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 控制台 */
.control-panel {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

/* 当前照片信息 */
.current-photo-info {
  margin-bottom: 25px;
}

.current-photo-info h3 {
  font-size: 24px;
  color: #333;
  margin-bottom: 15px;
  font-weight: 600;
}

.photo-details {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
  color: #666;
  font-size: 14px;
}

.photo-index {
  font-weight: 600;
  color: #667eea;
}

.photo-address {
  max-width: 300px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

/* 播放控制 */
.playback-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.control-btn, .play-pause-btn {
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-pause-btn {
  width: 60px;
  height: 60px;
  font-size: 22px;
}

.control-btn:hover, .play-pause-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 20px;
}

.speed-control label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

/* 进度条 */
.progress-bar {
  position: relative;
  height: 6px;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 3px;
  overflow: visible;
  cursor: pointer;
  margin: 10px 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
  border-radius: 3px;
}

.progress-indicator {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  background: white;
  border: 2px solid #667eea;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transform: translate(-50%, -50%);
  cursor: grab;
  transition: transform 0.2s ease;
  z-index: 10;
}

.progress-indicator:hover {
  transform: translate(-50%, -50%) scale(1.2);
}

.progress-indicator:active {
  cursor: grabbing;
  transform: translate(-50%, -50%) scale(1.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .album-header {
    padding: 15px 20px;
    flex-direction: column;
    gap: 15px;
  }

  .page-title {
    font-size: 22px;
  }

  .filter-content {
    padding: 15px 20px;
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .filter-stats {
    margin-left: 0;
    align-items: stretch;
  }

  .photo-card {
    width: 280px;
    height: 320px;
  }

  .gallery-3d {
    height: 350px;
  }

  .control-panel {
    padding: 20px;
  }

  .playback-controls {
    gap: 15px;
  }

  .speed-control {
    margin-left: 0;
    margin-top: 15px;
  }

  .photo-details {
    flex-direction: column;
    gap: 8px;
  }

  .banner-content {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding: 20px 10px;
  }

  .photo-card {
    width: 220px;
    height: 260px;
  }

  .gallery-3d {
    height: 280px;
  }

  .control-btn, .play-pause-btn {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .play-pause-btn {
    width: 50px;
    height: 50px;
    font-size: 18px;
  }

  .current-photo-info h3 {
    font-size: 20px;
  }

  .photo-details {
    font-size: 13px;
  }
}

/* 3D卡片位置类 */
.photo-card.center {
  z-index: 200;
}

.photo-card.left-1, .photo-card.right-1 {
  z-index: 150;
}

.photo-card.left-2, .photo-card.right-2 {
  z-index: 100;
}

.photo-card.hidden {
  opacity: 0;
  pointer-events: none;
}
</style>

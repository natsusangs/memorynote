<template>
  <div class="route-view-container">
    <!-- Top Navigation -->
    <header class="route-header">
      <div class="header-left">
        <button class="back-button" @click="goBack">
          <span class="back-icon">←</span>
          <span>Back</span>
        </button>
        <h1 class="page-title">🚗 Daily Route View</h1>
      </div>
      
      <div class="header-controls">
        <div class="date-selector">
          <label>📅 Select Date:</label>
          <input 
            type="date" 
            v-model="selectedDate" 
            @change="loadDayRoute"
            :max="maxDate"
            class="date-input"
          />
        </div>
        <button class="route-options-btn" @click="toggleOptions" :class="{ active: showOptions }">
          <span>⚙️</span>
          Route Options
        </button>
      </div>
    </header>

    <!-- Route Options Panel -->
    <div class="options-panel" :class="{ visible: showOptions }">
      <div class="options-content">
        <div class="option-group">
          <label>🗺️ Map Style</label>
          <select v-model="mapStyle" @change="updateMapStyle">
            <option value="roadmap">Roadmap</option>
            <option value="satellite">Satellite</option>
            <option value="hybrid">Hybrid</option>
            <option value="terrain">Terrain</option>
          </select>
        </div>
        
        <div class="option-group">
          <label>📍 Display Options</label>
          <div class="checkbox-group">
            <label><input type="checkbox" v-model="showPhotoMarkers" @change="updateMapDisplay"> Show Photo Markers</label>
            <label><input type="checkbox" v-model="showRoutePolyline" @change="updateMapDisplay"> Show Route Lines</label>
            <label><input type="checkbox" v-model="showTimeLabels" @change="updateMapDisplay"> Show Time Labels</label>
            <label><input type="checkbox" v-model="showDistanceInfo" @change="updateMapDisplay"> Show Distance Info</label>
          </div>
        </div>

        <div class="option-group">
          <label>🎨 Route Style</label>
            <input type="color" v-model="routeColor" @change="updateRouteStyle" />
            <label>Line Width:</label>
            <input type="range" min="2" max="10" v-model="routeWidth" @change="updateRouteStyle" />
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <main class="main-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading route data...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <div class="error-icon">❌</div>
        <h3>Load Failed</h3>
        <p>{{ error }}</p>
        <button @click="retryLoad" class="retry-btn">Retry</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="!dayPhotos.length" class="empty-state">
        <div class="empty-icon">📷</div>
        <h3>No photos for this date</h3>
        <p>Please select another date or upload photos with GPS information</p>
        <button @click="selectTodayWithPhotos" class="select-date-btn">Select a date with photos</button>
      </div>

      <!-- Map and Photo Display -->
      <div v-else class="route-content">
        <!-- Map Container -->
        <div class="map-container">
          <div id="google-map" class="google-map"></div>
          
          <!-- Map Control Buttons -->
          <div class="map-controls">
            <button @click="fitMapToRoute" class="map-control-btn" title="Fit Map to Route">
              <span>🎯</span>
            </button>
            <button @click="toggleMapFullscreen" class="map-control-btn" title="Fullscreen">
              <span>⛶</span>
            </button>
          </div>

          <!-- Route Statistics -->
          <div class="route-stats">
            <div class="stat-item">
              <span class="stat-label">📷 Photo Count</span>
              <span class="stat-value">{{ dayPhotos.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">📏 Total Distance</span>
              <span class="stat-value">{{ formatDistance(totalDistance) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">⏱️ Time Span</span>
              <span class="stat-value">{{ formatTimeSpan() }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">🚶 Average Speed</span>
              <span class="stat-value">{{ formatSpeed() }}</span>
            </div>
          </div>
        </div>

        <!-- Photo Timeline -->
        <div class="photo-timeline">
          <div class="timeline-header">
            <h3>📸 Photo Timeline</h3>
            <div class="timeline-controls">
              <button @click="playTimeline" class="timeline-btn" :disabled="isPlaying">
                <span>▶️</span> Play Route
              </button>
              <button @click="pauseTimeline" class="timeline-btn" :disabled="!isPlaying">
                <span>⏸️</span> Pause
              </button>
              <button @click="resetTimeline" class="timeline-btn">
                <span>🔄</span> Reset
              </button>
            </div>
          </div>

          <div class="timeline-content">
            <!-- Horizontal Timeline -->
            <div class="timeline-horizontal">
              <div class="timeline-line"></div>
              <div 
                v-for="(photo, index) in dayPhotos" 
                :key="photo.id"
                class="timeline-item"
                :class="{ 
                  active: activePhotoIndex === index,
                  visited: index <= playbackIndex 
                }"
                :style="{ left: getTimelinePosition(index) + '%' }"
                @click="selectPhoto(index)"
              >
                <div class="timeline-dot">
                  <span class="photo-number">{{ index + 1 }}</span>
                </div>
                <div class="timeline-photo-card">
                  <img :src="getImageUrl(photo.path)" :alt="photo.description" />
                  <div class="photo-info">
                    <div class="photo-time">{{ formatTime(photo.date) }}</div>
                    <div v-if="photo.fullAddress" class="photo-location">
                      📍 {{ getShortAddress(photo.fullAddress) }}
                    </div>
                    <div v-else class="photo-coordinates">
                      🌐 {{ photo.latitude.toFixed(4) }}, {{ photo.longitude.toFixed(4) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'RouteView',
  
  data() {
    return {
      // Basic Data
      allPhotos: [],
      dayPhotos: [],
      selectedDate: '',
      maxDate: '',
      
      // State Management
      loading: false,
      error: null,
      
      // Map Related
      map: null,
      markers: [],
      polyline: null,
      infoWindow: null,
      
      // Map Options
      showOptions: false,
      mapStyle: 'roadmap',
      showPhotoMarkers: true,
      showRoutePolyline: true,
      showTimeLabels: true,
      showDistanceInfo: true,
      routeColor: '#4285f4',
      routeWidth: 4,
      
      // Route Statistics
      totalDistance: 0,
      
      // Timeline Playback
      isPlaying: false,
      playbackIndex: -1,
      activePhotoIndex: 0,
      playbackTimer: null,
      playbackSpeed: 2000, // 2 seconds per point
      
      // Address Resolution
      addressCache: new Map(),
    }
  },

  mounted() {
    this.initializeComponent()
  },

  beforeDestroy() {
    this.cleanup()
  },

  methods: {
    // Initialize Component
    async initializeComponent() {
      try {
        // Set default date to today
        const today = new Date()
        this.selectedDate = today.toISOString().split('T')[0]
        this.maxDate = this.selectedDate
        
        // Load photos data first
        await this.loadPhotosData()
        
        // Then load Google Maps API (async)
        this.loadGoogleMapsAPI().catch(error => {
          console.error('Google Maps API loading failed:', error)
          this.error = 'Google Maps API loading failed, some features may not work'
        })
        
        // Load day route (doesn't depend on map)
        await this.loadDayRoute()
        
      } catch (error) {
        console.error('Component initialization failed:', error)
        this.error = 'Initialization failed, please refresh the page and try again'
      }
    },

    // Load Google Maps API
    async loadGoogleMapsAPI() {
      if (window.google && window.google.maps) {
        // Delayed initialization to ensure DOM is rendered
        this.$nextTick(() => {
          this.initializeMap()
        })
        return
      }

      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        const apiKey = process.env.VUE_APP_GOOGLE_MAPS_API_KEY

        if (!apiKey) {
          console.error('Google Maps API key not found in environment variables')
          return
        }

        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`
        script.async = true
        script.defer = true
        
        script.onload = () => {
          // Delayed initialization to ensure DOM is rendered
          this.$nextTick(() => {
            this.initializeMap()
            resolve()
          })
        }
        
        script.onerror = () => {
          this.error = 'Google Maps API loading failed'
          reject(new Error('Google Maps API loading failed'))
        }
        
        document.head.appendChild(script)
      })
    },

    // Initialize Map
    initializeMap() {
      const mapElement = document.getElementById('google-map')
      
      if (!window.google || !window.google.maps) {
        console.error('Google Maps API not loaded')
        return
      }
      
      if (!mapElement) {
        console.error('Map container element not found, retrying...')
        // If element is not rendered yet, retry later
        setTimeout(() => {
          this.initializeMap()
        }, 500)
        return
      }

      try {
        this.map = new google.maps.Map(mapElement, {
          zoom: 13,
          center: { lat: 39.9042, lng: 116.4074 }, // Default Beijing
          mapTypeId: this.mapStyle,
          styles: this.getMapStyles(),
          zoomControl: true,
          streetViewControl: true,
          fullscreenControl: false,
          mapTypeControl: true
        })

        this.infoWindow = new google.maps.InfoWindow()
        console.log('Google Maps initialized successfully')
        
        // After map initialization, if there's photo data for the day, update map display immediately
        if (this.dayPhotos.length > 0) {
          this.$nextTick(() => {
            this.updateMapDisplay()
          })
        }
      } catch (error) {
        console.error('Map initialization failed:', error)
        this.error = 'Map initialization failed'
      }
    },

    // Load Photos Data
    async loadPhotosData() {
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
          // Batch process addresses
          setTimeout(() => this.processAllAddresses(), 1000)
        } else {
          this.error = response.data.message || 'Failed to get photos'
        }
      } catch (error) {
        console.error('Failed to get photos:', error)
        this.error = error.response?.data?.message || 'Network error, please check connection'
      } finally {
        this.loading = false
      }
    },

    // Transform Photos Data
    transformPhotosData(photos) {
      return photos.map(photo => {
        const gpsData = this.parseGpsData(photo.gps_data || photo.gpsData)
        
        return {
          id: photo.id,
          path: photo.path,
          date: photo.gps_time || photo.gpsTime || photo.created_time || photo.uploadTime,
          description: `Photo ${photo.id}`,
          latitude: gpsData?.latitude,
          longitude: gpsData?.longitude,
          fullAddress: null,
          addressLoading: false
        }
      }).filter(photo => photo.latitude && photo.longitude) // Only keep photos with GPS info
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    },

    // Parse GPS Data
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

    // Load Day Route
    async loadDayRoute() {
      if (!this.selectedDate) return

      this.loading = true
      this.error = null

      try {
        // Filter photos for selected date
        const selectedDay = new Date(this.selectedDate)
        this.dayPhotos = this.allPhotos.filter(photo => {
          const photoDate = new Date(photo.date)
          return this.isSameDay(photoDate, selectedDay)
        }).sort((a, b) => new Date(a.date) - new Date(b.date))

        if (this.dayPhotos.length === 0) {
          this.error = null // Don't show as error, but as empty state
          return
        }

        // Calculate route distance
        this.calculateRouteDistance()

        // Update map display
        this.updateMapDisplay()

        // Reset playback state
        this.resetTimeline()

      } catch (error) {
        console.error('Failed to load day route:', error)
        this.error = 'Failed to load route'
      } finally {
        this.loading = false
      }
    },

    // Batch Process Addresses
    async processAllAddresses() {
      if (!window.google || !window.google.maps) return

      const photosNeedingAddress = this.allPhotos.filter(photo => 
        photo.latitude && photo.longitude && !photo.fullAddress
      )

      for (const photo of photosNeedingAddress) {
        await this.resolvePhotoAddress(photo)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    },

    // Resolve Photo Address
    async resolvePhotoAddress(photo) {
      if (!photo.latitude || !photo.longitude) return
      
      const cacheKey = `${photo.latitude.toFixed(6)},${photo.longitude.toFixed(6)}`
      
      if (this.addressCache.has(cacheKey)) {
        photo.fullAddress = this.addressCache.get(cacheKey)
        return
      }

      photo.addressLoading = true

      try {
        const address = await this.reverseGeocode(photo.latitude, photo.longitude)
        photo.fullAddress = address
        this.addressCache.set(cacheKey, address)
      } catch (error) {
        console.warn('Address resolution failed:', error)
      } finally {
        photo.addressLoading = false
      }
    },

    // Reverse Geocoding
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
            resolve(results[0].formatted_address)
          } else {
            reject(new Error(`Geocoding failed: ${status}`))
          }
        })
      })
    },

    // Calculate Route Distance
    calculateRouteDistance() {
      if (this.dayPhotos.length < 2) {
        this.totalDistance = 0
        return
      }

      let totalDistance = 0
      for (let i = 1; i < this.dayPhotos.length; i++) {
        const prev = this.dayPhotos[i - 1]
        const curr = this.dayPhotos[i]
        
        const distance = this.calculateDistance(
          prev.latitude, prev.longitude,
          curr.latitude, curr.longitude
        )
        totalDistance += distance
      }
      
      this.totalDistance = totalDistance
    },

    // Calculate Distance Between Two Points (using Haversine formula)
    calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371 // Earth radius (kilometers)
      const dLat = this.toRad(lat2 - lat1)
      const dLon = this.toRad(lon2 - lon1)
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    },

    toRad(value) {
      return value * Math.PI / 180
    },

    // Update Map Display
    updateMapDisplay() {
      // Check if map is initialized
      if (!this.map) {
        console.log('Map not initialized yet, skipping map update')
        return
      }
      
      if (this.dayPhotos.length === 0) {
        console.log('No photos for today, skipping map update')
        return
      }

      // Clear existing markers and routes
      this.clearMapElements()

      // Add photo markers
      if (this.showPhotoMarkers) {
        this.addPhotoMarkers()
      }

      // Add route
      if (this.showRoutePolyline && this.dayPhotos.length > 1) {
        this.addRoutePolyline()
      }

      // Fit map view
      this.fitMapToRoute()
    },

    // Clear Map Elements
    clearMapElements() {
      // Clear markers
      this.markers.forEach(marker => marker.setMap(null))
      this.markers = []

      // Clear route
      if (this.polyline) {
        this.polyline.setMap(null)
        this.polyline = null
      }
    },

    // Add Photo Markers
    addPhotoMarkers() {
      this.dayPhotos.forEach((photo, index) => {
        const marker = new google.maps.Marker({
          position: { lat: photo.latitude, lng: photo.longitude },
          map: this.map,
          title: `Photo ${index + 1} - ${this.formatTime(photo.date)}`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="${this.routeColor}" stroke="white" stroke-width="2"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${index + 1}</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32)
          }
        })

        // Add click event
        marker.addListener('click', () => {
          this.selectPhoto(index)
          this.showPhotoInfo(photo, marker)
        })

        this.markers.push(marker)
      })
    },

    // Add Route
    addRoutePolyline() {
      const path = this.dayPhotos.map(photo => ({
        lat: photo.latitude,
        lng: photo.longitude
      }))

      this.polyline = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: this.routeColor,
        strokeOpacity: 1.0,
        strokeWeight: parseInt(this.routeWidth),
        map: this.map
      })
    },

    // Fit Map to Route
    fitMapToRoute() {
      if (!this.map || this.dayPhotos.length === 0) return

      const bounds = new google.maps.LatLngBounds()
      this.dayPhotos.forEach(photo => {
        bounds.extend({ lat: photo.latitude, lng: photo.longitude })
      })

      this.map.fitBounds(bounds)
      
      // If only one point, set appropriate zoom level
      if (this.dayPhotos.length === 1) {
        this.map.setZoom(15)
      }
    },

    // Show Photo Info
    showPhotoInfo(photo, marker) {
      const content = `
        <div class="photo-info-window">
          <img src="${this.getImageUrl(photo.path)}" alt="${photo.description}" style="width: 200px; height: 150px; object-fit: cover; border-radius: 8px;">
          <div style="margin-top: 10px;">
            <div><strong>Time:</strong> ${this.formatDateTime(photo.date)}</div>
            <div><strong>Location:</strong> ${photo.fullAddress || 'Resolving...'}</div>
            <div><strong>Coordinates:</strong> ${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}</div>
          </div>
        </div>
      `
      
      this.infoWindow.setContent(content)
      this.infoWindow.open(this.map, marker)
    },

    // Select Photo
    selectPhoto(index) {
      this.activePhotoIndex = index
      const photo = this.dayPhotos[index]
      
      // Only move map when map is initialized
      if (this.map) {
        // Move map to photo location
        this.map.panTo({ lat: photo.latitude, lng: photo.longitude })
        
        // Highlight corresponding marker
        this.highlightMarker(index)
      }
    },

    // Highlight Marker
    highlightMarker(index) {
      this.markers.forEach((marker, i) => {
        const isActive = i === index
        marker.setIcon({
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="${isActive ? '#ff4444' : this.routeColor}" stroke="white" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${i + 1}</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(isActive ? 40 : 32, isActive ? 40 : 32)
        })
      })
    },

    // Timeline Playback Control
    playTimeline() {
      if (this.dayPhotos.length === 0) return
      
      this.isPlaying = true
      this.playbackIndex = -1
      
      this.playbackTimer = setInterval(() => {
        this.playbackIndex++
        
        if (this.playbackIndex >= this.dayPhotos.length) {
          this.pauseTimeline()
          return
        }
        
        this.selectPhoto(this.playbackIndex)
      }, this.playbackSpeed)
    },

    pauseTimeline() {
      this.isPlaying = false
      if (this.playbackTimer) {
        clearInterval(this.playbackTimer)
        this.playbackTimer = null
      }
    },

    resetTimeline() {
      this.pauseTimeline()
      this.playbackIndex = -1
      this.activePhotoIndex = 0
      if (this.dayPhotos.length > 0) {
        this.selectPhoto(0)
      }
    },

    // Get Timeline Position
    getTimelinePosition(index) {
      if (this.dayPhotos.length <= 1) return 0
      return (index / (this.dayPhotos.length - 1)) * 100
    },

    // Select Date with Photos
    selectTodayWithPhotos() {
      if (this.allPhotos.length === 0) return
      
      // Find the most recent date with photos
      const photoDates = [...new Set(this.allPhotos.map(photo => 
        new Date(photo.date).toISOString().split('T')[0]
      ))].sort().reverse()
      
      if (photoDates.length > 0) {
        this.selectedDate = photoDates[0]
        this.loadDayRoute()
      }
    },

    // Map Style and Options
    updateMapStyle() {
      if (this.map) {
        this.map.setMapTypeId(this.mapStyle)
      }
    },

    updateRouteStyle() {
      if (this.polyline) {
        this.polyline.setOptions({
          strokeColor: this.routeColor,
          strokeWeight: parseInt(this.routeWidth)
        })
      }
      // Redraw markers
      if (this.showPhotoMarkers) {
        this.addPhotoMarkers()
      }
    },

    toggleOptions() {
      this.showOptions = !this.showOptions
    },

    toggleMapFullscreen() {
      const mapContainer = document.querySelector('.map-container')
      if (mapContainer) {
        if (!document.fullscreenElement) {
          mapContainer.requestFullscreen().catch(err => {
            console.log('Fullscreen mode not supported:', err)
          })
        } else {
          document.exitFullscreen()
        }
      }
    },

    // Formatting Functions
    formatDistance(km) {
      if (km < 1) {
        return `${Math.round(km * 1000)}m`
      }
      return `${km.toFixed(1)}km`
    },

    formatTimeSpan() {
      if (this.dayPhotos.length < 2) return 'N/A'
      
      const start = new Date(this.dayPhotos[0].date)
      const end = new Date(this.dayPhotos[this.dayPhotos.length - 1].date)
      const diff = end - start
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`
      }
      return `${minutes}m`
    },

    formatSpeed() {
      if (this.dayPhotos.length < 2 || this.totalDistance === 0) return 'N/A'
      
      const start = new Date(this.dayPhotos[0].date)
      const end = new Date(this.dayPhotos[this.dayPhotos.length - 1].date)
      const hours = (end - start) / (1000 * 60 * 60)
      
      if (hours === 0) return 'N/A'
      
      const speed = this.totalDistance / hours
      return `${speed.toFixed(1)}km/h`
    },

    formatTime(dateString) {
      const date = new Date(dateString)
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    },

    formatDateTime(dateString) {
      const date = new Date(dateString)
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${this.formatTime(dateString)}`
    },

    // Utility Functions
    getImageUrl(path) {
      if (!path) return this.getDefaultImage()
      if (path.startsWith('http')) return path
      
      const cleanPath = path.startsWith('/') ? path.substring(1) : path
      return `${axios.defaults.baseURL}/upload/${cleanPath}`
    },

    getDefaultImage() {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZjNzU3ZCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Image Load Failed</text></svg>'
    },

    getMapStyles() {
      // Can return custom map styles
      return []
    },

    isSameDay(date1, date2) {
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getDate() === date2.getDate()
    },

    // Cleanup Functions
    cleanup() {
      this.pauseTimeline()
      this.clearMapElements()
    },

    // Other Methods
    retryLoad() {
      this.loadDayRoute()
    },

    goBack() {
      this.$router.push('/userMain')
    },

    getShortAddress(fullAddress) {
      if (!fullAddress) return 'Unknown Location'
      const parts = fullAddress.split(',')
      return parts.length > 2 ? parts[0] + ', ' + parts[1] : fullAddress
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

.route-view-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
}

/* Top Navigation */
.route-header {
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

.page-title {
  font-size: 28px;
  color: #333;
  font-weight: 600;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.date-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-selector label {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.date-input {
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.date-input:focus {
  outline: none;
  border-color: #667eea;
}

.route-options-btn {
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

.route-options-btn:hover, .route-options-btn.active {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

/* Options Panel */
.options-panel {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e0e0e0;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.options-panel.visible {
  max-height: 200px;
}

.options-content {
  padding: 20px 30px;
  display: flex;
  gap: 30px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 150px;
}

.option-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: normal;
  font-size: 13px;
}

.checkbox-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.style-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.style-options label {
  font-size: 12px;
  font-weight: normal;
}

.style-options input[type="color"] {
  width: 40px;
  height: 30px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.style-options input[type="range"] {
  width: 100px;
}

/* Main Content */
.main-content {
  padding: 20px;
  min-height: calc(100vh - 120px);
}

/* Status Display */
.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  margin: 40px auto;
  max-width: 500px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(102, 126, 234, 0.2);
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
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
  text-align: center;
}

.retry-btn, .select-date-btn {
  padding: 12px 30px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 16px;
}

.retry-btn:hover, .select-date-btn:hover {
  background: #5a6fd8;
  transform: scale(1.05);
}

/* Route Content */
.route-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: calc(100vh - 160px);
}

/* Map Container */
.map-container {
  position: relative;
  height: 60%;
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.google-map {
  width: 100%;
  height: 100%;
}

/* Map Control Buttons */
.map-controls {
  position: absolute;
  top: 15px;
  right: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.map-control-btn {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.map-control-btn:hover {
  background: white;
  transform: scale(1.1);
}

/* Route Statistics */
.route-stats {
  position: absolute;
  bottom: 15px;
  left: 15px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 15px;
  border-radius: 12px;
  display: flex;
  gap: 20px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

/* Photo Timeline */
.photo-timeline {
  height: 40%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.timeline-header h3 {
  font-size: 20px;
  color: #333;
}

.timeline-controls {
  display: flex;
  gap: 10px;
}

.timeline-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.timeline-btn:hover:not(:disabled) {
  background: #5a6fd8;
  transform: scale(1.05);
}

.timeline-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Timeline Content */
.timeline-content {
  height: calc(100% - 70px);
  overflow: hidden;
  position: relative;
}

.timeline-horizontal {
  position: relative;
  height: 100%;
  padding: 40px 20px;
  overflow-x: auto;
  overflow-y: hidden;
}

.timeline-line {
  position: absolute;
  top: 50%;
  left: 20px;
  right: 20px;
  height: 2px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 1px;
  transform: translateY(-50%);
}

.timeline-item {
  position: absolute;
  top: 0;
  width: 120px;
  height: 100%;
  cursor: pointer;
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

.timeline-item:hover {
  transform: translateX(-50%) scale(1.05);
  z-index: 10;
}

.timeline-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #667eea;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 5;
}

.timeline-dot .photo-number {
  color: white;
  font-size: 10px;
  font-weight: bold;
}

.timeline-photo-card {
  position: absolute;
  top: 20%;
  left: 10px;
  right: 10px;
  background: white;
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  opacity: 0.8;
}

.timeline-item:hover .timeline-photo-card {
  opacity: 1;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.timeline-photo-card img {
  width: 100%;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 8px;
}

.photo-info {
  text-align: center;
}

.photo-time {
  font-size: 12px;
  color: #333;
  font-weight: 600;
  margin-bottom: 4px;
}

.photo-location, .photo-coordinates {
  font-size: 10px;
  color: #666;
  line-height: 1.2;
  max-width: 100px;
  margin: 0 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Active State */
.timeline-item.active .timeline-dot {
  background: #ff4444;
  transform: translate(-50%, -50%) scale(1.2);
  box-shadow: 0 4px 12px rgba(255, 68, 68, 0.4);
}

.timeline-item.active .timeline-photo-card {
  opacity: 1;
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(255, 68, 68, 0.2);
  border: 2px solid #ff4444;
}

/* Visited State */
.timeline-item.visited .timeline-dot {
  background: #4CAF50;
}

.timeline-item.visited .timeline-photo-card {
  border-color: #4CAF50;
}

/* Responsive Design */
@media (max-width: 768px) {
  .route-header {
    padding: 15px 20px;
    flex-direction: column;
    gap: 15px;
  }

  .header-controls {
    flex-direction: column;
    gap: 10px;
  }

  .options-content {
    padding: 15px 20px;
    flex-direction: column;
    gap: 15px;
  }

  .route-content {
    height: auto;
    min-height: calc(100vh - 200px);
  }

  .map-container {
    height: 400px;
  }

  .photo-timeline {
    height: 250px;
  }

  .route-stats {
    flex-direction: column;
    gap: 10px;
  }

  .stat-item {
    flex-direction: row;
    gap: 10px;
  }

  .timeline-controls {
    flex-direction: column;
    gap: 5px;
  }

  .timeline-btn {
    font-size: 12px;
    padding: 6px 12px;
  }

  .timeline-item {
    width: 110px;
  }

  .timeline-horizontal {
    padding: 30px 15px;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding: 10px;
  }

  .page-title {
    font-size: 22px;
  }

  .timeline-item {
    width: 100px;
  }

  .timeline-dot {
    width: 20px;
    height: 20px;
  }

  .timeline-dot .photo-number {
    font-size: 8px;
  }

  .timeline-photo-card {
    padding: 6px;
  }

  .timeline-photo-card img {
    height: 50px;
  }

  .photo-time {
    font-size: 10px;
  }

  .photo-location, .photo-coordinates {
    font-size: 8px;
    max-width: 80px;
  }
}
</style> 
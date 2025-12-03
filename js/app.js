/**
 * ShoreSquad - Beach Cleanup Crew App
 * JavaScript Application Logic
 */

// Application State Management
class ShoreSquadApp {
    constructor() {
        this.state = {
            user: null,
            location: null,
            weather: null,
            events: [],
            crew: [],
            isLoading: false
        };
        
        this.config = {
            weatherApiKey: 'your_openweather_api_key_here', // Replace with actual API key
            mapsApiKey: 'your_google_maps_api_key_here', // Replace with actual API key
            geolocationTimeout: 10000,
            weatherUpdateInterval: 300000, // 5 minutes
            storageKey: 'shoresquad_data'
        };
        
        this.init();
    }
    
    // Initialize the application
    async init() {
        try {
            this.showLoading('Initializing ShoreSquad...');
            
            // Load cached data
            this.loadFromStorage();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize components
            await this.initializeLocation();
            await this.loadWeatherData();
            this.loadEventData();
            this.initializeAnimations();
            
            // Hide loading screen
            this.hideLoading();
            
            console.log('✅ ShoreSquad initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing ShoreSquad:', error);
            this.hideLoading();
        }
    }
    
    // Event Listeners Setup
    setupEventListeners() {
        // Navigation
        this.setupNavigation();
        
        // Weather interactions
        this.setupWeatherInteractions();
        
        // Event interactions
        this.setupEventInteractions();
        
        // Button interactions
        this.setupButtonInteractions();
        
        // Resize handler for responsive features
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));
        
        // Online/offline handling
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }
    
    // Navigation Setup
    setupNavigation() {
        const navToggle = document.getElementById('nav-toggle') || document.querySelector('.nav-toggle');
        const navMenu = document.getElementById('nav-menu') || document.querySelector('.nav-menu');
        const navLinks = document.querySelectorAll('.nav-link');
        
        // Mobile menu toggle
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
                navToggle.setAttribute('aria-expanded', !isExpanded);
                navMenu.classList.toggle('active');
                
                // Animate hamburger
                navToggle.classList.toggle('active');
            });
        }
        
        // Smooth scrolling for navigation links
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                        
                        // Close mobile menu
                        if (navMenu) navMenu.classList.remove('active');
                        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        });
        
        // Active section highlighting
        this.setupActiveNavigation();
    }
    
    // Active Navigation Highlighting
    setupActiveNavigation() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, {
            threshold: 0.3,
            rootMargin: '-100px 0px -50% 0px'
        });
        
        sections.forEach(section => observer.observe(section));
    }
    
    // Weather Interactions
    setupWeatherInteractions() {
        const changeLocationBtn = document.getElementById('change-location');
        const checkWeatherBtn = document.getElementById('check-weather-btn');
        
        if (changeLocationBtn) {
            changeLocationBtn.addEventListener('click', () => {
                this.promptLocationChange();
            });
        }
        
        if (checkWeatherBtn) {
            checkWeatherBtn.addEventListener('click', () => {
                const weatherSection = document.getElementById('weather');
                if (weatherSection) {
                    weatherSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }
    
    // Event Interactions
    setupEventInteractions() {
        const createEventBtn = document.getElementById('create-event-btn');
        const joinCleanupBtn = document.getElementById('join-cleanup-btn');
        
        if (createEventBtn) {
            createEventBtn.addEventListener('click', () => {
                this.showCreateEventModal();
            });
        }
        
        if (joinCleanupBtn) {
            joinCleanupBtn.addEventListener('click', () => {
                this.findNearbyCleanups();
            });
        }
        
        // Event card interactions
        this.setupEventCardListeners();
    }
    
    // Button Interactions
    setupButtonInteractions() {
        const downloadBtn = document.getElementById('download-app-btn');
        const learnMoreBtn = document.getElementById('learn-more-btn');
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.handleAppDownload();
            });
        }
        
        if (learnMoreBtn) {
            learnMoreBtn.addEventListener('click', () => {
                this.showLearnMoreModal();
            });
        }
    }
    
    // Location Initialization
    async initializeLocation() {
        try {
            if (!navigator.geolocation) {
                throw new Error('Geolocation is not supported by this browser');
            }
            
            const position = await this.getCurrentPosition();
            this.state.location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            
            // Reverse geocoding to get location name
            await this.updateLocationName();
            
        } catch (error) {
            console.warn('Geolocation error:', error);
            // Use default location (Santa Monica, CA)
            this.state.location = {
                lat: 34.0195,
                lng: -118.4912,
                name: 'Santa Monica, CA'
            };
            this.updateLocationDisplay();
        }
    }
    
    // Get Current Position Promise Wrapper
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                    enableHighAccuracy: true,
                    timeout: this.config.geolocationTimeout,
                    maximumAge: 600000 // 10 minutes
                }
            );
        });
    }
    
    // Update Location Name via Reverse Geocoding
    async updateLocationName() {
        try {
            // Using a free geocoding service (nominatim)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${this.state.location.lat}&lon=${this.state.location.lng}`
            );
            
            if (response.ok) {
                const data = await response.json();
                const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown Location';
                const state = data.address?.state || data.address?.country || '';
                
                this.state.location.name = `${city}${state ? ', ' + state : ''}`;
                this.updateLocationDisplay();
            }
        } catch (error) {
            console.warn('Reverse geocoding failed:', error);
            this.state.location.name = 'Current Location';
            this.updateLocationDisplay();
        }
    }
    
    // Update Location Display
    updateLocationDisplay() {
        const locationElement = document.getElementById('current-location');
        if (locationElement && this.state.location?.name) {
            locationElement.textContent = this.state.location.name;
        }
    }
    
    // Load Weather Data
    async loadWeatherData() {
        if (!this.state.location) return;
        
        try {
            // Note: Using OpenWeatherMap API (requires API key)
            // For demo purposes, using mock data
            const weatherData = await this.fetchWeatherData();
            
            this.state.weather = weatherData;
            this.updateWeatherDisplay();
            this.updateCleanupRecommendation();
            
        } catch (error) {
            console.warn('Weather data loading failed:', error);
            this.loadMockWeatherData();
        }
    }
    
    // Fetch Weather Data (Mock Implementation)
    async fetchWeatherData() {
        // Mock weather data for demonstration
        // In production, replace with actual API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    temperature: 72,
                    feelsLike: 75,
                    description: 'sunny',
                    humidity: 65,
                    windSpeed: 8.5,
                    uvIndex: 6,
                    icon: 'sun',
                    conditions: 'perfect' // good, okay, poor
                });
            }, 1000);
        });
        
        // Actual API implementation would look like:
        /*
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${this.state.location.lat}&lon=${this.state.location.lng}&appid=${this.config.weatherApiKey}&units=imperial`
        );
        
        if (!response.ok) throw new Error('Weather API request failed');
        
        const data = await response.json();
        return this.parseWeatherData(data);
        */
    }
    
    // Load Mock Weather Data
    loadMockWeatherData() {
        this.state.weather = {
            temperature: 72,
            feelsLike: 75,
            description: 'sunny',
            humidity: 65,
            windSpeed: 8.5,
            uvIndex: 6,
            icon: 'sun',
            conditions: 'perfect'
        };
        
        this.updateWeatherDisplay();
        this.updateCleanupRecommendation();
    }
    
    // Update Weather Display
    updateWeatherDisplay() {
        const weather = this.state.weather;
        if (!weather) return;
        
        // Temperature
        const tempElement = document.getElementById('current-temp');
        if (tempElement) {
            tempElement.textContent = `${Math.round(weather.temperature)}°F`;
        }
        
        // Feels like
        const feelsLikeElement = document.getElementById('feels-like');
        if (feelsLikeElement) {
            feelsLikeElement.textContent = `${Math.round(weather.feelsLike)}°F`;
        }
        
        // Description
        const descriptionElement = document.getElementById('weather-description');
        if (descriptionElement) {
            descriptionElement.textContent = weather.description.charAt(0).toUpperCase() + weather.description.slice(1);
        }
        
        // Wind speed
        const windElement = document.getElementById('wind-speed');
        if (windElement) {
            windElement.textContent = `${weather.windSpeed} mph`;
        }
        
        // Humidity
        const humidityElement = document.getElementById('humidity');
        if (humidityElement) {
            humidityElement.textContent = `${weather.humidity}%`;
        }
        
        // UV Index
        const uvElement = document.getElementById('uv-index');
        if (uvElement) {
            uvElement.textContent = weather.uvIndex;
        }
        
        // Weather icon (could be enhanced with actual weather icons)
        this.updateWeatherIcon(weather.icon);
    }
    
    // Update Weather Icon
    updateWeatherIcon(iconType) {
        const iconElement = document.getElementById('weather-icon');
        if (!iconElement) return;
        
        // Simple icon mapping - could be enhanced with actual weather icon library
        const iconMap = {
            sun: `<svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>`,
            cloud: `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
            </svg>`,
            rain: `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                <line x1="8" y1="21" x2="8" y2="19"/>
                <line x1="16" y1="21" x2="16" y2="19"/>
                <line x1="12" y1="23" x2="12" y2="21"/>
            </svg>`
        };
        
        iconElement.innerHTML = iconMap[iconType] || iconMap.sun;
    }
    
    // Update Cleanup Recommendation
    updateCleanupRecommendation() {
        const statusElement = document.getElementById('cleanup-status');
        if (!statusElement || !this.state.weather) return;
        
        const conditions = this.state.weather.conditions;
        const statusMap = {
            perfect: {
                class: 'good',
                text: 'Perfect for beach cleanup!'
            },
            good: {
                class: 'good',
                text: 'Great conditions for cleanup!'
            },
            okay: {
                class: 'okay',
                text: 'Okay conditions - bring sun protection!'
            },
            poor: {
                class: 'poor',
                text: 'Not ideal - check back later!'
            }
        };
        
        const status = statusMap[conditions] || statusMap.okay;
        
        statusElement.innerHTML = `
            <div class="recommendation-indicator ${status.class}">
                <span class="indicator-dot"></span>
                <span class="indicator-text">${status.text}</span>
            </div>
        `;
    }
    
    // Load Event Data
    loadEventData() {
        // Mock event data for demonstration
        const mockEvents = [
            {
                id: 1,
                title: 'Santa Monica Beach Cleanup',
                location: 'Santa Monica Pier, CA',
                date: new Date(2025, 11, 15), // December 15, 2025
                time: '9:00 AM - 12:00 PM',
                attendees: 23,
                coordinates: { lat: 34.0195, lng: -118.4912 }
            },
            {
                id: 2,
                title: 'Venice Beach Conservation Day',
                location: 'Venice Beach, CA',
                date: new Date(2025, 11, 18), // December 18, 2025
                time: '8:00 AM - 11:00 AM',
                attendees: 31,
                coordinates: { lat: 33.9850, lng: -118.4695 }
            },
            {
                id: 3,
                title: 'Malibu Shoreline Restoration',
                location: 'Malibu State Beach, CA',
                date: new Date(2025, 11, 22), // December 22, 2025
                time: '7:00 AM - 10:00 AM',
                attendees: 18,
                coordinates: { lat: 34.0259, lng: -118.7798 }
            }
        ];
        
        this.state.events = mockEvents;
        this.updateEventsDisplay();
    }
    
    // Update Events Display
    updateEventsDisplay() {
        const eventsContainer = document.getElementById('events-list');
        if (!eventsContainer || !this.state.events.length) return;
        
        const eventsHTML = this.state.events.map(event => {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            const month = monthNames[event.date.getMonth()];
            const day = event.date.getDate();
            
            return `
                <div class="event-card" data-event-id="${event.id}">
                    <div class="event-date">
                        <span class="event-month">${month}</span>
                        <span class="event-day">${day}</span>
                    </div>
                    <div class="event-content">
                        <h3 class="event-title">${event.title}</h3>
                        <p class="event-location">${event.location}</p>
                        <div class="event-meta">
                            <span class="event-time">${event.time}</span>
                            <span class="event-attendees">${event.attendees} squad members going</span>
                        </div>
                    </div>
                    <button class="btn btn--primary btn--small join-event-btn" data-event-id="${event.id}">
                        Join
                    </button>
                </div>
            `;
        }).join('');
        
        eventsContainer.innerHTML = eventsHTML;
        
        // Setup event card listeners after updating DOM
        this.setupEventCardListeners();
    }
    
    // Setup Event Card Listeners
    setupEventCardListeners() {
        const joinButtons = document.querySelectorAll('.join-event-btn');
        
        joinButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const eventId = parseInt(button.dataset.eventId);
                this.joinEvent(eventId);
            });
        });
    }
    
    // Initialize Animations
    initializeAnimations() {
        // Counter animations for hero stats
        this.animateCounters();
        
        // Intersection Observer for scroll animations
        this.setupScrollAnimations();
        
        // Particle effects or other visual enhancements can go here
    }
    
    // Animate Counters
    animateCounters() {
        const counters = document.querySelectorAll('[data-count]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = parseInt(counter.dataset.count);
                    let current = 0;
                    const increment = target / 50; // Adjust speed
                    
                    const updateCounter = () => {
                        current += increment;
                        if (current < target) {
                            counter.textContent = Math.floor(current);
                            requestAnimationFrame(updateCounter);
                        } else {
                            counter.textContent = target;
                        }
                    };
                    
                    updateCounter();
                    observer.unobserve(counter);
                }
            });
        }, { threshold: 0.5 });
        
        counters.forEach(counter => observer.observe(counter));
    }
    
    // Setup Scroll Animations
    setupScrollAnimations() {
        const animatedElements = document.querySelectorAll('.feature-card, .event-card');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-up');
                    observer.unobserve(entry.target);
                }
            });
        }, { 
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        animatedElements.forEach(element => observer.observe(element));
    }
    
    // User Interactions
    async promptLocationChange() {
        // Simple prompt for demo - could be enhanced with a proper modal
        const newLocation = prompt('Enter a city or zip code:', this.state.location?.name || '');
        
        if (newLocation) {
            try {
                this.showLoading('Updating location...');
                await this.geocodeLocation(newLocation);
                await this.loadWeatherData();
                this.hideLoading();
            } catch (error) {
                console.error('Location update failed:', error);
                alert('Sorry, we couldn\'t find that location. Please try again.');
                this.hideLoading();
            }
        }
    }
    
    // Geocode Location
    async geocodeLocation(locationName) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(locationName)}`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.length > 0) {
                    const result = data[0];
                    this.state.location = {
                        lat: parseFloat(result.lat),
                        lng: parseFloat(result.lon),
                        name: result.display_name.split(',').slice(0, 2).join(',')
                    };
                    this.updateLocationDisplay();
                } else {
                    throw new Error('Location not found');
                }
            }
        } catch (error) {
            throw new Error('Geocoding failed');
        }
    }
    
    // Show Create Event Modal
    showCreateEventModal() {
        // Simple alert for demo - could be enhanced with a proper modal
        alert('Create Event feature coming soon! For now, you can join existing cleanup events.');
    }
    
    // Find Nearby Cleanups
    findNearbyCleanups() {
        const eventsSection = document.getElementById('events');
        if (eventsSection) {
            eventsSection.scrollIntoView({ behavior: 'smooth' });
            
            // Highlight events briefly
            setTimeout(() => {
                const eventCards = document.querySelectorAll('.event-card');
                eventCards.forEach(card => {
                    card.style.boxShadow = '0 0 20px rgba(0, 119, 190, 0.3)';
                    setTimeout(() => {
                        card.style.boxShadow = '';
                    }, 2000);
                });
            }, 500);
        }
    }
    
    // Join Event
    joinEvent(eventId) {
        const event = this.state.events.find(e => e.id === eventId);
        if (event) {
            // Simple confirmation for demo
            const confirmed = confirm(`Join "${event.title}"?\n\nDate: ${event.date.toLocaleDateString()}\nTime: ${event.time}\nLocation: ${event.location}`);
            
            if (confirmed) {
                // Update attendee count
                event.attendees += 1;
                this.updateEventsDisplay();
                
                // Show success message
                this.showNotification(`✅ You've joined "${event.title}"! Check your email for details.`, 'success');
                
                // Save to storage
                this.saveToStorage();
            }
        }
    }
    
    // Handle App Download
    handleAppDownload() {
        // Check if device supports PWA installation
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the PWA install prompt');
                }
                this.deferredPrompt = null;
            });
        } else {
            // Fallback - show app store links or installation instructions
            this.showNotification('ShoreSquad app is coming soon to App Store and Google Play!', 'info');
        }
    }
    
    // Show Learn More Modal
    showLearnMoreModal() {
        alert('Learn More:\n\nShoreSquad connects young environmental advocates to organize beach cleanups. Use weather data and maps to plan perfect cleanup days, coordinate with your crew, and make a real impact on ocean conservation.\n\nEvery piece of trash removed helps protect marine life and keeps our beaches beautiful for future generations.');
    }
    
    // Map Interaction Functions
    openInGoogleMaps() {
        const lat = 1.381497;
        const lng = 103.955574;
        const location = "Pasir Ris Beach, Singapore";
        
        // Create Google Maps URL with directions
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(location)}`;
        
        // Open in new tab/window
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
        
        // Show confirmation
        this.showNotification('🗺️ Opening directions to Pasir Ris Beach...', 'info');
    }
    
    shareLocation() {
        const lat = 1.381497;
        const lng = 103.955574;
        const locationName = "Pasir Ris Beach Cleanup";
        const shareText = `🌊 Join us for a beach cleanup at ${locationName}!\n\n📍 Location: ${lat}, ${lng}\n🗓️ Date: December 15, 2025\n⏰ Time: 8:00 AM - 11:00 AM\n\nLet's make waves for ocean conservation! 🏄‍♂️`;
        
        // Check if Web Share API is supported
        if (navigator.share) {
            navigator.share({
                title: 'ShoreSquad Beach Cleanup',
                text: shareText,
                url: `https://www.google.com/maps?q=${lat},${lng}`
            }).then(() => {
                this.showNotification('📤 Location shared successfully!', 'success');
            }).catch((error) => {
                console.log('Share failed:', error);
                this.fallbackShare(shareText, lat, lng);
            });
        } else {
            // Fallback for browsers without Web Share API
            this.fallbackShare(shareText, lat, lng);
        }
    }
    
    fallbackShare(shareText, lat, lng) {
        // Copy to clipboard as fallback
        if (navigator.clipboard) {
            const fullText = `${shareText}\n\nGoogle Maps: https://www.google.com/maps?q=${lat},${lng}`;
            
            navigator.clipboard.writeText(fullText).then(() => {
                this.showNotification('📋 Location details copied to clipboard!', 'success');
            }).catch(() => {
                this.showShareModal(shareText, lat, lng);
            });
        } else {
            this.showShareModal(shareText, lat, lng);
        }
    }
    
    showShareModal(shareText, lat, lng) {
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        const message = `${shareText}\n\nGoogle Maps: ${mapsUrl}`;
        
        // Simple modal replacement
        const userChoice = confirm(`Share this cleanup location?\n\n${message}\n\nClick OK to copy to clipboard or Cancel to close.`);
        
        if (userChoice) {
            // Manual copy fallback
            const textArea = document.createElement('textarea');
            textArea.value = message;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showNotification('📋 Location copied to clipboard!', 'success');
        }
    }
    
    // Utility Functions
    showLoading(message = 'Loading...') {
        this.state.isLoading = true;
        const overlay = document.getElementById('loading-overlay');
        const text = overlay?.querySelector('.loading-text');
        
        if (overlay) {
            if (text) text.textContent = message;
            overlay.classList.add('show');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }
    
    hideLoading() {
        this.state.isLoading = false;
        const overlay = document.getElementById('loading-overlay');
        
        if (overlay) {
            overlay.classList.remove('show');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }
    
    // Show Notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--background);
            color: var(--text-primary);
            padding: var(--space-4);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-xl);
            z-index: 1000;
            max-width: 300px;
            transform: translateX(100%);
            transition: transform var(--transition-normal);
        `;
        
        // Type-specific styling
        if (type === 'success') {
            notification.style.borderLeft = '4px solid var(--success)';
        } else if (type === 'error') {
            notification.style.borderLeft = '4px solid var(--error)';
        } else if (type === 'warning') {
            notification.style.borderLeft = '4px solid var(--warning)';
        } else {
            notification.style.borderLeft = '4px solid var(--info)';
        }
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }
    
    // Handle Resize
    handleResize() {
        // Update any size-dependent features
        console.log('Window resized:', window.innerWidth, window.innerHeight);
    }
    
    // Handle Online/Offline
    handleOnline() {
        this.showNotification('🌐 Back online! Syncing data...', 'success');
        // Refresh weather data, events, etc.
        this.loadWeatherData();
    }
    
    handleOffline() {
        this.showNotification('📱 You\'re offline. Some features may be limited.', 'warning');
    }
    
    // Local Storage Management
    saveToStorage() {
        try {
            const dataToSave = {
                events: this.state.events,
                location: this.state.location,
                weather: this.state.weather,
                timestamp: Date.now()
            };
            
            localStorage.setItem(this.config.storageKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.warn('Failed to save data to storage:', error);
        }
    }
    
    loadFromStorage() {
        try {
            const savedData = localStorage.getItem(this.config.storageKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // Check if data is not too old (1 hour)
                if (Date.now() - data.timestamp < 3600000) {
                    if (data.location) this.state.location = data.location;
                    if (data.weather) this.state.weather = data.weather;
                    if (data.events) this.state.events = data.events;
                    
                    // Update displays with cached data
                    this.updateLocationDisplay();
                    this.updateWeatherDisplay();
                    this.updateEventsDisplay();
                }
            }
        } catch (error) {
            console.warn('Failed to load data from storage:', error);
        }
    }
    
    // Utility: Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// PWA Installation Handler
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Update UI to notify the user they can install the PWA
    console.log('PWA installation available');
});

// Global functions for map interactions (accessible from HTML)
function openInGoogleMaps() {
    if (window.shoreSquadApp) {
        window.shoreSquadApp.openInGoogleMaps();
    } else {
        // Fallback if app isn't loaded yet
        const lat = 1.381497;
        const lng = 103.955574;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    }
}

function shareLocation() {
    if (window.shoreSquadApp) {
        window.shoreSquadApp.shareLocation();
    } else {
        // Fallback if app isn't loaded yet
        const lat = 1.381497;
        const lng = 103.955574;
        const shareText = `🌊 Join us for a beach cleanup at Pasir Ris Beach!\n\n📍 Location: ${lat}, ${lng}\n🗓️ Date: December 15, 2025\n⏰ Time: 8:00 AM - 11:00 AM`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(`${shareText}\n\nGoogle Maps: https://www.google.com/maps?q=${lat},${lng}`);
            alert('Location details copied to clipboard!');
        } else {
            alert(shareText);
        }
    }
}

// Initialize Application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize ShoreSquad App
    window.shoreSquadApp = new ShoreSquadApp();
    
    // Store deferred prompt in app instance
    if (deferredPrompt) {
        window.shoreSquadApp.deferredPrompt = deferredPrompt;
    }
    
    console.log('🌊 ShoreSquad is ready to make waves!');
});

// Handle PWA installation
window.addEventListener('appinstalled', (evt) => {
    console.log('PWA was installed');
    // Hide install promotion
    window.shoreSquadApp?.showNotification('🎉 ShoreSquad installed successfully!', 'success');
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShoreSquadApp;
}
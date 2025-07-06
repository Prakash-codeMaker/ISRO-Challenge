let map;
let forecastChart;
let compareChart;
let userLocation = null;
let notificationCount = 0;
let satelliteLayer = null;

// Navigation
function showPage(pageId) {
    // Hide all sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show the selected section
    const targetSection = document.getElementById(pageId);
    if (targetSection) {
        targetSection.classList.add('active');
    } else {
        console.warn(`Page section with id '${pageId}' not found`);
        return;
    }
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`[href="#${pageId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Initialize specific page functionality
    if (pageId === 'map') {
        setTimeout(() => initMap(), 100);
    }
    if (pageId === 'forecast' && !forecastChart) {
        setTimeout(() => initForecast(), 100);
    }
    if (pageId === 'compare' && !compareChart) {
        setTimeout(() => initCompareChart(), 100);
    }
    if (pageId === 'dashboard') {
        setTimeout(() => loadDashboard(), 100);
    }
    if (pageId === 'news') {
        setTimeout(() => loadNewsFeed(), 100);
    }
}

// Notification System
function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    panel.classList.toggle('show');
}

function addNotification(message, type = 'info') {
    const list = document.getElementById('notificationList');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="d-flex justify-content-between">
            <span>${message}</span>
            <button class="btn btn-sm btn-outline-secondary" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    list.appendChild(notification);
    notificationCount++;
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (notificationCount > 0) {
        badge.style.display = 'inline';
        badge.textContent = notificationCount;
    } else {
        badge.style.display = 'none';
    }
}

function enableNotifications() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                addNotification('Push notifications enabled!', 'success');
            }
        });
    }
}

// Get user location and AQI
function getUserLocation() {
    // Update UI to show we're getting location
    document.getElementById('locationName').innerHTML = '<span class="status-indicator status-loading"></span>Getting location...';
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                updateLocationDisplay();
                fetchAQIData();
                updateWeatherData();
                addNotification('Location detected successfully!', 'success');
            },
            function(error) {
                console.log("Location error:", error);
                // Fallback to Delhi
                userLocation = { lat: 28.6139, lng: 77.2090 };
                document.getElementById('locationName').innerHTML = '<span class="status-indicator status-online"></span>Delhi (Default)';
                fetchAQIData();
                updateWeatherData();
                addNotification('Using default location (Delhi)', 'warning');
            }
        );
    } else {
        // Fallback to Delhi
        userLocation = { lat: 28.6139, lng: 77.2090 };
        document.getElementById('locationName').innerHTML = '<span class="status-indicator status-online"></span>Delhi (Default)';
        fetchAQIData();
        updateWeatherData();
        addNotification('Geolocation not supported. Using default location.', 'warning');
    }
}

function updateLocationDisplay() {
    // Reverse geocoding simulation
    const cities = [
        { name: "Delhi", lat: 28.6139, lng: 77.2090 },
        { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
        { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
        { name: "Pune", lat: 18.5204, lng: 73.8567 },
        { name: "Jaipur", lat: 26.9124, lng: 75.7873 }
    ];
    
    let closestCity = cities[0];
    let minDistance = Infinity;
    
    cities.forEach(city => {
        const distance = Math.sqrt(
            Math.pow(userLocation.lat - city.lat, 2) + 
            Math.pow(userLocation.lng - city.lng, 2)
        );
        if (distance < minDistance) {
            minDistance = distance;
            closestCity = city;
        }
    });
    
    document.getElementById('locationName').innerHTML = `<span class="status-indicator status-online"></span>${closestCity.name}`;
}

function fetchAQIData() {
    // Simulate AQI data (in real implementation, use OpenAQ API)
    const mockAQI = Math.floor(Math.random() * 150) + 20;
    updateAQIDisplay(mockAQI);
    
    // Simulate data source status
    updateDataSourceStatus();
}

function updateAQIDisplay(aqi) {
    const aqiElement = document.getElementById('currentAQI');
    const statusElement = document.getElementById('aqiStatus');
    const lastUpdatedElement = document.getElementById('lastUpdated');
    
    aqiElement.textContent = aqi;
    lastUpdatedElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    
    // Update color and status
    aqiElement.className = 'aqi-value';
    if (aqi <= 50) {
        aqiElement.classList.add('aqi-good');
        statusElement.innerHTML = '<span class="status-indicator status-online"></span>Good - Safe for outdoor activities';
    } else if (aqi <= 100) {
        aqiElement.classList.add('aqi-moderate');
        statusElement.innerHTML = '<span class="status-indicator status-online"></span>Moderate - Sensitive groups should limit outdoor exposure';
    } else if (aqi <= 150) {
        aqiElement.classList.add('aqi-unhealthy');
        statusElement.innerHTML = '<span class="status-indicator status-offline"></span>Unhealthy for Sensitive Groups';
        addNotification(`High AQI alert: ${aqi} in your area`, 'warning');
    } else {
        aqiElement.classList.add('aqi-poor');
        statusElement.innerHTML = '<span class="status-indicator status-offline"></span>Poor - Avoid outdoor activities';
        addNotification(`Critical AQI alert: ${aqi} in your area`, 'alert');
    }
    
    // Update advisory page
    document.getElementById('advisoryAQI').textContent = aqi;
    updateAQIBreakdown(aqi);
    
    // Save to AQI history
    const city = document.getElementById('locationName')?.textContent.replace('Getting location...', 'Unknown').replace(/[^\w\s]/g, '') || 'Unknown';
    const history = JSON.parse(localStorage.getItem('aqiHistory') || '[]');
    history.push({ city, aqi, time: new Date().toLocaleTimeString() });
    localStorage.setItem('aqiHistory', JSON.stringify(history));
}

function updateWeatherData() {
    // Simulate weather data
    const temperature = Math.floor(Math.random() * 20) + 15; // 15-35°C
    const visibility = (Math.random() * 5 + 2).toFixed(1); // 2-7 km
    
    document.getElementById('temperature').textContent = `${temperature}°C`;
    document.getElementById('visibility').textContent = `${visibility} km`;
}

function updateDataSourceStatus() {
    const sources = ['openaqStatus', 'insatStatus', 'imdStatus'];
    sources.forEach(sourceId => {
        const dot = document.getElementById(sourceId);
        if (Math.random() > 0.1) { // 90% uptime
            dot.classList.remove('offline');
        } else {
            dot.classList.add('offline');
        }
    });
}

// Initialize map
function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Map element not found');
        return;
    }
    
    if (map) {
        map.remove();
    }
    
    map = L.map('map').setView([20.5937, 78.9629], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add sample AQI markers for major cities
    const cities = [
        { name: "Delhi", lat: 28.6139, lng: 77.2090, aqi: 145 },
        { name: "Mumbai", lat: 19.0760, lng: 72.8777, aqi: 89 },
        { name: "Bangalore", lat: 12.9716, lng: 77.5946, aqi: 67 },
        { name: "Pune", lat: 18.5204, lng: 73.8567, aqi: 78 },
        { name: "Jaipur", lat: 26.9124, lng: 75.7873, aqi: 134 },
        { name: "Lucknow", lat: 26.8467, lng: 80.9462, aqi: 156 },
        { name: "Kanpur", lat: 26.4499, lng: 80.3319, aqi: 189 },
        { name: "Agra", lat: 27.1767, lng: 78.0081, aqi: 123 }
    ];
    
    cities.forEach(city => {
        let color = '#28a745'; // Green
        if (city.aqi > 200) color = '#6f42c1'; // Purple
        else if (city.aqi > 150) color = '#dc3545'; // Red
        else if (city.aqi > 100) color = '#fd7e14'; // Orange
        else if (city.aqi > 50) color = '#ffc107'; // Yellow
        
        L.circleMarker([city.lat, city.lng], {
            radius: 12,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map).bindPopup(`
            <strong>${city.name}</strong><br>
            AQI: ${city.aqi}<br>
            ${city.aqi <= 50 ? 'Good' : city.aqi <= 100 ? 'Moderate' : city.aqi <= 150 ? 'Unhealthy for Sensitive' : city.aqi <= 200 ? 'Unhealthy' : city.aqi <= 300 ? 'Very Unhealthy' : 'Hazardous'}
        `);
    });
}

function toggleSatelliteLayer() {
    if (!satelliteLayer) {
        satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri'
        });
    }
    
    if (map.hasLayer(satelliteLayer)) {
        map.removeLayer(satelliteLayer);
    } else {
        satelliteLayer.addTo(map);
    }
}

function refreshMapData() {
    addNotification('Refreshing map data...', 'info');
    setTimeout(() => {
        addNotification('Map data updated successfully!', 'success');
    }, 1500);
}

function showNearbyStations() {
    addNotification('Finding nearby monitoring stations...', 'info');
    
    // Simulate finding nearby stations
    setTimeout(() => {
        if (map && userLocation) {
            // Add mock nearby stations to the map
            const nearbyStations = [
                {
                    name: "Central Monitoring Station",
                    lat: userLocation.lat + (Math.random() - 0.5) * 0.01,
                    lng: userLocation.lng + (Math.random() - 0.5) * 0.01,
                    aqi: Math.floor(Math.random() * 100) + 50,
                    distance: "1.2 km"
                },
                {
                    name: "Industrial Area Station",
                    lat: userLocation.lat + (Math.random() - 0.5) * 0.015,
                    lng: userLocation.lng + (Math.random() - 0.5) * 0.015,
                    aqi: Math.floor(Math.random() * 150) + 100,
                    distance: "2.8 km"
                },
                {
                    name: "Residential Zone Station",
                    lat: userLocation.lat + (Math.random() - 0.5) * 0.02,
                    lng: userLocation.lng + (Math.random() - 0.5) * 0.02,
                    aqi: Math.floor(Math.random() * 80) + 30,
                    distance: "4.1 km"
                }
            ];
            
            // Add station markers to map
            nearbyStations.forEach(station => {
                const color = station.aqi <= 50 ? '#28a745' : 
                             station.aqi <= 100 ? '#ffc107' : 
                             station.aqi <= 150 ? '#fd7e14' : '#dc3545';
                
                L.circleMarker([station.lat, station.lng], {
                    radius: 8,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(map).bindPopup(`
                    <strong>${station.name}</strong><br>
                    AQI: ${station.aqi}<br>
                    Distance: ${station.distance}<br>
                    ${station.aqi <= 50 ? 'Good' : station.aqi <= 100 ? 'Moderate' : station.aqi <= 150 ? 'Unhealthy for Sensitive' : 'Unhealthy'}
                `);
            });
            
            // Center map on user location
            map.setView([userLocation.lat, userLocation.lng], 12);
            
            addNotification(`Found ${nearbyStations.length} monitoring stations nearby!`, 'success');
        } else {
            addNotification('Unable to find nearby stations. Please check your location.', 'warning');
        }
    }, 1500);
}

// Initialize forecast chart
function initForecast() {
    const canvas = document.getElementById('forecastChart');
    if (!canvas) {
        console.error('Forecast chart element not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Generate 48-hour forecast data
    const labels = [];
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < 48; i++) {
        const time = new Date(now.getTime() + i * 60 * 60 * 1000);
        labels.push(time.getHours() + ':00');
        // Simulate AQI fluctuation with AI-like patterns
        const baseAQI = 80;
        const variation = Math.sin(i * 0.3) * 20 + Math.cos(i * 0.1) * 15 + Math.random() * 10;
        data.push(Math.max(20, baseAQI + variation));
    }
    
    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'AQI Forecast',
                data: data,
                borderColor: '#4A90E2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 200,
                    title: {
                        display: true,
                        text: 'AQI Value'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time (Hours)'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: '48-Hour AQI Forecast'
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff'
                }
            }
        }
    });
    
    // Update model accuracy
    document.getElementById('modelAccuracy').textContent = `Accuracy: ${Math.floor(Math.random() * 10) + 85}%`;
    document.getElementById('lastModelUpdate').textContent = `Updated: ${Math.floor(Math.random() * 5) + 1} min ago`;
}

function updateForecast() {
    const location = document.getElementById('locationSelect').value;
    const model = document.getElementById('modelSelect').value;
    
    addNotification(`Updating forecast for ${location} using ${model} model...`, 'info');
    
    // Update the chart with new data
    if (forecastChart) {
        const newData = forecastChart.data.datasets[0].data.map(value => 
            Math.max(20, value + (Math.random() - 0.5) * 30)
        );
        forecastChart.data.datasets[0].data = newData;
        forecastChart.update();
        
        // Update summary cards
        const avg = Math.round(newData.reduce((a, b) => a + b, 0) / newData.length);
        const peak = Math.max(...newData);
        document.getElementById('todayAvg').textContent = avg;
        document.getElementById('tomorrowPeak').textContent = peak;
        
        setTimeout(() => {
            addNotification('Forecast updated successfully!', 'success');
        }, 1000);
    }
}

// Initialize comparison chart
function initCompareChart() {
    const canvas = document.getElementById('compareChart');
    if (!canvas) {
        console.error('Compare chart element not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    compareChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['PM2.5', 'PM10', 'O₃', 'NO₂', 'SO₂', 'CO'],
            datasets: [{
                label: 'City 1',
                data: [45, 78, 23, 34, 12, 8],
                backgroundColor: 'rgba(74, 144, 226, 0.8)',
                borderColor: '#4A90E2',
                borderWidth: 1
            }, {
                label: 'City 2',
                data: [67, 89, 31, 45, 18, 12],
                backgroundColor: 'rgba(220, 53, 69, 0.8)',
                borderColor: '#dc3545',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Concentration (μg/m³)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Pollutant Comparison'
                }
            }
        }
    });
}

// Dashboard Logic
function loadDashboard() {
    // Load saved locations
    const saved = JSON.parse(localStorage.getItem('savedLocations') || '[]');
    const savedList = document.getElementById('savedLocations');
    savedList.innerHTML = '';
    saved.forEach((loc, idx) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.textContent = `${loc.name} (${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)})`;
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-danger';
        delBtn.innerHTML = '<i class="fas fa-trash"></i>';
        delBtn.onclick = () => {
            saved.splice(idx, 1);
            localStorage.setItem('savedLocations', JSON.stringify(saved));
            loadDashboard();
        };
        li.appendChild(delBtn);
        savedList.appendChild(li);
    });
    
    // Load AQI history
    const history = JSON.parse(localStorage.getItem('aqiHistory') || '[]');
    const histList = document.getElementById('aqiHistory');
    histList.innerHTML = '';
    history.slice(-20).reverse().forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = `${item.city}: AQI ${item.aqi} (${item.time})`;
        histList.appendChild(li);
    });
    
    // Update weekly summary
    updateWeeklySummary();
}



function updateWeeklySummary() {
    const history = JSON.parse(localStorage.getItem('aqiHistory') || '[]');
    if (history.length > 0) {
        const recent = history.slice(-7);
        const avg = Math.round(recent.reduce((a, b) => a + b.aqi, 0) / recent.length);
        const best = Math.min(...recent.map(h => h.aqi));
        const worst = Math.max(...recent.map(h => h.aqi));
        
        document.getElementById('weeklyAvg').textContent = avg;
        document.getElementById('bestDay').textContent = best;
        document.getElementById('worstDay').textContent = worst;
    }
}

// News Feed Logic
function loadNewsFeed() {
    const news = [
        {
            title: "Delhi's AQI improves after rain",
            date: "2025-04-10",
            source: "The Times of India",
            category: "environment",
            url: "#",
            summary: "Recent showers have led to a significant drop in air pollution levels across Delhi."
        },
        {
            title: "ISRO launches new satellite for air monitoring",
            date: "2025-04-09",
            source: "NDTV",
            category: "technology",
            url: "#",
            summary: "The new satellite will provide real-time atmospheric data for rural India."
        },
        {
            title: "Mumbai records lowest PM2.5 in 3 years",
            date: "2025-04-08",
            source: "Hindustan Times",
            category: "health",
            url: "#",
            summary: "Air quality in Mumbai has improved due to stricter emission controls."
        },
        {
            title: "New air quality standards announced",
            date: "2025-04-07",
            source: "Economic Times",
            category: "policy",
            url: "#",
            summary: "Government introduces stricter air quality standards for major cities."
        }
    ];
    
    const category = document.getElementById('newsCategory')?.value || 'all';
    const filteredNews = category === 'all' ? news : news.filter(item => item.category === category);
    
    const feed = document.getElementById('newsFeed');
    if (!feed) return;
    feed.innerHTML = '';
    filteredNews.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-md-6';
        col.innerHTML = `<div class="news-card">
            <div class="news-title">${item.title}</div>
            <div class="news-meta">${item.date} | ${item.source}</div>
            <div class="news-summary mt-2 mb-2">${item.summary}</div>
            <a href="${item.url}" class="btn btn-sm btn-outline-primary" target="_blank">Read more</a>
        </div>`;
        feed.appendChild(col);
    });
}

function refreshNews() {
    addNotification('Refreshing news feed...', 'info');
    setTimeout(() => {
        loadNewsFeed();
        addNotification('News feed updated!', 'success');
    }, 1000);
}



// AQI Comparison Tool
function compareAQI() {
    const city1 = document.getElementById('compareCity1').value;
    const city2 = document.getElementById('compareCity2').value;
    const cityData = {
        delhi: { name: 'Delhi', aqi: 145 },
        mumbai: { name: 'Mumbai', aqi: 89 },
        bangalore: { name: 'Bangalore', aqi: 67 },
        pune: { name: 'Pune', aqi: 78 },
        jaipur: { name: 'Jaipur', aqi: 134 },
        lucknow: { name: 'Lucknow', aqi: 156 },
        kanpur: { name: 'Kanpur', aqi: 189 },
        agra: { name: 'Agra', aqi: 123 }
    };
    
    const c1 = cityData[city1];
    const c2 = cityData[city2];
    const result = document.getElementById('compareResult');
    if (!result) return;
    
    result.innerHTML = `<div class="col-md-6">
        <div class="aqi-card text-center">
            <h5>${c1.name}</h5>
            <div class="aqi-value">${c1.aqi}</div>
            <div class="mt-2">${c1.aqi <= 50 ? 'Good' : c1.aqi <= 100 ? 'Moderate' : c1.aqi <= 150 ? 'Unhealthy for Sensitive' : c1.aqi <= 200 ? 'Unhealthy' : 'Very Unhealthy'}</div>
        </div>
    </div>
    <div class="col-md-6">
        <div class="aqi-card text-center">
            <h5>${c2.name}</h5>
            <div class="aqi-value">${c2.aqi}</div>
            <div class="mt-2">${c2.aqi <= 50 ? 'Good' : c2.aqi <= 100 ? 'Moderate' : c2.aqi <= 150 ? 'Unhealthy for Sensitive' : c2.aqi <= 200 ? 'Unhealthy' : 'Very Unhealthy'}</div>
        </div>
    </div>`;
    
    // Update comparison chart
    if (compareChart) {
        compareChart.data.datasets[0].data = [
            Math.round(c1.aqi * 0.5), Math.round(c1.aqi * 0.3), 
            Math.round(c1.aqi * 0.1), Math.round(c1.aqi * 0.05), 
            Math.round(c1.aqi * 0.03), Math.round(c1.aqi * 0.02)
        ];
        compareChart.data.datasets[1].data = [
            Math.round(c2.aqi * 0.5), Math.round(c2.aqi * 0.3), 
            Math.round(c2.aqi * 0.1), Math.round(c2.aqi * 0.05), 
            Math.round(c2.aqi * 0.03), Math.round(c2.aqi * 0.02)
        ];
        compareChart.update();
    }
}



// AQI Breakdown
function updateAQIBreakdown(aqi) {
    const breakdown = {
        PM25: Math.round(aqi * 0.5),
        PM10: Math.round(aqi * 0.3),
        O3: Math.round(aqi * 0.1),
        NO2: Math.round(aqi * 0.05),
        SO2: Math.round(aqi * 0.03),
        CO: Math.round(aqi * 0.02)
    };
    const el = document.getElementById('aqiBreakdown');
    if (!el) return;
    el.innerHTML = `<div class="row">
        <div class="col"><strong>PM2.5:</strong> ${breakdown.PM25}</div>
        <div class="col"><strong>PM10:</strong> ${breakdown.PM10}</div>
        <div class="col"><strong>O₃:</strong> ${breakdown.O3}</div>
        <div class="col"><strong>NO₂:</strong> ${breakdown.NO2}</div>
        <div class="col"><strong>SO₂:</strong> ${breakdown.SO2}</div>
        <div class="col"><strong>CO:</strong> ${breakdown.CO}</div>
    </div>`;
}



// Health Advisory Functions
function personalizeAdvisory() {
    addNotification('Personalizing health advisory...', 'info');
    setTimeout(() => {
        addNotification('Health advisory personalized for your profile!', 'success');
    }, 1500);
}

function shareAdvisory() {
    const aqi = document.getElementById('advisoryAQI')?.textContent || '--';
    const text = `Current AQI: ${aqi}. Stay informed with AirScape!`;
    
    if (navigator.share) {
        navigator.share({
            title: 'AirScape Health Advisory',
            text,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(text + ' ' + window.location.href);
        addNotification('Health advisory copied to clipboard!', 'success');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Don't automatically request location - wait for user interaction
    // getUserLocation();
    
    // Create map container
    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
        mapContainer.innerHTML = '<div id="map" style="height: 600px; border-radius: 15px;"></div>';
    }
    
    // Handle navigation clicks
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('href').substring(1);
            if (page) {
                showPage(page);
            }
        });
    });
    
    // Initialize default page
    showPage('home');
    
    // Setup event listeners
    const addLocationBtn = document.getElementById('addLocationBtn');
    if (addLocationBtn) {
        addLocationBtn.onclick = function() {
            if (!userLocation) {
                addNotification('Please get your location first', 'warning');
                return;
            }
            const cities = [
                { name: "Delhi", lat: 28.6139, lng: 77.2090 },
                { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
                { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
                { name: "Pune", lat: 18.5204, lng: 73.8567 },
                { name: "Jaipur", lat: 26.9124, lng: 75.7873 }
            ];
            let closestCity = cities[0];
            let minDistance = Infinity;
            cities.forEach(city => {
                const distance = Math.sqrt(
                    Math.pow(userLocation.lat - city.lat, 2) + 
                    Math.pow(userLocation.lng - city.lng, 2)
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCity = city;
                }
            });
            const saved = JSON.parse(localStorage.getItem('savedLocations') || '[]');
            if (!saved.some(loc => loc.name === closestCity.name)) {
                saved.push({ ...closestCity, ...userLocation });
                localStorage.setItem('savedLocations', JSON.stringify(saved));
                loadDashboard();
                addNotification(`Added ${closestCity.name} to saved locations`, 'success');
            } else {
                addNotification(`${closestCity.name} is already saved`, 'info');
            }
        };
    }
    
    // Setup feedback form
    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
        feedbackForm.onsubmit = function(e) {
            e.preventDefault();
            const name = document.getElementById('feedbackName').value.trim();
            const email = document.getElementById('feedbackEmail').value.trim();
            const category = document.getElementById('feedbackCategory').value;
            const msg = document.getElementById('feedbackMessage').value.trim();
            const status = document.getElementById('feedbackStatus');
            
            if (!name || !email || !msg) {
                status.textContent = 'Please fill all required fields.';
                status.style.color = 'var(--danger-red)';
                return;
            }
            
            // Simulate sending
            status.textContent = 'Sending feedback...';
            status.style.color = 'var(--primary-blue)';
            
            setTimeout(() => {
                status.textContent = 'Thank you for your feedback! We\'ll get back to you soon.';
                status.style.color = 'var(--success-green)';
                document.getElementById('feedbackForm').reset();
                addNotification('Feedback submitted successfully!', 'success');
            }, 1500);
        };
    }
    
    // Setup comparison form
    const compareCity1 = document.getElementById('compareCity1');
    const compareCity2 = document.getElementById('compareCity2');
    if (compareCity1 && compareCity2) {
        compareCity1.onchange = compareAQI;
        compareCity2.onchange = compareAQI;
        compareAQI();
    }
    
    // Setup share button
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.onclick = function() {
            const aqi = document.getElementById('currentAQI')?.textContent || '--';
            const city = document.getElementById('locationName')?.textContent.replace(/[^\w\s]/g, '') || 'your city';
            const text = `Current AQI in ${city}: ${aqi}. Check air quality with AirScape!`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'AirScape AQI',
                    text,
                    url: window.location.href
                });
            } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(text + ' ' + window.location.href);
                shareBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
                }, 1500);
                addNotification('AQI info copied to clipboard!', 'success');
            }
        };
    }
    
    // Add some initial notifications
    setTimeout(() => {
        addNotification('Welcome to AirScape! Your air quality companion.', 'success');
        addNotification('Click "Get My Location" to see personalized AQI data', 'info');
    }, 2000);
    
    // Simulate periodic updates
    setInterval(() => {
        updateDataSourceStatus();
        if (Math.random() > 0.8) {
            addNotification('New air quality data available', 'info');
        }
    }, 30000);
}); 
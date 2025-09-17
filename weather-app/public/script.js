// filepath: weather-app/public/script.js
document.addEventListener('DOMContentLoaded', () => {
    const CWA_API_URL = '/.netlify/functions/get-weather';
    
    const cityInput = document.getElementById('city-input');
    const addCityBtn = document.getElementById('add-city-btn');
    const savedCitiesList = document.getElementById('saved-cities-list');
    
    const currentCityName = document.getElementById('current-city-name');
    const weatherAnimationContainer = document.getElementById('weather-animation');
    const currentTempValue = document.getElementById('current-temp-value');
    const currentWeatherDesc = document.getElementById('current-weather-description');
    const currentHumidity = document.getElementById('current-humidity');
    const currentWindSpeed = document.getElementById('current-wind-speed');
    const currentPoP = document.getElementById('current-pop');
    const forecastGrid = document.getElementById('forecast-grid');

    let lottieAnimation;
    let savedCities = JSON.parse(localStorage.getItem('savedCities')) || [];
    const MAX_CITIES = 5;

    function getWeatherAnimationPath(weatherCode) {
        const code = parseInt(weatherCode, 10);
        if ([1].includes(code)) return 'animations/sunny.json';
        if ([2, 3, 4, 5, 6, 7].includes(code)) return 'animations/cloudy.json';
        if (code >= 8 && code <= 22) return 'animations/rainy.json';
        if (code >= 24 && code <= 28) return 'animations/cloudy.json';
        if (code >= 29 && code <= 39) return 'animations/rainy.json';
        if ([41, 42].includes(code)) return 'animations/snowy.json';
        return 'animations/cloudy.json';
    }

    function playLottieAnimation(path) {
        if (lottieAnimation) {
            lottieAnimation.destroy();
        }
        lottieAnimation = lottie.loadAnimation({
            container: weatherAnimationContainer,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: path
        });
    }

    async function fetchAndDisplayWeather(cityName) {
        currentCityName.textContent = '讀取中...';
        forecastGrid.innerHTML = '';
        
        try {
            const response = await fetch(`${CWA_API_URL}?cityName=${encodeURIComponent(cityName)}`);
            if (!response.ok) {
                throw new Error('網路回應錯誤');
            }
            const data = await response.json();

            if (!data || !data.records || data.records.location.length === 0) {
                alert(`找不到 "${cityName}" 的天氣資料，請確認城市名稱是否正確 (例如：臺北市、高雄市)。`);
                currentCityName.textContent = '查無資料';
                return;
            }

            const locationData = data.records.location[0];
            updateCurrentWeatherUI(locationData);
            updateForecastUI(locationData);
            setActiveCityButton(cityName);

        } catch (error) {
            console.error('獲取天氣資料失敗:', error);
            alert('無法獲取天氣資料，請稍後再試。');
            currentCityName.textContent = '讀取失敗';
        }
    }

    function updateCurrentWeatherUI(locationData) {
        const weatherElement = locationData.weatherElement;
        const currentData = {
            city: locationData.locationName,
            wx: weatherElement[0].time[0].parameter,
            pop: weatherElement[1].time[0].parameter,
            minT: weatherElement[2].time[0].parameter,
            maxT: weatherElement[4].time[0].parameter,
        };

        const avgTemp = (parseFloat(currentData.minT.parameterName) + parseFloat(currentData.maxT.parameterName)) / 2;
        
        currentCityName.textContent = currentData.city;
        currentTempValue.textContent = Math.round(avgTemp);
        currentWeatherDesc.textContent = currentData.wx.parameterName;
        currentPoP.textContent = `${currentData.pop.parameterName}%`;
        
        currentHumidity.textContent = '--%'; 
        currentWindSpeed.textContent = '-- m/s';
        
        playLottieAnimation(getWeatherAnimationPath(currentData.wx.parameterValue));
    }
    
    function updateForecastUI(locationData) {
        forecastGrid.innerHTML = '';
        const tempElements = locationData.weatherElement[4].time;
        const weatherElements = locationData.weatherElement[0].time;

        for (let i = 0; i < tempElements.length; i++) {
            const time = tempElements[i].startTime.split(' ')[1].substring(0, 5);
            const temp = tempElements[i].parameter.parameterName;
            const weather = weatherElements[i].parameter.parameterName;

            const forecastCard = document.createElement('div');
            forecastCard.className = 'forecast-card';
            forecastCard.innerHTML = `
                <p class="forecast-time">${time}</p>
                <p class="forecast-icon">☀️</p> <p class="forecast-desc">${weather}</p>
                <p class="forecast-temp">${temp}°</p>
            `;
            forecastGrid.appendChild(forecastCard);
        }
    }
    
    function addCity() {
        const cityName = cityInput.value.trim();
        if (!cityName) {
            alert('請輸入城市名稱！');
            return;
        }
        if (savedCities.includes(cityName)) {
            alert(`${cityName} 已經在列表中了。`);
            return;
        }
        if (savedCities.length >= MAX_CITIES) {
            alert(`最多只能新增 ${MAX_CITIES} 個城市。`);
            return;
        }

        savedCities.push(cityName);
        localStorage.setItem('savedCities', JSON.stringify(savedCities));
        renderSavedCities();
        cityInput.value = '';
        fetchAndDisplayWeather(cityName);
    }
    
    function renderSavedCities() {
        savedCitiesList.innerHTML = '';
        savedCities.forEach(city => {
            const cityBtn = document.createElement('button');
            cityBtn.className = 'city-btn';
            cityBtn.textContent = city;
            cityBtn.addEventListener('click', () => fetchAndDisplayWeather(city));
            savedCitiesList.appendChild(cityBtn);
        });
    }

    function setActiveCityButton(activeCity) {
        document.querySelectorAll('.city-btn').forEach(btn => {
            if (btn.textContent === activeCity) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function getGeolocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async position => {
                const { latitude, longitude } = position.coords;
                console.log(`獲取到經緯度: ${latitude}, ${longitude}。此範例將預設載入臺北市。`);
                fetchAndDisplayWeather('臺北市');
            }, error => {
                console.error("地理定位失敗:", error.message);
                fetchAndDisplayWeather('臺北市');
            });
        } else {
            console.log("此瀏覽器不支援地理定位。");
            fetchAndDisplayWeather('臺北市');
        }
    }

    addCityBtn.addEventListener('click', addCity);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addCity();
        }
    });

    function init() {
        renderSavedCities();
        if (savedCities.length > 0) {
            fetchAndDisplayWeather(savedCities[0]);
        } else {
            getGeolocation();
        }
    }

    init();
});
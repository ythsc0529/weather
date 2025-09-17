// 等待 DOM 內容完全載入後再執行
document.addEventListener('DOMContentLoaded', () => {
    // --- 變數定義 ---
    // API 金鑰已移至後端，前端不再需要
    // const CWA_API_KEY = 'CWA-B82FC55A-3350-466B-9B59-D6661FBC21DB'; // !! 請務必替換成您自己的 CWA 授權碼 !!
    // 將 API URL 指向我們的 Netlify Function
    const API_ENDPOINT = '/.netlify/functions/getWeather';
    
    // HTML 元素選擇器
    const cityInput = document.getElementById('city-input');
    const addCityBtn = document.getElementById('add-city-btn');
    const savedCitiesList = document.getElementById('saved-cities-list');
    
    const currentCityName = document.getElementById('current-city-name');
    const weatherAnimationContainer = document.getElementById('weather-animation');
    const currentTempValue = document.getElementById('current-temp-value');
    const currentWeatherDesc = document.getElementById('current-weather-description');
    const currentHumidity = document.getElementById('current-humidity');
    const currentWindSpeed = document.getElementById('current-wind-speed');
    const currentPoP = document.getElementById('current-pop'); // PoP = Probability of Precipitation
    const forecastGrid = document.getElementById('forecast-grid');

    let lottieAnimation; // 用於儲存 Lottie 動畫實例
    let savedCities = JSON.parse(localStorage.getItem('savedCities')) || [];
    const MAX_CITIES = 5;

    // --- 核心函式 ---

    // 根據天氣狀況代碼選擇對應的動畫檔案
    function getWeatherAnimationPath(weatherCode) {
        // CWA 天氣現象代碼: https://opendata.cwa.gov.tw/opendatadoc/DIV2/A0001-001.pdf
        const code = parseInt(weatherCode, 10);
        if ([1].includes(code)) return 'animations/sunny.json'; // 晴天
        if ([2, 3, 4, 5, 6, 7].includes(code)) return 'animations/cloudy.json'; // 多雲、陰天
        if (code >= 8 && code <= 22) return 'animations/rainy.json'; // 各種雨天
        if (code >= 24 && code <= 28) return 'animations/cloudy.json'; // 各種多雲有霧
        if (code >= 29 && code <= 39) return 'animations/rainy.json'; // 各種雷雨
        if ([41, 42].includes(code)) return 'animations/snowy.json'; // 雪天
        return 'animations/cloudy.json'; // 預設
    }

    // 播放 Lottie 動畫
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

    // 獲取並顯示天氣資料
    async function fetchAndDisplayWeather(cityName) {
        currentCityName.textContent = '讀取中...';
        forecastGrid.innerHTML = '';
        
        try {
            // 呼叫我們的 Netlify Function，並將城市名稱作為查詢參數
            const response = await fetch(`${API_ENDPOINT}?locationName=${encodeURIComponent(cityName)}`);
            if (!response.ok) {
                throw new Error('網路回應錯誤');
            }
            const data = await response.json();

            if (data.error || !data.records || data.records.location.length === 0) {
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

    // 更新當前天氣 UI
    function updateCurrentWeatherUI(locationData) {
        const weatherElement = locationData.weatherElement;
        const currentData = {
            city: locationData.locationName,
            wx: weatherElement[0].time[0].parameter, // 天氣現象
            pop: weatherElement[1].time[0].parameter, // 降雨機率
            minT: weatherElement[2].time[0].parameter, // 最低溫度
            maxT: weatherElement[4].time[0].parameter, // 最高溫度
            // 濕度與風速在 F-C0032-001 API 中沒有提供，此處為示意
            // 若需要，需串接另一支 API (如：自動氣象站觀測資料 O-A0001-001)
            // 這裡我們先用降雨機率和溫度範圍替代
        };

        const avgTemp = (parseFloat(currentData.minT.parameterName) + parseFloat(currentData.maxT.parameterName)) / 2;
        
        currentCityName.textContent = currentData.city;
        currentTempValue.textContent = Math.round(avgTemp);
        currentWeatherDesc.textContent = currentData.wx.parameterName;
        currentPoP.textContent = `${currentData.pop.parameterName}%`;
        
        // 濕度和風速為示意，實際需要串接不同 API
        currentHumidity.textContent = '--%'; 
        currentWindSpeed.textContent = '-- m/s';
        
        playLottieAnimation(getWeatherAnimationPath(currentData.wx.parameterValue));
    }
    
    // 更新預報 UI
    function updateForecastUI(locationData) {
        forecastGrid.innerHTML = ''; // 清空舊的預報
        const tempElements = locationData.weatherElement[4].time; // 最高溫
        const weatherElements = locationData.weatherElement[0].time; // 天氣現象

        for (let i = 0; i < tempElements.length; i++) {
            const time = tempElements[i].startTime.split(' ')[1].substring(0, 5); // 取 HH:mm
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
    
    // 新增城市
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
    
    // 渲染已儲存的城市按鈕
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

    // 設定當前活躍的城市按鈕樣式
    function setActiveCityButton(activeCity) {
        document.querySelectorAll('.city-btn').forEach(btn => {
            if (btn.textContent === activeCity) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // 透過瀏覽器 API 獲取使用者地理位置
    function getGeolocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async position => {
                const { latitude, longitude } = position.coords;
                // 注意：CWA API 不直接支援經緯度查詢鄉鎮天氣預報
                // 這裡需要一個 "反向地理編碼" 服務將經緯度轉成城市名
                // 為簡化，我們先預設一個城市，例如臺北市
                console.log(`獲取到經緯度: ${latitude}, ${longitude}。此範例將預設載入臺北市。`);
                fetchAndDisplayWeather('臺北市');
            }, error => {
                console.error("地理定位失敗:", error.message);
                // 如果使用者拒絕或定位失敗，預設載入一個城市
                fetchAndDisplayWeather('臺北市');
            });
        } else {
            console.log("此瀏覽器不支援地理定位。");
            // 不支援定位，預設載入一個城市
            fetchAndDisplayWeather('臺北市');
        }
    }

    // --- 事件監聽 ---
    addCityBtn.addEventListener('click', addCity);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addCity();
        }
    });

    // --- 初始化 ---
    function init() {
        renderSavedCities();
        if (savedCities.length > 0) {
            fetchAndDisplayWeather(savedCities[0]);
        } else {
            getGeolocation(); // 嘗試自動定位
        }
    }

    init();
});
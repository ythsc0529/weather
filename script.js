// 等待 DOM 內容完全載入後再執行
document.addEventListener('DOMContentLoaded', () => {
    const API_ENDPOINT = '/.netlify/functions/getWeather';
    
    // HTML 元素選擇器
    const citySelector = document.getElementById('city-selector');
    
    const currentCityName = document.getElementById('current-city-name');
    const weatherAnimationContainer = document.getElementById('weather-animation');
    const currentTempValue = document.getElementById('current-temp-value');
    const currentWeatherDesc = document.getElementById('current-weather-description');
    const currentHumidity = document.getElementById('current-humidity');
    const currentWindSpeed = document.getElementById('current-wind-speed');
    const currentPoP = document.getElementById('current-pop'); // PoP = Probability of Precipitation
    const forecastGrid = document.getElementById('forecast-grid');
    const currentObservationTime = document.getElementById('current-observation-time');
    const currentApparentTemp = document.getElementById('current-apparent-temp');

    let lottieAnimation; // 用於儲存 Lottie 動畫實例

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
        };

        // 擷取時間（使用天氣現象的 time.startTime 作為該狀態的時間）
        let obsTime = '--';
        try {
            const startTime = weatherElement[0].time[0].startTime; // 格式通常為 "YYYY-MM-DD HH:mm:ss"
            // 只保留日期與時分
            obsTime = startTime ? startTime.replace(':00', '').replace(/^\s+|\s+$/g, '') : '--';
        } catch (e) {
            obsTime = '--';
        }

        // 嘗試尋找「體感溫度」元素（不同資料集名稱可能不同）
        let apparent = '--';
        try {
            const apparentEl = weatherElement.find(el => {
                const name = (el.elementName || '').toString().toLowerCase();
                const desc = (el.description || '').toString().toLowerCase();
                // 包含多種可能命名（AT、apparent、體感、comfort）
                return name.includes('at') || name.includes('apparent') || name.includes('apparenttemperature') || desc.includes('體感') || name.includes('comfort');
            });
            if (apparentEl && apparentEl.time && apparentEl.time[0] && apparentEl.time[0].parameter) {
                apparent = apparentEl.time[0].parameter.parameterName;
            }
        } catch (e) {
            apparent = '--';
        }

        const avgTemp = (parseFloat(currentData.minT.parameterName) + parseFloat(currentData.maxT.parameterName)) / 2;
        
        currentCityName.textContent = currentData.city;
        currentTempValue.textContent = Math.round(avgTemp);
        currentWeatherDesc.textContent = currentData.wx.parameterName;
        currentPoP.textContent = `${currentData.pop.parameterName}%`;
        
        // 濕度和風速為示意，實際需要串接不同 API
        currentHumidity.textContent = '--%'; 
        currentWindSpeed.textContent = '-- m/s';

        // 顯示擷取時間與體感溫度
        currentObservationTime.textContent = `擷取時間: ${obsTime}`;
        currentApparentTemp.textContent = (apparent !== '--') ? `${apparent}°C` : '--';
        
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
            const weatherCode = weatherElements[i].parameter.parameterValue;

            const forecastCard = document.createElement('div');
            forecastCard.className = 'forecast-card';
            forecastCard.innerHTML = `
                <p class="forecast-time">${time}</p>
                <img src="${getWeatherIconPath(weatherCode)}" alt="${weatherElements[i].parameter.parameterName}" class="forecast-icon">
                <p class="forecast-temp">${temp}°</p>
            `;
            forecastGrid.appendChild(forecastCard);
        }
    }

    // 根據天氣代碼獲取圖示路徑
    function getWeatherIconPath(weatherCode) {
        const code = parseInt(weatherCode, 10);
        if ([1].includes(code)) return 'icons/day-clear.svg'; // 晴天
        if ([2, 3].includes(code)) return 'icons/day-cloudy.svg'; // 晴時多雲
        if ([4, 5, 6, 7].includes(code)) return 'icons/cloudy.svg'; // 多雲、陰天
        if (code >= 8 && code <= 22) return 'icons/rain.svg'; // 各種雨天
        if (code >= 24 && code <= 28) return 'icons/fog.svg'; // 各種多雲有霧
        if (code >= 29 && code <= 39) return 'icons/thunderstorm.svg'; // 各種雷雨
        if ([41, 42].includes(code)) return 'icons/snow.svg'; // 雪天
        return 'icons/cloudy.svg'; // 預設
    }

    // --- 事件監聽 ---
    citySelector.addEventListener('change', (e) => {
        fetchAndDisplayWeather(e.target.value);
    });

    // --- 初始化 ---
    function init() {
        // 預設載入第一個城市（臺北市）的天氣
        fetchAndDisplayWeather(citySelector.value);
    }

    init();
});
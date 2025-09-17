exports.handler = async function(event, context) {
    // 從 Netlify 環境變數中讀取 API 金鑰
    const CWA_API_KEY = process.env.CWA_API_KEY;
    const CWA_API_URL = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001';

    // 從前端請求的 URL 中獲取城市名稱
    const { locationName } = event.queryStringParameters;

    if (!locationName) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: '缺少 locationName 參數' })
        };
    }

    try {
        // 組合真正的 CWA API URL
        const apiUrl = `${CWA_API_URL}?Authorization=${CWA_API_KEY}&locationName=${encodeURIComponent(locationName)}`;
        
        // 使用 fetch 向 CWA API 發送請求
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) {
            // 如果 CWA API 回應錯誤，將其傳遞給前端
            return {
                statusCode: response.status,
                body: JSON.stringify(data)
            };
        }

        // 成功後將 CWA 的資料回傳給前端
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Netlify function 發生錯誤:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: '伺服器內部錯誤' })
        };
    }
};
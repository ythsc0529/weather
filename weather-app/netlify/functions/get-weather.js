const fetch = require('node-fetch');

const CWA_API_KEY = 'CWA-B82FC55A-3350-466B-9B59-D6661FBC21DB'; // Replace with your own CWA API key
const CWA_API_URL = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001';

exports.handler = async (event, context) => {
    const { queryStringParameters } = event;
    const cityName = queryStringParameters.cityName;

    if (!cityName) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'City name is required' }),
        };
    }

    try {
        const response = await fetch(`${CWA_API_URL}?Authorization=${CWA_API_KEY}&locationName=${encodeURIComponent(cityName)}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch weather data' }),
        };
    }
};
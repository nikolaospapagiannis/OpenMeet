const axios = require('axios');

async function testTopicAPI() {
  try {
    const response = await axios.get('http://localhost:4000/api/topics', {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    console.log('API Response:', response.status, response.statusText);
    console.log('Response headers:', response.headers);
  } catch (error) {
    console.log('API call attempted to:', error.config?.url);
    console.log('Error:', error.code || error.message);
  }
}

testTopicAPI();

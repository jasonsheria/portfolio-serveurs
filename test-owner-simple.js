const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvYWNxdWltZWdhY2hAZ21haWwuY29tIiwic3ViIjoiNjhhZjk5ZDcyMzZkNWFlNmE0ZmMyZjc2IiwiaWF0IjoxNzU2NjIwNTI3LCJleHAiOjE3NTY2Mjc3Mjd9.JxzCekS3pvD-A0KS2x__5tw7IVR6IF3-GrEa3nLlmGg';

const data = {
  meta: {
    form: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+243999888777",
      address: "123 Test St"
    },
    types: ["house", "apartment"]
  }
};

axios.post('http://localhost:3000/api/owner/create', data, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  // console.log('Response:', response.data);
})
.catch(error => {
  console.error('Error:', error.response ? {
    status: error.response.status,
    data: error.response.data
  } : error.message);
});

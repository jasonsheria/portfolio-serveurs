const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// Token JWT
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvYWNxdWltZWdhY2hAZ21haWwuY29tIiwic3ViIjoiNjhhZjk5ZDcyMzZkNWFlNmE0ZmMyZjc2IiwiaWF0IjoxNzU2NjIwNTI3LCJleHAiOjE3NTY2Mjc3Mjd9.JxzCekS3pvD-A0KS2x__5tw7IVR6IF3-GrEa3nLlmGg';

// Create test files
fs.writeFileSync('test-id.jpg', 'Test ID Image');
fs.writeFileSync('test-property.jpg', 'Test Property Image');

// Create form data
const formData = new FormData();
formData.append('idFile', fs.createReadStream('test-id.jpg'));
formData.append('propertyTitle', fs.createReadStream('test-property.jpg'));

const metadata = {
  form: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+243999888777',
    address: '123 Test St, Kinshasa'
  },
  types: ['house', 'apartment']
};

formData.append('meta', JSON.stringify(metadata));

// Make the request
axios.post('http://localhost:3000/api/owner/create', formData, {
  headers: {
    ...formData.getHeaders(),
    'Authorization': `Bearer ${token}`
  }
})
.then(response => {
  console.log('Success:', response.data);
})
.catch(error => {
  console.error('Error:', error.response ? error.response.data : error.message);
})
.finally(() => {
  // Clean up test files
  fs.unlinkSync('test-id.jpg');
  fs.unlinkSync('test-property.jpg');
});

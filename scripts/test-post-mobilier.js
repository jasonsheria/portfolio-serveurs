const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Replace the token below with the one you provided or set TEST_MOBILIER_TOKEN env var
const token = process.env.TEST_MOBILIER_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Imphc29uZ2FjaGFiYTFAZ21haWwuY29tIiwic3ViIjoiNjg1ODAzN2Q1YTBmZmE1OTYxZjMwZmRiIiwiaWF0IjoxNzY0MjIxMDM2LCJleHAiOjE3NjQyMjgyMzZ9.Lfx-CKDOHSsfWAljiZ2DRRHhJOlomj6IefDO9CZFrVs';

const filePath = path.resolve(__dirname, '__cloudinary_tmp_test.png');
if (!fs.existsSync(filePath)) {
  console.error('Test image not found:', filePath);
  process.exit(2);
}

const data = { titre: 'Test Mobilier Cloudinary', prix: 123 };

async function run() {
  try {
    const form = new FormData();
    form.append('data', JSON.stringify(data));
    form.append('images', fs.createReadStream(filePath));

    const url = 'http://localhost:5000/api/mobilier';
    console.log('Posting to', url);

    const res = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: null
    });

    console.log('Status:', res.status);
    try { console.log('Body:', JSON.stringify(res.data, null, 2)); } catch (e) { console.log('Body (raw):', res.data); }

    if (res.status >= 200 && res.status < 300) {
      console.log('\n--- Validation of images field ---');
      const images = res.data?.images || res.data?.images || [];
      if (Array.isArray(images) && images.length > 0) {
        images.forEach((u, i) => console.log(`${i}: ${u}`));
      } else {
        console.warn('No images array found in response.');
      }
    } else {
      console.error('Request failed with status', res.status);
      process.exit(3);
    }
  } catch (err) {
    console.error('Error posting:', err.message || err);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response body:', err.response.data);
    }
    process.exit(4);
  }
}

run();

// Simple test script to upload a local file to Cloudinary and print the response.
// Usage (PowerShell):
// set-item env:CLOUDINARY_CLOUD_NAME "your_cloud_name"; set-item env:CLOUDINARY_API_KEY "key"; set-item env:CLOUDINARY_API_SECRET "secret"; node scripts/test-upload-cloudinary.js ./path/to/file.jpg

import 'dotenv/config';
import cloudinary from 'cloudinary';
import fs from 'fs';

const argv = process.argv.slice(2);
let filePath = argv[0];

// If no file provided, create a tiny 1x1 PNG and upload it — handy for quick tests.
const tmpFile = 'scripts/__cloudinary_tmp_test.png';
if (!filePath) {
  // 1x1 transparent PNG
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6Wl3mIAAAAASUVORK5CYII=';
  if (!fs.existsSync('scripts')) {
    try { fs.mkdirSync('scripts'); } catch (e) { /* ignore */ }
  }
  fs.writeFileSync(tmpFile, Buffer.from(pngBase64, 'base64'));
  filePath = tmpFile;
  // console.log('No file provided — created tiny test PNG at', filePath);
}

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const uploadFolder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'apiena_tests';

if (!cloudName || !apiKey || !apiSecret) {
  console.error('Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in env');
  process.exit(1);
}

cloudinary.v2.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

(async () => {
  try {
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      process.exit(1);
    }

    // Diagnostic: show (masked) env vars and basic checks
    const env = {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
      CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER,
    };
    // console.log('Cloudinary env (masked):');
    function mask(s) { if (!s) return '<missing>'; return s.length>6 ? s.slice(0,3)+'...'+s.slice(-3) : '***'; }
    // console.log('  CLOUDINARY_CLOUD_NAME:', env.CLOUDINARY_CLOUD_NAME ? env.CLOUDINARY_CLOUD_NAME : '<missing>');
    // console.log('  CLOUDINARY_API_KEY:', mask(env.CLOUDINARY_API_KEY));
    // console.log('  CLOUDINARY_API_SECRET:', env.CLOUDINARY_API_SECRET ? ('len='+env.CLOUDINARY_API_SECRET.length) : '<missing>');
    // console.log('  CLOUDINARY_UPLOAD_FOLDER:', env.CLOUDINARY_UPLOAD_FOLDER || '<default: uploads>');

    // Trim whitespace from env values (in-memory) to avoid accidental spaces
    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').toString().trim();
    const apiKey = (process.env.CLOUDINARY_API_KEY || '').toString().trim();
    const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').toString().trim();
    const uploadFolder = (process.env.CLOUDINARY_UPLOAD_FOLDER || 'uploads').toString().trim();

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('One or more Cloudinary credentials are missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.');
      process.exit(1);
    }

    cloudinary.v2.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    // console.log('Performing Cloudinary API auth check (listing 1 resource)...');
    try {
      // This will fail with 401 if credentials are invalid
      const resCheck = await cloudinary.v2.api.resources({ max_results: 1 });
      // console.log('Cloudinary auth check: OK. sample resources count:', resCheck.resources ? resCheck.resources.length : 0);
    } catch (ckErr) {
      console.error('Cloudinary auth check failed:');
      // Show as much info as possible without leaking secret
      if (ckErr && ckErr.http_code) console.error('  http_code =', ckErr.http_code);
      if (ckErr && ckErr.message) console.error('  message =', ckErr.message);
      // continue to attempt upload so uploader error is shown as well
    }

    // console.log('Uploading', filePath, 'to Cloudinary...');
    const res = await cloudinary.v2.uploader.upload(filePath, {
      folder: uploadFolder,
      use_filename: true,
      unique_filename: true,
      resource_type: 'auto',
    });
    // console.log('Upload successful:');
    // console.log('public_id:', res.public_id);
    // console.log('secure_url:', res.secure_url);
    // console.log('raw response:', res);
      // Cleanup tmp file if we created it
      if (filePath === tmpFile) {
        try { fs.unlinkSync(tmpFile); } catch (e) { /* ignore */ }
      }
  } catch (err) {
    console.error('Upload failed:', err);
    process.exit(2);
  }
})();

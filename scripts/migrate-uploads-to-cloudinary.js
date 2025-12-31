#!/usr/bin/env node
/**
 * scripts/migrate-uploads-to-cloudinary.js
 *
 * Scans every collection in the configured MongoDB and looks for string values
 * that reference local uploads (contain `/uploads/` or start with `uploads/`).
 * For each found local file it will upload to Cloudinary and update the document
 * replacing the local path with the Cloudinary `secure_url`.
 *
 * Usage:
 *   node migrate-uploads-to-cloudinary.js --dry-run
 *   node migrate-uploads-to-cloudinary.js --apply --remove-local
 *
 * Environment variables (required):
 *   MONGODB_URI (e.g. mongodb://user:pass@host:port/db)
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *   (optional) UPLOADS_DIR - if you use a custom uploads base dir
 *
 * Notes:
 * - The script is conservative by default (dry-run). Use --apply to make changes.
 * - Use --remove-local to delete the original local file after successful upload.
 * - The script updates documents with simple dot-path assignment. It supports
 *   nested fields and array elements.
 */

const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

async function main() {
  const argv = process.argv.slice(2);
  const flags = {};
  for (const a of argv) {
    if (a === '--dry-run') flags.dryRun = true;
    if (a === '--apply') flags.apply = true;
    if (a === '--remove-local') flags.removeLocal = true;
    if (a.startsWith('--limit=')) flags.limit = parseInt(a.split('=')[1], 10) || 0;
    if (a.startsWith('--batch=')) flags.batch = parseInt(a.split('=')[1], 10) || 100;
  }

  if (!flags.apply) flags.dryRun = true; // default to dry-run unless --apply provided

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI (or MONGO_URI) environment variable is required');
    process.exit(2);
  }

  const uploadsBase = process.env.UPLOADS_DIR
    ? process.env.UPLOADS_DIR
    : (process.env.NODE_ENV === 'production' ? '/upload' : path.join(process.cwd(), 'uploads'));

  // configure cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
    secure: true,
  });

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set.');
    process.exit(2);
  }

  const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  // console.log('Connected to MongoDB');

  const db = client.db();
  const collections = await db.listCollections().toArray();
  // console.log(`Found ${collections.length} collections`);

  const summary = { examinedDocs: 0, matchesFound: 0, uploads: 0, errors: 0, updates: 0 };

  const batchSize = flags.batch || 100;

  for (const coll of collections) {
    const collName = coll.name;
    // console.log('\n-- Processing collection:', collName);
    const collection = db.collection(collName);

    // iterate with a cursor to avoid loading whole collection
    const cursor = collection.find({}, { batchSize });
    let i = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      i += 1;
      summary.examinedDocs += 1;

      const found = findUploadPathsInDoc(doc);
      if (found.length === 0) continue;

      summary.matchesFound += found.length;
      // console.log(`Document _id=${doc._id} has ${found.length} upload path(s)`);

      // build updates for this document
      const updates = {};
      for (const f of found) {
        const orig = f.value;
        // normalize path string
        const normalized = orig.startsWith('/') ? orig.slice(1) : orig;
        const localPath = orig.startsWith('/') ? path.join('/', normalized) : path.join(uploadsBase, normalized.replace(/^uploads\//, ''));

        // Try to map path to actual filesystem path
        let absoluteLocalPath = localPath;
        if (!path.isAbsolute(absoluteLocalPath)) {
          absoluteLocalPath = path.join(uploadsBase, normalized.replace(/^uploads\//, ''));
        }

        if (!fs.existsSync(absoluteLocalPath)) {
          console.warn(`  local file not found for doc ${doc._id} field ${f.dotPath}: ${absoluteLocalPath}`);
          summary.errors += 1;
          continue;
        }

        // infer cloudinary folder from upload path: /uploads/<folder>/...
        let inferredFolder = 'general';
        const parts = normalized.split('/');
        if (parts.length >= 2 && parts[0] === 'uploads') {
          inferredFolder = parts[1];
        } else if (parts.length >= 1) {
          inferredFolder = parts[0];
        }

        // console.log(`  Will upload ${absoluteLocalPath} -> Cloudinary folder ${inferredFolder}`);
        if (flags.dryRun) {
          updates[f.dotPath] = `DRY_RUN_WOULD_UPLOAD:${absoluteLocalPath}`;
          summary.uploads += 1;
          continue;
        }

        // perform upload
        try {
          const uploadFolder = (process.env.CLOUDINARY_UPLOAD_FOLDER || 'app_uploads') + '/' + inferredFolder;
          const result = await cloudinary.uploader.upload(absoluteLocalPath, { folder: uploadFolder, use_filename: true, unique_filename: false, resource_type: 'auto' });
          summary.uploads += 1;
          const secure = result.secure_url || result.url;
          updates[f.dotPath] = secure;
          // console.log(`    uploaded -> ${secure}`);
          if (flags.removeLocal) {
            try { fs.unlinkSync(absoluteLocalPath); // console.log(`    removed local file ${absoluteLocalPath}`); } catch (e) { console.warn(`    failed to remove ${absoluteLocalPath}: ${e.message}`); }
          }
        } catch (err) {
          console.error(`    upload failed for ${absoluteLocalPath}:`, err.message || err);
          summary.errors += 1;
        }
      }

      // apply updates if any and not dry-run
      if (!flags.dryRun && Object.keys(updates).length > 0) {
        // convert updates from dotPath to $set object
        const setObj = {};
        for (const dp of Object.keys(updates)) setObj[dp] = updates[dp];
        try {
          const res = await collection.updateOne({ _id: doc._id }, { $set: setObj });
          summary.updates += res.modifiedCount || 0;
          // console.log(`  updated doc ${doc._id}, modifiedCount=${res.modifiedCount}`);
        } catch (err) {
          console.error(`  failed to update doc ${doc._id}:`, err.message || err);
          summary.errors += 1;
        }
      } else if (flags.dryRun && Object.keys(updates).length > 0) {
        // console.log(`  [dry-run] would update doc ${doc._id} with ${Object.keys(updates).length} fields`);
      }

      if (flags.limit && summary.examinedDocs >= flags.limit) break;
    }
    if (flags.limit && summary.examinedDocs >= flags.limit) break;
  }

  // console.log('\nMigration summary:', summary);
  await client.close();
  // console.log('Disconnected from MongoDB');
}

/**
 * Walk the document and return list of { dotPath, value } where value is a string that looks like an upload
 */
function findUploadPathsInDoc(obj) {
  const results = [];
  function walk(node, pathSegments) {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      const v = node;
      if (v.includes('/uploads/') || v.startsWith('uploads/') || v.startsWith('/uploads/')) {
        results.push({ dotPath: pathSegments.join('.'), value: v });
      }
      return;
    }
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        walk(node[i], pathSegments.concat([i]));
      }
      return;
    }
    if (typeof node === 'object') {
      for (const k of Object.keys(node)) {
        walk(node[k], pathSegments.concat([k]));
      }
    }
  }
  walk(obj, []);
  return results;
}

main().catch(err => { console.error('Fatal error', err); process.exit(1); });

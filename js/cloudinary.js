// cloudinary.js
// Provides uploadToCloudinary(file) for unsigned browser uploads.
// Place this file before profile.js and post.js.
async function uploadToCloudinary(file, onProgress) {
  if (!file) return '';
  const cfg = window.CLOUDINARY || {};
  const CLOUD_NAME = cfg.cloudName;
  const UPLOAD_PRESET = cfg.uploadPreset;
  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error('Cloudinary config missing (cloudName/uploadPreset)');

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);

  // fetch-based upload (no progress event support broadly)
  const res = await fetch(url, { method: 'POST', body: fd });
  const data = await res.json();
  if (res.ok && data && data.secure_url) return data.secure_url;
  // Normalize error
  const errMsg = data && data.error ? JSON.stringify(data.error) : (res.statusText || 'Cloudinary upload failed');
  throw new Error('Cloudinary upload failed: ' + errMsg);
}
window.uploadToCloudinary = uploadToCloudinary;

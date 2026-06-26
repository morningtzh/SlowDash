const fs = require('fs');

async function uploadFileToPresignedUrl(presignedUrl, filePath, contentType = 'application/octet-stream') {
  if (!presignedUrl) throw new Error('presignedUrl is required');
  const buffer = fs.readFileSync(filePath);
  return uploadBufferToPresignedUrl(presignedUrl, buffer, contentType);
}

async function uploadBufferToPresignedUrl(presignedUrl, buffer, contentType = 'application/octet-stream') {
  if (!presignedUrl) throw new Error('presignedUrl is required');
  // Use native fetch available in Node 18+
  const res = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buffer.length)
    },
    body: buffer
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload failed: ${res.status} ${res.statusText} ${text}`);
  }

  return true;
}

module.exports = { uploadFileToPresignedUrl, uploadBufferToPresignedUrl };

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

function buildS3Client(cfg) {
  const options = {};
  if (cfg.region) options.region = cfg.region;
  if (cfg.endpoint) options.endpoint = cfg.endpoint;
  if (cfg.access_key_id && cfg.secret_access_key) {
    options.credentials = {
      accessKeyId: cfg.access_key_id,
      secretAccessKey: cfg.secret_access_key
    };
  }
  if (cfg.forcePathStyle !== undefined) options.forcePathStyle = !!cfg.forcePathStyle;
  return new S3Client(options);
}

function buildPublicUrl(cfg, key) {
  const normalizedKey = (key || '').replace(/^\/+/, '');
  if (cfg && cfg.public_url) {
    const base = cfg.public_url.replace(/\/+$/, '');
    const encodedKey = normalizedKey.split('/').map(segment => encodeURIComponent(segment)).join('/');
    return `${base}/${encodedKey}`;
  }

  if (cfg && cfg.endpoint) {
    const ep = cfg.endpoint.replace(/\/$/, '');
    return `${ep}/${cfg.bucket}/${encodeURIComponent(normalizedKey)}`;
  }

  if (cfg && cfg.region) {
    return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${encodeURIComponent(normalizedKey)}`;
  }

  return `s3://${cfg.bucket}/${normalizedKey}`;
}

async function uploadFileToS3(cfg, filePath, key) {
  if (!cfg || !cfg.bucket) throw new Error('S3 config.bucket required');
  const client = buildS3Client(cfg);
  const Body = fs.createReadStream(filePath);
  Body.on('error', (err) => {
    console.error('[S3] Stream error reading file:', err.message);
  });
  const params = {
    Bucket: cfg.bucket,
    Key: key,
    Body,
    ContentType: 'image/png'
  };
  if (cfg.public) params.ACL = 'public-read';

  const cmd = new PutObjectCommand(params);
  const res = await client.send(cmd);

  const url = buildPublicUrl(cfg, key);

  return { res, url };
}

module.exports = { uploadFileToS3, buildPublicUrl };

const { S3Client } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1', // Reemplaza con tu región
});

module.exports = s3Client;

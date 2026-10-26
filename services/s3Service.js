const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION || 'us-east-1';

let s3Client = null;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && bucketName) {
    s3Client = new S3Client({
        region,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });
    console.log('☁️ AWS S3 Client inicializado con éxito');
} else {
    console.log('📁 Modo de almacenamiento local activo (configure AWS_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY para AWS S3)');
}

/**
 * Sube un archivo a S3 si está configurado, o retorna la ruta relativa local
 * @param {string} localFilePath - Ruta física del archivo
 * @param {string} s3Key - Clave/nombre en S3 (ej: 'posts/imagen.jpg')
 * @param {string} contentType - Mime type (ej: 'image/jpeg')
 * @returns {Promise<string>} URL de S3 o ruta local
 */
async function subirArchivoS3(localFilePath, s3Key, contentType = 'image/jpeg') {
    if (!s3Client || !bucketName) {
        // Fallback a ruta local
        return `/uploads/${s3Key.replace(/^uploads\//, '')}`;
    }

    try {
        const fileContent = fs.readFileSync(localFilePath);
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType
        });

        await s3Client.send(command);
        return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
    } catch (err) {
        console.error('Error al subir a S3:', err.message);
        // Si falla S3, retorna la ruta local como respaldo
        return `/uploads/${s3Key.replace(/^uploads\//, '')}`;
    }
}

module.exports = {
    subirArchivoS3,
    estaHabilitadoS3: () => !!s3Client
};

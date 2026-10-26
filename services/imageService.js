const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Procesa una imagen subida creando automáticamente:
 * 1. Miniatura (Thumbnail) optimizada (400x400 px, recorte centrado)
 * 2. Transformación 1: Blanco y Negro (Grayscale)
 * 3. Transformación 2: Sepia cálido (Tono vintage)
 * 4. Transformación 3: Escala reducida / Optimización alta definición (Scale 50%)
 *
 * @param {string} inputPath - Ruta absoluta o relativa al archivo original
 * @param {string} outputDir - Carpeta donde se guardarán las transformaciones
 * @param {string} filename - Nombre base del archivo original
 * @returns {Promise<Object>} Rutas relativas de cada versión
 */
async function procesarTransformaciones(inputPath, outputDir, filename) {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);

    const thumbName = `${baseName}_thumb.jpg`;
    const bwName = `${baseName}_bw.jpg`;
    const sepiaName = `${baseName}_sepia.jpg`;
    const scaleName = `${baseName}_scale.jpg`;

    const thumbPath = path.join(outputDir, thumbName);
    const bwPath = path.join(outputDir, bwName);
    const sepiaPath = path.join(outputDir, sepiaName);
    const scalePath = path.join(outputDir, scaleName);

    // 1. Miniatura tipo Instagram (400x400 cuadrada)
    await sharp(inputPath)
        .rotate() // Respeta orientación EXIF
        .resize(400, 400, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 85 })
        .toFile(thumbPath);

    // 2. Transformación Blanco y Negro (Grayscale)
    await sharp(inputPath)
        .rotate()
        .grayscale()
        .jpeg({ quality: 90 })
        .toFile(bwPath);

    // 3. Transformación Sepia
    // Aplicamos tinte sepia cálido mediante modulación y recombinación de canales
    await sharp(inputPath)
        .rotate()
        .modulate({
            brightness: 1.05,
            saturation: 0.6
        })
        .tint({ r: 112, g: 66, b: 20 })
        .jpeg({ quality: 90 })
        .toFile(sepiaPath);

    // 4. Transformación Escala Reducida / Invertido / Efecto Artístico
    // Reducción al 50% de escala con aumento de contraste y nitidez
    const metadata = await sharp(inputPath).metadata();
    const newWidth = Math.max(100, Math.round((metadata.width || 800) * 0.5));
    await sharp(inputPath)
        .rotate()
        .resize({ width: newWidth })
        .sharpen()
        .jpeg({ quality: 85 })
        .toFile(scalePath);

    return {
        original: `/uploads/posts/${filename}`,
        miniatura: `/uploads/posts/${thumbName}`,
        transformaciones: {
            blancoYNegro: `/uploads/posts/${bwName}`,
            sepia: `/uploads/posts/${sepiaName}`,
            escalaReducida: `/uploads/posts/${scaleName}`
        }
    };
}

module.exports = {
    procesarTransformaciones
};

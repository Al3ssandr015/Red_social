const multer = require('multer');
const path = require('path');

// ─── Función para crear storage según carpeta destino ─────────────────────────
const crearStorage = (destino) => multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', destino));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const nombre = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, nombre);
    }
});

// ─── Filtro: solo imágenes ─────────────────────────────────────────────────────
const filtroImagenes = (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png|gif|webp/;
    const ext  = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
    const mime = tiposPermitidos.test(file.mimetype);
    if (ext && mime) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
    }
};

const limite = { fileSize: 5 * 1024 * 1024 }; // 5 MB

// ─── Instancias de multer por tipo ────────────────────────────────────────────
const uploadAvatar   = multer({ storage: crearStorage('avatars'),  fileFilter: filtroImagenes, limits: limite });
const uploadPortada  = multer({ storage: crearStorage('portadas'), fileFilter: filtroImagenes, limits: limite });
const uploadPost     = multer({ storage: crearStorage('posts'),    fileFilter: filtroImagenes, limits: limite });

module.exports = { uploadAvatar, uploadPortada, uploadPost };

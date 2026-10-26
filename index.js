require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const conectarDB = require('./database/connection');

if (!process.env.JWT_SECRET) {
    console.error('❌ Falta JWT_SECRET en el archivo .env');
    process.exit(1);
}

// Asegura que existan las carpetas de imágenes
['avatars', 'portadas', 'posts'].forEach(d =>
    fs.mkdirSync(path.join(__dirname, 'uploads', d), { recursive: true })
);

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Conexión a Base de Datos ────────────────────────────────────────────────
conectarDB();

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public'))); // Frontend estático tipo Instagram
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Imágenes y transformaciones

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/usuarios', require('./routes/user'));
app.use('/api/publicaciones', require('./routes/publication'));
app.use('/api/follow', require('./routes/follow'));

// Endpoint informativo de la API
app.get('/api', (req, res) => {
    res.status(200).json({
        mensaje: '🚀 API InstaRed (Red Social Fotográfica) funcionando correctamente',
        version: '2.0.0 - Proyecto Final UMG',
        requerimientos_implementados: {
            req1_autenticacion: 'Página de bienvenida, Google Login API y Google reCAPTCHA integrados',
            req2_miniaturas: 'Página de inicio con miniaturas creadas con Sharp (estilo Instagram)',
            req3_reconocimiento: 'Subida de fotografías con reconocimiento facial vía face-api.js',
            req4_transformaciones: '3 transformaciones automáticas (Blanco y Negro, Sepia, Escala) generadas con Sharp',
            req5_resolucion_completa: 'Visor modal interactivo de fotos en alta resolución con selector de transformaciones',
            req6_almacenamiento_nube: 'Integración y arquitectura para AWS S3 y base de datos con salting por usuario'
        },
        endpoints: {
            usuarios: {
                'POST /api/usuarios': 'Crear usuario con salt individual y reCAPTCHA',
                'POST /api/usuarios/login': 'Iniciar sesión',
                'POST /api/usuarios/google': 'Iniciar sesión / registrarse con Google Login API',
                'GET /api/usuarios/yo': 'Usuario de la sesión actual',
                'PUT /api/usuarios/:id/seguir': 'Seguir / dejar de seguir',
                'GET /api/usuarios': 'Listar usuarios',
                'GET /api/usuarios/:id': 'Obtener usuario',
                'GET /api/usuarios/:id/publicaciones': 'Publicaciones de un usuario'
            },
            publicaciones: {
                'POST /api/publicaciones': 'Crear publicación con imagen, miniatura y 3 transformaciones automáticas (Sharp/S3)',
                'GET /api/publicaciones': 'Listar (?limite, ?antes, ?feed=siguiendo, ?usuario, ?q)',
                'GET /api/publicaciones/:id': 'Obtener publicación con transformaciones',
                'PUT /api/publicaciones/:id': 'Actualizar publicación',
                'DELETE /api/publicaciones/:id': 'Eliminar publicación y archivos asociados',
                'PUT /api/publicaciones/:id/like': 'Dar / quitar like'
            },
            comentarios: {
                'POST /api/publicaciones/:id/comentarios': 'Crear comentario en publicación',
                'GET /api/publicaciones/:id/comentarios': 'Listar comentarios'
            }
        }
    });
});

// Manejo de errores de subida de imágenes (Multer)
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera los 5 MB permitidos' : err.message;
        return res.status(400).json({ mensaje: msg });
    }
    if (err) return res.status(400).json({ mensaje: err.message || 'Error en la solicitud' });
    next();
});

// Ruta 404 para API
app.use('/api/*', (req, res) => {
    res.status(404).json({ mensaje: 'Ruta de API no encontrada' });
});

// Fallback al frontend para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Servidor InstaRed corriendo en http://localhost:${PORT}`);
});

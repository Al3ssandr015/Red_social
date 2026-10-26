const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { uploadAvatar, uploadPortada } = require('../middlewares/upload');
const {
    crearUsuario,
    seguirUsuario,
    login,
    loginGoogle,
    obtenerYo,
    obtenerUsuarios,
    obtenerUsuarioPorId,
    obtenerPublicacionesPorUsuario,
    subirFotoPerfil,
    subirFotoPortada,
    actualizarUsuario
} = require('../controllers/user');

router.post('/', crearUsuario);
router.post('/login', login);
router.post('/google', loginGoogle); // Requerimiento 1: Google Login API
router.get('/yo', auth, obtenerYo);   // antes de '/:id'
router.get('/', obtenerUsuarios);
router.get('/:id', auth.opcional, obtenerUsuarioPorId);
router.put('/:id/seguir', auth, seguirUsuario);
router.get('/:id/publicaciones', obtenerPublicacionesPorUsuario);

// Subida de imágenes de perfil
router.put('/:id/foto-perfil',  auth, uploadAvatar.single('fotoPerfil'),   subirFotoPerfil);
router.put('/:id/foto-portada', auth, uploadPortada.single('fotoPortada'), subirFotoPortada);

router.put('/update/:id', auth, actualizarUsuario);

module.exports = router;

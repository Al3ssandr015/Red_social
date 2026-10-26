const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { uploadPost } = require('../middlewares/upload');
const {
    crearPublicacion,
    obtenerPublicaciones,
    obtenerPublicacionPorId,
    actualizarPublicacion,
    eliminarPublicacion,
    darLike
} = require('../controllers/publication');
const {
    crearComentario,
    obtenerComentarios
} = require('../controllers/comment');

// uploadPost.single('imagen') procesa multipart/form-data y pone el archivo en req.file
router.post('/',    auth, uploadPost.single('imagen'), crearPublicacion);
router.get('/',     auth.opcional, obtenerPublicaciones);
router.get('/:id',  auth.opcional, obtenerPublicacionPorId);
router.put('/:id',  auth, actualizarPublicacion);
router.delete('/:id', auth, eliminarPublicacion);
router.put('/:id/like', auth, darLike);

router.post('/:id/comentarios', auth, crearComentario);
router.get('/:id/comentarios',  obtenerComentarios);

module.exports = router;

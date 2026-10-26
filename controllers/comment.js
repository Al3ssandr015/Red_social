const Comentario = require('../models/comment');
const Publicacion = require('../models/publication');
const Usuario = require('../models/user');

// POST /api/publicaciones/:id/comentarios - Crear comentario
const crearComentario = async (req, res) => {
    try {
        const usuario = req.userId;            // siempre el usuario de la sesión
        const comentario = (req.body.comentario || '').trim();
        const publicacionId = req.params.id;

        if (!comentario) {
            return res.status(400).json({ mensaje: 'El comentario es obligatorio' });
        }

        // Verificar que la publicación existe
        const publicacionExiste = await Publicacion.findById(publicacionId);
        if (!publicacionExiste) {
            return res.status(404).json({ mensaje: 'Publicación no encontrada' });
        }

        // Verificar que el usuario existe
        const usuarioExiste = await Usuario.findById(usuario);
        if (!usuarioExiste) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        const nuevoComentario = new Comentario({
            usuario,
            publicacion: publicacionId,
            comentario
        });

        await nuevoComentario.save();
        await nuevoComentario.populate('usuario', 'nombre username');

        res.status(201).json({
            mensaje: 'Comentario creado correctamente',
            comentario: nuevoComentario
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// GET /api/publicaciones/:id/comentarios - Obtener comentarios de una publicación
const obtenerComentarios = async (req, res) => {
    try {
        const publicacionId = req.params.id;

        // Verificar que la publicación existe
        const publicacionExiste = await Publicacion.findById(publicacionId);
        if (!publicacionExiste) {
            return res.status(404).json({ mensaje: 'Publicación no encontrada' });
        }

        const comentarios = await Comentario.find({ publicacion: publicacionId })
            .populate('usuario', 'nombre username')
            .sort({ fecha: -1 });

        res.status(200).json({
            publicacion: publicacionId,
            total: comentarios.length,
            comentarios
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

module.exports = {
    crearComentario,
    obtenerComentarios
};

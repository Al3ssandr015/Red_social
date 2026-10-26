const Publicacion = require('../models/publication');
const Usuario = require('../models/user');
const Comentario = require('../models/comment');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { procesarTransformaciones } = require('../services/imageService');
const { subirArchivoS3, estaHabilitadoS3 } = require('../services/s3Service');

const POPULATE = 'nombre username fotoPerfil';
const PAGINA_DEFECTO = 12;
const PAGINA_MAX = 30;

const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Publicación lista para el cliente: sin la lista de likes, pero con "likedByMe"
const serializar = (pub, userId, comentarios) => {
    const o = pub.toObject ? pub.toObject() : { ...pub };
    o.likedByMe = !!userId && Array.isArray(o.likedBy) &&
        o.likedBy.some(id => String(id) === String(userId));
    delete o.likedBy;
    if (comentarios !== undefined) o.comentarios = comentarios;
    return o;
};

// { idPublicacion: cantidad } para un grupo de publicaciones
const contarComentarios = async (ids) => {
    if (!ids.length) return {};
    const filas = await Comentario.aggregate([
        { $match: { publicacion: { $in: ids } } },
        { $group: { _id: '$publicacion', n: { $sum: 1 } } }
    ]);
    return Object.fromEntries(filas.map(f => [String(f._id), f.n]));
};

// POST /api/publicaciones — Crear publicación con transformaciones automáticas (Sharp + S3 + Reconocimiento Facial)
const crearPublicacion = async (req, res) => {
    try {
        const usuario = req.userId;
        const contenido = (req.body.contenido || '').trim();

        if (!contenido && !req.file) {
            return res.status(400).json({ mensaje: 'Debes ingresar un texto o subir una fotografía' });
        }

        const usuarioExiste = await Usuario.findById(usuario);
        if (!usuarioExiste) return res.status(404).json({ mensaje: 'El usuario no fue encontrado' });

        let imagen = null;
        let miniatura = null;
        let transformaciones = {
            blancoYNegro: null,
            sepia: null,
            escalaReducida: null
        };

        // Procesar imagen con Sharp si existe
        if (req.file) {
            const inputPath = req.file.path;
            const outputDir = path.dirname(inputPath);
            const filename = req.file.filename;

            // Procesamiento automático de miniatura y 3 transformaciones
            const resultado = await procesarTransformaciones(inputPath, outputDir, filename);

            if (estaHabilitadoS3()) {
                // Subir a AWS S3
                const s3KeyPrefix = `posts/${filename.split('.')[0]}`;
                imagen = await subirArchivoS3(inputPath, `posts/${filename}`, req.file.mimetype);
                miniatura = await subirArchivoS3(path.join(outputDir, `${filename.split('.')[0]}_thumb.jpg`), `${s3KeyPrefix}_thumb.jpg`, 'image/jpeg');
                transformaciones.blancoYNegro = await subirArchivoS3(path.join(outputDir, `${filename.split('.')[0]}_bw.jpg`), `${s3KeyPrefix}_bw.jpg`, 'image/jpeg');
                transformaciones.sepia = await subirArchivoS3(path.join(outputDir, `${filename.split('.')[0]}_sepia.jpg`), `${s3KeyPrefix}_sepia.jpg`, 'image/jpeg');
                transformaciones.escalaReducida = await subirArchivoS3(path.join(outputDir, `${filename.split('.')[0]}_scale.jpg`), `${s3KeyPrefix}_scale.jpg`, 'image/jpeg');
            } else {
                imagen = resultado.original;
                miniatura = resultado.miniatura;
                transformaciones = resultado.transformaciones;
            }
        }

        // Parsear detección facial si viene del cliente con face-api.js
        let deteccionesFaciales = { cantidadRostros: 0, detalles: [] };
        if (req.body.deteccionesFaciales) {
            try {
                const parsed = typeof req.body.deteccionesFaciales === 'string'
                    ? JSON.parse(req.body.deteccionesFaciales)
                    : req.body.deteccionesFaciales;
                deteccionesFaciales = {
                    cantidadRostros: parsed.cantidadRostros || (Array.isArray(parsed) ? parsed.length : 0),
                    detalles: Array.isArray(parsed) ? parsed : (parsed.detalles || [])
                };
            } catch (e) {
                console.warn('Error al parsear detecciones faciales:', e.message);
            }
        }

        const nuevaPublicacion = new Publicacion({
            usuario,
            contenido,
            imagen,
            miniatura,
            transformaciones,
            deteccionesFaciales
        });

        await nuevaPublicacion.save();
        await nuevaPublicacion.populate('usuario', POPULATE);

        res.status(201).json({
            mensaje: 'Publicación creada exitosamente con sus transformaciones automáticas',
            publicacion: serializar(nuevaPublicacion, req.userId, 0)
        });
    } catch (error) {
        console.error('Error al crear publicación:', error);
        res.status(500).json({ mensaje: 'Error del servidor al procesar la publicación', error: error.message });
    }
};

// GET /api/publicaciones
const obtenerPublicaciones = async (req, res) => {
    try {
        const limite = Math.min(parseInt(req.query.limite) || PAGINA_DEFECTO, PAGINA_MAX);
        const filtro = {};

        if (req.query.usuario) {
            if (!mongoose.isValidObjectId(req.query.usuario)) return res.status(400).json({ mensaje: 'Usuario inválido' });
            filtro.usuario = req.query.usuario;
        }

        if (req.query.feed === 'siguiendo') {
            if (!req.userId) return res.status(401).json({ mensaje: 'Inicia sesión para ver a quién sigues' });
            const yo = await Usuario.findById(req.userId).select('siguiendo');
            if (!yo) return res.status(401).json({ mensaje: 'La cuenta ya no existe' });
            filtro.usuario = { $in: [...yo.siguiendo, yo._id] };
        }

        const q = String(req.query.q || '').trim().slice(0, 100);
        if (q) {
            const rx = new RegExp(escapeRegex(q), 'i');
            const autores = await Usuario.find({ $or: [{ nombre: rx }, { username: rx }] }).select('_id').limit(50);
            filtro.$or = [{ contenido: rx }, { usuario: { $in: autores.map(u => u._id) } }];
        }

        if (req.query.antes && !mongoose.isValidObjectId(req.query.antes)) {
            return res.status(400).json({ mensaje: 'Cursor inválido' });
        }

        const total = await Publicacion.countDocuments(filtro);

        const consulta = { ...filtro };
        if (req.query.antes) consulta._id = { $lt: req.query.antes };

        const pubs = await Publicacion.find(consulta)
            .select('+likedBy')
            .populate('usuario', POPULATE)
            .sort({ _id: -1 })
            .limit(limite + 1);

        const hayMas = pubs.length > limite;
        if (hayMas) pubs.pop();

        const conteo = await contarComentarios(pubs.map(p => p._id));
        const publicaciones = pubs.map(p => serializar(p, req.userId, conteo[String(p._id)] || 0));

        res.status(200).json({
            total,
            publicaciones,
            siguiente: hayMas ? String(pubs[pubs.length - 1]._id) : null
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// GET /api/publicaciones/:id
const obtenerPublicacionPorId = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ mensaje: 'Publicación no encontrada' });
        const publicacion = await Publicacion.findById(req.params.id)
            .select('+likedBy')
            .populate('usuario', POPULATE);
        if (!publicacion) return res.status(404).json({ mensaje: 'Publicación no encontrada' });
        const conteo = await contarComentarios([publicacion._id]);
        res.status(200).json(serializar(publicacion, req.userId, conteo[String(publicacion._id)] || 0));
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// PUT /api/publicaciones/:id
const actualizarPublicacion = async (req, res) => {
    try {
        const { contenido } = req.body;
        if (!contenido) return res.status(400).json({ mensaje: 'El contenido es obligatorio para actualizar' });
        const existente = await Publicacion.findById(req.params.id).select('+likedBy');
        if (!existente) return res.status(404).json({ mensaje: 'Publicación no encontrada' });
        if (String(existente.usuario) !== req.userId) return res.status(403).json({ mensaje: 'Solo puedes editar tus publicaciones' });
        existente.contenido = contenido;
        await existente.save();
        await existente.populate('usuario', POPULATE);
        res.status(200).json({ mensaje: 'Publicación actualizada', publicacion: serializar(existente, req.userId) });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// DELETE /api/publicaciones/:id
const eliminarPublicacion = async (req, res) => {
    try {
        const publicacion = await Publicacion.findById(req.params.id);
        if (!publicacion) return res.status(404).json({ mensaje: 'Publicación no encontrada' });
        if (String(publicacion.usuario) !== req.userId) return res.status(403).json({ mensaje: 'Solo puedes eliminar tus publicaciones' });
        
        await publicacion.deleteOne();

        // Limpiar archivos físicos si son locales
        const borrarArchivo = (rutaRelativa) => {
            if (rutaRelativa && rutaRelativa.startsWith('/uploads/')) {
                const fullPath = path.join(__dirname, '..', rutaRelativa);
                fs.unlink(fullPath, () => {});
            }
        };

        borrarArchivo(publicacion.imagen);
        borrarArchivo(publicacion.miniatura);
        if (publicacion.transformaciones) {
            borrarArchivo(publicacion.transformaciones.blancoYNegro);
            borrarArchivo(publicacion.transformaciones.sepia);
            borrarArchivo(publicacion.transformaciones.escalaReducida);
        }

        res.status(200).json({ mensaje: 'Publicación eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// PUT /api/publicaciones/:id/like — Alterna: da like si no lo tenías, lo quita si ya lo diste
const darLike = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(404).json({ mensaje: 'Publicación no encontrada' });

        let publicacion = await Publicacion.findOneAndUpdate(
            { _id: id, likedBy: { $ne: req.userId } },
            { $addToSet: { likedBy: req.userId }, $inc: { likes: 1 } },
            { new: true }
        ).select('+likedBy').populate('usuario', POPULATE);

        if (!publicacion) {
            publicacion = await Publicacion.findOneAndUpdate(
                { _id: id, likedBy: req.userId },
                { $pull: { likedBy: req.userId }, $inc: { likes: -1 } },
                { new: true }
            ).select('+likedBy').populate('usuario', POPULATE);
        }

        if (!publicacion) return res.status(404).json({ mensaje: 'Publicación no encontrada' });

        const resultado = serializar(publicacion, req.userId);
        res.status(200).json({
            mensaje: resultado.likedByMe ? 'Like registrado' : 'Like quitado',
            publicacion: resultado
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

module.exports = {
    crearPublicacion,
    obtenerPublicaciones,
    obtenerPublicacionPorId,
    actualizarPublicacion,
    eliminarPublicacion,
    darLike
};

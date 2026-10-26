const mongoose = require('mongoose');

const publicacionSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: [true, 'El usuario es obligatorio']
    },
    contenido: {
        type: String,
        required: [true, 'El contenido es obligatorio'],
        trim: true
    },
    likes: {
        type: Number,
        default: 0
    },
    // Quién dio like (evita likes repetidos). No se envía al cliente en listas.
    likedBy: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
        select: false
    },
    // Imagen original en resolución completa
    imagen: {
        type: String,
        default: null
    },
    // Miniatura creada automáticamente con Sharp (Requerimiento 2 del proyecto)
    miniatura: {
        type: String,
        default: null
    },
    // 3 transformaciones automáticas (Requerimiento 4 del proyecto)
    transformaciones: {
        blancoYNegro: { type: String, default: null },
        sepia: { type: String, default: null },
        escalaReducida: { type: String, default: null }
    },
    // Reconocimiento facial con face-api.js (Requerimiento 3 y 7 del proyecto)
    deteccionesFaciales: {
        cantidadRostros: { type: Number, default: 0 },
        detalles: { type: Array, default: [] }
    },
    fecha: {
        type: Date,
        default: Date.now
    }
});

publicacionSchema.index({ usuario: 1, _id: -1 });

module.exports = mongoose.model('Publicacion', publicacionSchema);

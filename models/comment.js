const mongoose = require('mongoose');

const comentarioSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: [true, 'El usuario es obligatorio']
    },
    publicacion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Publicacion',
        required: [true, 'La publicación es obligatoria']
    },
    comentario: {
        type: String,
        required: [true, 'El comentario es obligatorio'],
        trim: true
    },
    fecha: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Comentario', comentarioSchema);

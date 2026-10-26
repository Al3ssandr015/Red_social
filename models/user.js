const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true
    },
    correo: {
        type: String,
        required: [true, 'El correo es obligatorio'],
        unique: true,
        trim: true,
        lowercase: true
    },
    username: {
        type: String,
        required: [true, 'El username es obligatorio'],
        unique: true,
        trim: true
    },
    // Contraseña almacenada en hash (Requerimiento adicional 3)
    password: {
        type: String,
        required: function() { return !this.googleId; } // No obligatoria si entra con Google Login
    },
    // Sal único generado individualmente para cada usuario (Requerimiento adicional 3)
    salt: {
        type: String,
        default: null
    },
    // Identificador para Google Sign-In (Requerimiento 1)
    googleId: {
        type: String,
        default: null
    },
    fechaRegistro: {
        type: Date,
        default: Date.now
    },
    fotoPerfil: {
        type: String,
        default: null   // Ruta relativa: /uploads/avatars/nombre.jpg o URL S3
    },
    fotoPortada: {
        type: String,
        default: null   // Ruta relativa: /uploads/portadas/nombre.jpg o URL S3
    },
    // Usuarios a los que sigue esta cuenta
    siguiendo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario'
    }]
});

usuarioSchema.index({ siguiendo: 1 });

module.exports = mongoose.model('Usuario', usuarioSchema);

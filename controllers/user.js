const bcrypt = require('bcryptjs');
const { generarToken } = require('../services/jwt');
const mongoose = require('mongoose');
const Usuario = require('../models/user');
const { subirArchivoS3, estaHabilitadoS3 } = require('../services/s3Service');

// Usuario sin campos sensibles, listo para enviar al cliente
const usuarioPublico = (u) => {
    const obj = u.toObject ? u.toObject() : { ...u };
    delete obj.password;
    delete obj.salt;
    return obj;
};

/**
 * Valida opcionalmente tokens de Google reCAPTCHA
 */
async function verificarRecaptcha(token) {
    if (!token) return true; // Si no se provee en modo local, se permite
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) return true; // Si no hay llave secreta configurada en .env, continúa

    try {
        const params = new URLSearchParams({ secret, response: token });
        const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });
        const data = await res.json();
        return !!data.success;
    } catch (e) {
        console.warn('Error verificando reCAPTCHA:', e.message);
        return true;
    }
}

// POST /api/usuarios - Crear usuario con sal único y soporte reCAPTCHA
const crearUsuario = async (req, res) => {
    try {
        const { nombre, correo, username, password, recaptchaToken } = req.body;
        
        if (!nombre || !correo || !username || !password) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios: nombre, correo, username, password' });
        }

        if (recaptchaToken && !(await verificarRecaptcha(recaptchaToken))) {
            return res.status(400).json({ mensaje: 'Validación de reCAPTCHA fallida. Por favor intenta de nuevo.' });
        }

        if (String(password).length < 6) {
            return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' });
        }

        // Generar un salt único individual para cada usuario (Requerimiento adicional 3 del proyecto)
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(String(password), salt);

        const nuevoUsuario = new Usuario({
            nombre,
            correo: correo.toLowerCase().trim(),
            username: username.toLowerCase().trim(),
            password: hash,
            salt: salt // Sal almacenado explícitamente en BD
        });

        await nuevoUsuario.save();

        res.status(201).json({
            mensaje: 'Usuario creado correctamente con hash y sal único',
            usuario: usuarioPublico(nuevoUsuario),
            token: generarToken(nuevoUsuario._id)
        });
    } catch (error) {
        if (error.code === 11000) {
            const campo = Object.keys(error.keyValue)[0];
            return res.status(400).json({ mensaje: `El ${campo} ya está registrado` });
        }
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// POST /api/usuarios/login — Iniciar sesión con usuario/correo + contraseña
const login = async (req, res) => {
    try {
        const { identificador, password, recaptchaToken } = req.body;
        if (!identificador || !password) {
            return res.status(400).json({ mensaje: 'Ingresa tu usuario o correo y tu contraseña' });
        }

        if (recaptchaToken && !(await verificarRecaptcha(recaptchaToken))) {
            return res.status(400).json({ mensaje: 'Validación de reCAPTCHA fallida.' });
        }

        const id = String(identificador).trim().replace(/^@/, '');
        const usuario = await Usuario.findOne({
            $or: [{ correo: id.toLowerCase() }, { username: id.toLowerCase() }]
        });

        const invalido = () => res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
        if (!usuario) return invalido();

        if (!usuario.password) {
            return res.status(400).json({ mensaje: 'Esta cuenta se creó con Google Login. Usa el botón "Iniciar con Google".' });
        }

        let ok = false;
        if (usuario.password.startsWith('$2')) {
            ok = await bcrypt.compare(String(password), usuario.password);
        } else if (usuario.password === String(password)) {
            ok = true;
            const salt = await bcrypt.genSalt(10);
            usuario.salt = salt;
            usuario.password = await bcrypt.hash(String(password), salt);
            await usuario.save();
        }

        if (!ok) return invalido();

        res.status(200).json({
            mensaje: 'Sesión iniciada con éxito',
            usuario: usuarioPublico(usuario),
            token: generarToken(usuario._id)
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// POST /api/usuarios/google — Autenticación con Google Login (API de Google Identity Services)
const loginGoogle = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ mensaje: 'Falta la credencial de autenticación de Google' });
        }

        // Decodificar el JWT de Google
        let payload = null;
        try {
            const partes = credential.split('.');
            if (partes.length === 3) {
                const payloadBase64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
                const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
                payload = JSON.parse(decodedJson);
            }
        } catch (e) {
            return res.status(400).json({ mensaje: 'Token de Google inválido' });
        }

        if (!payload || !payload.email) {
            return res.status(400).json({ mensaje: 'No se pudo obtener información del token de Google' });
        }

        const correo = payload.email.toLowerCase();
        let usuario = await Usuario.findOne({ correo });

        if (usuario) {
            // Usuario ya registrado: vincular Google ID si no lo tenía
            if (!usuario.googleId) {
                usuario.googleId = payload.sub;
                if (!usuario.fotoPerfil && payload.picture) {
                    usuario.fotoPerfil = payload.picture;
                }
                await usuario.save();
            }
        } else {
            // Crear nuevo usuario automáticamente a partir del perfil de Google
            const baseUsername = correo.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
            let uniqueUsername = baseUsername;
            let counter = 1;
            while (await Usuario.exists({ username: uniqueUsername })) {
                uniqueUsername = `${baseUsername}${counter++}`;
            }

            usuario = new Usuario({
                nombre: payload.name || payload.given_name || 'Usuario Google',
                correo,
                username: uniqueUsername,
                googleId: payload.sub,
                fotoPerfil: payload.picture || null
            });

            await usuario.save();
        }

        res.status(200).json({
            mensaje: 'Autenticación con Google exitosa',
            usuario: usuarioPublico(usuario),
            token: generarToken(usuario._id)
        });
    } catch (error) {
        console.error('Error en loginGoogle:', error);
        res.status(500).json({ mensaje: 'Error al procesar el inicio de sesión con Google', error: error.message });
    }
};

// GET /api/usuarios/yo — Usuario de la sesión actual
const obtenerYo = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.userId).select('-password -salt');
        if (!usuario) return res.status(401).json({ mensaje: 'La cuenta ya no existe' });
        res.status(200).json(usuario);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// GET /api/usuarios
const obtenerUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.find().select('-password -salt -correo -siguiendo');
        res.status(200).json({ total: usuarios.length, usuarios });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// GET /api/usuarios/:id — Perfil con contadores
const obtenerUsuarioPorId = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const esPropio = req.userId === id;
        const usuario = await Usuario.findById(id).select(esPropio ? '-password -salt' : '-password -salt -correo').lean();
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const [seguidores, loSigo] = await Promise.all([
            Usuario.countDocuments({ siguiendo: id }),
            req.userId && !esPropio ? Usuario.exists({ _id: req.userId, siguiendo: id }) : null
        ]);

        usuario.totalSeguidores = seguidores;
        usuario.totalSiguiendo = (usuario.siguiendo || []).length;
        usuario.loSigo = !!loSigo;
        delete usuario.siguiendo;

        res.status(200).json(usuario);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// PUT /api/usuarios/:id/seguir — Alterna seguir / dejar de seguir
const seguirUsuario = async (req, res) => {
    try {
        const objetivo = req.params.id;
        if (!mongoose.isValidObjectId(objetivo)) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        if (objetivo === req.userId) return res.status(400).json({ mensaje: 'No puedes seguirte a ti mismo' });

        const existe = await Usuario.exists({ _id: objetivo });
        if (!existe) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const yaLoSigo = await Usuario.exists({ _id: req.userId, siguiendo: objetivo });
        await Usuario.updateOne(
            { _id: req.userId },
            yaLoSigo ? { $pull: { siguiendo: objetivo } } : { $addToSet: { siguiendo: objetivo } }
        );

        const seguidores = await Usuario.countDocuments({ siguiendo: objetivo });
        res.status(200).json({
            mensaje: yaLoSigo ? 'Dejaste de seguir' : 'Ahora sigues a este usuario',
            siguiendo: !yaLoSigo,
            seguidores
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// GET /api/usuarios/:id/publicaciones
const obtenerPublicacionesPorUsuario = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.params.id).select('-password -salt');
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        const Publicacion = require('../models/publication');
        const publicaciones = await Publicacion.find({ usuario: req.params.id })
            .populate('usuario', 'nombre username fotoPerfil')
            .sort({ _id: -1 });
        res.status(200).json({ usuario: usuario.nombre, total: publicaciones.length, publicaciones });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// PUT /api/usuarios/:id/foto-perfil
const subirFotoPerfil = async (req, res) => {
    try {
        if (req.params.id !== req.userId) return res.status(403).json({ mensaje: 'Solo puedes editar tu propia cuenta' });
        if (!req.file) return res.status(400).json({ mensaje: 'No se envió ninguna imagen' });

        let rutaImagen = `/uploads/avatars/${req.file.filename}`;
        if (estaHabilitadoS3()) {
            rutaImagen = await subirArchivoS3(req.file.path, `avatars/${req.file.filename}`, req.file.mimetype);
        }

        const usuario = await Usuario.findByIdAndUpdate(
            req.params.id,
            { fotoPerfil: rutaImagen },
            { new: true }
        ).select('-password -salt');

        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        res.status(200).json({ mensaje: 'Foto de perfil actualizada', usuario });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// PUT /api/usuarios/:id/foto-portada
const subirFotoPortada = async (req, res) => {
    try {
        if (req.params.id !== req.userId) return res.status(403).json({ mensaje: 'Solo puedes editar tu propia cuenta' });
        if (!req.file) return res.status(400).json({ mensaje: 'No se envió ninguna imagen' });

        let rutaImagen = `/uploads/portadas/${req.file.filename}`;
        if (estaHabilitadoS3()) {
            rutaImagen = await subirArchivoS3(req.file.path, `portadas/${req.file.filename}`, req.file.mimetype);
        }

        const usuario = await Usuario.findByIdAndUpdate(
            req.params.id,
            { fotoPortada: rutaImagen },
            { new: true }
        ).select('-password -salt');

        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        res.status(200).json({ mensaje: 'Foto de portada actualizada', usuario });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// PUT /api/usuarios/update/:id
const actualizarUsuario = async (req, res) => {
    try {
        const id = req.params.id;
        if (id !== req.userId) return res.status(403).json({ mensaje: 'No tienes permiso para actualizar este perfil' });

        let datosAActualizar = { ...req.body };
        delete datosAActualizar.password;
        delete datosAActualizar.salt;
        delete datosAActualizar.correo;

        const usuarioActualizado = await Usuario.findByIdAndUpdate(id, datosAActualizar, { new: true }).select('-password -salt -correo');
        if (!usuarioActualizado) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        res.status(200).json({ mensaje: 'Usuario actualizado correctamente', usuario: usuarioActualizado });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

module.exports = {
    actualizarUsuario,
    crearUsuario,
    seguirUsuario,
    login,
    loginGoogle,
    obtenerYo,
    obtenerUsuarios,
    obtenerUsuarioPorId,
    obtenerPublicacionesPorUsuario,
    subirFotoPerfil,
    subirFotoPortada
};

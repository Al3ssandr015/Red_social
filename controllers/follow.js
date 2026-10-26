const Follow = require('../models/follow');
const Usuario = require('../models/user');
const mongoose = require('mongoose');

// Acción save follow (Pasos 25 y 26)
const save = async (req, res) => {
    try {
        const { followed } = req.body;
        if (!mongoose.isValidObjectId(followed)) return res.status(400).json({ mensaje: 'ID de usuario no válido' });

        const follow = new Follow({
            user: req.userId,
            followed: followed
        });

        await follow.save();

        // Para mantener compatibilidad con el frontend antiguo, también agregamos al array del usuario
        await Usuario.findByIdAndUpdate(req.userId, { $addToSet: { siguiendo: followed } });

        res.status(200).json({ mensaje: 'Ahora sigues a este usuario', follow });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ mensaje: 'Ya sigues a este usuario' });
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// Acción unfollow (Paso 27)
const unfollow = async (req, res) => {
    try {
        const { id } = req.params;
        const followDeleted = await Follow.findOneAndDelete({ user: req.userId, followed: id });

        if (!followDeleted) return res.status(404).json({ mensaje: 'No sigues a este usuario' });

        // Mantener compatibilidad con el frontend
        await Usuario.findByIdAndUpdate(req.userId, { $pull: { siguiendo: id } });

        res.status(200).json({ mensaje: 'Dejaste de seguir al usuario' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// Listado de usuarios que sigo (following) (Paso 28, 29, 30)
const following = async (req, res) => {
    try {
        const userId = req.params.id || req.userId;
        const follows = await Follow.find({ user: userId }).populate('followed', '-password -correo');
        res.status(200).json({ total: follows.length, following: follows });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// Listado de usuarios que me siguen (followers) (Paso 31)
const followers = async (req, res) => {
    try {
        const userId = req.params.id || req.userId;
        const follows = await Follow.find({ followed: userId }).populate('user', '-password -correo');
        res.status(200).json({ total: follows.length, followers: follows });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

// Array de IDs de follows
const followUserIds = async (req, res) => {
    try {
        const userId = req.userId;
        const following = await Follow.find({ user: userId }).select('followed -_id');
        const followers = await Follow.find({ followed: userId }).select('user -_id');

        let followingLimpios = following.map(f => f.followed);
        let followersLimpios = followers.map(f => f.user);

        res.status(200).json({ following: followingLimpios, followers: followersLimpios });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
}

module.exports = {
    save,
    unfollow,
    following,
    followers,
    followUserIds
};

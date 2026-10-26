const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    followed: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Evitar duplicados
followSchema.index({ user: 1, followed: 1 }, { unique: true });

module.exports = mongoose.model('Follow', followSchema);

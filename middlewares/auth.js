const jwt = require('jsonwebtoken');

const leerToken = (req) => {
    const header = req.headers.authorization || '';
    return header.startsWith('Bearer ') ? header.slice(7) : null;
};

// Exige un token válido: Authorization: Bearer <token>
// Deja el id del usuario autenticado en req.userId
const auth = (req, res, next) => {
    const token = leerToken(req);
    if (!token) return res.status(401).json({ mensaje: 'Debes iniciar sesión' });
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.id;
        next();
    } catch (e) {
        return res.status(401).json({ mensaje: 'Sesión inválida o expirada, inicia sesión de nuevo' });
    }
};

// Igual, pero si no hay token (o es inválido) sigue como visitante (req.userId = undefined).
// Sirve para rutas públicas que cambian un poco si estás logueado (ej. "ya di like").
auth.opcional = (req, res, next) => {
    const token = leerToken(req);
    if (token) {
        try { req.userId = jwt.verify(token, process.env.JWT_SECRET).id; } catch (e) {}
    }
    next();
};

module.exports = auth;

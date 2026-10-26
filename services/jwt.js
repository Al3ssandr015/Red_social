const jwt = require('jsonwebtoken');

const generarToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

module.exports = { generarToken };

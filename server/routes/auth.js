const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Iniciar sesión
// @access  Public
router.post('/login', [
  body('username', 'El nombre de usuario es requerido').not().isEmpty(),
  body('password', 'La contraseña es requerida').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Buscar usuario en la base de datos
    const userQuery = `
      SELECT u.id, u.username, u.password_hash, u.email, u.role, u.is_active
      FROM users u 
      WHERE u.username = $1
    `;
    
    const userResult = await db.query(userQuery, [username]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Crear token JWT
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'gpcones_secret',
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      }
    );

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Recuperar contraseña
// @access  Public
router.post('/forgot-password', [
  body('email', 'El email es requerido').isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Verificar si el email existe
    const userQuery = 'SELECT id, username FROM users WHERE email = $1';
    const userResult = await db.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email no encontrado' });
    }

    // Generar token temporal para reset de contraseña
    const resetToken = jwt.sign(
      { user: { id: userResult.rows[0].id } },
      process.env.JWT_SECRET || 'gpcones_secret',
      { expiresIn: '1h' }
    );

    // TODO: Enviar email con link de reset
    // Por ahora solo retornamos el token
    res.json({ 
      message: 'Se ha enviado un enlace de recuperación a tu email',
      resetToken // En producción, esto no se enviaría
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Resetear contraseña
// @access  Public
router.post('/reset-password', [
  body('token', 'Token requerido').not().isEmpty(),
  body('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gpcones_secret');
    
    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Actualizar contraseña
    const updateQuery = 'UPDATE users SET password = $1 WHERE id = $2';
    await db.query(updateQuery, [hashedPassword, decoded.user.id]);

    res.json({ message: 'Contraseña actualizada correctamente' });

  } catch (err) {
    console.error(err.message);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// @route   GET /api/auth/me
// @desc    Obtener usuario actual
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const userQuery = `
      SELECT id, username, email, role, is_active, created_at
      FROM users 
      WHERE id = $1
    `;
    
    const userResult = await db.query(userQuery, [req.user.id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: userResult.rows[0] });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router; 
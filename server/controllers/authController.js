const { query } = require('../config/database');
const { hashPassword, verifyPassword, generateToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');
const emailService = require('../services/emailService');
const crypto = require('crypto');



// Controlador de autenticación para el sistema GPCONES
class AuthController {
  
  // Historia 1: Recuperación de contraseña
  async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos',
          details: errors.array() 
        });
      }

      const { email } = req.body;

      // Verificar que el usuario existe
      const userResult = await query(
        'SELECT id, username, full_name, email FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (userResult.rows.length === 0) {
        // Por seguridad, no revelar si el email existe o no
        return res.json({ 
          message: 'Si el email está registrado, recibirá un enlace de restablecimiento',
          success: true 
        });
      }

      const user = userResult.rows[0];

      // Generar token de recuperación
      const resetToken = emailService.generateResetToken();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

      // Invalidar tokens anteriores del usuario
      await query(
        'UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false',
        [user.id]
      );

      // Guardar nuevo token en la base de datos
      await query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, resetToken, expiresAt]
      );

      // Enviar email de recuperación
      const emailResult = await emailService.sendPasswordResetEmail(
        user.email, 
        user.full_name, 
        resetToken
      );

      if (!emailResult.success) {
        console.error('Error enviando email:', emailResult.error);
        // No fallar la operación si el email no se puede enviar
        // En producción, podrías querer usar una cola de emails
      }

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical) VALUES ($1, $2, $3, $4, $5)',
        [user.id, 'SOLICITUD_RECUPERACION_PASSWORD', 'AUTH', `Solicitud de recuperación para ${email}`, false]
      );

      res.json({ 
        message: 'Si el email está registrado, recibirá un enlace de restablecimiento',
        success: true,
        expires_in: '30 minutos'
      });

    } catch (error) {
      console.error('Error en forgotPassword:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: 'No se pudo procesar la solicitud de recuperación de contraseña'
      });
    }
  }

  // Restablecer contraseña con token
  async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos',
          details: errors.array() 
        });
      }

      const { token, newPassword } = req.body;

      // Verificar que el token existe y es válido
      const tokenResult = await query(
        `SELECT prt.*, u.id as user_id, u.username, u.email, u.full_name 
         FROM password_reset_tokens prt 
         JOIN users u ON prt.user_id = u.id 
         WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()`,
        [token]
      );

      if (tokenResult.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Token inválido o expirado',
          message: 'El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.'
        });
      }

      const tokenData = tokenResult.rows[0];

      // Verificar que el usuario sigue activo
      const userResult = await query(
        'SELECT id, is_active FROM users WHERE id = $1',
        [tokenData.user_id]
      );

      if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
        return res.status(400).json({ 
          error: 'Usuario inactivo',
          message: 'El usuario asociado a este enlace no está activo.'
        });
      }

      // Hash de la nueva contraseña
      const newPasswordHash = await hashPassword(newPassword);

      // Actualizar contraseña del usuario
      await query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, tokenData.user_id]
      );

      // Marcar token como usado
      await query(
        'UPDATE password_reset_tokens SET used = true, used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [tokenData.id]
      );

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical) VALUES ($1, $2, $3, $4, $5)',
        [
          tokenData.user_id, 
          'RESTABLECIMIENTO_PASSWORD', 
          'AUTH', 
          `Contraseña restablecida exitosamente para ${tokenData.email}`,
          true
        ]
      );

      res.json({ 
        message: 'Contraseña restablecida exitosamente',
        success: true,
        user: {
          username: tokenData.username,
          email: tokenData.email,
          full_name: tokenData.full_name
        }
      });

    } catch (error) {
      console.error('Error en resetPassword:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: 'No se pudo restablecer la contraseña'
      });
    }
  }

  // Verificar validez del token de recuperación
  async verifyResetToken(req, res) {
    try {
      const { token } = req.params;

      const tokenResult = await query(
        `SELECT prt.*, u.username, u.email, u.full_name 
         FROM password_reset_tokens prt 
         JOIN users u ON prt.user_id = u.id 
         WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()`,
        [token]
      );

      if (tokenResult.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Token inválido o expirado',
          message: 'El enlace de recuperación no es válido o ha expirado.',
          valid: false
        });
      }

      const tokenData = tokenResult.rows[0];
      const timeLeft = Math.max(0, Math.floor((new Date(tokenData.expires_at) - new Date()) / 1000 / 60));

      res.json({ 
        message: 'Token válido',
        success: true,
        valid: true,
        user: {
          username: tokenData.username,
          email: tokenData.email,
          full_name: tokenData.full_name
        },
        expires_in_minutes: timeLeft
      });

    } catch (error) {
      console.error('Error en verifyResetToken:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: 'No se pudo verificar el token',
        valid: false
      });
    }
  }

  // Historia 2: Control de roles
  async updateUserRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos',
          details: errors.array() 
        });
      }

      const { userId } = req.params;
      const { newRole } = req.body;

      // Verificar que el rol es válido según especificaciones
      const validRoles = ['Administrador del Sistema', 'Revisión de Calidad', 'Reconocedor Predial', 'Digitador Alfanumérico'];
      if (!validRoles.includes(newRole)) {
        return res.status(400).json({ 
          error: 'Rol inválido',
          message: `El rol debe ser uno de: ${validRoles.join(', ')}`,
          valid_roles: validRoles
        });
      }

      // Verificar que el usuario existe
      const userResult = await query(
        'SELECT id, username, role FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Usuario no encontrado',
          message: 'El usuario especificado no existe o está inactivo'
        });
      }

      const oldRole = userResult.rows[0].role;

      // Actualizar rol del usuario
      await query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newRole, userId]
      );

      // Registrar en auditoría (evento crítico)
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical, previous_state, new_state) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          req.user.id, 
          'CAMBIO_ROL_USUARIO', 
          'AUTH', 
          `Cambio de rol de '${oldRole}' a '${newRole}' para usuario ${userResult.rows[0].username}`,
          true,
          JSON.stringify({ role: oldRole }),
          JSON.stringify({ role: newRole })
        ]
      );

      res.json({ 
        message: 'Rol de usuario actualizado exitosamente',
        success: true,
        user_id: userId,
        old_role: oldRole,
        new_role: newRole,
        updated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error en updateUserRole:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: 'No se pudo actualizar el rol del usuario'
      });
    }
  }

  // Login de usuario
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos',
          details: errors.array() 
        });
      }

      const { username, password } = req.body;

      console.log(`🔐 Intento de login para usuario: ${username}`);

      // Buscar usuario por username
      const userResult = await query(
        'SELECT id, username, email, full_name, role, password_hash, is_active FROM users WHERE username = $1',
        [username]
      );

      if (userResult.rows.length === 0) {
        console.log(`❌ Usuario no encontrado: ${username}`);
        return res.status(401).json({ 
          error: 'Credenciales inválidas',
          message: 'Usuario o contraseña incorrectos'
        });
      }

      const user = userResult.rows[0];
      console.log(`✅ Usuario encontrado: ${user.username}, Activo: ${user.is_active}`);

      // Verificar que el usuario esté activo
      if (!user.is_active) {
        console.log(`❌ Usuario inactivo: ${username}`);
        return res.status(401).json({ 
          error: 'Usuario inactivo',
          message: 'Su cuenta ha sido desactivada. Contacte al administrador del sistema.'
        });
      }

      // Verificar contraseña
      console.log(`🔑 Verificando contraseña para usuario: ${username}`);
      const isValidPassword = await verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        console.log(`❌ Contraseña incorrecta para usuario: ${username}`);
        return res.status(401).json({ 
          error: 'Credenciales inválidas',
          message: 'Usuario o contraseña incorrectos'
        });
      }

      console.log(`✅ Contraseña válida para usuario: ${username}`);

      // Generar token JWT
      const token = generateToken(user.id);

      // Actualizar último login
      await query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          user.id, 
          'LOGIN_EXITOSO', 
          'AUTH', 
          `Inicio de sesión exitoso desde ${req.ip || 'IP desconocida'}`,
          req.ip,
          req.get('User-Agent')
        ]
      );

      // No enviar password_hash en la respuesta
      delete user.password_hash;

      res.json({
        message: 'Inicio de sesión exitoso',
        success: true,
        user,
        token,
        expires_in: process.env.JWT_EXPIRES_IN || '24h'
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: 'No se pudo procesar el inicio de sesión'
      });
    }
  }

  // Logout de usuario
  async logout(req, res) {
    try {
      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          req.user.id, 
          'LOGOUT', 
          'AUTH', 
          `Cierre de sesión desde ${req.ip || 'IP desconocida'}`,
          req.ip,
          req.get('User-Agent')
        ]
      );

      res.json({ 
        message: 'Cierre de sesión exitoso',
        success: true 
      });

    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: 'No se pudo procesar el cierre de sesión'
      });
    }
  }

  // Obtener perfil del usuario autenticado
  async getProfile(req, res) {
    try {
      const userResult = await query(
        'SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users WHERE id = $1',
        [req.user.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Usuario no encontrado',
          message: 'El usuario no existe'
        });
      }

      res.json({
        message: 'Perfil obtenido exitosamente',
        success: true,
        user: userResult.rows[0]
      });

    } catch (error) {
      console.error('Error en getProfile:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: 'No se pudo obtener el perfil del usuario'
      });
    }
  }

  // Cambiar contraseña del usuario autenticado
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos',
          details: errors.array() 
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Obtener usuario con contraseña actual
      const userResult = await query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Usuario no encontrado',
          message: 'El usuario no existe'
        });
      }

      // Verificar contraseña actual
      const isValidPassword = await verifyPassword(currentPassword, userResult.rows[0].password_hash);
      if (!isValidPassword) {
        return res.status(400).json({ 
          error: 'Contraseña actual incorrecta',
          message: 'La contraseña actual proporcionada no es correcta'
        });
      }

      // Hash de nueva contraseña
      const newPasswordHash = await hashPassword(newPassword);

      // Actualizar contraseña
      await query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, req.user.id]
      );

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical) VALUES ($1, $2, $3, $4, $5)',
        [
          req.user.id, 
          'CAMBIO_PASSWORD', 
          'AUTH', 
          'Cambio de contraseña exitoso',
          true
        ]
      );

      res.json({ 
        message: 'Contraseña actualizada exitosamente',
        success: true 
      });

    } catch (error) {
      console.error('Error en changePassword:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: 'No se pudo cambiar la contraseña'
      });
    }
  }
}

module.exports = new AuthController();

const { query } = require('../config/database');
const { hashPassword } = require('../middleware/auth');
const { validationResult } = require('express-validator');

// Controlador de gestión de usuarios para el sistema GPCONES
class UsersController {
  
  // Obtener todos los usuarios con filtros
  async getUsers(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        role = '', 
        status = '',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      
      // Construir consulta con filtros
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Filtro de búsqueda
      if (search) {
        whereConditions.push(`(u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      // Filtro por rol
      if (role) {
        whereConditions.push(`u.role = $${paramIndex}`);
        queryParams.push(role);
        paramIndex++;
      }

      // Filtro por estado
      if (status !== '') {
        whereConditions.push(`u.is_active = $${paramIndex}`);
        queryParams.push(status === 'active');
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Consulta principal
      const usersQuery = `
        SELECT 
          u.id,
          u.username,
          u.email,
          u.full_name,
          u.role,
          u.is_active,
          u.last_login,
          u.created_at,
          u.updated_at,
          COUNT(*) OVER() as total_count
        FROM users u
        ${whereClause}
        ORDER BY u.${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await query(usersQuery, queryParams);
      const users = result.rows;

      // Estadísticas de usuarios
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive,
          role,
          COUNT(*) as count_by_role
        FROM users
        GROUP BY role
        ORDER BY count_by_role DESC
      `;

      const statsResult = await query(statsQuery);
      const stats = {
        total: users.length > 0 ? parseInt(users[0].total_count) : 0,
        active: statsResult.rows.reduce((sum, row) => sum + (row.role === 'Administrador del Sistema' ? parseInt(row.active) : 0), 0),
        inactive: statsResult.rows.reduce((sum, row) => sum + (row.role === 'Administrador del Sistema' ? parseInt(row.inactive) : 0), 0),
        byRole: statsResult.rows.reduce((acc, row) => {
          acc[row.role] = parseInt(row.count_by_role);
          return acc;
        }, {})
      };

      res.json({
        success: true,
        data: {
          users: users.map(user => ({
            ...user,
            total_count: undefined // Remover del objeto usuario
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: stats.total,
            pages: Math.ceil(stats.total / limit)
          },
          stats
        }
      });

    } catch (error) {
      console.error('Error en getUsers:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener los usuarios'
      });
    }
  }

  // Crear nuevo usuario
  async createUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos',
          details: errors.array() 
        });
      }

      const {
        username,
        email,
        full_name,
        role,
        password,
        is_active = true
      } = req.body;

      // Verificar que el username no exista
      const existingUsername = await query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUsername.rows.length > 0) {
        return res.status(400).json({
          error: 'Username duplicado',
          message: 'El nombre de usuario ya existe en el sistema'
        });
      }

      // Verificar que el email no exista
      const existingEmail = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(400).json({
          error: 'Email duplicado',
          message: 'El email ya está registrado en el sistema'
        });
      }

      // Hash de la contraseña
      const passwordHash = await hashPassword(password);

      // Crear usuario
      const result = await query(
        `INSERT INTO users (username, email, full_name, role, password_hash, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, username, email, full_name, role, is_active, created_at`,
        [username, email, full_name, role, passwordHash, is_active]
      );

      const newUser = result.rows[0];

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical, new_state) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          req.user.id,
          'CREACION_USUARIO',
          'GESTION_USUARIOS',
          `Nuevo usuario creado: ${username} (${email}) con rol ${role}`,
          true,
          JSON.stringify(newUser)
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: newUser
      });

    } catch (error) {
      console.error('Error en createUser:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo crear el usuario'
      });
    }
  }

  // Actualizar usuario
  async updateUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos',
          details: errors.array() 
        });
      }

      const { userId } = req.params;
      const {
        username,
        email,
        full_name,
        role,
        is_active
      } = req.body;

      // Verificar que el usuario existe
      const existingUser = await query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (existingUser.rows.length === 0) {
        return res.status(404).json({
          error: 'Usuario no encontrado',
          message: 'El usuario especificado no existe'
        });
      }

      const oldUser = existingUser.rows[0];

      // Verificar username duplicado (si cambió)
      if (username && username !== oldUser.username) {
        const existingUsername = await query(
          'SELECT id FROM users WHERE username = $1 AND id != $2',
          [username, userId]
        );

        if (existingUsername.rows.length > 0) {
          return res.status(400).json({
            error: 'Username duplicado',
            message: 'El nombre de usuario ya existe en el sistema'
          });
        }
      }

      // Verificar email duplicado (si cambió)
      if (email && email !== oldUser.email) {
        const existingEmail = await query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, userId]
        );

        if (existingEmail.rows.length > 0) {
          return res.status(400).json({
            error: 'Email duplicado',
            message: 'El email ya está registrado en el sistema'
          });
        }
      }

      // Actualizar usuario
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (username) {
        updateFields.push(`username = $${paramIndex}`);
        updateValues.push(username);
        paramIndex++;
      }

      if (email) {
        updateFields.push(`email = $${paramIndex}`);
        updateValues.push(email);
        paramIndex++;
      }

      if (full_name) {
        updateFields.push(`full_name = $${paramIndex}`);
        updateValues.push(full_name);
        paramIndex++;
      }

      if (role) {
        updateFields.push(`role = $${paramIndex}`);
        updateValues.push(role);
        paramIndex++;
      }

      if (is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        updateValues.push(is_active);
        paramIndex++;
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      updateValues.push(userId);

      const result = await query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        updateValues
      );

      const updatedUser = result.rows[0];

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical, previous_state, new_state) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          req.user.id,
          'ACTUALIZACION_USUARIO',
          'GESTION_USUARIOS',
          `Usuario actualizado: ${updatedUser.username}`,
          true,
          JSON.stringify(oldUser),
          JSON.stringify(updatedUser)
        ]
      );

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: updatedUser
      });

    } catch (error) {
      console.error('Error en updateUser:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo actualizar el usuario'
      });
    }
  }

  // Eliminar usuario (desactivar)
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      // Verificar que el usuario existe
      const existingUser = await query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (existingUser.rows.length === 0) {
        return res.status(404).json({
          error: 'Usuario no encontrado',
          message: 'El usuario especificado no existe'
        });
      }

      const user = existingUser.rows[0];

      // No permitir eliminar el propio usuario
      if (userId === req.user.id) {
        return res.status(400).json({
          error: 'Operación no permitida',
          message: 'No puedes desactivar tu propia cuenta'
        });
      }

      // Desactivar usuario (soft delete)
      await query(
        'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical, previous_state) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          req.user.id,
          'DESACTIVACION_USUARIO',
          'GESTION_USUARIOS',
          `Usuario desactivado: ${user.username}`,
          true,
          JSON.stringify(user)
        ]
      );

      res.json({
        success: true,
        message: 'Usuario desactivado exitosamente'
      });

    } catch (error) {
      console.error('Error en deleteUser:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo desactivar el usuario'
      });
    }
  }

  // Reactivar usuario
  async reactivateUser(req, res) {
    try {
      const { userId } = req.params;

      // Verificar que el usuario existe
      const existingUser = await query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (existingUser.rows.length === 0) {
        return res.status(404).json({
          error: 'Usuario no encontrado',
          message: 'El usuario especificado no existe'
        });
      }

      const user = existingUser.rows[0];

      // Reactivar usuario
      await query(
        'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical, previous_state) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          req.user.id,
          'REACTIVACION_USUARIO',
          'GESTION_USUARIOS',
          `Usuario reactivado: ${user.username}`,
          true,
          JSON.stringify(user)
        ]
      );

      res.json({
        success: true,
        message: 'Usuario reactivado exitosamente'
      });

    } catch (error) {
      console.error('Error en reactivateUser:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo reactivar el usuario'
      });
    }
  }

  // Resetear contraseña de usuario
  async resetUserPassword(req, res) {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;

      // Verificar que el usuario existe
      const existingUser = await query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (existingUser.rows.length === 0) {
        return res.status(404).json({
          error: 'Usuario no encontrado',
          message: 'El usuario especificado no existe'
        });
      }

      const user = existingUser.rows[0];

      // Hash de la nueva contraseña
      const passwordHash = await hashPassword(newPassword);

      // Actualizar contraseña
      await query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, userId]
      );

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical) VALUES ($1, $2, $3, $4, $5)',
        [
          req.user.id,
          'RESET_PASSWORD_USUARIO',
          'GESTION_USUARIOS',
          `Contraseña reseteada para usuario: ${user.username}`,
          true
        ]
      );

      res.json({
        success: true,
        message: 'Contraseña reseteada exitosamente'
      });

    } catch (error) {
      console.error('Error en resetUserPassword:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo resetear la contraseña'
      });
    }
  }

  // Obtener estadísticas de usuarios
  async getUserStats(req, res) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive,
          role,
          COUNT(*) as count_by_role
        FROM users
        GROUP BY role
        ORDER BY count_by_role DESC
      `;

      const result = await query(statsQuery);
      const stats = {
        total: result.rows.reduce((sum, row) => sum + parseInt(row.total), 0),
        active: result.rows.reduce((sum, row) => sum + parseInt(row.active), 0),
        inactive: result.rows.reduce((sum, row) => sum + parseInt(row.inactive), 0),
        byRole: result.rows.reduce((acc, row) => {
          acc[row.role] = parseInt(row.count_by_role);
          return acc;
        }, {})
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error en getUserStats:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener las estadísticas'
      });
    }
  }
}

module.exports = new UsersController();

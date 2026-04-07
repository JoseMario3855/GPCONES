const db = require('../config/database');

// Función para registrar eventos de auditoría
const logAuditEvent = async (userId, action, module, details = {}) => {
  try {
    const query = `
      INSERT INTO audit_logs (
        user_id, 
        action, 
        module, 
        details, 
        ip_address, 
        user_agent, 
        is_critical,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id
    `;

    const values = [
      userId,
      action,
      module,
      JSON.stringify(details),
      details.ip_address || '127.0.0.1',
      details.user_agent || 'Unknown',
      details.is_critical || false
    ];

    const result = await db.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error registrando evento de auditoría:', error);
    // No lanzar error para no interrumpir el flujo principal
    return null;
  }
};

// Función para obtener logs de auditoría
const getAuditLogs = async (filters = {}, page = 1, limit = 20) => {
  try {
    let whereClause = 'WHERE 1=1';
    const values = [];
    let valueIndex = 1;

    // Filtros
    if (filters.user_id) {
      whereClause += ` AND user_id = $${valueIndex}`;
      values.push(filters.user_id);
      valueIndex++;
    }

    if (filters.action) {
      whereClause += ` AND action = $${valueIndex}`;
      values.push(filters.action);
      valueIndex++;
    }

    if (filters.module) {
      whereClause += ` AND module = $${valueIndex}`;
      values.push(filters.module);
      valueIndex++;
    }

    if (filters.date_from) {
      whereClause += ` AND created_at >= $${valueIndex}`;
      values.push(filters.date_from);
      valueIndex++;
    }

    if (filters.date_to) {
      whereClause += ` AND created_at <= $${valueIndex}`;
      values.push(filters.date_to);
      valueIndex++;
    }

    if (filters.is_critical !== undefined) {
      whereClause += ` AND is_critical = $${valueIndex}`;
      values.push(filters.is_critical);
      valueIndex++;
    }

    // Consulta principal
    const query = `
      SELECT 
        al.*,
        u.username,
        u.full_name,
        u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
    `;

    values.push(limit, (page - 1) * limit);

    const result = await db.query(query, values);

    // Contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      ${whereClause}
    `;
    
    const countResult = await db.query(countQuery, values.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    return {
      logs: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error obteniendo logs de auditoría:', error);
    throw error;
  }
};

// Función para obtener estadísticas de auditoría
const getAuditStats = async () => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN is_critical = true THEN 1 END) as critical_logs,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_logs,
        COUNT(DISTINCT module) as active_modules,
        COUNT(DISTINCT action) as unique_actions
      FROM audit_logs
    `;

    const moduleStatsQuery = `
      SELECT 
        module,
        COUNT(*) as count
      FROM audit_logs
      GROUP BY module
      ORDER BY count DESC
    `;

    const actionStatsQuery = `
      SELECT 
        action,
        COUNT(*) as count
      FROM audit_logs
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `;

    const [statsResult, moduleResult, actionResult] = await Promise.all([
      db.query(statsQuery),
      db.query(moduleStatsQuery),
      db.query(actionStatsQuery)
    ]);

    return {
      total: statsResult.rows[0].total_logs,
      critical: statsResult.rows[0].critical_logs,
      today: statsResult.rows[0].today_logs,
      activeModules: statsResult.rows[0].active_modules,
      uniqueActions: statsResult.rows[0].unique_actions,
      byModule: moduleResult.rows.reduce((acc, row) => {
        acc[row.module] = parseInt(row.count);
        return acc;
      }, {}),
      byAction: actionResult.rows.reduce((acc, row) => {
        acc[row.action] = parseInt(row.count);
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de auditoría:', error);
    throw error;
  }
};

// Función para obtener log específico por ID
const getAuditLogById = async (logId) => {
  try {
    const query = `
      SELECT 
        al.*,
        u.username,
        u.full_name,
        u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = $1
    `;

    const result = await db.query(query, [logId]);
    
    if (result.rows.length === 0) {
      throw new Error('Log de auditoría no encontrado');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error obteniendo log de auditoría:', error);
    throw error;
  }
};

// Función para limpiar logs antiguos (mantenimiento)
const cleanupOldLogs = async (daysToKeep = 90) => {
  try {
    const query = `
      DELETE FROM audit_logs 
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
    `;

    const result = await db.query(query);
    
    console.log(`Limpieza de auditoría completada: ${result.rowCount} registros eliminados`);
    
    return {
      success: true,
      deletedCount: result.rowCount,
      message: `Se eliminaron ${result.rowCount} registros de auditoría antiguos`
    };
  } catch (error) {
    console.error('Error en limpieza de logs de auditoría:', error);
    throw error;
  }
};

module.exports = {
  logAuditEvent,
  getAuditLogs,
  getAuditStats,
  getAuditLogById,
  cleanupOldLogs
};

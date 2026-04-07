import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import axios from 'axios';
import jwtDecode from 'jwt-decode';

// Configurar la base URL de axios para conectar al backend
// En desarrollo, usar el proxy configurado en package.json (sin baseURL)
// El proxy redirige /api/* a http://localhost:3002/api/*
// En producción, usar la URL completa del backend
if (process.env.NODE_ENV === 'production') {
  axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3002';
}
// En desarrollo, no establecer baseURL para usar el proxy relativo

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('gpcones_token'));
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({});
  
  // Municipio y schema seleccionado
  const [municipioSeleccionado, setMunicipioSeleccionado] = useState(() => {
    const saved = localStorage.getItem('municipio_seleccionado');
    return saved ? JSON.parse(saved) : null;
  });

  // Configurar axios con interceptor para el token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verificar si el token es válido
      validateToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Cargar permisos cuando cambie el usuario
  useEffect(() => {
    if (user) {
      loadUserPermissions();
    }
  }, [user]);

  const validateToken = async () => {
    try {
      const response = await axios.get('/api/auth/validate-token');
      if (response.data.success) {
        setUser(response.data.user);
        // Los permisos se cargarán en el useEffect cuando user cambie
      } else {
        logout();
      }
    } catch (error) {
      console.error('Error validando token:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async () => {
    try {
      // Definir permisos basados en el rol del usuario
      const rolePermissions = getRolePermissions(user?.role);
      setPermissions(rolePermissions);
    } catch (error) {
      console.error('Error cargando permisos:', error);
    }
  };

  const getRolePermissions = (role) => {
    const permissions = {
      // Administrador del Sistema - Acceso completo
      'Administrador del Sistema': {
        can_manage_users: true,
        can_manage_predios: true,
        can_approve_predios: true,
        can_view_audit_logs: true,
        can_export_xtf: true,
        can_load_xtf: true,
        can_access_gdb: true,
        can_create_predios: true,
        can_edit_predios: true,
        can_delete_predios: true,
        can_change_predio_status: true,
        can_view_all_predios: true,
        can_manage_roles: true,
        can_view_system_stats: true,
        can_export_data: true,
        can_import_data: true,
        can_manage_system_config: true
      },
      
      // Revisión de Calidad - Revisar y aprobar predios
      'Revisión de Calidad': {
        can_manage_users: false,
        can_manage_predios: false,
        can_approve_predios: true,
        can_view_audit_logs: true,
        can_export_xtf: true,
        can_load_xtf: false,
        can_access_gdb: false,
        can_create_predios: false,
        can_edit_predios: false,
        can_delete_predios: false,
        can_change_predio_status: true,
        can_view_all_predios: true,
        can_manage_roles: false,
        can_view_system_stats: true,
        can_export_data: true,
        can_import_data: false,
        can_manage_system_config: false
      },
      
      // Reconocedor Predial - Crear y editar predios
      'Reconocedor Predial': {
        can_manage_users: false,
        can_manage_predios: true,
        can_approve_predios: false,
        can_view_audit_logs: false,
        can_export_xtf: false,
        can_load_xtf: false,
        can_access_gdb: true,
        can_create_predios: true,
        can_edit_predios: true,
        can_delete_predios: false,
        can_change_predio_status: false,
        can_view_all_predios: false,
        can_manage_roles: false,
        can_view_system_stats: false,
        can_export_data: false,
        can_import_data: true,
        can_manage_system_config: false
      },
      
      // Digitador Alfanumérico - Solo entrada de datos
      'Digitador Alfanumérico': {
        can_manage_users: false,
        can_manage_predios: false,
        can_approve_predios: false,
        can_view_audit_logs: false,
        can_export_xtf: false,
        can_load_xtf: false,
        can_access_gdb: false,
        can_create_predios: true,
        can_edit_predios: false,
        can_delete_predios: false,
        can_change_predio_status: false,
        can_view_all_predios: false,
        can_manage_roles: false,
        can_view_system_stats: false,
        can_export_data: false,
        can_import_data: false,
        can_manage_system_config: false
      }
    };

    return permissions[role] || {};
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      console.log('🔐 Intentando login para:', username);
      console.log('📡 URL:', axios.defaults.baseURL || window.location.origin);
      
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      console.log('✅ Respuesta del servidor:', response.data);

      if (response.data.success) {
        const { token: newToken, user: userData } = response.data;
        
        // Guardar token en localStorage
        localStorage.setItem('gpcones_token', newToken);
        
        // Configurar axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        // Actualizar estado
        setToken(newToken);
        setUser(userData);
        
        // Los permisos se cargarán automáticamente en el useEffect
        
        message.success('Inicio de sesión exitoso');
        return { success: true };
      } else {
        const errorMsg = response.data.message || 'Error en el inicio de sesión';
        message.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      console.error('❌ Error completo en login:', error);
      console.error('Response:', error.response);
      console.error('Request:', error.request);
      
      let errorMessage = 'Error en el inicio de sesión';
      
      if (error.response) {
        // El servidor respondió con un código de error
        errorMessage = error.response.data?.message || error.response.data?.error || `Error ${error.response.status}: ${error.response.statusText}`;
        console.error('Error del servidor:', error.response.data);
      } else if (error.request) {
        // La petición se hizo pero no hubo respuesta
        errorMessage = 'No se pudo conectar al servidor. Verifica que el backend esté corriendo.';
        console.error('Sin respuesta del servidor');
      } else {
        // Algo más pasó
        errorMessage = error.message || 'Error desconocido';
        console.error('Error:', error.message);
      }
      
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post('/api/auth/logout');
      }
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Limpiar estado local
      localStorage.removeItem('gpcones_token');
      localStorage.removeItem('municipio_seleccionado');
      delete axios.defaults.headers.common['Authorization'];
      setToken(null);
      setUser(null);
      setPermissions({});
      setMunicipioSeleccionado(null);
      setLoading(false);
    }
  };

  // Funciones para manejar municipio seleccionado
  const seleccionarMunicipio = (municipioData) => {
    localStorage.setItem('municipio_seleccionado', JSON.stringify(municipioData));
    setMunicipioSeleccionado(municipioData);
  };

  const cambiarMunicipio = () => {
    localStorage.removeItem('municipio_seleccionado');
    setMunicipioSeleccionado(null);
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await axios.put('/api/auth/change-password', {
        currentPassword,
        newPassword
      });

      if (response.data.success) {
        message.success('Contraseña cambiada exitosamente');
        return { success: true };
      }
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      const errorMessage = error.response?.data?.message || 'Error cambiando la contraseña';
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      
      if (response.data.success) {
        message.success('Si el email está registrado, recibirá un enlace de restablecimiento');
        return { success: true };
      }
    } catch (error) {
      console.error('Error en forgot password:', error);
      const errorMessage = error.response?.data?.message || 'Error procesando la solicitud';
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      const response = await axios.post('/api/auth/reset-password', {
        token,
        newPassword
      });
      
      if (response.data.success) {
        message.success('Contraseña restablecida exitosamente');
        return { success: true, user: response.data.user };
      }
    } catch (error) {
      console.error('Error en reset password:', error);
      const errorMessage = error.response?.data?.message || 'Error restableciendo la contraseña';
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const verifyResetToken = async (token) => {
    try {
      const response = await axios.get(`/api/auth/verify-reset-token/${token}`);
      return response.data;
    } catch (error) {
      console.error('Error verificando token:', error);
      return { success: false, valid: false, error: error.response?.data?.message || 'Error verificando el token' };
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const response = await axios.put(`/api/auth/users/${userId}/role`, {
        newRole
      });

      if (response.data.success) {
        message.success('Rol de usuario actualizado exitosamente');
        return { success: true };
      }
    } catch (error) {
      console.error('Error actualizando rol:', error);
      const errorMessage = error.response?.data?.message || 'Error actualizando el rol';
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const hasPermission = (permission) => {
    if (!user || !permissions) return false;
    
    // Administrador tiene todos los permisos
    if (user.role === 'Administrador del Sistema') return true;
    
    return permissions[permission] === true || permissions[permission] === 'full';
  };

  const canExportXTF = () => {
    return hasPermission('can_export_xtf');
  };

  const canLoadXTF = () => {
    return hasPermission('can_load_xtf');
  };

  const canAccessGDB = () => {
    return hasPermission('can_access_gdb');
  };

  const canManageUsers = () => {
    return hasPermission('can_manage_users');
  };

  const canManagePredios = () => {
    return hasPermission('can_manage_predios');
  };

  const canApprovePredios = () => {
    return hasPermission('can_approve_predios');
  };

  const canViewAuditLogs = () => {
    return hasPermission('can_view_audit_logs');
  };

  const isTokenExpired = () => {
    if (!token) return true;
    
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  };

  const refreshToken = async () => {
    // Implementar lógica de refresh token si es necesario
    // Por ahora, simplemente validamos el token existente
    if (token && !isTokenExpired()) {
      await validateToken();
    } else {
      logout();
    }
  };

  const value = {
    user,
    token,
    loading,
    permissions,
    login,
    logout,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyResetToken,
    updateUserRole,
    hasPermission,
    canExportXTF,
    canLoadXTF,
    canAccessGDB,
    canManageUsers,
    canManagePredios,
    canApprovePredios,
    canViewAuditLogs,
    isTokenExpired,
    refreshToken,
    isAuthenticated: !!user && !!token,
    municipioSeleccionado,
    seleccionarMunicipio,
    cambiarMunicipio
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

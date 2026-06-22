import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './contexts/AuthContext';

// Componentes de autenticación
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

// Componentes del layout
import Layout from './components/layout/Layout';

// Componentes de páginas
import Dashboard from './components/dashboard/Dashboard';
import Predios from './components/predios/Predios';
import PredioForm from './components/predios/PredioForm';
// import PredioDetail from './components/predios/PredioDetail';
import Users from './components/users/Users';
// import Profile from './components/auth/Profile';
import AuditLogs from './components/audit/AuditLogs';

// Componentes de carga de archivos
import XTFUpload from './components/xtf/XTFUpload';
import XTFValidation from './components/xtf/XTFValidation';
import IGACExcelImport from './components/xtf/IGACExcelImport';
import ExcelToXTFConverter from './components/xtf/ExcelToXTFConverter';
import ILIManager from './components/ili/ILIManager';
import SchemaExplorer from './components/ili/SchemaExplorer';
import MunicipiosManager from './components/municipios/MunicipiosManager';
import MunicipioSelector from './components/municipios/MunicipioSelector';
import ConsultaAlfanumerico from './components/consultaAlfanumerico/ConsultaAlfanumerico';
import CatalogosManager from './components/catalogos/CatalogosManager';
import RevisionCatastral from './components/predios/RevisionCatastral';

// Componente de ruta protegida
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, municipioSeleccionado } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="Cargando GPCONES..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado pero no tiene municipio seleccionado, mostrar selector
  if (!municipioSeleccionado) {
    return <MunicipioSelector />;
  }

  return children;
};

// Componente principal de la aplicación
function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="Inicializando GPCONES..." />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        
        {/* Rutas protegidas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Dashboard />} />
          
          {/* Gestión de Predios */}
          <Route path="predios" element={<Predios />} />
          <Route path="predios/revision" element={<RevisionCatastral />} />
          <Route path="predios/nuevo" element={<PredioForm />} />
          {/* <Route path="predios/:id" element={<PredioDetail />} /> */}
          <Route path="predios/:id/editar" element={<PredioForm />} />
          
          {/* Gestión de Usuarios */}
          <Route path="users" element={<Users />} />
          
          {/* Perfil de Usuario */}
          {/* <Route path="profile" element={<Profile />} /> */}
          
          {/* Auditoría */}
          <Route path="audit" element={<AuditLogs />} />
          
                                {/* Carga de Archivos XTF */}
                      <Route path="xtf/upload" element={<XTFUpload />} />
                      <Route path="xtf/validation" element={<XTFValidation />} />
                      <Route path="xtf/import-excel" element={<IGACExcelImport />} />
                      <Route path="xtf/excel-to-xtf" element={<ExcelToXTFConverter />} />
                      
                      {/* Gestión ILI/XTF */}
                      <Route path="ili" element={<ILIManager />} />
                      <Route path="ili/explorer" element={<SchemaExplorer />} />
                      
                      {/* Gestión de Municipios */}
                      <Route path="municipios" element={<MunicipiosManager />} />
                      
                      {/* Selector de Municipio */}
                      <Route path="select-municipio" element={<MunicipioSelector />} />
                      
                      {/* Consulta Alfanumérica */}
                      <Route path="consulta-alfanumerico" element={<ConsultaAlfanumerico />} />
                      
                      {/* Administración de Catálogos */}
                      <Route path="catalogos" element={<CatalogosManager />} />
          
          {/* Ruta por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;

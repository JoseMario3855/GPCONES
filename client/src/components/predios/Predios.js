import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Fab,
  Tooltip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Home as HomeIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import axios from 'axios';

const Predios = () => {
  const [predios, setPredios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPredio, setEditingPredio] = useState(null);
  const [viewingPredio, setViewingPredio] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    municipio: '',
    departamento: '',
    tipo_predio: '',
    area_min: '',
    area_max: ''
  });

  // Formulario
  const [formData, setFormData] = useState({
    numero_predial: '',
    matricula_inmobiliaria: '',
    area_terreno: '',
    area_construccion: '',
    direccion: '',
    municipio: '',
    departamento: 'Antioquia',
    coordenadas_x: '',
    coordenadas_y: '',
    tipo_predio: '',
    uso_predio: '',
    observaciones: ''
  });

  const tipoPredios = [
    'Urbano',
    'Rural',
    'Mixto',
    'Industrial',
    'Comercial',
    'Residencial'
  ];

  const usosPredio = [
    'Residencial',
    'Comercial',
    'Industrial',
    'Agrícola',
    'Ganadero',
    'Forestal',
    'Recreativo',
    'Institucional'
  ];

  useEffect(() => {
    loadPredios();
    loadStatistics();
  }, [page, rowsPerPage, filters]);

  const loadPredios = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...filters
      });

      const response = await axios.get(`/api/predios?${params}`);
      setPredios(response.data.data.predios);
      setTotal(response.data.data.pagination.total);
    } catch (error) {
      console.error('Error al cargar predios:', error);
      showSnackbar('Error al cargar predios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await axios.get('/api/predios/statistics');
      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingPredio) {
        await axios.put(`/api/predios/${editingPredio.id}`, formData);
        showSnackbar('Predio actualizado correctamente', 'success');
      } else {
        await axios.post('/api/predios', formData);
        showSnackbar('Predio registrado correctamente', 'success');
      }

      setOpenDialog(false);
      resetForm();
      loadPredios();
      loadStatistics();
    } catch (error) {
      console.error('Error al guardar predio:', error);
      const message = error.response?.data?.error || 'Error al guardar predio';
      showSnackbar(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (predio) => {
    setEditingPredio(predio);
    setFormData({
      numero_predial: predio.numero_predial || '',
      matricula_inmobiliaria: predio.matricula_inmobiliaria || '',
      area_terreno: predio.area_terreno || '',
      area_construccion: predio.area_construccion || '',
      direccion: predio.direccion || '',
      municipio: predio.municipio || '',
      departamento: predio.departamento || 'Antioquia',
      coordenadas_x: predio.coordenadas_x || '',
      coordenadas_y: predio.coordenadas_y || '',
      tipo_predio: predio.tipo_predio || '',
      uso_predio: predio.uso_predio || '',
      observaciones: predio.observaciones || ''
    });
    setOpenDialog(true);
  };

  const handleView = async (predio) => {
    try {
      const response = await axios.get(`/api/predios/${predio.id}`);
      setViewingPredio(response.data.predio);
    } catch (error) {
      console.error('Error al cargar predio:', error);
      showSnackbar('Error al cargar predio', 'error');
    }
  };

  const handleDelete = async (predio) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este predio?')) {
      try {
        await axios.delete(`/api/predios/${predio.id}`);
        showSnackbar('Predio eliminado correctamente', 'success');
        loadPredios();
        loadStatistics();
      } catch (error) {
        console.error('Error al eliminar predio:', error);
        showSnackbar('Error al eliminar predio', 'error');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      numero_predial: '',
      matricula_inmobiliaria: '',
      area_terreno: '',
      area_construccion: '',
      direccion: '',
      municipio: '',
      departamento: 'Antioquia',
      coordenadas_x: '',
      coordenadas_y: '',
      tipo_predio: '',
      uso_predio: '',
      observaciones: ''
    });
    setEditingPredio(null);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      municipio: '',
      departamento: '',
      tipo_predio: '',
      area_min: '',
      area_max: ''
    });
    setPage(0);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🏠 Gestión Catastral
      </Typography>

      {/* Estadísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Predios
              </Typography>
              <Typography variant="h4">
                {statistics.total_predios || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Área Total (m²)
              </Typography>
              <Typography variant="h4">
                {statistics.area_total ? Math.round(statistics.area_total).toLocaleString() : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Municipios
              </Typography>
              <Typography variant="h4">
                {statistics.total_municipios || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Área Promedio (m²)
              </Typography>
              <Typography variant="h4">
                {statistics.area_promedio ? Math.round(statistics.area_promedio) : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          🔍 Filtros de Búsqueda
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Buscar (Número Predial, Matrícula, Dirección)"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Municipio"
              value={filters.municipio}
              onChange={(e) => handleFilterChange('municipio', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Departamento"
              value={filters.departamento}
              onChange={(e) => handleFilterChange('departamento', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Predio</InputLabel>
              <Select
                value={filters.tipo_predio}
                onChange={(e) => handleFilterChange('tipo_predio', e.target.value)}
                label="Tipo de Predio"
              >
                <MenuItem value="">Todos</MenuItem>
                {tipoPredios.map(tipo => (
                  <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Área Mínima (m²)"
              type="number"
              value={filters.area_min}
              onChange={(e) => handleFilterChange('area_min', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={1}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              fullWidth
              size="small"
            >
              Limpiar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de Predios */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Número Predial</TableCell>
                <TableCell>Matrícula</TableCell>
                <TableCell>Área (m²)</TableCell>
                <TableCell>Municipio</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : predios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No se encontraron predios
                  </TableCell>
                </TableRow>
              ) : (
                predios.map((predio) => (
                  <TableRow key={predio.id}>
                    <TableCell>{predio.numero_predial}</TableCell>
                    <TableCell>{predio.matricula_inmobiliaria}</TableCell>
                    <TableCell>{predio.area_terreno}</TableCell>
                    <TableCell>{predio.municipio}</TableCell>
                    <TableCell>
                      <Chip 
                        label={predio.tipo_predio || 'No especificado'} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={predio.estado || 'Activo'} 
                        size="small" 
                        color={predio.estado === 'activo' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleView(predio)} size="small">
                        <ViewIcon />
                      </IconButton>
                      <IconButton onClick={() => handleEdit(predio)} size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(predio)} size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
        />
      </Paper>

      {/* Botón flotante para agregar */}
      <Tooltip title="Registrar nuevo predio">
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setOpenDialog(true)}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      {/* Dialog para agregar/editar predio */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPredio ? 'Editar Predio' : 'Registrar Nuevo Predio'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Número Predial *"
                  value={formData.numero_predial}
                  onChange={(e) => setFormData({...formData, numero_predial: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Matrícula Inmobiliaria *"
                  value={formData.matricula_inmobiliaria}
                  onChange={(e) => setFormData({...formData, matricula_inmobiliaria: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Área del Terreno (m²) *"
                  type="number"
                  value={formData.area_terreno}
                  onChange={(e) => setFormData({...formData, area_terreno: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Área de Construcción (m²)"
                  type="number"
                  value={formData.area_construccion}
                  onChange={(e) => setFormData({...formData, area_construccion: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Dirección"
                  value={formData.direccion}
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Municipio *"
                  value={formData.municipio}
                  onChange={(e) => setFormData({...formData, municipio: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Departamento *"
                  value={formData.departamento}
                  onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Coordenada X"
                  type="number"
                  value={formData.coordenadas_x}
                  onChange={(e) => setFormData({...formData, coordenadas_x: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Coordenada Y"
                  type="number"
                  value={formData.coordenadas_y}
                  onChange={(e) => setFormData({...formData, coordenadas_y: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Predio</InputLabel>
                  <Select
                    value={formData.tipo_predio}
                    onChange={(e) => setFormData({...formData, tipo_predio: e.target.value})}
                    label="Tipo de Predio"
                  >
                    {tipoPredios.map(tipo => (
                      <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Uso del Predio</InputLabel>
                  <Select
                    value={formData.uso_predio}
                    onChange={(e) => setFormData({...formData, uso_predio: e.target.value})}
                    label="Uso del Predio"
                  >
                    {usosPredio.map(uso => (
                      <MenuItem key={uso} value={uso}>{uso}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observaciones"
                  multiline
                  rows={3}
                  value={formData.observaciones}
                  onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : (editingPredio ? 'Actualizar' : 'Registrar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para ver predio */}
      <Dialog open={!!viewingPredio} onClose={() => setViewingPredio(null)} maxWidth="md" fullWidth>
        <DialogTitle>Detalles del Predio</DialogTitle>
        <DialogContent>
          {viewingPredio && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Número Predial</Typography>
                <Typography variant="body1">{viewingPredio.numero_predial}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Matrícula Inmobiliaria</Typography>
                <Typography variant="body1">{viewingPredio.matricula_inmobiliaria}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Área del Terreno</Typography>
                <Typography variant="body1">{viewingPredio.area_terreno} m²</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Área de Construcción</Typography>
                <Typography variant="body1">{viewingPredio.area_construccion || 'No especificado'} m²</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Dirección</Typography>
                <Typography variant="body1">{viewingPredio.direccion || 'No especificado'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Municipio</Typography>
                <Typography variant="body1">{viewingPredio.municipio}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Departamento</Typography>
                <Typography variant="body1">{viewingPredio.departamento}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Tipo de Predio</Typography>
                <Typography variant="body1">{viewingPredio.tipo_predio || 'No especificado'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Uso del Predio</Typography>
                <Typography variant="body1">{viewingPredio.uso_predio || 'No especificado'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Observaciones</Typography>
                <Typography variant="body1">{viewingPredio.observaciones || 'Sin observaciones'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Registrado por</Typography>
                <Typography variant="body1">{viewingPredio.created_by_name || 'Sistema'}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingPredio(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Predios; 
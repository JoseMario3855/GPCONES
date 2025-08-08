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
  Alert,
  Snackbar,
  CircularProgress,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import axios from 'axios';

const XTFUpload = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState(0);
  const [validationResults, setValidationResults] = useState(null);
  const [processingResults, setProcessingResults] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [viewDetails, setViewDetails] = useState(null);

  const processingSteps = [
    'Carga del archivo',
    'Validación del modelo',
    'Análisis de datos',
    'Conversión a PostgreSQL',
    'Finalización'
  ];

  useEffect(() => {
    loadFiles();
  }, [page, rowsPerPage]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/xtf?page=${page + 1}&limit=${rowsPerPage}`);
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Error al cargar archivos:', error);
      showSnackbar('Error al cargar archivos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.name.toLowerCase().endsWith('.xtf')) {
      setSelectedFile(file);
    } else {
      showSnackbar('Por favor selecciona un archivo .xtf válido', 'error');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showSnackbar('Por favor selecciona un archivo', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setProcessingStep(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Simular progreso de carga
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      const response = await axios.post('/api/xtf/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      showSnackbar('Archivo cargado correctamente', 'success');
      setSelectedFile(null);
      loadFiles();
      
      // Simular proceso de validación y procesamiento
      simulateProcessing(response.data.file.id);
      
    } catch (error) {
      console.error('Error al cargar archivo:', error);
      const message = error.response?.data?.error || 'Error al cargar archivo';
      showSnackbar(message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const simulateProcessing = async (fileId) => {
    setProcessingStep(1);
    
    // Simular validación
    await new Promise(resolve => setTimeout(resolve, 2000));
    setProcessingStep(2);
    
    try {
      const validationResponse = await axios.post(`/api/xtf/${fileId}/validate`);
      setValidationResults(validationResponse.data);
    } catch (error) {
      console.error('Error en validación:', error);
    }
    
    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 3000));
    setProcessingStep(3);
    
    try {
      const processingResponse = await axios.post(`/api/xtf/${fileId}/process`);
      setProcessingResults(processingResponse.data);
    } catch (error) {
      console.error('Error en procesamiento:', error);
    }
    
    // Finalizar
    await new Promise(resolve => setTimeout(resolve, 1000));
    setProcessingStep(4);
    
    loadFiles();
  };

  const handleValidate = async (fileId) => {
    try {
      const response = await axios.post(`/api/xtf/${fileId}/validate`);
      setValidationResults(response.data);
      showSnackbar('Validación completada', 'success');
    } catch (error) {
      console.error('Error en validación:', error);
      showSnackbar('Error en validación', 'error');
    }
  };

  const handleProcess = async (fileId) => {
    try {
      const response = await axios.post(`/api/xtf/${fileId}/process`);
      setProcessingResults(response.data);
      showSnackbar('Procesamiento completado', 'success');
      loadFiles();
    } catch (error) {
      console.error('Error en procesamiento:', error);
      showSnackbar('Error en procesamiento', 'error');
    }
  };

  const handleDelete = async (fileId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
      try {
        await axios.delete(`/api/xtf/${fileId}`);
        showSnackbar('Archivo eliminado correctamente', 'success');
        loadFiles();
      } catch (error) {
        console.error('Error al eliminar archivo:', error);
        showSnackbar('Error al eliminar archivo', 'error');
      }
    }
  };

  const handleViewDetails = async (file) => {
    try {
      const response = await axios.get(`/api/xtf/${file.id}`);
      setViewDetails(response.data.file);
    } catch (error) {
      console.error('Error al cargar detalles:', error);
      showSnackbar('Error al cargar detalles', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'error': return 'error';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckIcon />;
      case 'processing': return <CircularProgress size={20} />;
      case 'error': return <ErrorIcon />;
      case 'pending': return <InfoIcon />;
      default: return <InfoIcon />;
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📁 Carga de Archivos XTF
      </Typography>

      {/* Panel de carga */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          🚀 Cargar Nuevo Archivo XTF
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              disabled={uploading}
              fullWidth
            >
              Seleccionar Archivo XTF
              <input
                type="file"
                hidden
                accept=".xtf"
                onChange={handleFileSelect}
              />
            </Button>
            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Archivo seleccionado: {selectedFile.name}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              fullWidth
              startIcon={uploading ? <CircularProgress size={20} /> : <PlayIcon />}
            >
              {uploading ? 'Subiendo...' : 'Cargar Archivo'}
            </Button>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              onClick={() => setSelectedFile(null)}
              disabled={!selectedFile || uploading}
              fullWidth
            >
              Limpiar
            </Button>
          </Grid>
        </Grid>

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Progreso: {uploadProgress}%
            </Typography>
          </Box>
        )}

        {uploading && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Procesando archivo...
            </Typography>
            <Stepper activeStep={processingStep} orientation="vertical">
              {processingSteps.map((step, index) => (
                <Step key={step}>
                  <StepLabel>{step}</StepLabel>
                  <StepContent>
                    {index === processingStep && (
                      <CircularProgress size={20} sx={{ ml: 2 }} />
                    )}
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}
      </Paper>

      {/* Resultados de validación */}
      {validationResults && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            📋 Resultados de Validación
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Estado
                  </Typography>
                  <Chip 
                    label={validationResults.valid ? 'Válido' : 'Inválido'} 
                    color={validationResults.valid ? 'success' : 'error'}
                    icon={validationResults.valid ? <CheckIcon /> : <ErrorIcon />}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Errores
                  </Typography>
                  <Typography variant="h4">
                    {validationResults.errors?.length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Advertencias
                  </Typography>
                  <Typography variant="h4">
                    {validationResults.warnings?.length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {validationResults.errors && validationResults.errors.length > 0 && (
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Ver Errores de Validación</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {validationResults.errors.map((error, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText primary={error.message} secondary={error.location} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}
        </Paper>
      )}

      {/* Resultados de procesamiento */}
      {processingResults && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            ⚙️ Resultados de Procesamiento
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Predios Procesados
                  </Typography>
                  <Typography variant="h4">
                    {processingResults.predios_processed || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Construcciones
                  </Typography>
                  <Typography variant="h4">
                    {processingResults.construcciones_processed || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Terrenos
                  </Typography>
                  <Typography variant="h4">
                    {processingResults.terrenos_processed || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tiempo de Procesamiento
                  </Typography>
                  <Typography variant="h4">
                    {processingResults.processing_time || 0}s
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Tabla de archivos */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Archivo</TableCell>
                <TableCell>Tamaño</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Fecha Carga</TableCell>
                <TableCell>Progreso</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No se encontraron archivos XTF
                  </TableCell>
                </TableRow>
              ) : (
                files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>{file.filename}</TableCell>
                    <TableCell>{(file.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                    <TableCell>
                      <Chip 
                        label={file.status} 
                        color={getStatusColor(file.status)}
                        icon={getStatusIcon(file.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(file.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {file.progress || 0}%
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleViewDetails(file)} size="small">
                        <ViewIcon />
                      </IconButton>
                      {file.status === 'pending' && (
                        <>
                          <IconButton onClick={() => handleValidate(file.id)} size="small">
                            <AssessmentIcon />
                          </IconButton>
                          <IconButton onClick={() => handleProcess(file.id)} size="small">
                            <PlayIcon />
                          </IconButton>
                        </>
                      )}
                      <IconButton onClick={() => handleDelete(file.id)} size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog para ver detalles */}
      <Dialog open={!!viewDetails} onClose={() => setViewDetails(null)} maxWidth="md" fullWidth>
        <DialogTitle>Detalles del Archivo XTF</DialogTitle>
        <DialogContent>
          {viewDetails && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Nombre del Archivo</Typography>
                <Typography variant="body1">{viewDetails.filename}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Tamaño</Typography>
                <Typography variant="body1">{(viewDetails.size / 1024 / 1024).toFixed(2)} MB</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Estado</Typography>
                <Chip 
                  label={viewDetails.status} 
                  color={getStatusColor(viewDetails.status)}
                  icon={getStatusIcon(viewDetails.status)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Fecha de Carga</Typography>
                <Typography variant="body1">
                  {new Date(viewDetails.created_at).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Descripción</Typography>
                <Typography variant="body1">{viewDetails.description || 'Sin descripción'}</Typography>
              </Grid>
              {viewDetails.validation_results && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Resultados de Validación</Typography>
                  <Typography variant="body1">
                    {viewDetails.validation_results.valid ? 'Válido' : 'Inválido'}
                  </Typography>
                </Grid>
              )}
              {viewDetails.processing_results && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Resultados de Procesamiento</Typography>
                  <Typography variant="body1">
                    Predios: {viewDetails.processing_results.predios_processed || 0}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDetails(null)}>Cerrar</Button>
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

export default XTFUpload; 
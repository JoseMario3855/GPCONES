import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Button,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  TableChart as TableChartIcon,
  Storage as StorageIcon,
  Map as MapIcon
} from '@mui/icons-material';
import axios from 'axios';

const AntioquiaSchema = () => {
  const [schemaInfo, setSchemaInfo] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSchemaInfo();
  }, []);

  const fetchSchemaInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/antioquia/schema-info', {
        headers: { 'x-auth-token': token }
      });
      setSchemaInfo(response.data.data);
    } catch (err) {
      setError('Error al cargar información del schema');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (tableName, page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/antioquia/table/${tableName}`, {
        headers: { 'x-auth-token': token },
        params: { page, limit: 20, search: searchTerm }
      });
      setTableData(response.data.data);
      setSelectedTable(tableName);
    } catch (err) {
      setError('Error al cargar datos de la tabla');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      cc: 'primary',
      cr: 'secondary',
      gc: 'success',
      lc: 'warning',
      snr: 'info',
      ini: 'error'
    };
    return colors[category] || 'default';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      cc: <StorageIcon />,
      cr: <TableChartIcon />,
      gc: <MapIcon />,
      lc: <TableChartIcon />,
      snr: <StorageIcon />,
      ini: <StorageIcon />
    };
    return icons[category] || <StorageIcon />;
  };

  if (loading && !schemaInfo) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Schema Antioquia Test
      </Typography>
      
      <Grid container spacing={3}>
        {/* Estadísticas */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Estadísticas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total de tablas: {schemaInfo?.totalTables}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tablas con geometrías: {schemaInfo?.geometryTables}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Categorías */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Categorías
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {Object.entries(schemaInfo?.categories || {}).map(([category, tables]) => (
                  <Chip
                    key={category}
                    label={`${category.toUpperCase()}: ${tables.length}`}
                    color={getCategoryColor(category)}
                    icon={getCategoryIcon(category)}
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Estructura del Schema */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Estructura del Schema
              </Typography>
              
              {Object.entries(schemaInfo?.categories || {}).map(([category, tables]) => (
                <Accordion key={category}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={2}>
                      {getCategoryIcon(category)}
                      <Typography variant="subtitle1">
                        {category.toUpperCase()} ({tables.length} tablas)
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {tables.map((table) => (
                        <Grid item xs={12} sm={6} md={4} key={table.name}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="subtitle2" gutterBottom>
                                {table.name}
                              </Typography>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => fetchTableData(table.name)}
                                disabled={loading}
                              >
                                Ver Datos
                              </Button>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Datos de Tabla Seleccionada */}
        {selectedTable && tableData && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Datos de {selectedTable}
                </Typography>
                
                <Box mb={2}>
                  <TextField
                    fullWidth
                    placeholder="Buscar en la tabla..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        {tableData.records.length > 0 && 
                          Object.keys(tableData.records[0]).map((column) => (
                            <TableCell key={column}>{column}</TableCell>
                          ))
                        }
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableData.records.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <TableCell key={cellIndex}>
                              {typeof value === 'object' ? 'Geometría' : String(value || '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">
                    Mostrando {tableData.records.length} de {tableData.total} registros
                  </Typography>
                  <Box>
                    <Button
                      disabled={tableData.page <= 1}
                      onClick={() => fetchTableData(selectedTable, tableData.page - 1)}
                    >
                      Anterior
                    </Button>
                    <Typography component="span" sx={{ mx: 2 }}>
                      Página {tableData.page} de {tableData.totalPages}
                    </Typography>
                    <Button
                      disabled={tableData.page >= tableData.totalPages}
                      onClick={() => fetchTableData(selectedTable, tableData.page + 1)}
                    >
                      Siguiente
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AntioquiaSchema;

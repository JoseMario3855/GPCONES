import React from 'react';
import { Box, Grid, Paper, Typography, Card, CardContent } from '@mui/material';
import { Map, Upload, Person } from '@mui/icons-material';

const Dashboard = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Map sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">150</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Predios Registrados
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Upload sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">25</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Archivos XTF Cargados
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Person sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">5</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Usuarios Activos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Bienvenido al Sistema Catastral GP Cones
            </Typography>
            <Typography variant="body1" paragraph>
              Este sistema permite la gestión integral de predios catastrales y el procesamiento 
              de archivos XTF según los estándares IGAC y la extensión Antioquia del modelo LADM-COL.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Utiliza el menú lateral para navegar entre las diferentes funcionalidades del sistema.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 
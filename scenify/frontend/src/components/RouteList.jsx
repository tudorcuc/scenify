import React from 'react';
import { 
  Paper, 
  Typography, 
  ListItemText, 
  ListItemButton,
  Skeleton,
  Box,
  Chip
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RouteIcon from '@mui/icons-material/Route';
import MuseumIcon from '@mui/icons-material/Museum';

const RouteInfo = ({ route }) => {
  const isValidPOI = (point) => {
    return !point.name.toLowerCase().includes('start') && 
           !point.name.toLowerCase().includes('end');
  };
  const poiCount = route.points?.filter(p => isValidPOI(p)).length || 0;
  const distanceKm = (route.distance / 1000).toFixed(1);

  return (
    <Box>
      <Typography variant="body2" color="textSecondary" component="div" sx={{ mb: 1 }}>
        {route.description}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip 
          icon={<RouteIcon />} 
          label={`${distanceKm} km`}
          size="small"
          sx={{ 
            bgcolor: 'background.paper',
            '& .MuiChip-icon': { color: 'primary.main' }
          }}
        />
        {poiCount > 0 && (
          <Chip
            icon={<MuseumIcon />}
            label={`${poiCount - 2} attractions`}
            size="small"
            sx={{ 
              bgcolor: 'background.paper',
              '& .MuiChip-icon': { color: 'secondary.main' }
            }}
          />
        )}
      </Box>
    </Box>
  );
};

const RouteList = ({ 
  routes, 
  selectedRoute, 
  setSelectedRoute,
  loading
}) => {
  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
      </Paper>
    );
  }

  if (!routes || !routes.fastest_route || !routes.scenic_routes) {
    return null;
  }

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        bgcolor: 'background.paper', 
        flex: 1,
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))'
      }}
    >      <Typography 
        variant="h6" 
        sx={{ 
          mb: 2, 
          fontFamily: 'Poppins, sans-serif', 
          fontWeight: 600,
          textAlign: 'center',
          width: '100%'
        }}
      >
        Available Routes
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <ListItemButton 
            selected={selectedRoute?.name === routes.fastest_route.name}
            onClick={() => setSelectedRoute(routes.fastest_route)}
            sx={{ 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 1
              }
            }}
          >
            <ListItemText 
              primary={
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Direct Route
                </Typography>
              }
              secondary={<RouteInfo route={routes.fastest_route} />}
            />
          </ListItemButton>
        </Box>

        {routes.scenic_routes.map((route, index) => (
          <Box key={index} sx={{ flex: '1 1 300px', minWidth: 0 }}>
            <ListItemButton 
              selected={selectedRoute?.name === route.name}
              onClick={() => setSelectedRoute(route)}
              sx={{ 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: index === 0 ? 
                  'rgba(25, 118, 210, 0.08)' : 
                  'rgba(76, 175, 80, 0.08)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 1
                }
              }}
            >
              <ListItemText 
                primary={
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: index === 0 ? 'primary.main' : 'success.main' }}>
                    {index === 0 ? 'Quick Scenic Route' : 'Explorer Route'}
                  </Typography>
                }
                secondary={<RouteInfo route={route} />}
              />
            </ListItemButton>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default RouteList;
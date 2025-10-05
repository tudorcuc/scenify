import React, { useState } from 'react';
import { 
  Button, 
  TextField, 
  Paper, 
  Typography, 
  CircularProgress,
  Alert,
  Box,
  Fade,
  ToggleButton
} from '@mui/material';
import axios from 'axios';
import MuseumIcon from '@mui/icons-material/Museum';
import CastleIcon from '@mui/icons-material/Castle';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ChurchIcon from '@mui/icons-material/Church';
import LandscapeIcon from '@mui/icons-material/Landscape';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import WaterIcon from '@mui/icons-material/Water';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import ParkIcon from '@mui/icons-material/Park';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SwitchAccessShortcutIcon from '@mui/icons-material/SwitchAccessShortcut';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CATEGORIES = [
  { id: 'museum', label: 'Museum', icon: <MuseumIcon />, type: 'tourism', subtype: 'museum' },
  { id: 'gallery', label: 'Gallery', icon: <MuseumIcon />, type: 'tourism', subtype: 'gallery' },
  { id: 'castle', label: 'Castle', icon: <CastleIcon />, type: 'historic', subtype: 'castle' },
  { id: 'palace', label: 'Palace', icon: <AccountBalanceIcon />, type: 'historic', subtype: 'palace' },
  { id: 'monastery', label: 'Monastery', icon: <ChurchIcon />, type: 'historic', subtype: 'monastery' },
  { id: 'cathedral', label: 'Cathedral', icon: <ChurchIcon />, type: 'historic', subtype: 'cathedral' },
  { id: 'church', label: 'Church', icon: <ChurchIcon />, type: 'historic', subtype: 'church' },
  { id: 'peak', label: 'Peak', icon: <LandscapeIcon />, type: 'natural', subtype: 'peak' },
  { id: 'volcano', label: 'Volcano', icon: <LocalFireDepartmentIcon />, type: 'natural', subtype: 'volcano' },
  { id: 'waterfall', label: 'Waterfall', icon: <WaterIcon />, type: 'waterway', subtype: 'waterfall' },
  { id: 'beach', label: 'Beach', icon: <BeachAccessIcon />, type: 'natural', subtype: 'beach' },
  { id: 'bay', label: 'Bay', icon: <BeachAccessIcon />, type: 'natural', subtype: 'bay' },
  { id: 'park', label: 'Park', icon: <ParkIcon />, type: 'leisure', subtype: 'park' },
  { id: 'garden', label: 'Garden', icon: <ParkIcon />, type: 'leisure', subtype: 'garden' },
  { id: 'viewpoint', label: 'Viewpoint', icon: <PhotoCameraIcon />, type: 'tourism', subtype: 'viewpoint' }
];

const RouteForm = ({ 
  setRoutes, 
  setSelectedRoute,
  setLoading,
  setError,
  setProgressMessages
}) => {
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(CATEGORIES.map(c => c.id));
  const [fieldErrors, setFieldErrors] = useState({
    startLocation: '',
    endLocation: ''
  });

  const handleCategoryChange = (event, newCategories) => {
    setSelectedCategories(newCategories);
  };

  const toggleAllCategories = () => {
    if (selectedCategories.length === CATEGORIES.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(CATEGORIES.map(c => c.id));
    }
  };

  const validateField = (field, value) => {
    if (!value.trim()) {
      return `Please enter a ${field.replace('Location', ' location')}`;
    }
    if (value.length < 3) {
      return 'Location must be at least 3 characters long';
    }
    return '';
  };

  const handleLocationChange = (field) => (e) => {
    const value = e.target.value;
    if (field === 'startLocation') {
      setStartLocation(value);
    } else {
      setEndLocation(value);
    }
    setFieldErrors(prev => ({
      ...prev,
      [field]: validateField(field, value)
    }));
    setFormError(null);
  };

  const formatErrorMessage = (error) => {
    const match = error.match(/Could not geocode .* location: '(.*)'/);
    if (match) {
      const location = match[1];
      return `Unable to find "${location}". Please verify the spelling or try a nearby city.`;
    }
    return error;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const startError = validateField('startLocation', startLocation);
    const endError = validateField('endLocation', endLocation);
    
    setFieldErrors({
      startLocation: startError,
      endLocation: endError
    });

    if (startError || endError) {
      setFormError('Please fix the errors above to continue');
      return;
    }

    if (!startLocation.trim() || !endLocation.trim()) {
      setFormError('Please enter both start and end locations');
      return;
    }
    
    setFormError(null);
    setLoading(true);
    setError(null);
    setIsSubmitting(true);
    setProgressMessages([]);
    
    try {
      const selectedCategoryDetails = CATEGORIES
        .filter(cat => selectedCategories.includes(cat.id))
        .map(cat => ({ type: cat.type, subtype: cat.subtype }));

      const response = await axios.post(`${API_URL}/routes`, {
        startLocation,
        endLocation,
        poiCount: 15,
        categories: selectedCategoryDetails
      });
      
      const routesData = response.data;
      
      if (routesData.error) {
        console.error('API returned error:', routesData.error);
        const formattedError = formatErrorMessage(routesData.error);
        setFormError(formattedError);
        return;
      }
      
      const safeRoutesData = {
        fastest_route: routesData.fastest_route || null,
        scenic_routes: routesData.scenic_routes || []
      };
      
      setRoutes(safeRoutesData);
      if (safeRoutesData.fastest_route) {
        setSelectedRoute(safeRoutesData.fastest_route);
      }
    } catch (err) {
      console.error('Error fetching routes:', err);
      if (err.response && err.response.data && err.response.data.error) {
        const formattedError = formatErrorMessage(err.response.data.error);
        setFormError(formattedError);
      } else {
        setFormError('Unable to generate routes at the moment. Please try again later.');
      }
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        padding: '40px',
        width: '100%',
        maxWidth: '600px',
        background: 'rgba(37, 37, 37, 0.9)',
        backdropFilter: 'blur(10px)',
        textAlign: 'center'
      }}
    >
      <Typography variant="h5" gutterBottom sx={{ color: 'white', mb: 3, fontFamily: "'Sriracha', cursive" }}>
        Where would you like to go?
      </Typography>

      <WarningAmberIcon sx={{ color: 'orange', mr: 1 }} />
      <Typography 
        variant="body2" 
        sx={{ 
          color: 'rgba(255, 255, 255, 0.7)',
          fontFamily: "'Sriracha', cursive",
          textAlign: 'center',
          mb: 2
        }}
      >
        The farther you travel, the longer you'll need to wait for your scenic route to be generated.
      </Typography>

      <form onSubmit={handleSubmit}>
        <Fade in={true}>
          <TextField
            label="Starting Location"
            fullWidth
            margin="normal"
            variant="outlined"
            value={startLocation}
            onChange={handleLocationChange('startLocation')}
            placeholder="e.g. Oradea, Romania"
            disabled={isSubmitting}
            error={!!fieldErrors.startLocation}
            helperText={fieldErrors.startLocation}
            autoFocus
            sx={{ mb: 2 }}
          />
        </Fade>

        <Fade in={true} style={{ transitionDelay: '100ms' }}>
          <TextField
            label="Destination"
            fullWidth
            margin="normal"
            variant="outlined"
            value={endLocation}
            onChange={handleLocationChange('endLocation')}
            placeholder="e.g. Vienna, Austria"
            disabled={isSubmitting}
            error={!!fieldErrors.endLocation}
            helperText={fieldErrors.endLocation}
            sx={{ mb: 3 }}
          />
        </Fade>

        <Typography variant="subtitle1" sx={{ color: 'white', mb: 2, fontFamily: "'Sriracha', cursive"}}>
          Points of Interest Categories
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            onClick={toggleAllCategories}
            startIcon={<SwitchAccessShortcutIcon />}
            sx={{ mb: 2 }}
          >
            {selectedCategories.length === CATEGORIES.length ? 'Deselect All' : 'Select All'}
          </Button>
          
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 1,
              mb: 2
            }}
          >
            {CATEGORIES.map((category) => (
              <ToggleButton 
                key={category.id} 
                value={category.id}
                selected={selectedCategories.includes(category.id)}
                onChange={() => {
                  const newCategories = selectedCategories.includes(category.id)
                    ? selectedCategories.filter(id => id !== category.id)
                    : [...selectedCategories, category.id];
                  setSelectedCategories(newCategories);
                }}
                aria-label={category.label}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  padding: '8px',
                  minHeight: '72px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px !important',
                  color: 'white',
                  '&.MuiToggleButton-root.Mui-selected': {
                    backgroundColor: 'rgba(76, 175, 80, 0.3) !important',
                    color: '#4CAF50',
                    '&:hover': {
                      backgroundColor: 'rgba(76, 175, 80, 0.4) !important',
                    }
                  },
                  '&.MuiToggleButton-root': {
                    margin: 0,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px !important',
                  }
                }}
              >
                {category.icon}
                <Typography variant="caption" sx={{ textAlign: 'center', lineHeight: 1.2 }}>
                  {category.label}
                </Typography>
              </ToggleButton>
            ))}
          </Box>

          <Typography 
            variant="body2" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              fontFamily: "'Sriracha', cursive",
              textAlign: 'center',
              mb: 2
            }}
          >
            We'll also include rare findings you won't want to miss!
          </Typography>
        </Box>

        {formError && (
          <Alert 
            severity="error" 
            sx={{ 
              my: 2,
              '& .MuiAlert-message': {
                width: '100%',
                textAlign: 'left'
              }
            }}
          >
            {formError}
          </Alert>
        )}

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleSubmit}
          disabled={isSubmitting}
          sx={{
            mt: 2,
            py: 1.5,
            backgroundColor: '#4CAF50',
            fontSize: '1.1rem',
            fontFamily: "'Sriracha', cursive",
            textTransform: 'none',
            '&:hover': {
              backgroundColor: '#45a049'
            },
            '&:disabled': {
              backgroundColor: 'rgba(76, 175, 80, 0.5)'
            }
          }}
        >
          {isSubmitting ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              Finding Routes...
            </>
          ) : (
            'Scenify My Route'
          )}
        </Button>
      </form>
    </Paper>
  );
};

export default RouteForm;
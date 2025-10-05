import React, { useState } from 'react';
import { Container, CssBaseline, ThemeProvider, createTheme, Box, Button } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import 'ol/ol.css'; 
import GlobeComponent from './components/Globe/Globe';
import './App.css';
import RouteForm from './components/RouteForm';
import MapDisplay from './components/MapDisplay';
import RouteList from './components/RouteList';
import LandingPage from './components/LandingPage';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FFFFFF',
    },
    secondary: {
      main: '#666666',
    },
    background: {
      default: '#1B1B1B',
      paper: '#252525',
    },
  },
});

const MainApp = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState({
    fastest_route: null,
    scenic_routes: [],
  });
  
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progressMessages, setProgressMessages] = useState([]);

  const handleRoutesFound = (routesData) => {
    setRoutes(routesData);
  };

  const handleRestart = () => {
    setRoutes({
      fastest_route: null,
      scenic_routes: [],
    });
    setSelectedRoute(null);
    setError(null);
    setProgressMessages([]);
    navigate('/');
  };

  const showMap = routes.fastest_route !== null;

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: '#1B1B1B',
      position: 'relative'
    }}>
      {!showMap ? (
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            background: '#1B1B1B',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '200px',
              background: 'linear-gradient(to top, #FFE4E1, transparent)',
              opacity: 0.1,
            }
          }}
        >
          <Box
            sx={{
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              padding: '0 5%',
              gap: 4,
              alignItems: 'center'
            }}
          >              {/* Globe on the left */}
              <Box
                sx={{
                  position: 'relative',
                  width: '700px',
                  height: '700px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  resize: 'both',
                  aspectRatio: '1',
                  minWidth: '700px',
                  minHeight: '700px',
                  ml: 4,
                  '&:hover': {
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      right: 0,
                      bottom: 0,
                      width: '20px',
                      height: '20px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '0 0 50% 0',
                      cursor: 'nw-resize'
                    }
                  }
                }}
              >
                <GlobeComponent />
            </Box>

            {/* Route Form on the right */}
            <Box
              sx={{
                flex: '0 0 45%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start'
              }}
            >
              <RouteForm 
                setRoutes={handleRoutesFound}
                setSelectedRoute={setSelectedRoute}
                setLoading={setLoading}
                setError={setError}
                setProgressMessages={setProgressMessages}
              />
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ py: 2, px: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ 
            mb: 2, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}>
            <Button
              variant="contained"
              startIcon={<RestartAltIcon />}
              onClick={handleRestart}
              sx={{
                backgroundColor: '#2E7D32',
                color: 'white',
                padding: '12px 24px',
                fontSize: '1.1rem',
                fontFamily: "'Sriracha', cursive",
                fontWeight: 600,
                borderRadius: '8px',
                textTransform: 'none',
                boxShadow: '0 4px 14px 0 rgba(46, 125, 50, 0.39)',
                transition: 'all 0.3s ease',
                mb: 2,
                '&:hover': {
                  backgroundColor: '#1B5E20',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px 0 rgba(46, 125, 50, 0.45)'
                },
                '&:active': {
                  transform: 'translateY(1px)'
                }
              }}
            >
              Plan New Route
            </Button>

            <Box sx={{ width: '100%' }}>
              <RouteList 
                routes={routes} 
                selectedRoute={selectedRoute}
                setSelectedRoute={setSelectedRoute}
                loading={loading}
              />
            </Box>
          </Box>
          
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <MapDisplay 
              selectedRoute={selectedRoute} 
              loading={loading}
            />
          </Box>

          {loading && progressMessages.length > 0 && (
            <Box
              sx={{
                position: 'fixed',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                bgcolor: 'rgba(0,0,0,0.8)',
                color: 'white',
                p: 2,
                borderRadius: 2,
                maxWidth: '80%'
              }}
            >
              {progressMessages[progressMessages.length - 1]}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/plan" element={<MainApp />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GlobeComponent from './Globe/Globe';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '0 5%',
        background: '#1B1B1B',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Logo */}
      <Box sx={{ position: 'absolute', top: 20, left: 40 }}>
        <Typography variant="h3" fontWeight="bold" sx={{ fontFamily: "'Fleur De Leah', cursive" }}>
          Scenify
        </Typography>
      </Box>

      {/* Start Journey Button */}
      <Box sx={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        mt: 6
      }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/plan')}
          sx={{
            backgroundColor: '#2E7D32',
            color: 'white',
            padding: '16px 32px',
            fontSize: '1.3rem',
            fontFamily: "'Benne', serif",
            fontWeight: 600,
            borderRadius: '12px',
            textTransform: 'none',
            boxShadow: '0 4px 14px 0 rgba(46, 125, 50, 0.39)',
            transition: 'all 0.3s ease',
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
          START YOUR JOURNEY
        </Button>
      </Box>

      {/* Main Content */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        mt: 4,
        position: 'relative',
        gap: 30
      }}>
        {/* 3D Globe Container */}        <Box
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

        {/* Right side content */}
        <Box
          sx={{
            width: '50%',
            pr: 4,
            zIndex: 1
          }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="h3" 
              sx={{ 
                fontFamily: "'Benne', serif",
                fontWeight: 400,
                letterSpacing: 2,
                lineHeight: 1.5,
                color: '#E0E0E0',
                textTransform: 'uppercase',
                fontSize: '3.5rem'
              }}
            >
              Scenic
            </Typography>
            <Typography 
              variant="h3" 
              sx={{ 
                fontFamily: "'Benne', serif",
                fontWeight: 400,
                letterSpacing: 2,
                lineHeight: 1.5,
                color: '#E0E0E0',
                textTransform: 'uppercase',
                fontSize: '3.5rem'
              }}
            >
              Efficient
            </Typography>
            <Typography 
              variant="h3" 
              sx={{ 
                fontFamily: "'Benne', serif",
                fontWeight: 400,
                letterSpacing: 2,
                lineHeight: 1.5,
                color: '#E0E0E0',
                textTransform: 'uppercase',
                fontSize: '3.5rem'
              }}
            >
              Unforgettable
            </Typography>
          </Box>

          <Typography 
            variant="h3" 
            sx={{ 
              fontSize: '2.5rem',
              fontFamily: "'Benne', serif",
              fontWeight: 400,
              lineHeight: 1.3,
              mb: 3,
              background: 'linear-gradient(45deg, #4CAF50 30%, #81C784 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Plan the perfect journey with optimized routes through breathtaking destinations
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default LandingPage;
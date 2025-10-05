import React, { useEffect, useRef } from 'react';
import { Box, Paper, CircularProgress, Typography } from '@mui/material';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Style, Icon, Stroke, Circle, Fill } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { transform } from 'ol/proj';
import CastleIcon from '@mui/icons-material/Castle';
import ChurchIcon from '@mui/icons-material/Church';
import LandscapeIcon from '@mui/icons-material/Landscape';
import ParkIcon from '@mui/icons-material/Park';
import MuseumIcon from '@mui/icons-material/Museum';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WaterIcon from '@mui/icons-material/Water';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ApartmentIcon from '@mui/icons-material/Apartment';

//Icons for categories
const getPoiIcon = (type, subtype) => {
  // UNESCO sites
  if (subtype === 'UNESCO Site') return <AccountBalanceIcon />;
  
  // Historic sites
  if (subtype === 'Castle' || subtype === 'Palace') return <CastleIcon />;
  if (['Cathedral', 'Monastery', 'Church'].includes(subtype)) return <ChurchIcon />;
  if (subtype === 'Monument' || subtype === 'Memorial') return <AccountBalanceIcon />;
  if (subtype === 'Ruins' || subtype === 'Archaeological Site') return <ApartmentIcon />;
  
  // Natural sites
  if (subtype === 'Peak' || subtype === 'Volcano') return <LandscapeIcon />;
  if (subtype === 'Waterfall') return <WaterIcon />;
  if (subtype === 'Beach' || subtype === 'Bay') return <BeachAccessIcon />;
  
  // Cultural and leisure sites
  if (type === 'leisure' && (subtype === 'Park' || subtype === 'Garden')) return <ParkIcon />;
  if (subtype === 'Museum' || subtype === 'Gallery') return <MuseumIcon />;
  if (subtype === 'Viewpoint') return <PhotoCameraIcon />;

  return <LocationOnIcon />;
};

const MapDisplay = ({ selectedRoute, loading }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      const map = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: new OSM({
              attributions: []
            })
          })
        ],
        view: new View({
          center: fromLonLat([0, 0]),
          zoom: 2
        }),
        controls: []
      });
      mapInstanceRef.current = map;
    }

    if (selectedRoute) {
      updateMap(selectedRoute);
    }
  }, [selectedRoute]);

  const updateMap = (route) => {
    if (!route?.points || route.points.length < 2) return;
    const vectorSource = new VectorSource();
    if (route.path && route.path.length > 0) {
      const pathCoords = route.path.map(coord => fromLonLat([coord[0], coord[1]]));
      const routeFeature = new Feature({
        geometry: new LineString(pathCoords)
      });

      routeFeature.setStyle(new Style({
        stroke: new Stroke({
          color: '#4CAF50',
          width: 3
        })
      }));

      vectorSource.addFeature(routeFeature);
    }

    route.points.forEach((point, index) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([point.lon, point.lat])),
        name: point.name
      });

      const isEndpoint = index === 0 || index === route.points.length - 1;
      
      feature.setStyle(new Style({
        image: new Circle({
          radius: isEndpoint ? 8 : 6,
          fill: new Fill({
            color: isEndpoint ? 
              (index === 0 ? '#2196F3' : '#4CAF50') : 
              '#FFF'
          }),
          stroke: new Stroke({
            color: isEndpoint ?
              (index === 0 ? '#1976D2' : '#388E3C') :
              '#F44336',
            width: 2
          })
        })
      }));

      vectorSource.addFeature(feature);
    });

    // We remove the existing vector layers
    mapInstanceRef.current.getLayers().getArray()
      .filter(layer => layer instanceof VectorLayer)
      .forEach(layer => mapInstanceRef.current.removeLayer(layer));

    // And add the new vector layer
    const vectorLayer = new VectorLayer({
      source: vectorSource
    });
    mapInstanceRef.current.addLayer(vectorLayer);

    // This is how the map is fit to route bounds
    const extent = vectorSource.getExtent();
    mapInstanceRef.current.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      duration: 1000
    });
  };

  const renderPointsList = () => {
    if (!selectedRoute?.points) return null;

    return (
      <Box sx={{ 
        flex: '0 0 300px', 
        p: 3,
        overflowY: 'auto',
        borderLeft: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography variant="h6" gutterBottom>
          Points of Interest
        </Typography>
        <Box sx={{ 
          position: 'relative',
          paddingLeft: '24px',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: '12px',
            top: '0',
            bottom: '0',
            width: '2px',
            background: 'rgba(255, 255, 255, 0.1)',
            zIndex: 0
          }
        }}>
          {selectedRoute.points.map((point, index) => {
            if (index === 0) return (
              <Box key={index} sx={{ mb: 2, position: 'relative' }}>
                <Typography variant="subtitle1" component="div" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOnIcon sx={{ color: '#2196F3' }} />
                  {point.name}
                </Typography>
              </Box>
            );

            // Ladder
            return (
              <Box 
                key={index} 
                sx={{ 
                  mb: 2,
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: '-18px',
                    top: '20px',
                    width: '20px',
                    height: '2px',
                    background: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                <Paper 
                  elevation={2}
                  sx={{ 
                    p: 2,
                    bgcolor: 'background.default',
                    position: 'relative',
                    border: '1px solid',
                    borderColor: point.is_unesco ? '#FFD700' : '#C0C0C0',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: '-24px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      bgcolor: index === selectedRoute.points.length - 1 ? '#4CAF50' : '#F44336',
                      border: '2px solid',
                      borderColor: point.is_unesco ? '#FFD700' : '#C0C0C0',
                      zIndex: 1
                    }
                  }}
                >
                  <Typography 
                    variant="subtitle1" 
                    component="div" 
                    fontWeight="medium"
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      color: index === selectedRoute.points.length - 1 ? '#4CAF50' : 'white'
                    }}
                  >
                    {index !== selectedRoute.points.length - 1 && getPoiIcon(point.type, point.subtype)}
                    {point.name}
                  </Typography>
                  {point.type && point.subtype && index !== selectedRoute.points.length - 1 && (
                    <Typography 
                      variant="body2" 
                      color="textSecondary" 
                      sx={{ 
                        mt: 0.5,
                        textTransform: 'capitalize',
                        pl: 3.5
                      }}
                    >
                      {point.subtype} {point.type === point.subtype ? '' : `(${point.type})`}
                    </Typography>
                  )}
                  {point.is_unesco && (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        mt: 0.5,
                        color: '#FFD700',
                        fontWeight: 'medium',
                        pl: 3.5
                      }}
                    >
                      UNESCO World Heritage Site
                    </Typography>
                  )}
                </Paper>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Paper 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'background.paper'
        }}
      >
        <CircularProgress />
      </Paper>
    );
  }

  if (!selectedRoute) {
    return (
      <Paper 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'background.paper'
        }}
      >
        <Typography variant="h6" color="textSecondary">
          Select a route to view on the map
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        height: '100%',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        display: 'flex'
      }}
    >
      <Box 
        ref={mapRef} 
        sx={{ 
          flex: 1,
          '& .ol-attribution': {
            display: 'none'
          }
        }} 
      />
      {renderPointsList()}
    </Paper>
  );
};

export default MapDisplay;
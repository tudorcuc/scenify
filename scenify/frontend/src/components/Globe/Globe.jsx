import React, { useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';

const GlobeComponent = () => {
  const globeEl = useRef(null);
  
  useEffect(() => {
    if (globeEl.current) {
      // Enable auto-rotation
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.3;
    }
  }, []);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      position: 'relative',
      borderRadius: '50%',
      overflow: 'hidden'
    }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#000000"
        atmosphereAltitude={0.15}
        width={700}
        height={700}
      />
    </div>
  );
};

export default GlobeComponent;

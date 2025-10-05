import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const getRoutes = async (startLocation, endLocation, poiCount = 15, onProgressUpdate) => {
  try {
    const response = await axios.post(`${API_URL}/routes`, {
      startLocation,
      endLocation,
      poiCount
    }, {
      onDownloadProgress: (progressEvent) => {
        const text = progressEvent.event?.currentTarget?.responseText;
        if (text) {
          try {
            const matches = text.match(/print\(f"([^"]+)"/g);
            if (matches && matches.length > 0) {
              const latestMessage = matches[matches.length - 1]
                .replace('print(f"', '')
                .replace('")', '');
              onProgressUpdate?.(latestMessage);
            }
          } catch (err) {
          }
        }
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
};
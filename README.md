# Scenify

Welcome to **Scenify!** 🚗🌄

Scenify is a clever web app that turns ordinary trips into exciting adventures. Instead of just giving you the quickest route from A to B, it sprinkles in cool tourist spots along the way. Perfect for road trippers who want to make the journey as fun as the destination!

---

## What Makes Scenify Awesome?

- **Smart POI Detection:** Automatically finds relevant points of interest based on your route.  
- **Route Optimization:** Generates efficient paths that balance distance with discovery.  
- **Interactive Maps:** Visualize your journey in 2D with easy-to-use maps.  
- **User-Friendly Interface:** Simple and intuitive design for effortless planning.

---

## How It Works

Scenify uses open-source mapping tools to fetch locations, search for attractions, and plot the best routes. It integrates services like:

- **Nominatim** for geocoding addresses  
- **Overpass API** for querying points of interest  
- **OpenStreetMap (OSM)** for routing and map data

---

## Getting Started

### Prerequisites

- Docker and Docker Compose installed on your system  
- A modern web browser (Chrome, Firefox, etc.)  
- Internet connection for API calls

### Installation

```bash
# clone
git clone https://github.com/tudorcuc/scenify.git

# go into project
cd scenify

# start via Docker Compose
docker-compose up -d
```

This will build and run the containers as defined in `docker-compose.yml` in the project root.

### Access the app

Open your browser and go to `http://localhost:3000`  

---

## Usage

1. Open the app in your browser.  
2. Enter your starting and ending locations.  
3. Choose preferences for tourist spots (e.g., castles, beaches).  
4. Hit **Generate Route** and explore your personalized itinerary!

---

Thanks for checking out Scenify! Safe travels! 🌍

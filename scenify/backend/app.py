from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import json
import time
from math import radians, sin, cos, sqrt, atan2
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

app = Flask(__name__)
CORS(app)

# We define the geocoding API URL from OpenStreetMap (Nominatim)
GEOCODING_API_URL = "https://nominatim.openstreetmap.org/search"

def get_route_path(start_coords, end_coords):
    # This function is used to get the actual route path and distance between two points using OSRM
    try:
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{start_coords['lon']},{start_coords['lat']};{end_coords['lon']},{end_coords['lat']}?overview=full&geometries=geojson"
        response = requests.get(osrm_url)
        if response.status_code == 200:
            data = response.json()
            if data.get('routes'):
                route = data['routes'][0]
                return {
                    'coordinates': route['geometry']['coordinates'],
                    'distance': route['distance'] / 1000  # Convert to kilometers
                }
        return None
    except Exception as e:
        print(f"Error getting route path: {str(e)}")
        return None

@app.route('/api/routes', methods=['POST'])
def generate_routes():
    data = request.json
    start_location = data.get('startLocation')
    end_location = data.get('endLocation')
    max_pois = data.get('poiCount', 15) 
    categories = data.get('categories', [])
    if not start_location or not end_location:
        return jsonify({"error": "Start and end locations are required"}), 400

    # This is where we geocode start and end locations
    start_coords = geocode_location(start_location)
    end_coords = geocode_location(end_location)
    if not start_coords:
        return jsonify({"error": f"Could not geocode start location: '{start_location}'."}), 400
    if not end_coords:
        return jsonify({"error": f"Could not geocode end location: '{end_location}'."}), 400
    start_coords["name"] = start_location
    end_coords["name"] = end_location

    print("Searching for points of interest:")
    all_pois = fetch_all_pois(start_coords, end_coords, categories)
    print(f"Found a number of {len(all_pois)} POIs")

    # We set detour factors for the two scenic route types
    conservative_detour = 1.5  # 50% extra distance for rapid scenic route
    relaxed_detour = 2.0      # 100% extra distance for explorer scenic route

    # Generate the two scenic routes with different constraints
    fastest_scenic_route, fastest_score = solve_scenic_route(
        start_coords, end_coords, all_pois, conservative_detour, max_pois=max_pois//2
    )
    
    most_scenic_route, scenic_score = solve_scenic_route(
        start_coords, end_coords, all_pois, relaxed_detour, max_pois=max_pois
    )

    def add_route_paths(route_points):
        #We add real route paths and total distance on actual roads between consecutive points
        if len(route_points) < 2:
            return route_points
        paths = []
        total_distance = 0
        for i in range(len(route_points) - 1):
            route_data = get_route_path(route_points[i], route_points[i + 1])
            if route_data:
                paths.extend(route_data['coordinates'])
                total_distance += route_data['distance']
            else:
            # If OSRM fails we calculate it using the Haversine formula
                total_distance += calculate_distance(route_points[i], route_points[i + 1])
                
        print(f"Final route distance (OSRM): {total_distance:.1f}km")
            
        return {
            "points": route_points,
            "path": paths,
            "distance": total_distance * 1000  # We convert km to meters because other services expect meters
        }

    # Responses
    routes = {
        "fastest_route": {
            "name": "Direct Route",
            **add_route_paths([start_coords, end_coords]),
            "description": "Direct route from start to destination"
        },
        "scenic_routes": [
            {
                "name": "Balanced Scenic Route",
                **add_route_paths(fastest_scenic_route or [start_coords, end_coords]),
                "description": f"Optimized route with {len(fastest_scenic_route or []) - 2 if fastest_scenic_route else 0} points of interest, prioritizing travel time"
            },
            {
                "name": "Most Scenic Route",
                **add_route_paths(most_scenic_route or [start_coords, end_coords]),
                "description": f"Optimized route with {len(most_scenic_route or []) - 2 if most_scenic_route else 0} points of interest, maximizing attractions"
            }
        ]
    }

    return jsonify(routes)

def geocode_location(location):
    # Function called to geocode a single location
    params = {
        "q": location,
        "format": "json",
        "limit": 1
    }
    headers = {
        "User-Agent": "ScenicRoutesPlanner/1.0"
    }
    response = requests.get(GEOCODING_API_URL, params=params, headers=headers)
    if response.status_code == 200 and response.json():
        result = response.json()[0]
        return {
            "lat": float(result["lat"]),
            "lon": float(result["lon"])
        }
    return None

def fetch_all_pois(start_coords, end_coords, categories=[]):
    #This function fetches the needed POIs within the calculated corridor.
    total_distance = calculate_distance(start_coords, end_coords)
    corridor_km = min(250, max(50, total_distance * 0.2))

    lat_km_per_degree = 111
    lon_km_per_degree = 111 * cos(radians((start_coords['lat'] + end_coords['lat']) / 2)) #Longitude varies depending on latitude (it’s largest at the equator and minimized toward the poles)
    
    lat_padding = corridor_km / lat_km_per_degree #Calculates how many degrees of latitude correspond to half the corridor width (in kilometers)
    lon_padding = corridor_km / lon_km_per_degree
    
    min_lat = min(start_coords['lat'], end_coords['lat']) - lat_padding
    max_lat = max(start_coords['lat'], end_coords['lat']) + lat_padding
    min_lon = min(start_coords['lon'], end_coords['lon']) - lon_padding
    max_lon = max(start_coords['lon'], end_coords['lon']) + lon_padding

    print(f"Search area: ({min_lat:.4f}, {min_lon:.4f}) to ({max_lat:.4f}, {max_lon:.4f})")
    print(f"Corridor width: {corridor_km:.1f}km")

    overpass_url = "https://overpass-api.de/api/interpreter"
    overpass_query = """
[out:json][timeout:180];
(
  // UNESCO World Heritage Sites
  node({min_lat},{min_lon},{max_lat},{max_lon})["heritage"="1"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["heritage"="1"];
  relation({min_lat},{min_lon},{max_lat},{max_lon})["heritage"="1"];
  
  // Major museums and cultural sites
  node({min_lat},{min_lon},{max_lat},{max_lon})["tourism"="museum"]["wikipedia"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["tourism"="museum"]["wikipedia"];
  node({min_lat},{min_lon},{max_lat},{max_lon})["tourism"="gallery"]["wikipedia"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["tourism"="gallery"]["wikipedia"];
  
  // Notable castles and palaces
  node({min_lat},{min_lon},{max_lat},{max_lon})["historic"="castle"]["wikipedia"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["historic"="castle"]["wikipedia"];
  node({min_lat},{min_lon},{max_lat},{max_lon})["historic"="palace"]["wikipedia"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["historic"="palace"]["wikipedia"];
  
  // Notable religious sites
  node({min_lat},{min_lon},{max_lat},{max_lon})["historic"="monastery"]["wikipedia"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["historic"="monastery"]["wikipedia"];
  node({min_lat},{min_lon},{max_lat},{max_lon})["historic"="cathedral"]["wikipedia"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["historic"="cathedral"]["wikipedia"];
  node({min_lat},{min_lon},{max_lat},{max_lon})["historic"="church"]["wikipedia"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["historic"="church"]["wikipedia"];
  
  // Notable natural features
  node({min_lat},{min_lon},{max_lat},{max_lon})["natural"="peak"]["wikipedia"];
  node({min_lat},{min_lon},{max_lat},{max_lon})["natural"="volcano"]["wikipedia"];
  node({min_lat},{min_lon},{max_lat},{max_lon})["waterway"="waterfall"]["wikipedia"];
  node({min_lat},{min_lon},{max_lat},{max_lon})["natural"="beach"]["wikipedia"];
  node({min_lat},{min_lon},{max_lat},{max_lon})["natural"="bay"]["wikipedia"];
  
  // Notable parks, gardens and viewpoints
  node({min_lat},{min_lon},{max_lat},{max_lon})["leisure"="park"]["wikipedia"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["leisure"="park"]["wikipedia"];
  node({min_lat},{min_lon},{max_lat},{max_lon})["leisure"="garden"]["wikipedia"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["leisure"="garden"]["wikipedia"];
  node({min_lat},{min_lon},{max_lat},{max_lon})["tourism"="viewpoint"]["wikipedia"];
  
  // Historical and architectural sites
  node({min_lat},{min_lon},{max_lat},{max_lon})["historic"="monument"]["wikipedia"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["historic"="monument"]["wikipedia"];
  node({min_lat},{min_lon},{max_lat},{max_lon})["historic"="ruins"]["wikipedia"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["historic"="ruins"]["wikipedia"];
  node({min_lat},{min_lon},{max_lat},{max_lon})["historic"="archaeological_site"]["wikipedia"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["historic"="archaeological_site"]["wikipedia"];
  node({min_lat},{min_lon},{max_lat},{max_lon})["historic"="memorial"]["wikipedia"];
  way({min_lat},{min_lon},{max_lat},{max_lon})["historic"="memorial"]["wikipedia"];
);
out body;
>;
out skel qt;""".format(
        min_lat=min_lat,
        max_lat=max_lat,
        min_lon=min_lon,
        max_lon=max_lon
    ).strip()

    print("Overpass query sent to Overpass API")
    
    for attempt in range(3):
        try:
            timeout = 180 * (attempt + 1)
            print(f"Attempt {attempt + 1} with {timeout}s timeout...")
            
            response = requests.post(
                overpass_url, 
                data={'data': overpass_query},
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=timeout
            )
            print(f"Overpass API response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                elements = data.get('elements', [])
                print(f"Found {len(elements)} raw elements")
                
                heritage_1_count = 0
                wiki_count = 0
                pois = []
                
                for el in elements:
                    tags = el.get('tags', {})
                    # If there are POIs without names or coordinates we skip them
                    if not tags.get('name') or 'lat' not in el:
                        continue
                    # We try to provide English names
                    english_name = (
                        tags.get('name:en') or  # Try official English name
                        tags.get('int_name') or  # Try international name
                        tags.get('name')  # Fallback to default name
                    )

                    # We try to get the Wikipedia title if it is abailable
                    wiki_tag = tags.get('wikipedia:en') or tags.get('wikipedia')
                    if wiki_tag:
                        if ':' in wiki_tag:
                            wiki_lang, wiki_title = wiki_tag.split(':', 1)
                            if wiki_lang == 'en':
                                english_name = wiki_title.replace('_', ' ')
                        wiki_count += 1

                    # Count world heritage sites
                    if tags.get('heritage') == '1':
                        heritage_1_count += 1

                    # We try to get more specific type/subtype classification
                    def get_best_type_and_subtype(tags):
                        if tags.get('heritage') == '1':
                            return 'historic', 'UNESCO Site'
                            
                        # Try to get the most specific classification
                        for category in ['historic', 'natural', 'leisure']:
                            if category in tags:
                                # Convert underscore to space and capitalize each word
                                subtype = tags[category].replace('_', ' ').title()
                                return category, subtype
                        
                        # Tourism tag is vague so we handle the tourism category last and try to get specific subtypes
                        if 'tourism' in tags:
                            tourism_type = tags['tourism']
                            if tourism_type in ['museum', 'gallery', 'viewpoint']:
                                return 'tourism', tourism_type.title()
                            
                        # For the other cases, we try to just find a better classification
                        if 'building' in tags:
                            return 'historic', tags['building'].replace('_', ' ').title()
                        if 'landuse' in tags and tags['landuse'] in ['park', 'recreation_ground']:
                            return 'leisure', 'park'
                            
                        return None, None

                    poi_type, poi_subtype = get_best_type_and_subtype(tags)

                    # We check if this POI matches any of the selected categories by the user
                    # Always include UNESCO sites (heritage=1), they are unmissable
                    is_selected_category = tags.get('heritage') == '1'
                    
                    if not is_selected_category and categories:
                        for cat in categories:
                            if cat['type'] == poi_type and cat['subtype'].lower() == poi_subtype.lower():
                                is_selected_category = True
                                break

                    # We don't select POIs that don't match selected categories
                    if not is_selected_category:
                        continue

                    poi = {
                        "name": english_name,
                        "original_name": tags.get('name'),
                        "lat": el['lat'],
                        "lon": el['lon'],
                        "is_unesco": tags.get('heritage') == '1',
                        "is_notable": bool('wikipedia' in tags or 'wikidata' in tags),
                        "type": poi_type,
                        "subtype": poi_subtype,
                        "tags": tags
                    }
                    
                    if is_poi_on_reasonable_path(start_coords, end_coords, poi, detour_ratio=2.0):
                        pois.append(poi)

                print(f"Found {heritage_1_count} UNESCO sites and {wiki_count} Wikipedia-referenced sites")
                print(f"Filtered to {len(pois)} valid high-value POIs after category filtering")
                
                # We sort the POIs by significance
                return sorted(pois, key=lambda x: (
                    x['is_unesco'],  # UNESCO sites first (heritage = 1 or heritage = 2)
                    x['is_notable'],  # After that the notable (Wikipedia/Wikidata) sites
                    bool(x.get('name:en')),  # Then sites with English names
                    bool(x.get('type'))  # Then the other attractions
                ), reverse=True)
                
            elif response.status_code == 429:
                print("Rate limited, waiting before retry...")
                time.sleep(5 * (attempt + 1))
                continue
                
            else:
                print(f"Overpass API error: {response.status_code}")
                print(f"Response text: {response.text[:1000]}")
                
        except requests.exceptions.Timeout:
            print(f"Timeout on attempt {attempt + 1}")
            if attempt < 2:
                time.sleep(5)
            continue
        except Exception as e:
            print(f"Error on attempt {attempt + 1}: {str(e)}")
            if attempt < 2:
                time.sleep(5)
            continue
    
    print("All the tries failed")
    return []

def calculate_distance(point1, point2):
    # We use this function to calculate the distance between two points using the Haversine formula. The returned value is the distance in kilometers.
    # First we convert the latitude and longitude from degrees to radians
    lat1, lon1 = radians(point1['lat']), radians(point1['lon'])
    lat2, lon2 = radians(point2['lat']), radians(point2['lon'])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    r = 6371  # Radius of Earth in kilometers
    
    return c * r

def distance_to_line(start, end, point):
    # This function returns the perpendicular distance in km from `point` to the line origin->destination.
    # We convert lat/lon to a vector in degrees
    vec_se = [end['lat'] - start['lat'], end['lon'] - start['lon']]
    vec_sp = [point['lat'] - start['lat'], point['lon'] - start['lon']]
    
    # Dot product and squared length
    dot = vec_se[0]*vec_sp[0] + vec_se[1]*vec_sp[1]
    len_sq = vec_se[0]**2 + vec_se[1]**2
    
    if len_sq == 0:
        return calculate_distance(start, point)  # start == end corner case
    
    # Projection scalar
    t = dot / len_sq
    # Projected point (in degrees)
    proj = [start['lat'] + t * vec_se[0], start['lon'] + t * vec_se[1]]
    
    # Return Haversine distance between `point` and its projection
    return calculate_distance(point, {'lat': proj[0], 'lon': proj[1]})

def is_poi_on_reasonable_path(start, end, poi, detour_ratio=1.5, min_proximity_km=30):
    #This function returns True if:
    #   1. The detour to visit the POI is reasonable (within detour_ratio)
    #   2. The POI is not "beyond" the start/end points in terms of travel direction
    #   3. The POI is not too close to start or end points (min_proximity_km)

    # We check minimum distance from start and end points
    start_distance = calculate_distance(start, poi)
    end_distance = calculate_distance(end, poi)
    
    if start_distance < min_proximity_km or end_distance < min_proximity_km:
        return False

    # Then we check the detour ratio
    direct = calculate_distance(start, end)
    via_poi = calculate_distance(start, poi) + calculate_distance(poi, end)
    
    if via_poi > direct * detour_ratio:
        return False

    # Then we check if POI is between start and end in terms of direction
    route_dir = get_route_direction(start, end)
    
    if route_dir == 'ns':
        # For north-south routes, check latitude
        if start['lat'] < end['lat']:  # Heading north
            return poi['lat'] >= start['lat'] and poi['lat'] <= end['lat']
        else:  # Heading south
            return poi['lat'] <= start['lat'] and poi['lat'] >= end['lat']
    else:  # east-west route
        # For east-west routes, check longitude
        if start['lon'] < end['lon']:  # Heading east
            return poi['lon'] >= start['lon'] and poi['lon'] <= end['lon']
        else:  # Heading west
            return poi['lon'] <= start['lon'] and poi['lon'] >= end['lon']

def get_route_direction(start, end):
    #Used to determine if the route is primarily north-south or east-west.

    lat_diff = abs(end['lat'] - start['lat'])
    lon_diff = abs(end['lon'] - start['lon'])
    return 'ns' if lat_diff > lon_diff else 'ew'

def are_pois_too_close(poi1, poi2, min_distance_km=5):
    # Used to check if two POIs are closer than 5km to each other
    distance = calculate_distance(poi1, poi2)
    return distance < min_distance_km

def filter_pois_by_min_distance(pois, min_distance_km=5):
    # This function filters POIs to ensure they are at least 5km apart by using are_pois_too_close function.
    if not pois:
        return []
        
    # We sort POIs again to makes sure the more notabile ones will be selected
    sorted_pois = sorted(pois, key=lambda x: x.get('is_notable', False), reverse=True)
    filtered_pois = [sorted_pois[0]] 
    
    # We try to add each remaining POI
    for poi in sorted_pois[1:]:
        too_close = False
        for selected_poi in filtered_pois:
            if are_pois_too_close(poi, selected_poi, min_distance_km):
                too_close = True
                break
        
        if not too_close:
            filtered_pois.append(poi)
    
    print(f"Filtered from {len(pois)} to {len(filtered_pois)} POIs based on {min_distance_km}km minimum distance")
    return filtered_pois

def solve_scenic_route(start_point, end_point, pois, max_detour_factor=1.5, max_pois=15):
    # Solve for a scenic route that:
    #   1. Starts at start_point
    #   2. Ends visit end_point
    #   3. Includes up to max_pois points that don't exceed max_detour_factor
    #   4. Prioritizes notable POIs
    #   5. Ensures POIs are at least 5km apart

    print(f"\nCalculating the scenic route with {len(pois)} POIs and max detour factor {max_detour_factor}")
    
    if not pois:
        return [start_point, end_point], 0

    pois = filter_pois_by_min_distance(pois, min_distance_km=5)
    direct_distance = calculate_distance(start_point, end_point)
    max_total_distance = direct_distance * max_detour_factor
    print(f"Direct distance: {direct_distance:.1f}km")
    print(f"Maximum allowed distance: {max_total_distance:.1f}km")

    # Sort POIs by score
    def poi_score(poi):
        base_score = 0
        
        # Check heritage level and Wikipedia sources
        heritage_level = poi.get('tags', {}).get('heritage')
        if heritage_level == '1':
            base_score = 3000  # Highest priority for heritage=1 (World Heritage Sites)
        elif heritage_level == '2':
            base_score = 2000  # Second highest priority for heritage=2 (National Heritage Sites)
        elif poi.get('is_notable', False):
            base_score = 1000  # Wikipedia POIs get lower priority than heritage sites, but are still notable
        
        # We substract distance from direct route to prefer POIs closer to the route
        route_distance = distance_to_line(start_point, end_point, poi)
        return base_score - route_distance

    sorted_pois = sorted(pois, key=poi_score, reverse=True)
    selected_pois = []
    current_distance = direct_distance
    
    for poi in sorted_pois:
        if len(selected_pois) >= max_pois:
            break
            
        # We calculate the additional distance needed to visit this POI
        route_with_poi = [start_point] + selected_pois + [poi] + [end_point]
        new_distance = 0
        for i in range(len(route_with_poi) - 1):
            new_distance += calculate_distance(route_with_poi[i], route_with_poi[i + 1])

        if new_distance <= max_total_distance:
            selected_pois.append(poi)
            current_distance = new_distance

    print(f"Selected {len(selected_pois)} POIs")
    print(f"Total route distance: {current_distance:.1f}km")
    
    # Print in console selected heritage=1 POIs
    heritage_1_selected = [poi for poi in selected_pois if poi.get('tags', {}).get('heritage') == '1']
    if heritage_1_selected:
        print("\nSelected heritage=1 POIs:")
        for poi in heritage_1_selected:
            print(f"  - {poi['name']}")
    
    # If we found POIs, solve the order using TSP (Traveling Salesman Problem)
    if selected_pois:
        points = [start_point] + selected_pois + [end_point]
        n = len(points)
        
        manager = pywrapcp.RoutingIndexManager(n, 1, [0], [n-1])
        routing = pywrapcp.RoutingModel(manager)
        
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return int(calculate_distance(points[from_node], points[to_node]) * 1000)
        
        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH)
        search_parameters.time_limit.FromSeconds(2)
        
        solution = routing.SolveWithParameters(search_parameters)
        
        if solution:
            ordered_route = []
            index = routing.Start(0)
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                ordered_route.append(points[node_index])
                index = solution.Value(routing.NextVar(index))
            ordered_route.append(points[manager.IndexToNode(index)])
            
            # Calculate the final route distance after optimization (using Haversine formula)
            final_distance = 0
            for i in range(len(ordered_route) - 1):
                final_distance += calculate_distance(ordered_route[i], ordered_route[i + 1])
            print(f"Final optimized route distance: {final_distance:.1f}km")
            
            return ordered_route, len(selected_pois)
    
    return [start_point, end_point], 0

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
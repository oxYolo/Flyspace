export interface Waypoint {
  id?: string;
  name?: string;
  longitude: number;
  latitude: number;
  altitude?: number;
  description?: string;
  height?: number;
}

export interface FlightPath {
  waypoints: Waypoint[];
  totalDistance: number;
  averageSpeed?: number;
}

export interface SimulationOptions {
  speed?: number; // m/s
  loop?: boolean;
  showPath?: boolean;
  showWaypoints?: boolean;
}

export interface DronePosition {
  longitude: number;
  latitude: number;
  altitude: number;
  heading: number;
  pitch: number;
  roll: number;
  timestamp: number;
}
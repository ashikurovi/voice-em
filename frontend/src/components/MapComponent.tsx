"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icons in Next.js
const createIcon = (colorUrl: string) => new L.Icon({
  iconUrl: colorUrl,
  iconRetinaUrl: colorUrl,
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const defaultIcon = createIcon("https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-black.png"); // Victim (Black)
const policeIcon = createIcon("https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png"); // Police
const hospitalIcon = createIcon("https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png"); // Hospital
const pharmacyIcon = createIcon("https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png"); // Pharmacy
const fireIcon = createIcon("https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png"); // Fire Station

export interface NearbyService {
  id: number;
  lat: number;
  lng: number;
  type: string;
  name: string;
  phone: string;
  email: string | null;
  website: string | null;
  address?: string | null;
}

interface MapProps {
  location: { lat: number; lng: number };
  nearbyServices: NearbyService[];
  selectedService?: NearbyService | null;
}

// Component to dynamically center map and handle selected service
function MapController({ center, selectedService, markerRefs }: { center: [number, number], selectedService?: NearbyService | null, markerRefs: React.MutableRefObject<{ [key: number]: L.Marker }> }) {
  const map = useMap();

  useEffect(() => {
    if (selectedService) {
      map.flyTo([selectedService.lat, selectedService.lng], 16, { animate: true, duration: 1 });
      const marker = markerRefs.current[selectedService.id];
      if (marker) {
        // Add a slight delay to ensure the map has moved before opening popup
        setTimeout(() => marker.openPopup(), 500);
      }
    } else {
      map.flyTo(center, 13, { animate: true, duration: 1 });
    }
  }, [center, selectedService, map, markerRefs]);

  return null;
}

export default function MapComponent({ location, nearbyServices = [], selectedService }: MapProps) {
  const markerRefs = useRef<{ [key: number]: L.Marker }>({});

  const getIconForType = (type: string) => {
    switch (type) {
      case 'police': return policeIcon;
      case 'hospital': 
      case 'ambulance_station': return hospitalIcon;
      case 'pharmacy': return pharmacyIcon;
      case 'fire_station': 
      case 'rescue_station': return fireIcon;
      default: return defaultIcon;
    }
  };

  return (
    <MapContainer 
      center={[location.lat, location.lng]} 
      zoom={15} 
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController center={[location.lat, location.lng]} selectedService={selectedService} markerRefs={markerRefs} />
      
      <Marker position={[location.lat, location.lng]} icon={defaultIcon}>
        <Popup>
          <strong>Victim's Live Location</strong>
        </Popup>
      </Marker>

      {nearbyServices.map((service) => (
        <Marker 
          key={service.id} 
          position={[service.lat, service.lng]} 
          icon={getIconForType(service.type)}
          ref={(ref) => {
            if (ref) markerRefs.current[service.id] = ref as L.Marker;
          }}
        >
          <Popup>
            <div className="text-gray-900">
              <strong className="block uppercase text-xs text-gray-500">{service.type}</strong>
              <span className="font-bold">{service.name}</span>
              {service.address && (
                <>
                  <br />
                  <span className="text-xs text-gray-600">📍 {service.address}</span>
                </>
              )}
              <br />
              <span className="text-sm">📞 {service.phone}</span>
              {service.email && (
                <>
                  <br />
                  <span className="text-sm">📧 {service.email}</span>
                </>
              )}
              {service.website && (
                <>
                  <br />
                  <span className="text-sm">🌐 <a href={service.website.startsWith('http') ? service.website : `http://${service.website}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Website</a></span>
                </>
              )}
              <br />
              <div className="mt-2">
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${service.lat},${service.lng}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="bg-blue-600 !text-white text-xs px-3 py-1.5 rounded-full inline-block hover:bg-blue-700 transition-colors shadow-sm"
                >
                  🗺️ Get Directions
                </a>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

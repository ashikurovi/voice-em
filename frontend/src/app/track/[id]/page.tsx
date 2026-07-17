"use client";
import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const MapComponent = dynamic(() => import("../../../components/MapComponent"), { ssr: false });

import { NearbyService } from "../../../components/MapComponent";

export default function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [eventData, setEventData] = useState<any>(null);
  const [nearbyServices, setNearbyServices] = useState<NearbyService[]>([]);
  const [selectedService, setSelectedService] = useState<NearbyService | null>(null);
  const [address, setAddress] = useState<string>("Fetching address...");
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        
        // Fetch event data
        const res = await fetch(`${apiUrl}/api/emergency/${id}`);
        const data = await res.json();
        
        if (data.success) {
          setEventData(data.data);
          
          const lat = data.data.locationTrail[0]?.lat;
          const lng = data.data.locationTrail[0]?.lng;

          if (lat && lng) {
            // Fetch human readable address using Nominatim (OpenStreetMap)
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
              headers: {
                'User-Agent': 'VoiceEmergencySystemApp/1.0'
              }
            })
              .then(res => res.json())
              .then(geo => {
                if (geo && geo.display_name) {
                  setAddress(geo.display_name);
                } else {
                  setAddress("Address not found");
                }
              })
              .catch(() => setAddress("Address not found"));
          }

          // Fetch nearby services using Overpass API
          fetch(`${apiUrl}/api/emergency/${id}/nearby`)
            .then(r => r.json())
            .then(nearbyData => {
              if (nearbyData.success) {
                setNearbyServices(nearbyData.data);
              }
            })
            .catch(err => console.error("Failed to fetch nearby services", err));
        }
      } catch (err) {
        console.error("Error fetching event:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  if (!eventData) {
    return <div className="min-h-screen bg-gray-900 text-red-500 flex items-center justify-center">Tracking Link Invalid or Expired</div>;
  }

  return (
    <div className={`min-h-screen ${eventData.triggerType === 'SILENT' ? 'bg-gradient-to-br from-blue-950 via-slate-900 to-black' : 'bg-gradient-to-br from-red-950 via-gray-900 to-black'} text-white flex flex-col font-sans`}>
      <header className={`p-4 md:px-8 border-b flex justify-between items-center bg-white/5 backdrop-blur-xl ${eventData.triggerType === 'SILENT' ? 'border-blue-500/20' : 'border-red-500/20'} sticky top-0 z-50`}>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors bg-white/10 w-10 h-10 flex items-center justify-center rounded-full">
            ←
          </Link>
          <h1 className={`text-2xl font-extrabold tracking-tight ${eventData.triggerType === 'SILENT' ? 'text-blue-100' : 'text-red-500'}`}>
            {eventData.triggerType === 'SILENT' ? 'Safe Exploration Map' : 'Live Emergency Tracker'}
          </h1>
        </div>
        <div className="flex items-center gap-3 bg-black/30 px-4 py-2 rounded-full border border-white/5">
          <span className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ${eventData.triggerType === 'SILENT' ? 'bg-blue-400 text-blue-400' : 'bg-red-500 text-red-500'}`}></span>
          <span className={`text-sm font-bold tracking-widest uppercase ${eventData.triggerType === 'SILENT' ? 'text-blue-200' : 'text-red-400'}`}>LIVE STREAM</span>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Map Section */}
        <div className="lg:col-span-8 bg-black/40 rounded-3xl overflow-hidden border border-white/10 relative min-h-[500px] lg:min-h-[700px] shadow-2xl flex flex-col group">
          <div className="absolute inset-0 z-0 pointer-events-none shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]"></div>
          <MapComponent 
            location={eventData.locationTrail[0]} 
            nearbyServices={filterType === 'all' ? nearbyServices : nearbyServices.filter(s => {
              if (filterType === 'hospital') return s.type === 'hospital' || s.type === 'ambulance_station';
              if (filterType === 'police') return s.type === 'police';
              if (filterType === 'fire') return s.type === 'fire_station' || s.type === 'rescue_station';
              if (filterType === 'pharmacy') return s.type === 'pharmacy';
              return true;
            })} 
            selectedService={selectedService}
          />
          {/* Map Overlay Badge */}
          <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-2">
            <span>📍</span>
            <span className="text-sm font-medium">{eventData.locationTrail[0]?.lat.toFixed(4)}, {eventData.locationTrail[0]?.lng.toFixed(4)}</span>
          </div>
        </div>

        {/* Sidebar Info Section */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Main Status Card */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6 shadow-xl relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full ${eventData.triggerType === 'SILENT' ? 'bg-blue-500/10' : 'bg-red-500/10'}`}></div>
            
            <div className="mb-6">
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-1">Subject Profile</h3>
              <p className="text-2xl font-black text-white">{eventData.userId?.fullName || 'Unknown User'}</p>
              <p className="text-gray-500 text-xs font-mono mt-1 bg-black/20 inline-block px-2 py-0.5 rounded border border-white/5">ID: {id.slice(-8).toUpperCase()}</p>
            </div>


            <div className="space-y-4">
              <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block mb-1">Current Location</span>
                <span className="text-white text-sm leading-snug block">{address}</span>
              </div>
              
              <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5">
                <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Device Battery</span>
                <div className="flex items-center gap-2">
                  <span className={`font-black text-lg ${eventData.batteryLevel < 20 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                    {eventData.batteryLevel}%
                  </span>
                  <span className="text-xl">🔋</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nearby Services Card */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 flex-1 flex flex-col min-h-[300px]">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                <span className="text-lg">🏥</span> Emergency Services Directory
              </h3>
              
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {['all', 'hospital', 'police', 'fire', 'pharmacy'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                      filterType === type 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Found {filterType === 'all' ? nearbyServices.length : nearbyServices.filter(s => {
                  if (filterType === 'hospital') return s.type === 'hospital' || s.type === 'ambulance_station';
                  if (filterType === 'police') return s.type === 'police';
                  if (filterType === 'fire') return s.type === 'fire_station' || s.type === 'rescue_station';
                  if (filterType === 'pharmacy') return s.type === 'pharmacy';
                  return true;
                }).length} locations.
              </p>
            </div>
            
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              {nearbyServices.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 p-6">
                  <div className="text-4xl mb-4 animate-spin-slow">📡</div>
                  <p className="text-sm font-medium">Scanning area for services...</p>
                </div>
              ) : (
                <ul className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[400px]">
                  {nearbyServices.filter(s => {
                    if (filterType === 'all') return true;
                    if (filterType === 'hospital') return s.type === 'hospital' || s.type === 'ambulance_station';
                    if (filterType === 'police') return s.type === 'police';
                    if (filterType === 'fire') return s.type === 'fire_station' || s.type === 'rescue_station';
                    if (filterType === 'pharmacy') return s.type === 'pharmacy';
                    return true;
                  }).map(service => (
                    <li 
                      key={service.id} 
                      className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                        selectedService?.id === service.id 
                          ? 'bg-white/10 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.15)]' 
                          : 'bg-black/30 border-white/5 hover:bg-white/5 hover:border-white/20'
                      }`}
                      onClick={() => setSelectedService(service)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-bold text-white capitalize text-sm pr-2 group-hover:text-blue-300 transition-colors">{service.name}</span>
                        <span className={`text-[10px] px-2 py-1 rounded-md uppercase font-extrabold tracking-wider whitespace-nowrap ${
                          service.type === 'police' ? 'bg-blue-900/50 text-blue-300 border border-blue-500/30' :
                          (service.type === 'hospital' || service.type === 'ambulance_station') ? 'bg-orange-900/50 text-orange-300 border border-orange-500/30' :
                          (service.type === 'fire_station' || service.type === 'rescue_station') ? 'bg-red-900/50 text-red-300 border border-red-500/30' :
                          'bg-green-900/50 text-green-300 border border-green-500/30'
                        }`}>
                          {service.type.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="text-gray-400 text-xs flex flex-col gap-2">
                        {service.phone !== 'N/A' && (
                          <span className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
                            <span>📞</span>
                            <a href={`tel:${service.phone}`} className="text-blue-400 font-bold hover:underline">
                              {service.phone}
                            </a>
                            {service.phone === '999' && <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold">Helpline</span>}
                          </span>
                        )}
                        
                        {service.address && (
                          <span className="flex items-start gap-2">
                            <span>📍</span>
                            <span className="text-gray-300 flex-1 leading-snug">
                              {service.address}
                              <a 
                                href={`https://www.google.com/maps/dir/?api=1&destination=${service.lat},${service.lng}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-white font-medium hover:underline flex items-center gap-1 mt-1.5"
                              >
                                🗺️ Get Directions <span className="text-[10px]">↗</span>
                              </a>
                            </span>
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

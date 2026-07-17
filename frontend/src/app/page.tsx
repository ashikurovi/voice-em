"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { io } from 'socket.io-client';

export default function DashboardPage() {
  const [loadingMap, setLoadingMap] = useState(false);
  const [loadingSos, setLoadingSos] = useState(false);
  const [error, setError] = useState("");
  const [userProfile, setUserProfile] = useState<{ fullName: string, _id: string } | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [incomingSos, setIncomingSos] = useState<any>(null);
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      const token = Cookies.get("token");
      if (!token) return;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${apiUrl}/api/auth/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setUserProfile(data.data);
        }

        // Fetch User Contacts
        const contactRes = await fetch(`${apiUrl}/api/contacts`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const contactData = await contactRes.json();
        if (contactData.success) {
          setContacts(contactData.data);
        }
      } catch (err) {
        console.error("Failed to fetch user profile", err);
      }
    };
    fetchUser();
  }, []);

  // Web Speech API Logic
  useEffect(() => {
    let recognition: any = null;
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        const text = currentTranscript.toLowerCase();
        
        // Check for contact names
        let foundContact = false;
        if (contacts.length > 0) {
          for (const contact of contacts) {
            if (contact.contactName && text.includes(contact.contactName.toLowerCase())) {
              window.location.href = `tel:${contact.phoneNumber}`;
              recognition.stop();
              foundContact = true;
              break;
            }
          }
        }

        if (foundContact) return;

        // BD Hotlines Voice Commands
        if (text.includes('police') || text.includes('fire') || text.includes('national emergency') || text.includes('999')) {
          window.location.href = 'tel:999';
          recognition.stop();
        } else if (text.includes('health') || text.includes('ambulance') || text.includes('16263')) {
          window.location.href = 'tel:16263';
          recognition.stop();
        } else if (text.includes('women') || text.includes('children') || text.includes('109')) {
          window.location.href = 'tel:109';
          recognition.stop();
        } else if (text.includes('information') || text.includes('help desk') || text.includes('333')) {
          window.location.href = 'tel:333';
          recognition.stop();
        } else if (text.includes('help') || text.includes('bacao') || text.includes('emergency')) {
          triggerLiveEmergency();
          recognition.stop();
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== 'no-speech') {
           setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart recognition", e);
          }
        }
      };
    }

    if (isListening && recognition) {
      recognition.start();
    } else if (!isListening && recognition) {
      recognition.stop();
    }

    return () => {
      if (recognition) recognition.stop();
    };
  }, [isListening]);

  // Socket.IO for Nearby User Alerts
  useEffect(() => {
    if (!userProfile) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const socket = io(apiUrl);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('update_location', {
          userId: userProfile._id,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });

        // Fetch Nearby Active Users
        fetch(`${apiUrl}/api/emergency/nearby-users?lat=${position.coords.latitude}&lng=${position.coords.longitude}`, {
          headers: {
            "Authorization": `Bearer ${Cookies.get("token")}`
          }
        })
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              setNearbyUsers(data.data);
            }
          })
          .catch(err => console.error("Failed to fetch nearby users", err));
      });
    }

    socket.on('incoming_sos', (data) => {
      setIncomingSos(data);
      
      // Trigger Native Browser Notification
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(`🚨 SOS EMERGENCY: ${data.userName}`, {
          body: `Emergency triggered nearby! Tracking ID: ${data.eventId}. Click to track live location.`,
        });
        
        notification.onclick = () => {
          window.focus();
          window.location.href = `/track/${data.eventId}`;
        };
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userProfile]);

  // Request Notification Permission on Load
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  const triggerLiveEmergency = async () => {
    setLoadingSos(true);
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoadingSos(false);
      return;
    }

    const token = Cookies.get("token");
    if (!token) {
      setError("You must be logged in to trigger an emergency.");
      setLoadingSos(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

        const res = await fetch(`${apiUrl}/api/emergency/trigger`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            lat: latitude,
            lng: longitude,
            triggerType: "GENERAL"
          })
        });

        const data = await res.json();
        if (data.success && data.eventId) {
          // Open the tracking page directly
          window.location.href = `/track/${data.eventId}`;
        } else {
          setError("Failed to trigger emergency.");
          setLoadingSos(false);
        }
      } catch (err) {
        setError("Network error while triggering emergency.");
        setLoadingSos(false);
      }
    }, (geoErr) => {
      setError("Please allow location access to trigger SOS.");
      setLoadingSos(false);
    });
  };

  const openMyAreaMap = async () => {
    setLoadingMap(true);
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoadingMap(false);
      return;
    }

    const token = Cookies.get("token");
    if (!token) {
      setError("You must be logged in to view your area.");
      setLoadingMap(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        
        const res = await fetch(`${apiUrl}/api/emergency/trigger`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            lat: latitude,
            lng: longitude,
            triggerType: "SILENT"
          })
        });
        
        const data = await res.json();
        if (data.success && data.eventId) {
          window.location.href = `/track/${data.eventId}`;
        } else {
          setError("Failed to open map.");
          setLoadingMap(false);
        }
      } catch (err) {
        setError("Network error while opening map.");
        setLoadingMap(false);
      }
    }, (geoErr) => {
      setError("Please allow location access to view map.");
      setLoadingMap(false);
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
          <div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-400 tracking-tight">
              Guardian Protocol
            </h1>
            <p className="text-gray-400 mt-1 font-medium">
              Welcome back, {userProfile ? <span className="text-white bg-white/10 px-2 py-0.5 rounded-md ml-1">{userProfile.fullName}</span> : <span className="animate-pulse bg-gray-700 h-4 w-24 inline-block rounded ml-1"></span>}
            </p>
          </div>
          <nav className="flex gap-4 items-center mt-6 md:mt-0">
            <Link href="/dashboard" className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 border border-blue-500/30 px-5 py-2.5 rounded-full transition-all font-medium text-sm shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              Admin Dashboard
            </Link>
            <button
              onClick={() => {
                Cookies.remove('token');
                Cookies.remove('role');
                window.location.href = '/login';
              }}
              className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 px-5 py-2.5 rounded-full transition-all text-sm font-medium"
            >
              Secure Logout
            </button>
          </nav>
        </header>

        {/* Incoming Emergency Modal (If Any) */}
        {incomingSos && (
          <div className="relative overflow-hidden p-8 bg-gradient-to-br from-red-900 to-black border border-red-500 rounded-3xl shadow-[0_0_60px_rgba(220,38,38,0.6)] text-center transform transition-all hover:scale-[1.01]">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
            <button
              onClick={() => setIncomingSos(null)}
              className="absolute top-4 right-6 text-white/50 hover:text-white text-3xl font-light transition"
            >
              &times;
            </button>
            <div className="flex justify-center mb-4">
               <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_30px_rgba(220,38,38,0.8)]">
                  <span className="text-3xl">⚠️</span>
               </div>
            </div>
            <h2 className="text-4xl font-black text-white mb-2 tracking-wide uppercase">Emergency Nearby</h2>
            <p className="text-2xl text-red-200 mb-4 font-light">
              <strong className="font-bold text-white">{incomingSos.victimName}</strong> needs help <span className="bg-red-500 text-white px-3 py-1 rounded-full font-bold text-lg mx-1">{incomingSos.distance}km</span> away!
            </p>
            <p className="text-xl text-red-300 mb-8 font-light">
              Tracking ID: <span className="font-mono font-bold text-white bg-black/30 px-3 py-1 rounded-lg border border-red-500/30">{incomingSos.eventId}</span>
            </p>
            <Link
              href={`/track/${incomingSos.eventId}`}
              className="inline-flex items-center gap-2 bg-white text-red-900 font-extrabold px-10 py-4 rounded-full hover:bg-red-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all transform hover:-translate-y-1"
            >
              <span>View Live Tracker</span>
              <span className="text-xl">→</span>
            </Link>
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* My Area Section */}
          <section className="lg:col-span-4 flex flex-col group">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex-1 flex flex-col hover:bg-white/[0.07] transition-colors relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition"></div>
              <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm border border-blue-500/30">🗺️</span>
                Safe Exploration
              </h2>
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <button 
                  onClick={openMyAreaMap}
                  disabled={loadingMap || loadingSos}
                  className="relative group/btn"
                >
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-40 group-hover/btn:opacity-70 transition duration-500"></div>
                  <div className="w-48 h-48 bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-blue-500/50 hover:border-blue-400 rounded-full font-bold text-xl transition-all flex flex-col items-center justify-center shadow-2xl relative z-10 disabled:opacity-50">
                    <span className="text-4xl mb-2">{loadingMap ? "⏳" : "📡"}</span>
                    <span className="text-blue-400 group-hover/btn:text-blue-300">{loadingMap ? "Loading..." : "My Area"}</span>
                  </div>
                </button>
                <p className="text-sm text-gray-400 mt-8 leading-relaxed max-w-[250px]">
                  Silently view your current location and scan for nearby hospitals or police stations without triggering alerts.
                </p>
              </div>
            </div>
          </section>

          {/* System Control Section */}
          <section className="lg:col-span-8 flex flex-col group">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex-1 flex flex-col relative overflow-hidden">
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition"></div>
              
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <span className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-sm border border-red-500/30">🚨</span>
                   Emergency Override
                 </h2>
                 <button
                    onClick={() => setIsListening(!isListening)}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full font-medium transition-all text-sm border ${isListening ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.3)] animate-pulse' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                    {isListening ? 'Voice Active (Say "Help")' : 'Enable Voice Command'}
                  </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-3">
                  ⚠️ {error}
                </div>
              )}

              <div className="flex-1 flex flex-col items-center justify-center py-6">
                <button
                  onClick={triggerLiveEmergency}
                  disabled={loadingSos || loadingMap}
                  className="relative group/panic"
                >
                  <div className="absolute inset-0 bg-red-600 rounded-full blur-2xl opacity-50 group-hover/panic:opacity-80 group-hover/panic:scale-110 transition duration-500"></div>
                  <div className="w-64 h-64 bg-gradient-to-b from-red-500 to-red-800 border-4 border-red-400/50 hover:border-white/50 rounded-full font-black text-3xl transition-all flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(220,38,38,0.5)] relative z-10 transform hover:scale-105 active:scale-95 disabled:opacity-50">
                    <span className="text-white tracking-widest drop-shadow-md">
                      {loadingSos ? "SENDING..." : "SOS"}
                    </span>
                    <span className="text-red-200 text-xs font-medium uppercase tracking-[0.3em] mt-2 opacity-80">
                      Tap or Say Help
                    </span>
                  </div>
                </button>

                {transcript && (
                  <div className="mt-8 bg-black/40 px-6 py-3 rounded-full border border-white/5 max-w-md w-full text-center">
                    <p className="text-gray-300 text-sm italic line-clamp-1">"{transcript}"</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Data Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Emergency Contacts */}
          <section className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:bg-white/[0.07] transition-colors">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-xl">📞</span> Trusted Contacts
              </h2>
              <Link href="/dashboard/contacts" className="text-blue-400 hover:text-blue-300 text-sm font-medium hover:underline">
                Manage
              </Link>
            </div>
            
            <ul className="space-y-3">
              {contacts.length === 0 ? (
                <li className="text-gray-500 text-sm text-center py-8 bg-black/20 rounded-2xl border border-white/5">
                  No contacts added. <Link href="/dashboard/contacts" className="text-blue-400">Add some now</Link>.
                </li>
              ) : (
                contacts.map(contact => (
                  <li key={contact._id} className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5 group hover:border-white/10 transition">
                    <div>
                      <span className="block text-white font-medium">{contact.contactName}</span>
                      <span className="text-xs text-gray-400 mt-0.5 block">{contact.phoneNumber}</span>
                    </div>
                    <a href={`tel:${contact.phoneNumber}`} className="bg-white/10 hover:bg-blue-600 hover:border-blue-500 border border-transparent text-white px-4 py-2 rounded-xl text-sm transition-all font-medium">
                      Call
                    </a>
                  </li>
                ))
              )}
            </ul>
          </section>

          {/* Nearby Volunteers */}
          <section className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:bg-white/[0.07] transition-colors relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-bl-full"></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-xl">🤝</span> Nearby Volunteers
              </h2>
              <span className="text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full">
                Within 1km
              </span>
            </div>

            <ul className="space-y-3 relative z-10">
              {nearbyUsers.length === 0 ? (
                <li className="text-gray-500 text-sm text-center py-8 bg-black/20 rounded-2xl border border-white/5">
                  <div className="animate-pulse mb-2 text-xl">📡</div>
                  Scanning area for active volunteers...
                </li>
              ) : (
                nearbyUsers.map(user => (
                  <li key={user._id} className="flex justify-between items-center bg-gradient-to-r from-blue-900/30 to-black/20 p-4 rounded-2xl border border-blue-900/50 hover:border-blue-700/50 transition">
                    <div>
                      <span className="block text-white font-medium">{user.fullName}</span>
                      <span className="text-xs text-blue-300 mt-0.5 block flex items-center gap-1">
                        <span>📍</span> {user.distance} km away
                      </span>
                    </div>
                    <a href={`tel:${user.phoneNumber}`} className="bg-red-600/20 hover:bg-red-600 border border-red-500/50 text-red-100 hover:text-white px-4 py-2 rounded-xl text-sm transition-all font-bold">
                      Request Help
                    </a>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        {/* National Hotlines Grid */}
        <section className="bg-white/5 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/10">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="text-xl">🏛️</span> Bangladesh National Hotlines
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <a href="tel:999" className="group bg-black/20 p-6 rounded-2xl border border-red-900/30 hover:border-red-500/50 hover:bg-red-900/20 transition-all text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full"></div>
              <span className="block text-4xl font-black text-red-500 mb-2 group-hover:scale-110 transition-transform">999</span>
              <span className="text-sm font-medium text-gray-300 block">National Emergency</span>
              <span className="text-xs text-gray-500 mt-3 block font-mono bg-black/30 py-1 rounded-md border border-white/5">Voice: "Police" / "999"</span>
            </a>

            <a href="tel:16263" className="group bg-black/20 p-6 rounded-2xl border border-blue-900/30 hover:border-blue-500/50 hover:bg-blue-900/20 transition-all text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full"></div>
              <span className="block text-4xl font-black text-blue-500 mb-2 group-hover:scale-110 transition-transform">16263</span>
              <span className="text-sm font-medium text-gray-300 block">Health & Ambulance</span>
              <span className="text-xs text-gray-500 mt-3 block font-mono bg-black/30 py-1 rounded-md border border-white/5">Voice: "Ambulance"</span>
            </a>

            <a href="tel:109" className="group bg-black/20 p-6 rounded-2xl border border-pink-900/30 hover:border-pink-500/50 hover:bg-pink-900/20 transition-all text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/10 rounded-bl-full"></div>
              <span className="block text-4xl font-black text-pink-500 mb-2 group-hover:scale-110 transition-transform">109</span>
              <span className="text-sm font-medium text-gray-300 block">Women & Children</span>
              <span className="text-xs text-gray-500 mt-3 block font-mono bg-black/30 py-1 rounded-md border border-white/5">Voice: "109"</span>
            </a>

            <a href="tel:333" className="group bg-black/20 p-6 rounded-2xl border border-green-900/30 hover:border-green-500/50 hover:bg-green-900/20 transition-all text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-full"></div>
              <span className="block text-4xl font-black text-green-500 mb-2 group-hover:scale-110 transition-transform">333</span>
              <span className="text-sm font-medium text-gray-300 block">National Help Desk</span>
              <span className="text-xs text-gray-500 mt-3 block font-mono bg-black/30 py-1 rounded-md border border-white/5">Voice: "Information"</span>
            </a>

          </div>
        </section>

      </div>
    </div>
  );
}

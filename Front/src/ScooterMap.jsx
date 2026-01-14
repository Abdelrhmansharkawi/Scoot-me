import React, { useEffect, useState, useRef } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    useMapEvents,
    ZoomControl,
    useMap,
} from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { Scan } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Toast Imports
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_URL = 'scoot-me-production.up.railway.app';

// --- Custom Marker Generator ---
const createCustomMarker = (status, batteryLevel = 85) => {
    let badgeColor = 'bg-green-500';
    if (batteryLevel < 30) badgeColor = 'bg-orange-400';
    else if (status !== 'Available' || batteryLevel < 10)
        badgeColor = 'bg-red-500';

    return L.divIcon({
        className: 'custom-icon-marker',
        html: `
      <div class="relative w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center transform transition-transform hover:scale-110">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4.99845 15.9951C3.89422 15.9951 2.99907 16.8902 2.99907 17.9945C2.99907 19.0988 3.89422 19.9939 4.99845 19.9939C6.10268 19.9939 6.99784 19.0988 6.99784 17.9945C6.99784 16.8902 6.10268 15.9951 4.99845 15.9951Z" fill="#EA580C"/>
          <path d="M16.9948 15.9951C15.8905 15.9951 14.9954 16.8902 14.9954 17.9945C14.9954 19.0988 15.8905 19.9939 16.9948 19.9939C18.099 19.9939 18.9941 19.0988 18.9941 17.9945C18.9941 16.8902 18.099 15.9951 16.9948 15.9951Z" fill="#EA580C"/>
          <path d="M6.99784 17.9945H14.9954M9.99692 7.99761H13.9957L15.4952 12.9961H16.9948M9.99692 7.99761L7.99753 12.9961H4.99846M9.99692 7.99761V4.99854H11.9963V7.99761H9.99692Z" stroke="#EA580C" stroke-width="1.49954" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="absolute -top-1 -right-1 w-5 h-5 ${badgeColor} rounded-full flex items-center justify-center border-2 border-white">
          <span class="text-[10px] font-bold text-white leading-none">${batteryLevel}</span>
        </div>
      </div>
    `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -28],
    });
};

const MapController = ({ setMapInstance }) => {
    const map = useMap();
    useEffect(() => {
        setMapInstance(map);
    }, [map, setMapInstance]);
    return null;
};

const MapClickHandler = ({ onMapClick, isNavigating }) => {
    useMapEvents({
        click: () => {
            if (!isNavigating) onMapClick();
        },
    });
    return null;
};

const ScooterMap = () => {
    const navigate = useNavigate();
    const [scooters, setScooters] = useState([]);
    const [selectedScooter, setSelectedScooter] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [mapInstance, setMapInstance] = useState(null);
    const routingControlRef = useRef(null);
    const [isNavigating, setIsNavigating] = useState(false);

    // Watch Location
    useEffect(() => {
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) =>
                    setUserLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    }),
                (err) => console.error('Error watching location:', err),
                { enableHighAccuracy: false, maximumAge: 10000, timeout: 5000 }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    // Fetch Scooters
    const fetchScooters = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/scooter`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const offset = 0.0003;
            const updatedScooters = res.data.map((scooter) => {
                if (scooter.location?.coordinates?.length === 2) {
                    return {
                        ...scooter,
                        location: {
                            ...scooter.location,
                            coordinates: [
                                scooter.location.coordinates[0] + (Math.random() - 1) * offset,
                                scooter.location.coordinates[1] + (Math.random() - 1) * offset,
                            ],
                        },
                    };
                }
                return scooter;
            });
            setScooters(updatedScooters);
        } catch (err) {
            toast.error('Failed to fetch nearby scooters.');
        }
    };

    useEffect(() => {
        fetchScooters();
    }, []);

    // Function moved to the "Reserve & Navigate" button
    const handleReserveAndNavigate = async () => {
        if (!selectedScooter) return;

        const loadingToast = toast.loading('Reserving your scooter...');

        try {
            const token = localStorage.getItem('token');
            // Call the booking API
            await axios.patch(
                `${API_URL}/api/scooter/${selectedScooter._id}/book`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // If successful, update UI to navigation mode
            toast.update(loadingToast, {
                render: 'Scooter reserved for 10 minutes!',
                type: 'success',
                isLoading: false,
                autoClose: 2000,
            });

            setIsNavigating(true);
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Reservation failed';
            toast.update(loadingToast, {
                render: errorMsg,
                type: 'error',
                isLoading: false,
                autoClose: 3000,
            });
        }
    };

    // Routing Logic
    useEffect(() => {
        if (routingControlRef.current && mapInstance) {
            try {
                mapInstance.removeControl(routingControlRef.current);
                routingControlRef.current = null;
            } catch (e) {
                console.warn('Error removing control', e);
            }
        }

        if (!mapInstance || !userLocation || !selectedScooter || !isNavigating)
            return;

        const lat = selectedScooter.location.coordinates[1];
        const lng = selectedScooter.location.coordinates[0];

        const routingControl = L.Routing.control({
            waypoints: [
                L.latLng(userLocation.lat, userLocation.lng),
                L.latLng(lat, lng),
            ],
            routeWhileDragging: false,
            show: false,
            addWaypoints: false,
            fitSelectedRoutes: true,
            lineOptions: { styles: [{ color: '#EA580C', weight: 5 }] },
            createMarker: () => null,
        });

        routingControl.addTo(mapInstance);
        routingControlRef.current = routingControl;

        const bounds = L.latLngBounds([
            [userLocation.lat, userLocation.lng],
            [lat, lng],
        ]);
        mapInstance.fitBounds(bounds, { padding: [100, 100] });

        return () => {
            if (mapInstance && routingControlRef.current) {
                try {
                    mapInstance.removeControl(routingControlRef.current);
                    routingControlRef.current = null;
                } catch (e) {}
            }
        };
    }, [mapInstance, userLocation, selectedScooter, isNavigating]);

    const handleMenu = () => navigate('/book-ride');
    const handleProfile = () => navigate('/profile');

    return (
        <div className="w-screen h-screen relative overflow-hidden bg-gray-100">
            <ToastContainer
                position="top-center"
                autoClose={3000}
                theme="light"
                style={{ zIndex: 9999 }}
            />

            {!selectedScooter && (
                <>
                    <div className="absolute top-6 left-6 z-[1000]">
                        <button
                            onClick={handleMenu}
                            className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                            </svg>
                        </button>
                    </div>
                    <div className="absolute top-6 right-6 z-[1000]">
                        <button
                            onClick={handleProfile}
                            className="w-12 h-12 bg-orange-500 rounded-full shadow-md flex items-center justify-center text-white hover:bg-orange-600 active:scale-95 transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </>
            )}

            <MapContainer
                center={userLocation ? [userLocation.lat, userLocation.lng] : [31.041779, 31.357201]}
                zoom={16}
                zoomControl={false}
                style={{ width: '100%', height: '100%' }}
            >
                <MapController setMapInstance={setMapInstance} />
                <ZoomControl position="bottomright" />
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution="&copy; CARTO"
                />
                <MapClickHandler
                    onMapClick={() => setSelectedScooter(null)}
                    isNavigating={isNavigating}
                />

                {userLocation && (
                    <Marker
                        position={[userLocation.lat, userLocation.lng]}
                        icon={L.divIcon({
                            className: 'user-dot',
                            html: `<div style="width: 16px; height: 16px; background-color: #3b82f6; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
                            iconSize: [16, 16],
                            iconAnchor: [8, 8],
                        })}
                    />
                )}

                {scooters.map((s) => {
                    const lat = s.location?.coordinates?.[1];
                    const lng = s.location?.coordinates?.[0];
                    if (lat === undefined || lng === undefined) return null;
                    if (isNavigating && selectedScooter && s._id !== selectedScooter._id)
                        return null;
                    const battery = s.batteryLevel || Math.floor(Math.random() * (100 - 20) + 20);

                    return (
                        <Marker
                            key={s._id}
                            position={[lat, lng]}
                            icon={createCustomMarker(s.status, battery)}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                    if (!isNavigating) setSelectedScooter({ ...s, battery });
                                },
                            }}
                        />
                    );
                })}
            </MapContainer>

            {/* Bottom Sheet Modal */}
            {selectedScooter && !isNavigating && (
                <div className="absolute bottom-0 left-0 right-0 bg-white z-[2000] rounded-t-[35px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-10 animate-in slide-in-from-bottom duration-300">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8"></div>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{selectedScooter.scooterName || 'Scooter SC004'}</h2>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold text-white ${selectedScooter.status === 'Available' ? 'bg-orange-500' : 'bg-red-500'}`}>
                            {selectedScooter.status || 'Available'}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center">
                            <span className="text-gray-400 text-xs font-medium mb-1">Battery</span>
                            <span className={`font-bold ${selectedScooter.battery < 30 ? 'text-red-500' : 'text-orange-500'}`}>{selectedScooter.battery}%</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center">
                            <span className="text-gray-400 text-xs font-medium mb-1">Range</span>
                            <span className="text-gray-900 font-bold">6 km</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center">
                            <span className="text-gray-400 text-xs font-medium mb-1">Price</span>
                            <span className="text-gray-900 font-bold">$0.5/min</span>
                        </div>
                    </div>

                    <button
                        disabled={selectedScooter.status !== 'Available' || selectedScooter.battery < 10}
                        onClick={handleReserveAndNavigate}
                        className={`w-full py-4 rounded-full text-lg font-bold shadow-lg transition-all ${
                            selectedScooter.status !== 'Available' || selectedScooter.battery < 10
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                                : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200 text-white'
                        }`}
                    >
                        Reserve & Navigate
                    </button>
                </div>
            )}

            {/* --- SCAN QR BUTTON: Replaces Start Trip during Navigation --- */}
            {isNavigating && (
                <div className="absolute bottom-10 left-0 right-0 flex justify-center z-[2000]">
                    <button
                        onClick={() => navigate('/scan')}
                        className="bg-[#EA580C] text-white flex items-center justify-center gap-3 py-4 px-10 rounded-full shadow-[0_10px_30px_rgba(234,88,12,0.4)] active:scale-95 transition-transform"
                    >
                        <Scan size={24} strokeWidth={2.5} />
                        <span className="font-bold text-lg tracking-wide">Scan QR Code</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ScooterMap;

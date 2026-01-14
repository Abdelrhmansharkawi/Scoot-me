import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import {
	MapContainer,
	TileLayer,
	Marker,
	useMapEvents,
	useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import axios from 'axios';

const POLL_INTERVAL = 3000;
const API_URL = 'https://scoot-me-production.up.railway.app';

const Icons = {
	Cost: () => (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="#f97316"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="12" cy="12" r="10" />
			<path d="M16 8h-3a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-3" />
			<path d="M12 6v2" />
			<path d="M12 16v2" />
		</svg>
	),
	Time: () => (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="#f97316"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
	),
	Distance: () => (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="#f97316"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="m12 19-7-7 7-7" />
			<path d="M19 12H5" />
		</svg>
	),
	Location: () => (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="text-white"
		>
			<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
			<circle cx="12" cy="10" r="3" />
		</svg>
	),
};

// Component to handle auto-centering the map
const RecenterMap = ({ lat, lng }) => {
	const map = useMap();
	useEffect(() => {
		if (lat && lng) {
			map.setView([lat, lng], map.getZoom(), {
				animate: true,
				pan: { duration: 1 },
			});
		}
	}, [lat, lng, map]);
	return null;
};

const LocationSelector = ({ onSelect, enabled }) => {
	useMapEvents({
		click(e) {
			if (enabled) onSelect(e.latlng);
		},
	});
	return null;
};

const RoutingControl = ({ start, end }) => {
	const map = useMap();
	const routingControlRef = useRef(null);

	useEffect(() => {
		if (!map || !start || !end) return;

		// Create routing control ONCE
		if (!routingControlRef.current) {
			routingControlRef.current = L.Routing.control({
				waypoints: [L.latLng(start.lat, start.lng), L.latLng(end.lat, end.lng)],
				lineOptions: {
					styles: [{ color: '#f97316', weight: 6, opacity: 0.7 }],
				},
				addWaypoints: false,
				draggableWaypoints: false,
				fitSelectedRoutes: false, // important for live tracking
				show: false,
				createMarker: () => null,
				serviceUrl: 'https://router.project-osrm.org/route/v1',
			}).addTo(map);

			// Hide routing UI
			const container = routingControlRef.current.getContainer();
			if (container) container.style.display = 'none';
		} else {
			// Update waypoints smoothly (NO re-creation)
			routingControlRef.current.setWaypoints([
				L.latLng(start.lat, start.lng),
				L.latLng(end.lat, end.lng),
			]);
		}
	}, [map, start.lat, start.lng, end.lat, end.lng]);

	return null;
};

const LiveRide = () => {
	const { tripId } = useParams();
	const [trip, setTrip] = useState(null);
	const [error, setError] = useState(null);
	const [destination, setDestination] = useState(null);
	const [rideStarted, setRideStarted] = useState(false);
	const [livePos, setLivePos] = useState(null);

	// Using a ref for position ensures the interval always sends the latest coordinates
	// without needing to reset the interval constantly
	const livePosRef = useRef(null);
	const pollingRef = useRef(null);
	const wakeLockRef = useRef(null);

	const [stats, setStats] = useState({
		duration: 0,
		distance: 0,
		cost: 0,
		minsRemaining: null,
		estimatedArrival: null,
	});
	const navigate = useNavigate();

	const getAuthHeaders = () => ({
		headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
	});

	useEffect(() => {
		const fetchTrip = async () => {
			if (!tripId) return;
			try {
				const res = await axios.get(
					`${API_URL}/api/trips/${tripId}`,
					getAuthHeaders()
				);
				if (res.data) {
					setTrip(res.data);
					if (res.data.status === 'ONGOING') {
						setRideStarted(true);
					}
				}
			} catch (err) {
				setError(err.response?.data?.message || 'Failed to load trip.');
			}
		};
		fetchTrip();
	}, [tripId]);

	/* -------- CHANGED: Improved Location Tracking & Wake Lock -------- */
	useEffect(() => {
		if (!rideStarted) return;

		// 1. Request Screen Wake Lock (prevents phone from sleeping)
		const requestWakeLock = async () => {
			try {
				if ('wakeLock' in navigator) {
					wakeLockRef.current = await navigator.wakeLock.request('screen');
					console.log('Wake Lock active');
				}
			} catch (err) {
				console.error('Wake Lock error:', err);
			}
		};
		requestWakeLock();

		// 2. Use watchPosition instead of polling
		// This persists better in background/locked states on mobile
		const geoId = navigator.geolocation.watchPosition(
			(pos) => {
				const newPos = {
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
				};
				setLivePos(newPos);
				livePosRef.current = newPos; // Update Ref for the API interval
			},
			(err) => console.error('GPS Watch Error:', err),
			{
				enableHighAccuracy: true,
				maximumAge: 0,
				timeout: 20000,
			}
		);

		// 3. Handle Visibility (force sync when unlocking phone)
		const handleVisibilityChange = () => {
			// If wake lock was released (e.g. user minimized app), try re-acquiring it
			if (!document.hidden && !wakeLockRef.current) {
				requestWakeLock();
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			navigator.geolocation.clearWatch(geoId);
			if (wakeLockRef.current) {
				wakeLockRef.current.release();
				wakeLockRef.current = null;
			}
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [rideStarted]);

	/* -------- Smooth Local Timer (1s) -------- */
	useEffect(() => {
		if (!rideStarted) return;

		const interval = setInterval(() => {
			setStats((prev) => ({
				...prev,
				duration: prev.duration + 1,
			}));
		}, 1000);

		return () => clearInterval(interval);
	}, [rideStarted]);

	/* -------- API Sync Loop -------- */
	useEffect(() => {
		if (!rideStarted || !tripId) return;

		const syncLocation = async () => {
			try {
				// Use the Ref for coordinate to avoid stale closure in setInterval
				const currentCoords =
					livePosRef.current ||
					livePos ||
					trip?.currentLocation ||
					trip?.startLocation;

				if (!currentCoords) return;

				const currentPos = {
					lat: currentCoords.lat,
					lng: currentCoords.lng,
				};

				const res = await axios.post(
					`${API_URL}/api/trips/${tripId}/location`,
					currentPos,
					getAuthHeaders()
				);

				setStats((prev) => {
					const next = {
						...prev,
						distance: res.data.distance,
						cost: res.data.cost,
						minsRemaining: res.data.minsRemaining,
						estimatedArrival: res.data.estimatedArrival,
					};

					// Correct time if drift is large (fixes the "locked phone" time freeze)
					const drift = res.data.time - prev.duration;
					if (Math.abs(drift) > 2) {
						next.duration = res.data.time;
					}

					return next;
				});

				setTrip((prev) => ({
					...prev,
					currentLocation: res.data.currentLocation || currentPos,
				}));
			} catch (err) {
				console.warn('Polling skipped', err);
			}
		};

		// Run sync immediately on mount/resume
		syncLocation();

		pollingRef.current = setInterval(syncLocation, POLL_INTERVAL);

		return () => clearInterval(pollingRef.current);
	}, [rideStarted, tripId, trip]); // Removed 'livePos' from deps to stop interval resetting

	const handleConfirmDestination = async () => {
		if (!destination || !tripId) return;
		try {
			const res = await axios.post(
				`${API_URL}/api/trips/${tripId}/destination`,
				{
					latitude: destination.lat,
					longitude: destination.lng,
					locationName: 'Destination',
				},
				getAuthHeaders()
			);
			setTrip(res.data.trip);
		} catch (err) {
			alert(err.response?.data?.message || 'Error');
		}
	};

	const handleStartRide = async () => {
		try {
			await axios.post(
				`${API_URL}/api/trips/${tripId}/start`,
				{},
				getAuthHeaders()
			);
			setRideStarted(true);
		} catch (err) {
			alert(err.response?.data?.message || 'Failed');
		}
	};

	const handleEndRide = async () => {
		try {
			await axios.post(
				`${API_URL}/api/trips/${tripId}/end`,
				{},
				getAuthHeaders()
			);

			if (pollingRef.current) {
				clearInterval(pollingRef.current);
				pollingRef.current = null;
			}

			navigate(`/ride-details/${tripId}`);
		} catch (err) {
			alert(err.response?.data?.message || 'Failed to end ride');
		}
	};

	if (error)
		return (
			<div className="flex h-[100dvh] items-center justify-center text-red-500">
				{error}
			</div>
		);

	if (!trip)
		return (
			<div className="flex h-[100dvh] items-center justify-center text-gray-400">
				Loading...
			</div>
		);

	return (
		// Changed h-screen to h-[100dvh] for mobile browser address bar handling
		<div className="relative w-screen h-[100dvh] bg-slate-50 overflow-hidden font-sans">
			{rideStarted && (
				<div className="absolute top-12 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm">
					<div className="bg-white rounded-3xl shadow-xl border border-slate-50 flex justify-around py-5 px-2">
						<div className="flex flex-col items-center border-r border-slate-100 w-1/3">
							<div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase mb-1">
								<Icons.Cost /> Cost
							</div>
							<span className="text-lg font-bold">{stats.cost.toFixed(2)}</span>
							<span className="text-[10px] text-slate-400 font-medium">
								EGP
							</span>
						</div>
						<div className="flex flex-col items-center border-r border-slate-100 w-1/3">
							<div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase mb-1">
								<Icons.Time /> Time
							</div>
							<span className="text-lg font-bold">
								{Math.floor(stats.duration / 60)}:
								{(stats.duration % 60).toString().padStart(2, '0')}
							</span>
							<span className="text-[10px] text-slate-400 font-medium">
								elapsed
							</span>
						</div>
						<div className="flex flex-col items-center w-1/3">
							<div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase mb-1">
								<Icons.Distance /> Distance
							</div>
							<span className="text-lg font-bold">
								{(stats.distance / 1000).toFixed(1)}
							</span>
							<span className="text-[10px] text-slate-400 font-medium">km</span>
						</div>
					</div>
				</div>
			)}
			<MapContainer
				center={[trip.startLocation.lat, trip.startLocation.lng]}
				zoom={16}
				zoomControl={false}
				className="w-full h-full"
			>
				<TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

				{/* Auto-Centering logic */}
				{rideStarted && livePos && (
					<RecenterMap lat={livePos.lat} lng={livePos.lng} />
				)}

				{!trip?.endLocation && (
					<LocationSelector enabled={true} onSelect={setDestination} />
				)}

				<Marker
					position={[
						livePos?.lat ??
							trip?.currentLocation?.lat ??
							trip.startLocation.lat,
						livePos?.lng ??
							trip?.currentLocation?.lng ??
							trip.startLocation.lng,
					]}
					icon={L.divIcon({
						className: '',
						html: `<div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>`,
						iconSize: [16, 16],
						iconAnchor: [8, 8],
					})}
				/>

				{destination && !trip?.endLocation && (
					<Marker
						position={destination}
						icon={L.divIcon({
							className: '',
							html: `<div class="bg-orange-600 p-1.5 rounded-full border-2 border-white shadow-lg"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
							iconSize: [30, 30],
							iconAnchor: [15, 30],
						})}
					/>
				)}
				{trip?.endLocation && (
					<RoutingControl
						start={livePos || trip.currentLocation || trip.startLocation}
						end={trip.endLocation}
					/>
				)}
			</MapContainer>

			<div className="absolute bottom-0 left-0 right-0 z-[1000]">
				<div className="bg-white rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] p-8">
					{rideStarted ? (
						<div className="space-y-6">
							<div className="flex justify-between items-center">
								<h2 className="text-2xl font-bold text-slate-800">
									Trip in Progress
								</h2>
								<span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
									Active
								</span>
							</div>
							<div className="bg-slate-50/80 rounded-3xl p-5 flex justify-between items-center">
								<div>
									<p className="text-xs font-bold text-slate-400 uppercase mb-1">
										Estimated Arrival
									</p>
									<p className="text-xl font-bold">
										{stats.estimatedArrival
											? new Date(stats.estimatedArrival).toLocaleTimeString(
													[],
													{ hour: '2-digit', minute: '2-digit' }
											  )
											: '--:--'}
									</p>
								</div>
								<p className="text-slate-400 font-medium text-sm">
									{stats.minsRemaining ?? '--'} mins
									<br />
									remaining
								</p>
							</div>
							<button
								onClick={handleEndRide}
								className="w-full bg-[#FFF1F1] text-[#FF5A5A] font-bold py-5 rounded-3xl text-lg transition-all active:scale-[0.98]"
							>
								End Ride
							</button>
						</div>
					) : (
						<div className="p-4">
							{trip?.endLocation ? (
								<button
									onClick={handleStartRide}
									className="w-full bg-orange-500 text-white font-bold py-5 rounded-3xl text-lg shadow-lg shadow-orange-200 uppercase"
								>
									Start Trip
								</button>
							) : (
								<div className="space-y-4">
									<p className="text-center text-slate-400 text-sm font-medium">
										{destination
											? 'Ready to confirm?'
											: 'Tap on the map to set destination'}
									</p>
									<button
										onClick={handleConfirmDestination}
										disabled={!destination}
										className={`w-full font-bold py-5 rounded-3xl text-lg ${
											destination
												? 'bg-orange-500 text-white shadow-orange-200'
												: 'bg-slate-100 text-slate-300'
										}`}
									>
										{destination ? 'Confirm Destination' : 'Select a Point'}
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default LiveRide;

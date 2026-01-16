import React, { useState, useEffect } from 'react';
import { FaHistory, FaUser } from 'react-icons/fa';
import { MdElectricScooter } from 'react-icons/md';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import {
	MapContainer,
	TileLayer,
	Marker,
	Popup,
	useMapEvents,
} from 'react-leaflet';
import 'react-toastify/dist/ReactToastify.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Use environment variable or fallback
const API_URL =
	import.meta.env.VITE_API_URL || 'https://scoot-me-production.up.railway.app';

function MapClickHandler() {
	const navigate = useNavigate();

	useMapEvents({
		click: (e) => {
			const { lat, lng } = e.latlng;
			console.log('Map clicked at:', lat, lng);
			navigate('/map');
		},
	});

	return null;
}

// Custom Marker styling
const createCustomMarker = (status, batteryLevel = 85) => {
	let badgeColor = 'bg-green-500';
	if (batteryLevel < 30) badgeColor = 'bg-orange-400';
	else if (status !== 'Available') badgeColor = 'bg-red-500';

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

export default function BookRide() {
	const [query, setQuery] = useState('');
	const [scooters, setScooters] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchScooters = async () => {
			try {
				const token = localStorage.getItem('token');
				const res = await axios.get(`${API_URL}/api/scooter`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				const offset = 0.0001;
				const updatedScooters = res.data.map((scooter) => {
					// Mock random distance for UI match
					const mockDistance = (0.2 + Math.random() * 1.5).toFixed(1);

					if (
						scooter.location &&
						scooter.location.coordinates &&
						scooter.location.coordinates.length === 2
					) {
						return {
							...scooter,
							distance: mockDistance,
							location: {
								...scooter.location,
								coordinates: [
									scooter.location.coordinates[0] +
										(Math.random() - 0.5) * offset,
									scooter.location.coordinates[1] +
										(Math.random() - 0.5) * offset,
								],
							},
						};
					}
					return { ...scooter, distance: mockDistance };
				});

				setScooters(updatedScooters);
			} catch (err) {
				console.error('Failed to fetch scooters:', err);
				toast.error('Failed to load scooters. Please try again.');
			} finally {
				setLoading(false);
			}
		};

		fetchScooters();
	}, []);

	const filtered = scooters
		.filter(
			(s) =>
				s.scooterName.toLowerCase().includes(query.toLowerCase()) ||
				s.location.locationName.toLowerCase().includes(query.toLowerCase())
		)
		.sort((a, b) => {
			if (a.status === 'Available' && b.status !== 'Available') return -1;
			if (a.status !== 'Available' && b.status === 'Available') return 1;
			return 0;
		});

	const getBatteryColor = (level) => {
		if (level > 60) return 'bg-green-500';
		if (level > 30) return 'bg-yellow-400';
		return 'bg-red-500';
	};

	// Helper component to render map contents to avoid code duplication
	const MapContent = () => (
		<>
			<MapClickHandler />
			<TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
			{filtered.map((s) => {
				const lat = s.location.coordinates[1];
				const lng = s.location.coordinates[0];
				if (lat === undefined || lng === undefined) return null;

				return (
					<Marker
						key={s._id}
						position={[lat, lng]}
						icon={createCustomMarker(s.status, s.batteryLevel)}
					>
						<Popup>{s.scooterName}</Popup>
					</Marker>
				);
			})}
		</>
	);

	return (
		// Main Wrapper: Flex Col on Mobile, Flex Row on Desktop
		<div className="flex flex-col md:flex-row h-screen bg-gray-50 font-sans overflow-hidden">
			{/* --- LEFT PANEL (Sidebar for Desktop, Full screen for Mobile) --- */}
			<div className="flex flex-col w-full md:w-[420px] lg:w-[450px] h-full relative z-20 shadow-2xl bg-gray-50 shrink-0">
				{/* 1. Header Section */}
				<div className="bg-gradient-to-r from-[#FF5500] to-[#ff7b00] pt-12 pb-24 px-6 rounded-b-[40px] shadow-sm relative z-0">
					<div className="flex flex-col items-center justify-center text-white">
						<h1 className="text-2xl font-serif font-semibold tracking-wide">
							Book a Ride
						</h1>
						<p className="text-orange-100 text-sm mt-1 opacity-90">
							Find the nearest scooter
						</p>
					</div>
				</div>

				{/* 2. Map Section (MOBILE ONLY - VISIBLE) */}
				{/* Hidden on md/lg screens, visible on mobile to preserve original design */}
				<div className="w-full px-5 -mt-20 relative z-10 md:hidden">
					<div className="rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-white h-[200px]">
						<MapContainer
							center={[31.041779, 31.357201]}
							zoom={15.3}
							zoomControl={false}
							className="clickable-map"
							style={{ width: '100%', height: '100%', cursor: 'pointer' }}
						>
							<MapContent />
						</MapContainer>
					</div>
				</div>

				{/* 3. List Section */}
				<div className="flex-1 overflow-auto mt-4 px-5 pb-24 md:pb-20">
					<div className="flex justify-between items-end mb-4 px-1">
						<h2 className="text-lg font-bold text-gray-800 font-serif">
							Available Scooters
						</h2>
						<span className="text-gray-400 text-sm">
							{filtered.length} nearby
						</span>
					</div>

					{loading ? (
						<div className="flex justify-center items-center h-20 text-gray-400 text-sm">
							Loading...
						</div>
					) : (
						<ul className="space-y-4">
							{filtered.map((s) => (
								<li
									key={s._id}
									className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-all ${
										s.status !== 'Available' ? 'opacity-80' : ''
									}`}
								>
									<div className="flex items-center gap-4">
										<div
											className={`w-12 h-12 rounded-full flex items-center justify-center ${
												s.status === 'Available'
													? 'bg-orange-50'
													: 'bg-gray-100'
											}`}
										>
											<MdElectricScooter
												className={`text-2xl ${
													s.status === 'Available'
														? 'text-[#FF5500]'
														: 'text-gray-400'
												}`}
											/>
										</div>
										<div className="flex flex-col">
											<div className="flex items-center gap-2">
												<h3 className="font-bold text-gray-800 text-base">
													{s.scooterName}
												</h3>
												{s.status !== 'Available' && (
													<span className="bg-gray-200 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-medium">
														{s.status}
													</span>
												)}
											</div>
											<p className="text-gray-400 text-xs mt-0.5">
												{s.location.locationName}
											</p>
										</div>
									</div>

									<div className="flex flex-col items-end justify-center min-w-[60px]">
										<span className="text-gray-800 font-medium text-sm mb-2">
											{s.distance} km
										</span>
										<div className="flex items-center gap-2">
											<div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
												<div
													className={`h-full rounded-full ${getBatteryColor(
														s.batteryLevel
													)}`}
													style={{ width: `${s.batteryLevel}%` }}
												></div>
											</div>
											<span className="text-[10px] text-gray-400 font-medium">
												{s.batteryLevel}%
											</span>
										</div>
									</div>
								</li>
							))}
							{filtered.length === 0 && (
								<li className="text-center text-gray-400 text-sm py-8">
									No scooters found nearby.
								</li>
							)}
						</ul>
					)}
				</div>

				{/* 4. Bottom Navigation */}
				{/* Changed: 'fixed' on mobile, 'absolute' on desktop to stay inside the sidebar */}
				<div className="fixed md:absolute bottom-0 w-full md:w-full bg-white border-t border-gray-100 pb-2 pt-2 z-50">
					<div className="flex justify-around items-end px-6">
						<Link
							to="/profile"
							className="flex flex-col items-center gap-1 mb-2 group"
						>
							<FaUser className="text-xl text-gray-800 group-hover:text-orange-500 transition-colors" />
							<span className="text-[10px] font-medium text-gray-800">
								Profile
							</span>
						</Link>

						<div className="relative -top-5">
							<Link to="/book-ride">
								<div className="w-16 h-16 bg-[#FF5500] rounded-full flex items-center justify-center shadow-lg shadow-orange-200 border-4 border-gray-50">
									<MdElectricScooter className="text-3xl text-white" />
								</div>
							</Link>
						</div>

						<Link
							to="/history"
							className="flex flex-col items-center gap-1 mb-2 group"
						>
							<FaHistory className="text-xl text-gray-800 group-hover:text-orange-500 transition-colors" />
							<span className="text-[10px] font-medium text-gray-800">
								History
							</span>
						</Link>
					</div>
				</div>
			</div>

			{/* --- RIGHT PANEL (Map for Desktop - DESKTOP ONLY) --- */}
			{/* Hidden on mobile, visible on desktop */}
			<div className="hidden md:block flex-1 h-full relative z-10">
				<MapContainer
					center={[31.041779, 31.357201]}
					zoom={15.3}
					zoomControl={false}
					className="clickable-map"
					style={{ width: '100%', height: '100%', cursor: 'pointer' }}
				>
					<MapContent />
				</MapContainer>
			</div>

			<ToastContainer position="top-center" autoClose={3000} />
		</div>
	);
}

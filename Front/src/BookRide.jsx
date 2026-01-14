import React, { useState, useEffect } from 'react';
import { FaHome, FaHistory } from 'react-icons/fa';
import { RiAccountCircleLine } from 'react-icons/ri';
import { MdElectricScooter } from 'react-icons/md';
import { motion } from 'framer-motion';
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

const API_URL = 'https://scoot-me-production.up.railway.app';

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

				// Offset identical coordinates slightly to avoid perfect overlap
				const offset = 0.0001; // about ~10 meters

				const updatedScooters = res.data.map((scooter) => {
					if (
						scooter.location &&
						scooter.location.coordinates &&
						scooter.location.coordinates.length === 2
					) {
						// Slightly offset
						return {
							...scooter,
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
					return scooter;
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

	const handleBook = async (scooter) => {
		try {
			const token = localStorage.getItem('token');
			await axios.patch(
				`${API_URL}/api/scooter/${scooter._id}/book`,
				{},
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);

			toast.success(`Successfully booked ${scooter.scooterName}!`);

			setScooters((prevScooters) =>
				prevScooters.map((s) =>
					s._id === scooter._id ? { ...s, status: 'In Use' } : s
				)
			);
		} catch (err) {
			console.error('Booking failed:', err);
			toast.error(err.response?.data?.message || 'Booking failed');
		}
	};

	return (
		<div className="flex flex-col h-screen bg-gray-50">
			<div className="bg-gradient-to-b from-orange-200 to-transparent p-4">
				<h1 className="text-center text-xl font-semibold text-gray-700 flex items-center justify-center">
					<MdElectricScooter className="mr-2 text-orange-500" /> Book a Ride
				</h1>
				<div className="mt-4 flex justify-center">
					<input
						type="text"
						placeholder="Search scooters or locations"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="w-3/4 max-w-md px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400"
					/>
				</div>
			</div>

			{/* 🚩 Map */}
			<div className="w-full px-4 md:w-4/5 lg:w-3/5 mx-auto mt-4 rounded-2xl overflow-hidden shadow-lg">
				<MapContainer
					center={[31.041779, 31.357201]}
					zoom={15.3}
					className="clickable-map"
					style={{
						width: '100%',
						height: '250px',
						borderRadius: '20px',
						cursor: 'pointer',
					}}
				>
					<MapClickHandler />
					<TileLayer
						url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
						attribution="&copy; <a href='https://carto.com/attributions'>CARTO</a>"
					/>

					{filtered.map((s) => {
						const lat = s.location.coordinates[1];
						const lng = s.location.coordinates[0];

						if (lat === undefined || lng === undefined) {
							return null;
						}

						const scooterIcon = createCustomMarker(s.status, s.batteryLevel);

						return (
							<Marker key={s._id} position={[lat, lng]} icon={scooterIcon}>
								<Popup>
									<strong>{s.scooterName}</strong>
									<br />
									{s.location.locationName}
									<br />
									Status:{' '}
									<span
										style={{
											color: s.status === 'Available' ? 'green' : 'red',
										}}
									>
										{s.status}
									</span>
								</Popup>
							</Marker>
						);
					})}
				</MapContainer>
			</div>

			<div className="flex-1 overflow-auto mt-2 px-4">
				{loading ? (
					<div className="flex justify-center items-center h-40 text-gray-500">
						Loading scooters...
					</div>
				) : (
					<ul className="space-y-3">
						{filtered.map((s) => (
							<li
								key={s._id}
								className="bg-white p-4 rounded-lg shadow hover:shadow-md transition"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center">
										<MdElectricScooter className="text-2xl text-gray-600 mr-4" />
										<div>
											<p className="font-medium text-gray-800">
												{s.scooterName}
											</p>
											<p className="text-sm text-gray-500">
												{s.location.locationName}
											</p>
										</div>
									</div>
									<span
										className={`text-sm font-medium ${
											s.status === 'Available'
												? 'text-green-500'
												: 'text-red-500'
										}`}
									>
										{s.status}
									</span>
								</div>
								{s.status === 'Available' && (
									<div className="mt-3 flex justify-end">
										<button
											onClick={() => handleBook(s)}
											className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-full font-semibold transition"
										>
											Book Now
										</button>
									</div>
								)}
							</li>
						))}
						{filtered.length === 0 && (
							<li className="text-center text-gray-500 py-4">
								No scooters match your search.
							</li>
						)}
					</ul>
				)}
			</div>

			<nav className="bg-white border-t border-gray-200 p-2 flex justify-around items-center">
				<Link
					to="/profile"
					className="flex flex-col items-center text-gray-500"
				>
					<RiAccountCircleLine className="text-2xl" />
					<span className="text-xs">profile</span>
				</Link>
				<Link
					to="/book-ride"
					className="flex flex-col items-center text-gray-500"
				>
					<motion.div
						animate={{ y: [0, -15, 0] }}
						transition={{ repeat: Infinity, duration: 1.5 }}
						className="p-3 bg-white rounded-full shadow-lg"
					>
						<MdElectricScooter className="text-4xl text-orange-500 hover:scale-110 transition-transform" />
					</motion.div>
				</Link>
				<Link
					to="/history"
					className="flex flex-col items-center text-gray-500"
				>
					<FaHistory className="text-xl" />
					<span className="text-xs">History</span>
				</Link>
			</nav>
			<ToastContainer position="top-center" autoClose={3000} />
		</div>
	);
}

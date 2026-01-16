import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
	ArrowLeft,
	Calendar,
	Clock,
	Timer,
	Zap,
	Battery,
	Wallet, // Changed from DollarSign to Wallet for a better EGP feel
	MapPin,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL|| 'https://scoot-me-production.up.railway.app';

// --- SMART FORMATTING HELPERS ---
const formatCurr = (val) => {
	if (!val) return 'EGP 0.00';
	// If backend already sent "EGP 10.00", just return it
	if (typeof val === 'string' && val.includes('EGP')) return val;

	// Otherwise, clean it and format it
	const num =
		typeof val === 'string' ? parseFloat(val.replace(/[$,EGP ]/g, '')) : val;
	return isNaN(num) ? val : `EGP ${num.toFixed(2)}`;
};

const formatNum = (val, decimals = 2) => {
	if (!val) return '0';
	// If backend already sent "0.52 km", extract the number part
	const cleanVal = typeof val === 'string' ? val.split(' ')[0] : val;
	const num = parseFloat(cleanVal);
	return isNaN(num) ? val : num.toFixed(decimals);
};

/**
 * StatCard Component
 */
const StatCard = ({ icon: Icon, label, value }) => (
	<div className="bg-[#FFF8F3] p-5 rounded-xl flex flex-col gap-1 min-w-[140px]">
		<div className="flex items-center gap-2 mb-1">
			<Icon size={16} className="text-orange-500" strokeWidth={2.5} />
			<span className="text-xs font-semibold text-gray-500">{label}</span>
		</div>
		<span className="text-lg font-bold text-gray-900">{value}</span>
	</div>
);

/**
 * BreakdownRow Component
 */
const BreakdownRow = ({ label, value, isTotal = false }) => (
	<div
		className={`flex justify-between items-center py-2 ${
			isTotal ? 'mt-2 pt-4 border-t border-gray-100' : ''
		}`}
	>
		<span
			className={`${
				isTotal ? 'text-base font-bold text-gray-900' : 'text-sm text-gray-500'
			}`}
		>
			{label}
		</span>
		<span
			className={`${
				isTotal
					? 'text-lg font-bold text-orange-600'
					: 'text-sm font-medium text-gray-900'
			}`}
		>
			{value}
		</span>
	</div>
);

export default function RideDetailsScreen() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const { id } = useParams();

	useEffect(() => {
		const fetchRide = async () => {
			setLoading(true);
			try {
				const token = localStorage.getItem('token');
				const response = await axios.get(`${API_URL}/api/rides/${id}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				setData(response.data);
			} catch (err) {
				console.error(err);
				setError(
					err.response?.status === 404
						? 'Ride not found.'
						: 'Failed to fetch ride details.'
				);
			} finally {
				setLoading(false);
			}
		};
		fetchRide();
	}, [id]);

	if (loading)
		return (
			<div className="p-10 text-center font-medium">
				Loading ride details...
			</div>
		);
	if (error)
		return (
			<div className="p-10 text-center text-red-500 font-medium">{error}</div>
		);
	if (!data) return null;

	const handleGoBack = () => window.location.replace('/history');

	return (
		<div className="min-h-screen bg-white md:bg-gray-50 font-sans text-gray-900">
			{/* --- HEADER --- */}
			<div className="bg-white px-6 py-5 flex items-center shadow-sm md:shadow-none mb-4 md:mb-0">
				<button
					onClick={handleGoBack}
					className="p-1 hover:bg-gray-100 rounded-full transition mr-4"
				>
					<ArrowLeft size={24} />
				</button>
				<h1 className="text-xl font-medium">Ride Details</h1>
			</div>

			<div className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
					{/* --- LEFT COLUMN: ROUTE & STATS --- */}
					<div className="md:col-span-2 space-y-6">
						{/* Status Banner */}
						<div className="bg-[#FF5500] rounded-2xl p-6 text-white relative overflow-hidden shadow-md">
							<div className="relative z-10 flex justify-between items-start">
								<div>
									<h2 className="text-base font-medium mb-2 opacity-90">
										{data.status}
									</h2>
									<div className="space-y-1">
										<div className="flex items-center gap-2 text-sm font-medium">
											<Calendar size={16} className="opacity-80" />
											<span>{data.date}</span>
										</div>
										<div className="flex items-center gap-2 text-sm font-medium">
											<Clock size={16} className="opacity-80" />
											<span>{data.timeRange}</span>
										</div>
									</div>
								</div>
								<span
									className={`text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
										data.paymentStatus === 'Paid'
											? 'bg-[#00C853]'
											: 'bg-orange-400'
									}`}
								>
									{data.paymentStatus}
								</span>
							</div>
							<div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
						</div>

						{/* Route Card */}
						<div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
							<div className="relative">
								<div className="absolute left-[7px] top-3 bottom-8 w-[2px] bg-gray-100"></div>
								<div className="absolute left-[16px] top-1/2 -translate-y-1/2">
									<span className="text-xs text-gray-400 font-bold bg-white py-1">
										{formatNum(data.distance)} km
									</span>
								</div>

								<div className="relative flex items-start mb-12">
									<div className="relative z-10 mt-1.5 w-4 h-4 rounded-full bg-orange-500 ring-4 ring-white"></div>
									<div className="ml-6">
										<span className="block text-xs font-bold text-gray-400 uppercase mb-1">
											From
										</span>
										<span className="text-lg font-semibold">
											{data.startLocation}
										</span>
									</div>
								</div>

								<div className="relative flex items-start">
									<div className="relative z-10 mt-1 w-4 h-4 flex items-center justify-center bg-white">
										<MapPin
											size={20}
											className="text-orange-500 fill-orange-500"
										/>
									</div>
									<div className="ml-6">
										<span className="block text-xs font-bold text-gray-400 uppercase mb-1">
											To
										</span>
										<span className="text-lg font-semibold">
											{data.endLocation}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Stats Grid */}
						<div className="grid grid-cols-2 gap-4">
							<StatCard
								icon={Timer}
								label="Duration"
								value={`${formatNum(data.duration)} min`}
							/>
							<StatCard
								icon={Zap}
								label="Avg Speed"
								value={`${formatNum(data.avgSpeed, 1)} km/h`}
							/>
							<StatCard
								icon={Battery}
								label="Battery Used"
								value={`${formatNum(data.batteryUsed, 0)}%`}
							/>
							<StatCard
								icon={Wallet}
								label="Total Cost"
								value={formatCurr(data.totalCost)}
							/>
						</div>
					</div>

					{/* --- RIGHT COLUMN: PAYMENT & SCOOTER --- */}
					<div className="md:col-span-1">
						<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
							<div className="mb-8">
								<h3 className="text-sm font-bold text-gray-900 mb-4">
									Payment Breakdown
								</h3>
								<div className="space-y-1">
									<BreakdownRow
										label="Base fare"
										value={formatCurr(data.breakdown.baseFare)}
									/>
									<BreakdownRow
										label={`Distance (${formatNum(data.distance)} km)`}
										value={formatCurr(data.breakdown.distanceFare)}
									/>
									<BreakdownRow
										label={`Time (${formatNum(data.duration)} min)`}
										value={formatCurr(data.breakdown.timeFare)}
									/>
									<BreakdownRow
										label="Total"
										value={formatCurr(data.totalCost)}
										isTotal
									/>
								</div>
							</div>

							<div className="mb-8">
								<h3 className="text-sm font-bold text-gray-900 mb-4">
									Scooter Information
								</h3>
								<div className="space-y-3 text-sm">
									<div className="flex justify-between">
										<span className="text-gray-500">Scooter ID</span>
										<span className="text-gray-900 font-medium">
											{data.scooter.id}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-500">Model</span>
										<span className="text-gray-900 font-medium">
											{data.scooter.model}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-500">Battery at End</span>
										<span className="text-gray-900 font-medium">
											{formatNum(data.scooter.batteryLevel, 0)}%
										</span>
									</div>
								</div>
							</div>

							<button className="w-full bg-[#FF5500] hover:bg-orange-700 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
								<span className="text-sm">Download Receipt</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

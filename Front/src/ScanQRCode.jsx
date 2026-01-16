import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { X, CameraOff, Loader2, QrCode } from 'lucide-react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL|| 'https://scoot-me-production.up.railway.app';

const ScanQRCode = () => {
	const navigate = useNavigate();
	const [hasPermission, setHasPermission] = useState(null);
	const [isVerifying, setIsVerifying] = useState(false);

	const scannerRef = useRef(null);
	const isProcessingRef = useRef(false);
	const memoizedScanner = useRef(null); // Persistent instance reference

	// 1. Reusable start function with better error handling
	const startScanner = async () => {
		try {
			// Ensure the element exists in the DOM
			const element = document.getElementById('reader');
			if (!element) return;

			// Create instance only if it doesn't exist
			if (!memoizedScanner.current) {
				memoizedScanner.current = new Html5Qrcode('reader');
			}

			const scanner = memoizedScanner.current;

			if (!scanner.isScanning) {
				await scanner.start(
					{ facingMode: 'environment' },
					{
						fps: 10,
						qrbox: { width: 220, height: 220 },
						aspectRatio: 1,
					},
					(decodedText) => {
						handleVerifyScooter(decodedText, scanner);
					},
					() => {} // frame catch
				);
				setHasPermission(true);
			}
		} catch (err) {
			console.error('Scanner Start Error:', err);
			setHasPermission(false);
		}
	};

	// 2. Initial Mount
	useEffect(() => {
		// Delay ensures React has painted the #reader div
		const timer = setTimeout(() => {
			startScanner();
		}, 300);

		return () => {
			clearTimeout(timer);
			if (memoizedScanner.current && memoizedScanner.current.isScanning) {
				memoizedScanner.current.stop().catch(console.error);
			}
		};
	}, []);

	const handleVerifyScooter = async (scooterId, scannerInstance) => {
		if (isProcessingRef.current || isVerifying) return;
		isProcessingRef.current = true;
		setIsVerifying(true);

		try {
			if (scannerInstance && scannerInstance.isScanning) {
				try {
					await scannerInstance.stop();
				} catch (e) {
					console.warn(e);
				}
			}

			const token = localStorage.getItem('token');
			const res = await axios.get(
				`${API_URL}/api/scooter/${scooterId.trim()}/verify`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			const tripId = res.data.tripId;

			if (tripId) {
				toast.success('Scooter Verified!');
				setTimeout(() => navigate(`/live-ride/${tripId}`), 1000);
			} else {
				throw new Error('Trip ID missing');
			}
		} catch (err) {
			console.error('Verification Error:', err);
			const errorMsg = err.response?.data?.message || 'Verification Failed';
			toast.error(errorMsg);

			// RESET AND RESTART
			setIsVerifying(false);
			isProcessingRef.current = false;

			setTimeout(() => {
				startScanner();
			}, 800); // Longer delay to allow camera hardware to "breathe"
		}
	};

	if (hasPermission === false) {
		return (
			<div className="h-screen w-screen bg-[#111827] flex flex-col items-center justify-center px-10 text-center text-white">
				<CameraOff color="#ef4444" size={48} className="mb-4" />
				<h2 className="text-xl font-bold">Camera Access Denied</h2>
				<button
					onClick={() => window.location.reload()}
					className="mt-8 text-orange-500 font-bold border-b border-orange-500 uppercase text-sm"
				>
					Try Again
				</button>
			</div>
		);
	}

	return (
		<div className="relative h-screen w-screen text-white bg-[#111827] overflow-hidden flex flex-col">
			<ToastContainer position="top-center" theme="dark" />

			<div className="pt-12 px-8 flex justify-between items-start relative z-20">
				<div>
					<h1 className="text-3xl font-serif">Verify Scooter</h1>
					<p className="text-gray-300 text-sm mt-1">
						Scan the code on the handle
					</p>
				</div>
				<button
					onClick={() => navigate(-1)}
					className="bg-white/10 p-2 rounded-full"
				>
					<X size={24} />
				</button>
			</div>

			<div className="flex-1 flex flex-col items-center justify-center relative z-10 -mt-20">
				<div className="relative w-64 h-64">
					<div className="absolute inset-0 rounded-[2.5rem] overflow-hidden bg-black z-0">
						{/* THE READER MUST BE PERSISTENT */}
						<div id="reader" className="w-full h-full"></div>
					</div>

					<div className="absolute inset-0 z-10 pointer-events-none rounded-[2.5rem] border-2 border-white/20">
						<div className="absolute -top-0.5 -left-0.5 w-12 h-12 border-t-4 border-l-4 border-orange-500 rounded-tl-[2rem]" />
						<div className="absolute -top-0.5 -right-0.5 w-12 h-12 border-t-4 border-r-4 border-orange-500 rounded-tr-[2rem]" />
						<div className="absolute -bottom-0.5 -left-0.5 w-12 h-12 border-b-4 border-l-4 border-orange-500 rounded-bl-[2rem]" />
						<div className="absolute -bottom-0.5 -right-0.5 w-12 h-12 border-b-4 border-r-4 border-orange-500 rounded-br-[2rem]" />

						<div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[2.5rem]">
							{!isVerifying && hasPermission !== null ? (
								<div className="w-full h-1 bg-orange-500 shadow-[0_0_20px_#f97316] animate-scan" />
							) : isVerifying ? (
								<div className="bg-black/60 backdrop-blur-md p-4 rounded-xl flex flex-col items-center">
									<Loader2
										className="animate-spin text-orange-500 mb-2"
										size={32}
									/>
									<span className="text-[10px] uppercase font-bold">
										Verifying
									</span>
								</div>
							) : null}
						</div>
					</div>
				</div>
			</div>

			<div className="p-8 pb-12 relative z-20">
				<div className="w-full bg-white/5 border border-white/10 py-4 rounded-2xl flex items-center justify-center gap-3">
					<QrCode size={20} className="text-orange-500" />
					<span className="font-semibold text-gray-300">
						Scanning Automatic...
					</span>
				</div>
			</div>

			<style>{`
                #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
                #reader__status_span, #reader img, #reader__dashboard { display: none !important; }
                #reader { border: none !important; }
                @keyframes scan {
                    0% { transform: translateY(-130px); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(130px); opacity: 0; }
                }
                .animate-scan { animation: scan 3s ease-in-out infinite; }
            `}</style>
		</div>
	);
};

export default ScanQRCode;

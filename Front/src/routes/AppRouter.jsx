import {
	createBrowserRouter,
	RouterProvider,
	Navigate,
	Outlet,
} from 'react-router-dom';

// Import your components
import App from '../App';
import Login from '../Login';
import Signup from '../Signup';
import History from '../History';
import ForgotPassword from '../ForgetPassword';
import BookRide from '../BookRide';
import Wallet from '../wallet';
import RideDetails from '../RideDetails';
import Profile from '../profile';
import ScooterMap from '../ScooterMap';
import LiveRide from '../LiveRide';
import ScanQRCode from '../ScanQRCode';

// 1. Internal ProtectedRoute Wrapper
// This checks for your auth token before rendering the requested page
const ProtectedRoute = () => {
	// Logic: Check if token exists in localStorage (or your preferred auth state)
	const isAuthenticated = !!localStorage.getItem('token');

	if (!isAuthenticated) {
		// Redirect to login, 'replace' prevents the back-button loop
		return <Navigate to="/login" replace />;
	}

	// If authenticated, 'Outlet' renders the specific child route
	return <Outlet />;
};

// 2. Router Configuration
const router = createBrowserRouter([
	// --- Public Routes ---
	{
		path: '/login',
		element: <Login />,
	},
	{
		path: '/signup',
		element: <Signup />,
	},
	{
		path: '/forget-password',
		element: <ForgotPassword />,
	},
	{
		path: '/',
		element: <App />,
	},

	// --- Protected Routes ---
	// These routes require a token to access
	{
		element: <ProtectedRoute />,
		children: [
			{ path: '/history', element: <History /> },
			{ path: '/book-ride', element: <BookRide /> },
			{ path: '/wallet', element: <Wallet /> },
			{ path: '/ride-details/:id', element: <RideDetails /> },
			{ path: '/profile', element: <Profile /> },
			{ path: '/map', element: <ScooterMap /> },
			{ path: '/scan', element: <ScanQRCode /> },
			{ path: '/live-ride/:tripId', element: <LiveRide /> },
		],
	},

	{
		path: '*',
		element: <Navigate to="/" replace />,
	},
]);

const AppRouter = () => {
	return <RouterProvider router={router} />;
};

export default AppRouter;

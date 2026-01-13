const axios = require('axios');

const getRouteInfo = async (start, end) => {
	const url = `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false`;

	const response = await axios.get(url);

	if (!response.data.routes.length) {
		throw new Error('Route not found');
	}

	const route = response.data.routes[0];

	return {
		distance: route.distance, // meters
		duration: route.duration, // seconds
	};
};

module.exports = { getRouteInfo };

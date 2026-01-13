exports.calculateCost = (
	startTime,
	{ baseFare = 5, ratePerMin = 0.5 } = {}
) => {
	if (!startTime) return baseFare;

	const now = new Date();
	const mins = Math.max(1, Math.ceil((now - new Date(startTime)) / 60000));

	return baseFare + mins * ratePerMin;
};

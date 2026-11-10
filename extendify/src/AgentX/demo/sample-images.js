// Flat stand-ins for the image sheet's demo states, so they load nothing.
const tile = (hue, shape) =>
	`data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="hsl(${hue} 45% 88%)"/>${
			shape % 2
				? `<circle cx="60" cy="60" r="30" fill="hsl(${hue} 55% 45%)"/>`
				: `<rect x="32" y="32" width="56" height="56" rx="10" fill="hsl(${hue} 55% 45%)"/>`
		}</svg>`,
	)}`;

export const sampleImages = (from, count = 9) =>
	Array.from({ length: count }, (_, index) => ({
		id: `${from}-${index}`,
		url: tile((index * 47 + from.length * 30) % 360, index),
		name: `Sample ${index + 1}`,
		width: 120,
		height: 120,
	}));

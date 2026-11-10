// A card still open when a message goes out keeps what the user landed on; the colors card adds its new color.
const landings = new Map();

export const landOnMove = (id, land) => {
	landings.set(id, land);
	return () => landings.delete(id);
};

export const landAll = async () => {
	for (const land of [...landings.values()]) await land().catch(() => {});
};

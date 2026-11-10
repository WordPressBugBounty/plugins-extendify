const KEY = 'extendify-agentx-hand-off';
export const HAND_OFF_PARAM = 'extendify-agent-retry';
// Older than this, the request was likely given up on.
const FRESH_MS = 10 * 60 * 1000;

// wp-admin can't make some changes, so its link to the site carries the request.
export const handOff = (text) => {
	try {
		window.sessionStorage.setItem(
			KEY,
			JSON.stringify({ text, at: Date.now() }),
		);
	} catch {
		// Blocked storage only loses the offer to send it again.
	}
};

// Read as the script loads, since the site's first page drops the param from the address bar.
const linked = new URLSearchParams(window.location.search).has(HAND_OFF_PARAM);

// Anything off, like no param, an old request or a malformed one, and it's ignored.
export const takeHandOff = () => {
	if (!linked) return null;
	try {
		const { text, at } = JSON.parse(window.sessionStorage.getItem(KEY)) ?? {};
		window.sessionStorage.removeItem(KEY);
		return typeof text === 'string' && text.trim() && Date.now() - at < FRESH_MS
			? text
			: null;
	} catch {
		return null;
	}
};

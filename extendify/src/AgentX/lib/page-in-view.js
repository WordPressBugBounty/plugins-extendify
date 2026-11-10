import { pageUrl } from '@agentx/lib/follow-site';
import { usePageStore } from '@agentx/state/page';

const described = (frame) => {
	try {
		const { extAgentXPage, location } = frame.contentWindow;
		if (!extAgentXPage) return undefined;
		return { ...extAgentXPage, path: new URL(pageUrl(location.href)).pathname };
	} catch {
		return undefined;
	}
};

const AGENT_MOVE_MS = 15000;
let agentMoveUntil = 0;

// The agent's own move to another page keeps the card it offers, which a move by the user clears.
export const expectAgentMove = () => {
	agentMoveUntil = Date.now() + AGENT_MOVE_MS;
};

export const watchPage = (frame) => {
	const update = () => {
		const page = described(frame);
		const moved = page?.path !== usePageStore.getState().page?.path;
		const byAgent = moved && Date.now() < agentMoveUntil;
		if (moved) agentMoveUntil = 0;
		usePageStore.setState({ page, byAgent });
	};
	frame.addEventListener('extendify-agentx-page', update);
	update();
	return () => frame.removeEventListener('extendify-agentx-page', update);
};

// Undefined in wp-admin, which has no site frame.
export const pageInView = () => usePageStore.getState().page;

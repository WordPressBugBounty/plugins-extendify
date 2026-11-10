import { useDraftStore } from '@agentx/state/draft';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

// The editor renews its lock about every minute; slower looks would trail someone leaving.
const LOOK_MS = 30000;

export const postShown = (frame) => {
	try {
		const found = frame.contentDocument?.body?.className.match(
			/\b(?:page-id|postid)-(\d+)\b/,
		);
		return found ? Number(found[1]) : null;
	} catch {
		return null;
	}
};

// Who else has the page shown in the site frame open in the editor; nothing for any other page.
export const watchPresence = (frame) => {
	const look = async () => {
		if (document.visibilityState !== 'visible') return;
		const post = postShown(frame);
		if (!post) {
			useDraftStore.setState({ presence: null });
			return;
		}
		try {
			const { presence } = await apiFetch({
				path: addQueryArgs('/extendify/v1/agentx/presence', { post }),
			});
			// The frame may have moved on while it was asked.
			if (postShown(frame) === post) useDraftStore.setState({ presence });
		} catch {}
	};
	// A new page starts from its head, before its body names a post.
	const forget = () => useDraftStore.setState({ presence: null });
	const timer = setInterval(look, LOOK_MS);
	frame.addEventListener('extendify-agentx-page', forget);
	frame.addEventListener('load', look);
	document.addEventListener('visibilitychange', look);
	look();
	return () => {
		clearInterval(timer);
		frame.removeEventListener('extendify-agentx-page', forget);
		frame.removeEventListener('load', look);
		document.removeEventListener('visibilitychange', look);
	};
};

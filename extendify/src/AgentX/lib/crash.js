import { track } from '@agentx/lib/track';
import { digest } from '@shared/api/digest';

// Details carry roles, part types and workflow names, never words anyone wrote.
export const reportCrash = (error, where, details = {}) => {
	try {
		track('chat-crashed', { where });
		digest({
			error,
			details: { source: 'agentx', caller: `crash:${where}`, ...details },
		});
	} catch {
		// Reporting runs inside the crash, so its own failure must not add to it.
	}
};

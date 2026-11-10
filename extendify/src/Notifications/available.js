import { safeParseJson } from '@shared/lib/parsing';
import { create } from 'zustand';

// A trigger reads live site state, so a save can falsify one or bring one back.
export const useAvailableStore = create(() => ({
	notifications: safeParseJson(window.extSharedData?.notifications, []),
}));

export const availableNotifications = () =>
	useAvailableStore.getState().notifications;

// Selection takes the first match, so the slugs in order are what can change a pick.
const picksFrom = (notifications) =>
	notifications.map((item) => item?.slug).join();

export const setAvailableNotifications = (notifications) => {
	// A response carrying no list must leave the page's own alone, not empty the slot.
	if (!Array.isArray(notifications)) return;
	// The same picks must not replace: that reveals the next one behind a dismissal.
	if (picksFrom(notifications) !== picksFrom(availableNotifications())) {
		useAvailableStore.setState({ notifications });
	}
};

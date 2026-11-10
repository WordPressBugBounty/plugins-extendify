import { availableNotifications } from './available';
import { ignoresDismissal } from './slots';
import { useNotificationsStore } from './state';

export const notificationFor = (
	slot,
	notifications = availableNotifications(),
) => {
	const { isDismissedBanner } = useNotificationsStore.getState();
	return (
		notifications.find(
			(item) =>
				(item?.slots ?? []).includes(slot) &&
				(ignoresDismissal(slot) || !isDismissedBanner(item.slug)),
		) ?? null
	);
};

import { Caught } from '@agentx/Caught';
import { useAvailableStore } from '@notifications/available';
import { Notification } from '@notifications/Notification';
import { notificationFor } from '@notifications/selection';
import { useNotificationsStore } from '@notifications/state';

const SLOT = 'frontend-bottom';

// The site frame draws no bottom bar, so the open agent shows it here instead.
export const useSlotNotification = () => {
	const { isDismissedBanner } = useNotificationsStore();
	const notifications = useAvailableStore((state) => state.notifications);
	const notification = notificationFor(SLOT, notifications);
	return Boolean(notification) && !isDismissedBanner(notification.slug);
};

export const SlotNotification = () => {
	const shows = useSlotNotification();
	if (!shows) return null;
	return (
		<div className="flex w-full *:flex *:flex-1">
			<Notification slot={SLOT} placement="slot" />
		</div>
	);
};

// The site frame loads no notification scripts.
export const SlotModal = () => (
	<Caught where="modal" silent>
		<Notification slot="frontend-modal" />
	</Caught>
);

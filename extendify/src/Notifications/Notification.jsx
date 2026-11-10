import { siteHost } from '@shared/lib/site-host';
import { track } from '@shared/lib/track';
import { useEffect, useState } from '@wordpress/element';
import { useAvailableStore } from './available';
import { resolveNotificationLink } from './notification-link';
import { notificationFor } from './selection';
import { fillsSlot, ignoresDismissal, templateFor } from './slots';
import { useNotificationsStore } from './state';

export const Notification = ({ slot, placement }) => {
	const {
		dismissBanner,
		isDismissedBanner,
		recordNotificationView,
		recordNotificationClick,
	} = useNotificationsStore();
	const Template = templateFor(slot);
	const notifications = useAvailableStore((state) => state.notifications);

	// Dismissing one must not reveal the next; a new list from the server must.
	const [notification, setNotification] = useState(() =>
		notificationFor(slot, notifications),
	);
	useEffect(() => {
		setNotification(notificationFor(slot, notifications));
	}, [slot, notifications]);

	const slug = notification?.slug;
	const source = notification?.source;
	const dismissible = notification?.dismissible ?? false;
	// Only wp-admin defines pagenow; frontend slots never mount there.
	const page =
		window.pagenow ?? (slot.startsWith('frontend-') ? 'frontend' : '');
	const { href, external } = resolveNotificationLink(notification, siteHost());
	const renders =
		Boolean(Template && notification) &&
		fillsSlot(slot, notification, href) &&
		(ignoresDismissal(slot) || !isDismissedBanner(slug));

	useEffect(() => {
		if (!renders || !slug) return;
		track('notification_view', { slug, slot, page, source });
		recordNotificationView(slug);
	}, [renders, slug, slot, page, source, recordNotificationView]);

	if (!renders) return null;

	const dismiss = () => {
		track('notification_dismiss', { slug, slot, page, source });
		dismissBanner(slug);
	};

	const click = () => {
		track('notification_click', { slug, slot, page, source });
		recordNotificationClick(slug);
	};

	return (
		<div className="extendify-shared">
			<Template
				notification={notification}
				href={href}
				external={external}
				dismissible={dismissible}
				onDismiss={dismiss}
				onClick={click}
				placement={placement}
			/>
		</div>
	);
};

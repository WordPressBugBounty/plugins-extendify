export const resolveNotificationLink = (notification, adminUrl = '') => {
	switch (notification['button-link-type']) {
		case 'external':
			return { href: notification['button-link-external'], external: true };
		case 'plugin': {
			const slug = notification['button-link-plugin-slug'];
			return {
				href: slug
					? `${adminUrl}plugin-install.php?tab=search&s=${encodeURIComponent(slug)}`
					: undefined,
			};
		}
		default:
			return { href: notification['button-link-internal'] };
	}
};

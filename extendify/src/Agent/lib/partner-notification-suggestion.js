import { resolveNotificationLink } from '@partner-notification/partner-notification-link';
import { safeParseJson } from '@shared/lib/parsing';

export const AI_AGENT_FOLLOW_UP_SLOT = 'ai-agent-follow-up';

export const partnerNotificationSuggestion = () => {
	const adminUrl = window.extSharedData?.adminUrl ?? '';
	const notifications = safeParseJson(
		window.extSharedData?.partnerNotifications,
		[],
	);
	const notification = notifications.find((item) =>
		item?.slots?.includes(AI_AGENT_FOLLOW_UP_SLOT),
	);
	if (!notification) return null;

	const message = notification['content-agent-followup'];
	const { href } = resolveNotificationLink(notification, adminUrl);
	if (!message || !href) return null;

	const slug = notification.slug;
	const linkType = notification['button-link-type'];

	return {
		id: `partner-notification-${slug}`,
		type: 'external-link',
		message,
		url: href,
		viewTelemetry: {
			key: 'partner_notification_view',
			payload: { slug, slot: AI_AGENT_FOLLOW_UP_SLOT, linkType },
		},
		telemetry: {
			key: 'partner_notification_click',
			payload: { slug, slot: AI_AGENT_FOLLOW_UP_SLOT, linkType },
		},
	};
};

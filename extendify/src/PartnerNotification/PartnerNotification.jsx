import { safeParseJson } from '@shared/lib/parsing';
import { track } from '@shared/lib/track';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { close, Icon } from '@wordpress/icons';
import { useNotificationsStore } from './notifications';
import { resolveNotificationLink } from './partner-notification-link';

export const COLOR_DEFAULTS = {
	'color-background': '#ffffff',
	'color-border': '#d1d5db',
	'color-text': '#1e1e1e',
	'color-button-background': '#1e1e1e',
	'color-button-text': '#ffffff',
	'color-button-hover-background': '#000000',
	'color-button-hover-text': '#ffffff',
	'color-button-close-background': '#f3f4f6',
	'color-button-close-text': '#1e1e1e',
	'color-button-close-hover-background': '#d1d5db',
	'color-button-close-hover-text': '#1e1e1e',
};

const CSS_VARS = {
	'color-background': '--ext-pn-bg',
	'color-border': '--ext-pn-border',
	'color-text': '--ext-pn-text',
	'color-button-background': '--ext-pn-btn-bg',
	'color-button-text': '--ext-pn-btn-text',
	'color-button-hover-background': '--ext-pn-btn-hover-bg',
	'color-button-hover-text': '--ext-pn-btn-hover-text',
	'color-button-close-background': '--ext-pn-close-bg',
	'color-button-close-text': '--ext-pn-close-icon',
	'color-button-close-hover-background': '--ext-pn-close-hover-bg',
	'color-button-close-hover-text': '--ext-pn-close-hover-icon',
};

const colorStyle = (notification) =>
	Object.fromEntries(
		Object.entries(CSS_VARS).map(([field, cssVar]) => [
			cssVar,
			notification[field] || COLOR_DEFAULTS[field],
		]),
	);

export const PartnerNotification = ({ slot }) => {
	const {
		dismissBanner,
		isDismissedBanner,
		hasViewedNotification,
		recordNotificationView,
	} = useNotificationsStore();
	const adminUrl = window.extSharedData?.adminUrl ?? '';

	const notifications = safeParseJson(
		window.extSharedData?.partnerNotifications,
		[],
	);
	// Frozen at mount so dismissing doesn't reveal the next notification until reload.
	const [notification] = useState(() =>
		notifications.find(
			(item) => item?.slots?.includes(slot) && !isDismissedBanner(item.slug),
		),
	);

	const slug = notification?.slug;
	const page = window.pagenow ?? '';
	useEffect(() => {
		if (!slug) return;
		if (hasViewedNotification(slug, slot, page)) return;
		track('partner_notification_view', { slug, slot, page });
		recordNotificationView(slug, slot, page);
	}, [slug, slot, page, hasViewedNotification, recordNotificationView]);

	if (!notification || isDismissedBanner(slug)) return null;

	const { title, content, image } = notification;
	const buttonLabel = notification['button-label'];
	const linkType = notification['button-link-type'];
	const { href, external } = resolveNotificationLink(notification, adminUrl);

	const dismiss = () => {
		track('partner_notification_dismiss', { slug, slot, page });
		dismissBanner(slug);
	};

	return (
		<div className="extendify-shared">
			<div
				style={colorStyle(notification)}
				className="relative h-full min-h-32 w-full rounded-sm border bg-(--ext-pn-bg) px-5 py-5 text-base text-(--ext-pn-text) lg:px-8 lg:py-6 border-(--ext-pn-border)"
				data-test="assist-partner-notification"
			>
				<button
					type="button"
					aria-label={__('Dismiss notification', 'extendify-local')}
					onClick={dismiss}
					className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-bl rounded-se text-center p-1.5 rtl:left-0 rtl:right-auto rtl:rounded-bl-none rtl:rounded-br bg-(--ext-pn-close-bg) text-(--ext-pn-close-icon) hover:bg-(--ext-pn-close-hover-bg) hover:text-(--ext-pn-close-hover-icon)"
				>
					<Icon icon={close} size={32} className="fill-current" />
				</button>
				<div className="flex flex-col items-start gap-4">
					{image && (
						<img src={image} alt="" className="max-h-8 w-auto rounded-xs" />
					)}
					<div>
						<div className="text-lg font-semibold">{title}</div>
						<div className="mt-1 text-sm">{content}</div>
					</div>
					{buttonLabel && href && (
						<a
							href={href}
							target={external ? '_blank' : undefined}
							rel={external ? 'noreferrer' : undefined}
							onClick={() =>
								track('partner_notification_click', {
									slug,
									slot,
									linkType,
									page,
								})
							}
							className="inline-flex h-10 cursor-pointer items-center rounded-xs px-4 text-sm no-underline bg-(--ext-pn-btn-bg) text-(--ext-pn-btn-text) hover:bg-(--ext-pn-btn-hover-bg) hover:text-(--ext-pn-btn-hover-text)"
						>
							{buttonLabel}
						</a>
					)}
				</div>
			</div>
		</div>
	);
};

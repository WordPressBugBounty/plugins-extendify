import { Icon } from '@wordpress/icons';
import { iconFor } from '../icons';
import { externalLinkProps } from '../notification-link';

export const Pill = ({ notification, href, external, onClick }) => {
	const ctaLabel = notification['cta-label'];
	const icon = iconFor(notification.icon);

	return (
		<a
			href={href}
			{...externalLinkProps(external)}
			onClick={onClick}
			// Without this the pill has no accessible name where CSS hides the label.
			aria-label={ctaLabel}
			// Core's admin bar is taller below the md breakpoint; the pill matches it.
			className="inline-flex h-7.5 shrink-0 cursor-pointer items-center gap-1 rounded-sm bg-banner-main px-2.5 text-sm leading-none text-banner-text no-underline hover:opacity-90 md:h-6 md:text-[13px]"
			data-test="notification-pill"
		>
			{icon && <Icon icon={icon} size={16} className="fill-current" />}
			<span className="ext-notification-pill-label">{ctaLabel}</span>
		</a>
	);
};

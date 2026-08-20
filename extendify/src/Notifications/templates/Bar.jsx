import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import { DismissButton } from '../DismissButton';
import { iconFor } from '../icons';
import { externalLinkProps } from '../notification-link';

export const Bar = ({ notification, href, external, onDismiss, onClick }) => {
	const { title, content } = notification;
	const ctaLabel = notification['cta-label'];
	const icon = iconFor(notification.icon);

	return (
		<aside
			aria-label={
				// translators: label for the bar reporting whether the site is public.
				__('Site status', 'extendify-local')
			}
			// Below core's admin-bar breakpoint a full-width banner covers the content it reports on.
			className="fixed bottom-0 left-0 right-0 z-high-1 hidden items-center gap-4 bg-design-main px-5 py-3.5 text-base text-design-text md:flex [body:has(#extendify-agent-chat)_&]:ml-96"
			data-test="notification-bar"
		>
			{icon && (
				<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-banner-main text-banner-text">
					<Icon icon={icon} size={24} className="fill-current" />
				</span>
			)}
			<div className="min-w-0 flex-1">
				<div className="text-[15px] font-bold">{title}</div>
				<div className="mt-0.5 text-[13px]">{content}</div>
			</div>
			{ctaLabel && href && (
				<a
					href={href}
					{...externalLinkProps(external)}
					onClick={onClick}
					className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-md bg-banner-main px-5 text-sm font-medium text-banner-text no-underline hover:opacity-90"
				>
					{ctaLabel}
				</a>
			)}
			<DismissButton
				onClick={onDismiss}
				size={24}
				className="flex size-8 shrink-0 items-center justify-center rounded-xs text-design-text hover:opacity-80"
			/>
		</aside>
	);
};

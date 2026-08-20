import { DismissButton } from '../DismissButton';
import { externalLinkProps } from '../notification-link';

export const Card = ({ notification, href, external, onDismiss, onClick }) => {
	const { title, content, image } = notification;
	const ctaLabel = notification['cta-label'];

	return (
		<div
			className="relative h-full min-h-32 w-full rounded-sm border border-[#d1d5db] bg-white px-5 py-5 text-base text-gray-900 lg:px-8 lg:py-6"
			data-test="notification-card"
		>
			<DismissButton
				onClick={onDismiss}
				size={32}
				className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-bl rounded-se bg-[#f3f4f6] p-1.5 text-center text-gray-900 hover:bg-[#d1d5db] rtl:left-0 rtl:right-auto rtl:rounded-bl-none rtl:rounded-br"
			/>
			<div className="flex flex-col items-start gap-4">
				{image && (
					<img src={image} alt="" className="max-h-8 w-auto rounded-xs" />
				)}
				<div>
					<div className="text-lg font-semibold">{title}</div>
					<div className="mt-1 text-sm">{content}</div>
				</div>
				{ctaLabel && href && (
					<a
						href={href}
						{...externalLinkProps(external)}
						onClick={onClick}
						className="inline-flex h-10 cursor-pointer items-center rounded-xs bg-design-main px-4 text-sm text-design-text no-underline hover:opacity-90"
					>
						{ctaLabel}
					</a>
				)}
			</div>
		</div>
	);
};

import { designLogo } from '@agentx/lib/design-logos';
// Its controls sit 3px inside the border, so its corner is theirs plus 3px and the border's width.
// Any color can sit behind its buttons, so their focus ring takes the bar's own color.
export const BrandBar = ({ className = '', children, ...props }) => (
	<div
		{...props}
		className={`flex min-w-0 items-center gap-2 rounded-agentx-brand border-(length:--agentx-brand-border-width) border-solid border-agentx-brand-border bg-agentx-brand py-[3px] px-agentx-brand-inset text-agentx-brand-ink shadow-(--agentx-brand-shadow) [--color-agentx-focus:var(--color-agentx-brand-focus)] ${className}`}
	>
		{children}
	</div>
);

export const PartnerLogo = ({ fallback = null }) => {
	const { partnerName } = window.extSharedData ?? {};
	const partnerLogo =
		designLogo('primary') || window.extSharedData?.partnerLogo;
	if (!partnerLogo) {
		const name = partnerName || fallback;
		return name ? (
			<span className="truncate text-agentx-brand-name font-agentx-brand-name">
				{name}
			</span>
		) : null;
	}
	return (
		<img
			data-agentx-logo
			src={partnerLogo}
			alt={partnerName ?? ''}
			draggable={false}
			className="block h-agentx-logo max-w-agentx-logo-width shrink-0 object-contain"
		/>
	);
};

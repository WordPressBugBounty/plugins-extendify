import { BrandBar } from '@agentx/PartnerLogo';

export const SiteBar = ({ brand, chatToggle, bell, toolbar }) => (
	<div className="flex h-10 shrink-0 items-center gap-2">
		<span className="flex shrink-0 items-center gap-1">
			{chatToggle}
			{bell}
		</span>
		{brand && <BrandBar data-agentx-brand>{brand}</BrandBar>}
		<div className="ms-auto flex min-w-0 items-center justify-end gap-1">
			{toolbar}
		</div>
	</div>
);

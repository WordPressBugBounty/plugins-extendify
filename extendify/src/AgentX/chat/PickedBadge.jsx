import { check, Icon } from '@wordpress/icons';

// The white rim keeps it visible on a blue or dark option.
export const PickedBadge = ({ className = 'end-1 top-1' }) => (
	<span
		aria-hidden="true"
		className={`pointer-events-none absolute flex size-5 items-center justify-center rounded-full bg-agentx-picked text-agentx-picked-ink ring-2 ring-agentx-picked-rim shadow-(--agentx-picked-shadow) ${className}`}
	>
		<Icon icon={check} size={16} className="fill-current" />
	</span>
);

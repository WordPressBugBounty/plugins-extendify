import { useStatusStore } from '@agentx/state/status';
import { __ } from '@wordpress/i18n';

export const thinking = () =>
	// translators: Shown in the AI Agent's chat while it starts working on the user's message.
	__('Thinking', 'extendify-local');

// A running step's label is a span, since a status region inside the steps' toggle drops out of its name.
export const StatusLine = ({
	text,
	as: Tag = 'output',
	className = 'block text-agentx-body',
}) => {
	const status = useStatusStore((state) => state.text);

	return (
		<Tag
			className={`w-fit animate-agentx-shimmer bg-[linear-gradient(90deg,var(--color-agentx-status)_40%,var(--color-agentx-shimmer)_50%,var(--color-agentx-status)_60%)] bg-size-[200%_100%] bg-clip-text text-transparent motion-reduce:animate-none ${className}`}
		>
			{text ?? status ?? thinking()}
		</Tag>
	);
};

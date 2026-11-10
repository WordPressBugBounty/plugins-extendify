import { PRESS } from '@agentx/chat/styles';
import { Tooltip } from '@agentx/Tooltip';
import { useLayoutEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { arrowUp, closeSmall, Icon } from '@wordpress/icons';

const BUTTON = `agentx-focus inline-flex h-5 items-center justify-center gap-0.5 rounded-agentx-control border-0 bg-transparent p-0 text-agentx-caption text-agentx-queued-action ${PRESS} enabled:hover:text-agentx-queued-action-hover disabled:opacity-[var(--agentx-disabled-opacity,60%)]`;

export const QueuedMessage = ({
	text,
	disabled,
	onSend,
	onDelete,
	onLeave,
}) => {
	const section = useRef(null);

	// It leaves on its own when it sends, and focus inside would fall to the page.
	const leave = useRef(onLeave);
	leave.current = onLeave;
	useLayoutEffect(
		() => () => {
			if (section.current?.contains(document.activeElement)) leave.current?.();
		},
		[],
	);

	return (
		<section
			ref={section}
			aria-label={
				// translators: Names the message the user typed while the AI Agent was working, which waits above the chat box until the agent is done.
				__('Queued message', 'extendify-local')
			}
			className="group flex max-w-[85%] flex-col items-end gap-1 self-end"
		>
			<p className="m-0 max-h-[5lh] overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere] rounded-agentx-queued border border-agentx-queued-border bg-agentx-queued px-3 py-2 text-agentx-message text-agentx-queued-ink">
				{text}
			</p>
			<div className="flex items-center gap-2">
				<Tooltip text={__('Delete', 'extendify-local')}>
					<button
						type="button"
						disabled={disabled}
						onClick={onDelete}
						aria-label={
							// translators: Button on the user's queued message in the AI Agent's chat. It takes the message out of the queue and puts its text back in the chat box.
							__('Delete', 'extendify-local')
						}
						// Shown on hover or focus; a touch screen has no hover, so it always shows there.
						className={`${BUTTON} w-5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100`}
					>
						<Icon icon={closeSmall} size={18} className="fill-current" />
					</button>
				</Tooltip>
				<button
					type="button"
					disabled={disabled}
					onClick={onSend}
					className={BUTTON}
				>
					<Icon icon={arrowUp} size={14} className="fill-current" />
					{
						// translators: Button on the message the user typed while the AI Agent works. It stops the agent and sends the message at once.
						__('Send now', 'extendify-local')
					}
				</button>
			</div>
		</section>
	);
};

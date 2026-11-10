import { CardBadge } from '@agentx/chat/CardBadge';
import { CARD_PRIMARY, CARD_SHAPE, OUTLINED } from '@agentx/chat/styles';
import { WithSwatches } from '@agentx/chat/swatches';
import { __ } from '@wordpress/i18n';

// The agent's line says why; the card says in a sentence what's still open, and its button asks for it.
export const RowCard = ({
	name,
	text,
	icon,
	logo,
	action,
	dismiss,
	tone,
	onAct,
	onDismiss,
	...rest
}) => (
	<section
		aria-label={name ?? text}
		className={`flex max-w-agentx-card flex-col gap-3 ${CARD_SHAPE} ${tone}`}
		{...rest}
	>
		<div className="flex min-w-0 items-start gap-3">
			<CardBadge icon={icon} logo={logo} />
			<p className="m-0 min-w-0 flex-1 break-words">
				<WithSwatches text={text} />
			</p>
		</div>
		<div className="flex items-center justify-end gap-2">
			<button type="button" onClick={onDismiss} className={OUTLINED}>
				<span>
					{dismiss ??
						// translators: Button on the AI Agent's card for the step it suggests next: hides the card for now.
						__('Not now', 'extendify-local')}
				</span>
			</button>
			<button type="button" onClick={onAct} className={CARD_PRIMARY}>
				<span>{action}</span>
			</button>
		</div>
	</section>
);

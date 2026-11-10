import { ROW_CARD_SHAPE } from '@agentx/chat/styles';
import { Tooltip } from '@agentx/Tooltip';
import { __ } from '@wordpress/i18n';
import { closeSmall, external, Icon } from '@wordpress/icons';

const ACTION =
	'agentx-focus flex min-w-0 flex-1 items-center gap-1.5 rounded-agentx-control px-2.5 py-1.5 font-agentx-button leading-snug break-words text-agentx-nudge-card-ink no-underline hover:bg-agentx-nudge-card-hover';

export const Nudge = ({ nudge, onAct, onDismiss }) => (
	<section
		// translators: Screen reader name for the suggestion card the AI Agent shows in its chat after a reply.
		aria-label={__('Suggestion', 'extendify-local')}
		className={`flex items-center gap-1 ${ROW_CARD_SHAPE} border-agentx-nudge-card-border bg-agentx-nudge-card text-agentx-nudge-card-ink`}
	>
		{nudge.type === 'request' ? (
			<button
				type="button"
				onClick={onAct}
				className={`${ACTION} border-0 bg-transparent text-start`}
			>
				<span className="min-w-0">{nudge.text}</span>
			</button>
		) : (
			<a
				href={nudge.details.url}
				target="_blank"
				rel="noopener noreferrer"
				onClick={onAct}
				className={ACTION}
			>
				<span className="min-w-0">{nudge.text}</span>
				<Icon icon={external} size={16} className="shrink-0 fill-current" />
			</a>
		)}
		<Tooltip text={__('Dismiss', 'extendify-local')}>
			<button
				type="button"
				onClick={onDismiss}
				// translators: Closes the suggestion card in the AI Agent's chat, so it doesn't show again.
				aria-label={__('Dismiss', 'extendify-local')}
				className="agentx-focus flex size-8 shrink-0 items-center justify-center rounded-agentx-control border-0 bg-transparent p-0 text-agentx-notice-close transition-transform hover:bg-agentx-nudge-card-hover hover:text-agentx-notice-ink active:scale-[calc(var(--agentx-press-scale)-0.02)]"
			>
				<Icon icon={closeSmall} size={24} className="fill-current" />
			</button>
		</Tooltip>
	</section>
);

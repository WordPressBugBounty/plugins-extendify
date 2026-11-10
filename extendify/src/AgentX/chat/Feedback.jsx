import { NOTICE_TITLE_500, PRESS, ROW_CARD_SHAPE } from '@agentx/chat/styles';
import { Tooltip } from '@agentx/Tooltip';
import { flushSync } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { closeSmall, Icon, thumbsDown, thumbsUp } from '@wordpress/icons';

const ICON_BUTTON = `agentx-focus flex size-8 shrink-0 items-center justify-center rounded-agentx-control border-0 bg-transparent p-0 text-agentx-notice-close ${PRESS} hover:bg-agentx-hover hover:text-agentx-notice-ink`;

export const Feedback = ({ rated, openerRef, onRate, onOpen, onDismiss }) => {
	// The thumbs leave once rated, and focus would fall to the page.
	const rate = (rating) => {
		flushSync(() => onRate(rating));
		openerRef.current?.focus();
	};
	return (
		<section
			// translators: Screen reader name for the card in the AI Agent's chat that asks the user to rate the agent's recent help.
			aria-label={__('Feedback', 'extendify-local')}
			className={`flex items-center gap-1 text-agentx-feedback-card-ink ${ROW_CARD_SHAPE} border-agentx-feedback-card-border bg-agentx-feedback-card`}
		>
			<p
				className={`m-0 min-w-0 flex-1 py-1.5 ps-[5px] pe-2.5 ${NOTICE_TITLE_500} leading-snug break-words`}
			>
				{rated
					? // translators: Shown on the AI Agent's feedback card after the user rated the agent, inviting them to add a written comment.
						__('Anything else to share?', 'extendify-local')
					: // translators: Asks the user to rate the AI Agent's recent help, on a card in the agent's chat with thumbs up and thumbs down buttons.
						__('How is the AI Agent doing?', 'extendify-local')}
			</p>
			{rated ? (
				<button
					ref={openerRef}
					type="button"
					onClick={onOpen}
					className={`agentx-focus shrink-0 rounded-agentx-control border border-solid border-agentx-button-border bg-agentx-button px-3 py-[5px] text-agentx-body font-agentx-button text-agentx-button-ink ${PRESS} hover:bg-agentx-button-hover`}
				>
					{
						// translators: Button on the AI Agent's feedback card that opens a text field for a written comment about the agent's help.
						__('Add a comment', 'extendify-local')
					}
				</button>
			) : (
				<>
					<Tooltip text={__('Good', 'extendify-local')}>
						<button
							type="button"
							onClick={() => rate(1)}
							// translators: Screen reader name for the thumbs up button that rates the AI Agent's recent help as good.
							aria-label={__('Good', 'extendify-local')}
							className={ICON_BUTTON}
						>
							<Icon icon={thumbsUp} size={20} className="fill-current" />
						</button>
					</Tooltip>
					<Tooltip text={__('Not good', 'extendify-local')}>
						<button
							type="button"
							onClick={() => rate(0)}
							// translators: Screen reader name for the thumbs down button that rates the AI Agent's recent help as not good.
							aria-label={__('Not good', 'extendify-local')}
							className={ICON_BUTTON}
						>
							<Icon icon={thumbsDown} size={20} className="fill-current" />
						</button>
					</Tooltip>
				</>
			)}
			<Tooltip text={__('Dismiss', 'extendify-local')}>
				<button
					type="button"
					onClick={onDismiss}
					// translators: Closes the AI Agent's feedback card, so it doesn't ask again for now.
					aria-label={__('Dismiss', 'extendify-local')}
					className={ICON_BUTTON}
				>
					<Icon icon={closeSmall} size={24} className="fill-current" />
				</button>
			</Tooltip>
		</section>
	);
};

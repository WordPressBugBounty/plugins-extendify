import {
	CARD_PRIMARY,
	CARD_SHAPE,
	CLOSE,
	IN_CARD_CORNER,
} from '@agentx/chat/styles';
import { Tooltip } from '@agentx/Tooltip';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { closeSmall, Icon } from '@wordpress/icons';

export const ReportNote = ({ demo, onSend, onClose }) => {
	const field = useRef(null);
	const [comment, setComment] = useState('');
	const empty = !comment.trim();

	useEffect(() => {
		// A demo state leaves focus on the dev tool, where the arrow keys step through the states.
		if (demo) return;
		field.current?.focus({ preventScroll: true });
	}, []);

	return (
		<section
			onKeyDown={(event) => {
				if (event.key !== 'Escape') return;
				event.preventDefault();
				onClose();
			}}
			// translators: Screen reader name for the card in the AI Agent's chat where the user can add a note to the problem report they just sent.
			aria-label={__('Your report', 'extendify-local')}
			className={`relative flex flex-col gap-2 ${CARD_SHAPE} border-agentx-report-card-border bg-agentx-report-card text-agentx-report-card-ink`}
		>
			<p className="m-0 min-w-0 break-words pe-8">
				{
					// translators: Shown in the AI Agent's chat over the field where the user can add anything else to the problem report they just sent.
					__('Any additional feedback to share?', 'extendify-local')
				}
			</p>
			<Tooltip text={__('Close', 'extendify-local')} className={IN_CARD_CORNER}>
				<button
					type="button"
					onClick={onClose}
					// translators: Screen reader name for the X button that closes the AI Agent's card for adding a note to a problem report; the report itself was already sent.
					aria-label={__('Close', 'extendify-local')}
					className={CLOSE}
				>
					<Icon icon={closeSmall} size={24} className="fill-current" />
				</button>
			</Tooltip>
			<textarea
				ref={field}
				value={comment}
				onChange={(event) => setComment(event.target.value)}
				rows={3}
				// translators: Screen reader name for the field where the user describes what went wrong, added to the problem report they sent from the AI Agent's chat.
				aria-label={__('What happened?', 'extendify-local')}
				className="agentx-focus-inset resize-none rounded-agentx-control border border-agentx-field-border bg-agentx-field px-3 py-2 text-agentx-notice-body text-agentx-ink"
			/>
			<div className="flex justify-end">
				<button
					type="button"
					onClick={() => !empty && onSend(comment.trim())}
					aria-disabled={empty}
					className={CARD_PRIMARY}
				>
					{
						// translators: Button that adds the user's note to the problem report they sent from the AI Agent's chat.
						__('Send', 'extendify-local')
					}
				</button>
			</div>
		</section>
	);
};

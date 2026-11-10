import { Sheet } from '@agentx/chat/Sheet';
import { SHEET_PRIMARY } from '@agentx/chat/styles';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export const FeedbackSheet = ({ demo, onSend, onClose }) => {
	const sheet = useRef(null);
	const field = useRef(null);
	const [comment, setComment] = useState('');
	const empty = !comment.trim();

	useEffect(() => {
		// A demo state leaves focus on the dev tool, where the arrow keys step through the states.
		if (demo) return;
		field.current?.focus({ preventScroll: true });
	}, []);

	return (
		<Sheet
			sheet={sheet}
			title={
				// translators: Heading of the AI Agent's sheet where the user writes a comment about the agent's help.
				__('Share feedback', 'extendify-local')
			}
			closeLabel={
				// translators: Closes the AI Agent's feedback sheet without sending the comment.
				__('Close', 'extendify-local')
			}
			onClose={onClose}
		>
			<div className="flex flex-col gap-3 px-4 pb-4">
				<textarea
					ref={field}
					value={comment}
					onChange={(event) => setComment(event.target.value)}
					rows={4}
					// translators: Screen reader name for the field where the user writes a comment about the AI Agent's help.
					aria-label={__('Your feedback', 'extendify-local')}
					className="agentx-focus-inset resize-none rounded-agentx-control border border-agentx-sheet-field-border bg-agentx-sheet-field px-3 py-2 text-agentx-body text-agentx-sheet-field-ink"
				/>
				<div className="flex justify-end">
					<button
						type="button"
						onClick={() => !empty && onSend(comment.trim())}
						aria-disabled={empty}
						className={SHEET_PRIMARY}
					>
						{
							// translators: Button in the AI Agent's feedback sheet that sends the user's written comment about the agent's help.
							__('Send', 'extendify-local')
						}
					</button>
				</div>
			</div>
		</Sheet>
	);
};

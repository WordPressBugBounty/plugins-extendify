import { CARD_PRIMARY } from '@agentx/chat/styles';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Every card that asks takes the user's own words as its answer.
export const TypedAnswer = ({ onAnswer, busy, placeholder }) => {
	const [own, setOwn] = useState('');
	const text = own.trim();

	const send = () => {
		if (text && !busy) onAnswer(text);
	};

	// Not a form: some cards it sits in are forms already.
	return (
		<div className="flex gap-2">
			<input
				value={own}
				onChange={(event) => setOwn(event.target.value)}
				onKeyDown={(event) => {
					if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
					event.preventDefault();
					send();
				}}
				disabled={busy}
				placeholder={
					placeholder ??
					// translators: Placeholder in the field at the bottom of an AI Agent card that asks a question or offers choices, where the user can write their own answer.
					__('Or type your own', 'extendify-local')
				}
				aria-label={
					// translators: Screen reader name for the field on an AI Agent card where the user writes their own answer to its question.
					__('Your own', 'extendify-local')
				}
				className="agentx-focus h-8 min-w-0 flex-1 rounded-agentx-control border border-agentx-field-border bg-agentx-field px-3 text-agentx-notice-body text-agentx-ink"
			/>
			<button
				type="button"
				onClick={send}
				disabled={busy || !text}
				className={CARD_PRIMARY}
			>
				<span>
					{
						// translators: Button that sends the answer the user typed on an AI Agent card that asks a question or offers choices.
						__('Send', 'extendify-local')
					}
				</span>
			</button>
		</div>
	);
};

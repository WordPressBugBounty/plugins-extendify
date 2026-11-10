import {
	CARD_PRIMARY,
	CARD_SHAPE,
	CLOSE,
	IN_CARD_CORNER,
	NOTICE_TITLE,
	OPTION,
} from '@agentx/chat/styles';
import { WithSwatches } from '@agentx/chat/swatches';
import { useCardKeys } from '@agentx/lib/keyboard';
import { hidePart, showPart } from '@agentx/lib/part-preview';
import { Tooltip } from '@agentx/Tooltip';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { closeSmall, Icon } from '@wordpress/icons';

// More answers than this crowd the card; the user's own field takes the rest.
const MOST_OPTIONS = 4;
// Parts of the page outline as the user points at each, so a card naming them holds more.
const MOST_PARTS = 8;

// Options plus a field; the tool that drew it decides what an answer does.
export const QuestionCard = ({
	question,
	options,
	// Each answer's part of the page, by block id, outlined while the user points at it.
	blocks = [],
	submitLabel,
	failedText,
	onAnswer,
	onClose,
	demo,
}) => {
	const keys = useCardKeys(demo);
	const [own, setOwn] = useState('');
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);

	const shows = blocks.length > 0;
	// The outline would stay on the page once the card is answered or closed.
	useEffect(() => (shows ? hidePart : undefined), [shows]);

	const choose = async (value) => {
		setBusy(true);
		setFailed(false);
		try {
			await onAnswer(value);
		} catch {
			setFailed(true);
			setBusy(false);
		}
	};

	return (
		<form
			{...keys}
			onSubmit={(event) => {
				event.preventDefault();
				if (own.trim()) choose(own.trim());
			}}
			className={`agentx-focus relative m-0 ${CARD_SHAPE} border-agentx-question-card-border bg-agentx-question-card text-agentx-question-card-ink`}
		>
			<fieldset
				disabled={busy}
				aria-label={question}
				className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0"
			>
				{question && (
					<p className={`m-0 ${NOTICE_TITLE} ${onClose ? 'pe-5' : ''}`}>
						<WithSwatches text={question} />
					</p>
				)}
				{shows && (
					<p className="m-0 text-agentx-caption text-agentx-notice-muted [@media(hover:none)]:hidden">
						{
							// translators: A hint on the AI Agent's card asking which part of the page the user means; pointing at an answer outlines that part on the page.
							__('Hover an answer to see it on the page.', 'extendify-local')
						}
					</p>
				)}
				{options
					.slice(0, blocks.length ? MOST_PARTS : MOST_OPTIONS)
					.map((option, at) => (
						<button
							key={option.title ?? option}
							type="button"
							onClick={() => choose(option)}
							{...(blocks[at] && {
								onMouseEnter: () => showPart(blocks[at]),
								onMouseLeave: hidePart,
								onFocus: () => showPart(blocks[at]),
								onBlur: hidePart,
							})}
							className={OPTION}
						>
							<WithSwatches text={option.title ?? option} />
							{option.description && (
								<span className="block font-normal opacity-80">
									{option.description}
								</span>
							)}
						</button>
					))}
				<div className="flex gap-2">
					<input
						value={own}
						onChange={(event) => setOwn(event.target.value)}
						placeholder={
							// translators: Placeholder in the field under the options on the AI Agent's question card, where the user can write their own answer.
							__('Or type your own', 'extendify-local')
						}
						aria-label={
							// translators: Screen reader name for the field on the AI Agent's question card where the user writes their own answer.
							__('Your own', 'extendify-local')
						}
						className="agentx-focus h-8 min-w-0 flex-1 rounded-agentx-control border border-agentx-field-border bg-agentx-field px-3 text-agentx-notice-body text-agentx-ink"
					/>
					<button type="submit" disabled={!own.trim()} className={CARD_PRIMARY}>
						{submitLabel}
					</button>
				</div>
			</fieldset>
			{onClose && (
				<Tooltip
					text={__('Close', 'extendify-local')}
					className={IN_CARD_CORNER}
				>
					<button
						type="button"
						onClick={onClose}
						disabled={busy}
						aria-label={
							// translators: Closes the AI Agent's question card without answering it.
							__('Close', 'extendify-local')
						}
						className={CLOSE}
					>
						<Icon icon={closeSmall} size={24} className="fill-current" />
					</button>
				</Tooltip>
			)}
			{failed && failedText && (
				<p role="alert" className="m-0 mt-2 text-agentx-alert">
					{failedText}
				</p>
			)}
		</form>
	);
};

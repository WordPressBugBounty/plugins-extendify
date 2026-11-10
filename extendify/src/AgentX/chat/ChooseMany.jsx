import {
	CARD_PRIMARY,
	CARD_SHAPE,
	CLOSE,
	IN_CARD_CORNER,
	LIST,
	LIST_ROW,
	NOTICE_TITLE,
} from '@agentx/chat/styles';
import { TypedAnswer } from '@agentx/chat/TypedAnswer';
import { useCardKeys } from '@agentx/lib/keyboard';
import { Tooltip } from '@agentx/Tooltip';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { closeSmall, Icon } from '@wordpress/icons';

// Several things to say yes or no to at once, each its own checkbox, all ticked to start.
export const ChooseMany = ({ part, onAnswer, onClose, onTyped }) => {
	const { question, options = [], submitLabel } = part.input ?? {};
	const [picked, setPicked] = useState(() => options.map(({ value }) => value));
	const [busy, setBusy] = useState(false);
	const keys = useCardKeys(Boolean(part.demoState));

	const toggle = (value) =>
		setPicked((was) =>
			was.includes(value)
				? was.filter((each) => each !== value)
				: [...was, value],
		);

	const send = async () => {
		setBusy(true);
		try {
			await onAnswer(async () => ({
				values: picked,
				answer: options
					.filter(({ value }) => picked.includes(value))
					.map(({ label }) => label)
					.join(', '),
			}));
		} catch {
			setBusy(false);
		}
	};

	return (
		<form
			{...keys}
			onSubmit={(event) => {
				event.preventDefault();
				send();
			}}
			aria-label={question}
			className={`agentx-focus relative flex flex-col gap-2 ${CARD_SHAPE} border-agentx-checklist-card-border bg-agentx-checklist-card text-agentx-checklist-card-ink`}
		>
			<p className={`m-0 pe-8 break-words ${NOTICE_TITLE}`}>{question}</p>
			<Tooltip text={__('Close', 'extendify-local')} className={IN_CARD_CORNER}>
				<button
					type="button"
					onClick={onClose}
					disabled={busy}
					aria-label={
						// translators: Closes the AI Agent's card listing several things to tick, without changing any of them.
						__('Close', 'extendify-local')
					}
					className={CLOSE}
				>
					<Icon icon={closeSmall} size={24} className="fill-current" />
				</button>
			</Tooltip>
			<fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
				<ul className={LIST}>
					{options.map(({ label, value, detail }) => (
						<li key={value} className={LIST_ROW}>
							<label className="flex min-w-0 flex-1 cursor-pointer items-baseline gap-3 px-3 py-2 hover:bg-agentx-list-hover">
								<input
									type="checkbox"
									checked={picked.includes(value)}
									onChange={() => toggle(value)}
									className="agentx-focus size-4 shrink-0 translate-y-0.5 accent-agentx-checkbox"
								/>
								<span className="min-w-0 flex-1 font-agentx-button break-words">
									{label}
								</span>
								{detail && (
									<span className="max-w-[50%] shrink-0 truncate text-agentx-caption text-agentx-notice-muted">
										{detail}
									</span>
								)}
							</label>
						</li>
					))}
				</ul>
			</fieldset>
			<div className="flex justify-end">
				<button
					type="submit"
					disabled={busy || !picked.length}
					className={CARD_PRIMARY}
				>
					{submitLabel ||
						// translators: Button on the AI Agent's card listing several things to tick; it changes the ticked ones.
						__('Change these', 'extendify-local')}
				</button>
			</div>
			{onTyped && <TypedAnswer onAnswer={onTyped} busy={busy} />}
		</form>
	);
};

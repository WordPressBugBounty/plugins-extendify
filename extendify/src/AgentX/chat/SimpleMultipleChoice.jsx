import {
	CARD_SHAPE,
	CLOSE,
	IN_CARD_CORNER,
	NOTICE_TITLE,
	PRESS,
} from '@agentx/chat/styles';
import { TypedAnswer } from '@agentx/chat/TypedAnswer';
import { useCardKeys } from '@agentx/lib/keyboard';
import { Tooltip } from '@agentx/Tooltip';
import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { closeSmall, Icon } from '@wordpress/icons';

// The backend puts the option it recommends first.
export const SimpleMultipleChoice = ({
	question,
	options,
	onChoose,
	onClose,
	onTyped,
	demo,
}) => {
	const id = useId();
	const keys = useCardKeys(demo);

	return (
		<fieldset
			{...keys}
			aria-labelledby={id}
			className={`agentx-focus relative m-0 flex min-w-0 flex-col gap-2 ${CARD_SHAPE} border-agentx-choice-card-border bg-agentx-choice-card text-agentx-choice-card-ink`}
		>
			<p id={id} className={`m-0 ${NOTICE_TITLE} ${onClose ? 'pe-5' : ''}`}>
				{question ||
					// translators: Shown above a group of buttons the AI Agent offers the user to pick from, when it has no question of its own.
					__('Choose one', 'extendify-local')}
			</p>
			{options.map((option, index) => (
				<button
					key={`${index}-${option.label}`}
					type="button"
					onClick={() => onChoose(option)}
					className={`agentx-focus w-full rounded-agentx-option border border-agentx-option-border bg-agentx-option min-h-8 px-3 py-[5px] text-start font-agentx-button leading-5 break-words text-agentx-option-ink ${PRESS} hover:bg-agentx-option-hover`}
				>
					{option.label}
				</button>
			))}
			{onTyped && <TypedAnswer onAnswer={onTyped} />}
			{onClose && (
				<Tooltip
					text={__('Close', 'extendify-local')}
					className={IN_CARD_CORNER}
				>
					<button
						type="button"
						onClick={onClose}
						aria-label={
							// translators: Closes the AI Agent's card of choices without picking one.
							__('Close', 'extendify-local')
						}
						className={CLOSE}
					>
						<Icon icon={closeSmall} size={24} className="fill-current" />
					</button>
				</Tooltip>
			)}
		</fieldset>
	);
};

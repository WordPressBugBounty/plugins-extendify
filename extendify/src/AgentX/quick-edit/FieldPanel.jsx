import { FIELD, TEXT_BUTTON } from '@agentx/quick-edit/controls';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { close, Icon, plus } from '@wordpress/icons';

const TYPED = [
	'text',
	'email',
	'textarea',
	'number',
	'url',
	'phone',
	'password',
];
const CHOSEN = ['select', 'radio', 'checkbox'];

const CHOICE = /^choice-(\d+)$/;
const orderOf = (item) =>
	Number(
		[...item.classList].map((name) => CHOICE.exec(name)?.[1]).find(Boolean),
	);

// A choice's value, kept only where it isn't its label, since a field showing values has its own.
const optionOf = (label, value) => ({
	label,
	value: value !== label ? value : null,
});

// A field's choices in the order WPForms keeps them, since it can shuffle a list on the page.
const optionsOf = (box) => {
	const select = box.querySelector('select');
	// Choices.js empties a modern dropdown's select to its picked items, so its list can't be read there.
	if (
		select?.classList.contains('choicesjs-select') ||
		select?.closest('.choices')
	) {
		return null;
	}
	if (select) {
		return [...select.options]
			.filter((option) => !option.classList.contains('placeholder'))
			.map((option) => optionOf(option.textContent.trim(), option.value));
	}
	return [...box.querySelectorAll('li')]
		.filter((item) => orderOf(item))
		.sort((a, b) => orderOf(a) - orderOf(b))
		.map((item) =>
			optionOf(
				item.querySelector('label')?.textContent.trim() ?? '',
				item.querySelector('input')?.value ?? '',
			),
		);
};

const labelOf = (words) => {
	const copy = words.cloneNode(true);
	for (const mark of copy.querySelectorAll('.wpforms-required-label')) {
		mark.remove();
	}
	return copy.textContent.trim();
};

// Read off the page, since WPForms' own form reader leaves out a field's placeholder and choices.
export const fieldOf = (words) => {
	const box = words.closest('.wpforms-field');
	const type =
		[...box.classList]
			.map((name) => /^wpforms-field-([a-z-]+)$/.exec(name)?.[1])
			.find(Boolean) ?? '';
	const input = TYPED.includes(type)
		? box.querySelector('input:not([type="hidden"]), textarea')
		: null;
	const options = CHOSEN.includes(type) ? optionsOf(box) : null;
	return {
		type,
		label: labelOf(words),
		input,
		placeholder: input?.getAttribute('placeholder') ?? '',
		description:
			box.querySelector('.wpforms-field-description')?.textContent.trim() ?? '',
		required: Boolean(box.querySelector('[required], .wpforms-field-required')),
		choices: options?.map(({ label }) => label) ?? null,
		values: options?.map(({ value }) => value) ?? null,
	};
};

const ROW = 'flex items-center gap-2 px-1 text-agentx-quick-edit';
const NAME = 'w-24 shrink-0 text-agentx-quick-edit-label';

// WPForms matches sent choices to its own by place, keeping each place's settings, like which is picked.
const choicesOf = (field, choices) => {
	let last = choices.length;
	while (last > 0 && !choices[last - 1].trim()) last--;
	return choices.slice(0, last).map((choice, at) => {
		// An emptied choice in the middle keeps its words, or every choice after it would take the next one's place.
		const label = choice.trim() || field.choices[at] || '';
		const value = field.values?.[at];
		return { label, ...(value && { value }) };
	});
};

// The settings that differ from the field's own, as WPForms' update takes them.
const changesOf = (field, now) => ({
	...(field.input &&
		now.placeholder !== field.placeholder && {
			placeholder: now.placeholder,
		}),
	...(now.description !== field.description && {
		description: now.description,
	}),
	...(now.required !== field.required && { required: now.required }),
	...(field.choices &&
		now.choices.join('\n') !== field.choices.join('\n') && {
			choices: choicesOf(field, now.choices),
		}),
});

// The label is typed here, not on the form, and shows on the page as it's typed.
export const FieldPanel = ({ field, onChange, onLabel, onSave }) => {
	const labelField = useRef(null);
	const [label, setLabel] = useState(field.label);
	const [now, setNow] = useState({
		placeholder: field.placeholder,
		description: field.description,
		required: field.required,
		choices: field.choices ?? [],
	});

	const change = (next) => {
		const all = { ...now, ...next };
		setNow(all);
		onChange(changesOf(field, all));
		if ('placeholder' in next) {
			field.input?.setAttribute('placeholder', next.placeholder);
		}
	};

	useEffect(
		() => () => field.input?.setAttribute('placeholder', field.placeholder),
		[field],
	);

	useEffect(() => {
		labelField.current?.focus();
		labelField.current?.select();
	}, []);

	const choose = (index, value) =>
		change({
			choices: now.choices.map((choice, at) => (at === index ? value : choice)),
		});

	return (
		<div className="flex flex-col gap-1.5 px-1 pt-1">
			<label className={ROW}>
				<span className={NAME}>
					{
						// translators: Label of the field in Quick Edit's panel for a form field; it sets the field's name shown on the form, like Email.
						__('Label', 'extendify-local')
					}
				</span>
				<input
					ref={labelField}
					value={label}
					onChange={(event) => {
						setLabel(event.target.value);
						onLabel?.(event.target.value);
					}}
					onKeyDown={(event) => {
						if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
						event.preventDefault();
						onSave?.();
					}}
					className={`${FIELD} flex-1`}
				/>
			</label>
			{field.input && (
				<label className={ROW}>
					<span className={NAME}>
						{
							// translators: Label of the field in Quick Edit's panel for a form field; it sets the hint shown inside the empty field, like name@example.com.
							__('Placeholder', 'extendify-local')
						}
					</span>
					<input
						value={now.placeholder}
						onChange={(event) => change({ placeholder: event.target.value })}
						className={`${FIELD} flex-1`}
					/>
				</label>
			)}
			<label className={ROW}>
				<span className={NAME}>
					{
						// translators: Label of the field in Quick Edit's panel for a form field; it sets the short help text shown under the field.
						__('Description', 'extendify-local')
					}
				</span>
				<input
					value={now.description}
					onChange={(event) => change({ description: event.target.value })}
					className={`${FIELD} flex-1`}
				/>
			</label>
			{field.choices && (
				<div className="flex items-start gap-2 px-1 text-agentx-quick-edit">
					<span className={`${NAME} pt-1.5`}>
						{
							// translators: Label of the list in Quick Edit's panel for a form field like a dropdown; each item is one option a visitor can pick.
							__('Choices', 'extendify-local')
						}
					</span>
					<div className="flex flex-1 flex-col gap-1">
						{now.choices.map((choice, index) => (
							<div key={index} className="flex items-center gap-1">
								<input
									value={choice}
									aria-label={sprintf(
										// translators: %d is a number. Screen reader name for one option in Quick Edit's list of a form field's choices.
										__('Choice %d', 'extendify-local'),
										index + 1,
									)}
									onChange={(event) => choose(index, event.target.value)}
									className={`${FIELD} flex-1`}
								/>
								{/* Only the last can go, since WPForms matches choices by their place. */}
								{index === now.choices.length - 1 ? (
									<button
										type="button"
										aria-label={sprintf(
											// translators: %s is an option's words in a form field, like Morning. Button in Quick Edit that takes the option out of the field.
											__('Remove %s', 'extendify-local'),
											choice,
										)}
										onClick={() =>
											change({
												choices: now.choices.filter((_, at) => at !== index),
											})
										}
										className={`${TEXT_BUTTON} size-8 bg-transparent px-0 text-agentx-quick-edit-button-ink hover:bg-agentx-quick-edit-button-hover`}
									>
										<Icon icon={close} size={20} className="fill-current" />
									</button>
								) : (
									<span aria-hidden="true" className="size-8 shrink-0" />
								)}
							</div>
						))}
						<button
							type="button"
							onClick={() => change({ choices: [...now.choices, ''] })}
							className={`${TEXT_BUTTON} self-start bg-transparent px-2 text-agentx-quick-edit-button-ink hover:bg-agentx-quick-edit-button-hover`}
						>
							<Icon icon={plus} size={20} className="fill-current" />
							<span>
								{
									// translators: Button in Quick Edit's panel for a form field like a dropdown; it adds one more option a visitor can pick.
									__('Add choice', 'extendify-local')
								}
							</span>
						</button>
					</div>
				</div>
			)}
			<label className={ROW}>
				<input
					type="checkbox"
					checked={now.required}
					onChange={(event) => change({ required: event.target.checked })}
					className="size-4 accent-agentx-checkbox"
				/>
				<span>
					{
						// translators: Checkbox in Quick Edit's panel for a form field; when checked, a visitor has to fill in the field to send the form.
						__('Required', 'extendify-local')
					}
				</span>
			</label>
		</div>
	);
};

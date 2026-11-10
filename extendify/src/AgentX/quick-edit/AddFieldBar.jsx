import { fieldTypes, runAbility } from '@agentx/lib/abilities';
import { shellDocument } from '@agentx/lib/shell-document';
import { showCurrent } from '@agentx/lib/show-draft';
import { track } from '@agentx/lib/track';
import {
	DragHandle,
	FIELD,
	SaveButtons,
	SURFACE,
	TEXT_BUTTON,
} from '@agentx/quick-edit/controls';
import { useBesidePart } from '@agentx/quick-edit/place';
import { quietPage } from '@agentx/quick-edit/quiet-page';
import { createPortal, useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { chevronDown, close, Icon, plus } from '@wordpress/icons';

const CHOSEN = ['select', 'radio', 'checkbox'];
const ROW = 'flex items-center gap-2 px-1 text-agentx-quick-edit';
const NAME = 'w-24 shrink-0 text-agentx-quick-edit-label';

export const AddFieldBar = ({
	target,
	changed,
	commit = { current: null },
	onDone,
	onFailed,
	failed = null,
}) => {
	const { block, form } = target;
	const bar = useRef(null);
	const name = useRef(null);
	const [types, setTypes] = useState(null);
	const [type, setType] = useState(target.draft?.type ?? 'text');
	const [label, setLabel] = useState(target.draft?.label ?? '');
	const [choices, setChoices] = useState(target.draft?.choices ?? ['', '']);
	const [required, setRequired] = useState(target.draft?.required ?? false);
	const [problem, setProblem] = useState(failed);
	const chosen = CHOSEN.includes(type);
	changed.current = () => Boolean(label.trim());

	useEffect(() => {
		let current = true;
		fieldTypes().then((found) => current && setTypes(found));
		return () => {
			current = false;
		};
	}, []);

	useEffect(() => {
		const quiet = quietPage(block, { typed: false });
		name.current?.focus();
		return () => quiet();
	}, [block]);

	const drag = useBesidePart(bar, block, { inView: true });

	const save = async () => {
		const words = label.trim();
		if (!words) {
			setProblem(
				// translators: Shown in Quick Edit's panel for adding a field to a form on the user's website when Save is pressed with no label.
				__('Give the field a label.', 'extendify-local'),
			);
			return;
		}
		const options = chosen
			? choices.map((choice) => choice.trim()).filter(Boolean)
			: [];
		const draft = { type, label, choices, required };
		onDone();
		try {
			await runAbility('wpforms/add-field', {
				form_id: form,
				type,
				label: words,
				required,
				...(options.length && {
					choices: options.map((choice) => ({ label: choice })),
				}),
			});
			track('quick-edit-saved', { kind: 'add-field' });
			// WPForms renders the form on the server, so the page shows the field once it loads again.
			await showCurrent();
		} catch (error) {
			onFailed?.(
				error?.message ||
					// translators: Shown in Quick Edit when adding a field to a form on the user's website failed.
					__("Couldn't add the field. Please try again.", 'extendify-local'),
				{ draft },
			);
		}
	};
	commit.current = save;

	const keys = useRef(null);
	keys.current = (event) => {
		// Escape or Enter typed in the chat box mustn't cancel or save the field.
		if (!bar.current?.contains(event.target)) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onDone();
		}
		if (event.key === 'Enter' && !event.isComposing) {
			if (['BUTTON', 'SELECT'].includes(event.target.tagName)) return;
			event.preventDefault();
			save();
		}
	};
	useEffect(() => {
		const listen = (event) => keys.current(event);
		document.addEventListener('keydown', listen);
		return () => document.removeEventListener('keydown', listen);
	}, []);

	return createPortal(
		<div
			ref={bar}
			data-agentx-editor=""
			role="dialog"
			// translators: Screen reader name for Quick Edit's panel for adding a field, like a dropdown, to a form on the user's website.
			aria-label={__('Add field', 'extendify-local')}
			className={`group fixed top-0 left-0 z-100002 flex w-[26rem] max-w-[calc(100vw-1rem)] flex-col gap-1 rounded-agentx-quick-edit p-1 ${SURFACE}`}
		>
			<div className="flex items-center gap-1">
				<DragHandle onPointerDown={drag} />
				<span className="flex-1 text-agentx-quick-edit font-agentx-quick-edit">
					{
						// translators: Heading of Quick Edit's panel for adding a field, like a dropdown, to a form on the user's website.
						__('Add field', 'extendify-local')
					}
				</span>
				<SaveButtons onCancel={onDone} onSave={save} />
			</div>
			<div className="flex flex-col gap-1.5 px-1 pt-1 pb-2">
				<label className={ROW}>
					<span className={NAME}>
						{
							// translators: Label of the menu in Quick Edit's panel for adding a form field; it picks what kind of field, like Dropdown or Email.
							__('Type', 'extendify-local')
						}
					</span>
					<span className="relative flex flex-1">
						<select
							value={type}
							onChange={(event) => setType(event.target.value)}
							className={`${FIELD} w-full cursor-pointer appearance-none pe-8`}
						>
							{(types?.length ? types : [{ type, label: type }]).map((each) => (
								<option key={each.type} value={each.type}>
									{each.label}
								</option>
							))}
						</select>
						<Icon
							icon={chevronDown}
							size={20}
							className="pointer-events-none absolute end-1.5 top-1/2 -translate-y-1/2 fill-current"
						/>
					</span>
				</label>
				<label className={ROW}>
					<span className={NAME}>
						{
							// translators: Label of the field in Quick Edit's panel for adding a form field; it sets the new field's name shown on the form, like Birthdate.
							__('Label', 'extendify-local')
						}
					</span>
					<input
						ref={name}
						value={label}
						onChange={(event) => {
							setLabel(event.target.value);
							setProblem(null);
						}}
						className={`${FIELD} flex-1`}
					/>
				</label>
				{chosen && (
					<div className="flex items-start gap-2 px-1 text-agentx-quick-edit">
						<span className={`${NAME} pt-1.5`}>
							{
								// translators: Label of the list in Quick Edit's panel for adding a form field like a dropdown; each item is one option a visitor can pick.
								__('Choices', 'extendify-local')
							}
						</span>
						<div className="flex flex-1 flex-col gap-1">
							{choices.map((choice, index) => (
								<div key={index} className="flex items-center gap-1">
									<input
										value={choice}
										aria-label={sprintf(
											// translators: %d is a number. Screen reader name for one option in Quick Edit's list of a new form field's choices.
											__('Choice %d', 'extendify-local'),
											index + 1,
										)}
										onChange={(event) =>
											setChoices((now) =>
												now.map((each, at) =>
													at === index ? event.target.value : each,
												),
											)
										}
										className={`${FIELD} flex-1`}
									/>
									<button
										type="button"
										aria-label={sprintf(
											// translators: %d is a number. Button in Quick Edit's panel for adding a form field; it takes that option out of the new field.
											__('Remove choice %d', 'extendify-local'),
											index + 1,
										)}
										onClick={() =>
											setChoices((now) => now.filter((_, at) => at !== index))
										}
										className={`${TEXT_BUTTON} size-8 bg-transparent px-0 text-agentx-quick-edit-button-ink hover:bg-agentx-quick-edit-button-hover`}
									>
										<Icon icon={close} size={20} className="fill-current" />
									</button>
								</div>
							))}
							<button
								type="button"
								onClick={() => setChoices((now) => [...now, ''])}
								className={`${TEXT_BUTTON} self-start bg-transparent px-2 text-agentx-quick-edit-button-ink hover:bg-agentx-quick-edit-button-hover`}
							>
								<Icon icon={plus} size={20} className="fill-current" />
								<span>
									{
										// translators: Button in Quick Edit's panel for adding a form field like a dropdown; it adds one more option a visitor can pick.
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
						checked={required}
						onChange={(event) => setRequired(event.target.checked)}
						className="size-4 accent-agentx-checkbox"
					/>
					<span>
						{
							// translators: Checkbox in Quick Edit's panel for adding a form field; when checked, a visitor has to fill in the field to send the form.
							__('Required', 'extendify-local')
						}
					</span>
				</label>
			</div>
			{problem && (
				<p
					role="alert"
					className="m-0 px-2 pb-2 text-agentx-quick-edit text-agentx-quick-edit-problem"
				>
					{problem}
				</p>
			)}
		</div>,
		shellDocument().body,
	);
};

import { Sheet } from '@agentx/chat/Sheet';
import { allSuggestions } from '@agentx/chat/suggestions';
import { asks } from '@agentx/lib/abilities';
import { usePluginsStore } from '@agentx/state/plugins';
import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { brush, cog, Icon, page, plugins } from '@wordpress/icons';

const groups = () => [
	{
		id: 'design',
		icon: brush,
		// translators: Heading over the requests about the site's look, like its colors, fonts and logo, in the AI Agent's list of things to ask for.
		label: __('Design & Style', 'extendify-local'),
	},
	{
		id: 'settings',
		icon: cog,
		// translators: Heading over the requests about the site's settings, like its title and tagline, in the AI Agent's list of things to ask for.
		label: __('Site settings', 'extendify-local'),
	},
	{
		id: 'pages',
		icon: page,
		// translators: Heading over the requests about the site's pages, like making a new one or publishing one, in the AI Agent's list of things to ask for.
		label: __('Pages', 'extendify-local'),
	},
	{
		id: 'plugins',
		icon: plugins,
		// translators: Heading over the requests about plugins, like recommending one or adding a product to a store, in the AI Agent's list of things to ask for.
		label: __('Plugins', 'extendify-local'),
	},
];

// The agent's own lookups, which mean nothing as a request; the agent still gets them.
const AGENT_ONLY = new Set([
	'describe-editing-schema',
	'get-environment-info',
	'get-plugin-info',
	'get-reports-date-ranges',
	'get-site-environment',
]);

// What each plugin lets the agent do, by plugin name.
const abilityGroups = (abilities) =>
	abilities
		.map((category) => ({
			...category,
			abilities: category.abilities?.filter(
				({ name }) => !AGENT_ONLY.has(name.split('/')[1]),
			),
		}))
		.filter((category) => category.abilities?.length)
		.sort((a, b) => a.label.localeCompare(b.label))
		.map(({ category, label, abilities: theirs }) => ({
			id: `abilities-${category}`,
			icon: plugins,
			label,
			items: theirs.map((ability) => ({
				id: `ability-${ability.name}`,
				label: ability.label,
				text: sprintf(
					// translators: %1$s is a plugin's name, like WPForms, and %2$s one thing the AI Agent can do with it, like Add Field. Put in the chat box as the start of a request the user finishes.
					__('%1$s: %2$s', 'extendify-local'),
					label,
					ability.label,
				),
				// One that writes needs what to write, so the box waits for the user to say.
				details: {
					workflow: `plugin:${category}`,
					...(asks(ability.name) && { fill: true }),
				},
			})),
		}));

// Translated requests carry accents a user may not type.
const fold = (text) =>
	text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLocaleLowerCase();

export const CommandsSheet = ({
	demo,
	filter: demoFilter,
	onPick,
	onClose,
}) => {
	const id = useId();
	const sheet = useRef(null);
	const field = useRef(null);
	const list = useRef(null);
	const [typed, setTyped] = useState('');
	const [at, setAt] = useState(0);
	const filter = demo ? (demoFilter ?? '') : typed;
	const words = fold(filter).split(/\s+/).filter(Boolean);
	const matching = ({ text }) =>
		words.every((word) => fold(text).includes(word));
	const abilities = usePluginsStore((state) => state.abilities);
	const requests = allSuggestions().filter(
		(card) => card.group && matching(card),
	);
	const sections = [
		...groups().map((group) => ({
			...group,
			items: requests.filter((card) => card.group === group.id),
		})),
		...abilityGroups(abilities).map((group) => ({
			...group,
			items: group.items.filter(matching),
		})),
	].filter(({ items }) => items.length);
	const matches = sections.flatMap(({ items }) => items);
	const current = matches[Math.min(at, matches.length - 1)];
	const optionId = (card) => `${id}-${card.id}`;

	useEffect(() => {
		// A demo state leaves focus on the dev tool, where the arrow keys step through the states.
		if (demo) return;
		field.current?.focus({ preventScroll: true });
	}, []);

	// scrollIntoView would also scroll the chat while the sheet slides up.
	useEffect(() => {
		const option = current && document.getElementById(optionId(current));
		if (!option) return;
		const box = list.current.getBoundingClientRect();
		const { top, bottom } = option.getBoundingClientRect();
		if (top < box.top) list.current.scrollTop -= box.top - top;
		else if (bottom > box.bottom) list.current.scrollTop += bottom - box.bottom;
	}, [current?.id]);

	const keys = (event) => {
		if (event.nativeEvent.isComposing) return;
		const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
		if (step) {
			event.preventDefault();
			const index = matches.indexOf(current);
			setAt(Math.min(Math.max(index + step, 0), matches.length - 1));
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			if (current) onPick(current);
			return;
		}
		if (event.key === 'Backspace' && !typed) onClose();
	};

	return (
		<Sheet
			sheet={sheet}
			title={
				// translators: Heading of the AI Agent's list of requests it can carry out, opened by typing / in the chat box.
				__('Things you can ask for', 'extendify-local')
			}
			closeLabel={
				// translators: Closes the AI Agent's list of things to ask for.
				__('Close', 'extendify-local')
			}
			onClose={onClose}
		>
			<div className="relative shrink-0 px-4 pb-2">
				<span
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 start-7 flex items-center pb-2 text-agentx-body text-agentx-sheet-muted"
				>
					/
				</span>
				<input
					ref={field}
					type="text"
					role="combobox"
					aria-expanded="true"
					aria-autocomplete="list"
					aria-controls={`${id}-list`}
					aria-activedescendant={current ? optionId(current) : undefined}
					// translators: Names the field that narrows the AI Agent's list of things to ask for as the user types.
					aria-label={__('Filter the list', 'extendify-local')}
					// translators: Placeholder in the field that narrows the AI Agent's list of things to ask for.
					placeholder={__('Type to filter', 'extendify-local')}
					value={filter}
					readOnly={demo}
					onChange={(event) => {
						setTyped(event.target.value);
						setAt(0);
					}}
					onKeyDown={keys}
					autoComplete="off"
					spellCheck={false}
					className="agentx-focus-inset w-full rounded-agentx-control border border-solid border-agentx-sheet-field-border bg-agentx-sheet-field py-2 ps-6 pe-3 text-agentx-body text-agentx-sheet-field-ink placeholder:text-agentx-placeholder"
				/>
			</div>
			<div
				ref={list}
				id={`${id}-list`}
				role="listbox"
				aria-label={
					// translators: Heading of the AI Agent's list of requests it can carry out, opened by typing / in the chat box.
					__('Things you can ask for', 'extendify-local')
				}
				className="flex min-h-0 flex-col gap-3 overflow-y-auto px-2 pb-3"
			>
				{matches.length === 0 && (
					<p className="m-0 px-2 py-2 text-agentx-body text-agentx-sheet-muted">
						{
							// translators: Shown when nothing in the AI Agent's list of things to ask for matches what the user typed.
							__('No matches', 'extendify-local')
						}
					</p>
				)}
				{sections.map((group) => (
					// biome-ignore lint/a11y/useSemanticElements: a listbox holds only options and groups of them, so no fieldset.
					<div
						key={group.id}
						role="group"
						aria-labelledby={`${id}-${group.id}`}
						className="flex flex-col"
					>
						<div
							id={`${id}-${group.id}`}
							className="flex items-center gap-2 px-2 py-1.5 text-agentx-body text-agentx-commands-heading"
						>
							<Icon icon={group.icon} size={20} className="fill-current" />
							<span>{group.label}</span>
						</div>
						{group.items.map((card) => (
							<button
								key={card.id}
								type="button"
								id={optionId(card)}
								role="option"
								aria-selected={card === current}
								tabIndex={-1}
								data-request
								// A click would otherwise take focus from the filter field.
								onMouseDown={(event) => event.preventDefault()}
								onMouseMove={() => setAt(matches.indexOf(card))}
								onClick={() => onPick(card)}
								className="w-full rounded-agentx-control border-0 bg-transparent px-2 py-2 text-start text-agentx-body text-agentx-commands-item-ink aria-selected:bg-agentx-commands-item-active"
							>
								{card.label ?? card.text}
							</button>
						))}
					</div>
				))}
			</div>
		</Sheet>
	);
};

import { locked, showForm } from '@agentx/chat/conversation';
import { NOTICE_CARD, PresenceNotice } from '@agentx/chat/DraftBar';
import { discard, save } from '@agentx/lib/draft';
import { redoChange, undoChange, useDraftRun } from '@agentx/lib/draft-actions';
import { useKeyAnywhere } from '@agentx/lib/hooks';
import { draftKey } from '@agentx/lib/keyboard';
import { useDraftStore } from '@agentx/state/draft';
import { closeGutter, useGutterStore } from '@agentx/state/gutter';
import { flagRun } from '@agentx/state/report';
import { useRunStore } from '@agentx/state/run';
import { useShellStore } from '@agentx/state/shell';
import { shortcut, Tooltip } from '@agentx/Tooltip';
import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	backup,
	bug,
	check,
	cog,
	desktop,
	Icon,
	mobile,
	redo as redoIcon,
	siteLogo,
	trash,
	undo as undoIcon,
} from '@wordpress/icons';

const TOOL_BASE =
	'agentx-focus inline-flex size-7 shrink-0 items-center justify-center border-0 bg-transparent p-0 transition-colors aria-disabled:cursor-default aria-disabled:opacity-[var(--agentx-disabled-opacity,40%)]';

// One look for every tool: a hover only where a press would do something, and on or open drawn alike.
const TOOL = `${TOOL_BASE} rounded-agentx-tools text-agentx-tools-ink not-aria-disabled:not-aria-pressed:not-aria-expanded:hover:bg-agentx-tools-hover not-aria-disabled:hover:text-agentx-tools-hover-ink aria-pressed:bg-agentx-tools-active aria-pressed:text-agentx-tools-active-ink aria-pressed:shadow-(--agentx-tools-active-shadow) aria-expanded:bg-agentx-tools-active aria-expanded:text-agentx-tools-active-ink aria-expanded:shadow-(--agentx-tools-active-shadow)`;

const VIEW_BUTTON = `${TOOL_BASE} rounded-[calc(var(--radius-agentx-view-switch)-0.25rem)] text-agentx-view-switch-ink not-aria-disabled:not-aria-pressed:not-aria-expanded:hover:bg-agentx-view-switch-hover not-aria-disabled:hover:text-agentx-view-switch-hover-ink aria-pressed:bg-agentx-view-switch-active aria-pressed:text-agentx-view-switch-active-ink aria-pressed:shadow-(--agentx-view-switch-active-shadow)`;

const ToolButton = ({
	label,
	keys,
	icon,
	iconClassName = '',
	className = TOOL,
	children,
	...props
}) => (
	<Tooltip text={label} keys={keys}>
		<button type="button" aria-label={label} className={className} {...props}>
			<Icon icon={icon} size={20} className={`fill-current ${iconClassName}`} />
			{children}
		</button>
	</Tooltip>
);

const Choice = ({ on, label, onPress, autoFocus = false }) => (
	<button
		type="button"
		role="menuitemcheckbox"
		aria-checked={on}
		// biome-ignore lint/a11y/noAutofocus: the menu's first item takes focus when it opens.
		autoFocus={autoFocus}
		onClick={onPress}
		className="agentx-focus-inset flex w-full items-center gap-2 rounded-agentx-menu-item border-0 bg-transparent px-2 py-2 text-start text-agentx-menu-ink hover:bg-agentx-menu-hover focus-visible:bg-agentx-menu-hover"
	>
		<span
			aria-hidden="true"
			className={`flex size-4 shrink-0 items-center justify-center rounded-agentx-checkbox border border-solid ${on ? 'border-agentx-checkbox bg-agentx-checkbox text-agentx-checkbox-ink' : 'border-agentx-checkbox-border'}`}
		>
			{on && <Icon icon={check} size={16} className="fill-current" />}
		</span>
		<span className="font-agentx-settings-item">{label}</span>
	</button>
);

const SiteViewButtons = () => {
	const { siteView, setSiteView } = useShellStore();
	const views = [
		{
			view: 'desktop',
			icon: desktop,
			// translators: Screen reader label for the button above the website that shows it at a desktop computer's width.
			label: __('Desktop view', 'extendify-local'),
		},
		{
			view: 'phone',
			icon: mobile,
			// translators: Screen reader label for the button above the website that shows it at a phone's width, to check how it looks on a phone.
			label: __('Phone view', 'extendify-local'),
		},
	];

	return (
		<fieldset
			// translators: Screen reader name for the pair of buttons above the website that switch it between a desktop and a phone width.
			aria-label={__('Site view', 'extendify-local')}
			className="m-0 flex gap-1 border-0 p-0"
		>
			{views.map(({ view, icon, label }) => (
				<ToolButton
					key={view}
					label={label}
					icon={icon}
					aria-pressed={siteView === view}
					onClick={() => setSiteView(view)}
					className={VIEW_BUTTON}
				/>
			))}
		</fieldset>
	);
};

const Divider = () => (
	<span aria-hidden="true" className="mx-1 h-5 w-px bg-agentx-tools-divider" />
);

// A card already in the gutter waits on the user, and this would replace it unanswered.
const askDiscard = (run) =>
	!useGutterStore.getState().card &&
	useGutterStore.setState({
		card: {
			text:
				// translators: The AI Agent's question after the user pressed the trash button on its unsaved changes bar or on the bar over the website: throw away every change not saved yet, putting back the site as last saved.
				__('Discard all unsaved changes?', 'extendify-local'),
			// translators: Button on the AI Agent's card asking to discard unsaved changes; throws away every change not saved yet.
			button: __('Discard', 'extendify-local'),
			danger: true,
			// translators: Closes the AI Agent's question about discarding unsaved changes, keeping them.
			dismiss: __('Cancel', 'extendify-local'),
			onPress: () => {
				closeGutter();
				return run('discard', discard);
			},
			onDismiss: closeGutter,
		},
	});

// The icon set has no disk to mean save: Fluent UI System Icons' save_20_regular, MIT.
const disk = (
	<svg viewBox="0 0 20 20" aria-hidden="true">
		<path d="M3 5c0-1.1.9-2 2-2h8.38a2 2 0 0 1 1.41.59l1.62 1.62A2 2 0 0 1 17 6.62V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1v-4.5c0-.83.67-1.5 1.5-1.5h7c.83 0 1.5.67 1.5 1.5V16a1 1 0 0 0 1-1V6.62a1 1 0 0 0-.3-.7L14.1 4.28a1 1 0 0 0-.71-.29H13v2.5c0 .83-.67 1.5-1.5 1.5h-4A1.5 1.5 0 0 1 6 6.5V4zm2 0v2.5c0 .28.22.5.5.5h4a.5.5 0 0 0 .5-.5V4zm7 12v-4.5a.5.5 0 0 0-.5-.5h-7a.5.5 0 0 0-.5.5V16z" />
	</svg>
);

const spinner = (
	<svg viewBox="0 0 20 20" aria-hidden="true">
		<circle
			cx="10"
			cy="10"
			r="7.5"
			fill="none"
			stroke="currentColor"
			strokeOpacity="0.2"
			strokeWidth="2"
		/>
		<path
			d="M10 2.5a7.5 7.5 0 0 1 7.5 7.5"
			fill="none"
			strokeWidth="2"
			strokeLinecap="round"
			className="stroke-agentx-saving"
		/>
	</svg>
);

// A save takes a fifth of a second, which a spinner or a dimmed tool would only flicker for.
const SAVING_MS = 750;
// The agent's turn ends a moment before autosave's save starts.
const GAP_MS = 100;

// On at once, then off no sooner than ms after it came on, and past a gap too short to see.
const useHeld = (on, ms) => {
	const [held, setHeld] = useState(on);
	const holding = useRef(on);
	const since = useRef(0);
	useEffect(() => {
		if (on) {
			if (!holding.current) since.current = Date.now();
			holding.current = true;
			setHeld(true);
			return;
		}
		const timer = setTimeout(
			() => {
				holding.current = false;
				setHeld(false);
			},
			Math.max(GAP_MS, ms - (Date.now() - since.current)),
		);
		return () => clearTimeout(timer);
	}, [on, ms]);
	return held;
};

// Save and how it saves are apart, so Autosave never reads as a second save button.
const SettingsMenu = ({ inChat = false }) => {
	const id = useId();
	const autosave = useShellStore((state) => state.autosave);
	const [open, setOpen] = useState(false);
	const wrap = useRef(null);
	const toggle = useRef(null);

	useEffect(() => {
		if (!open) return;
		const away = (event) => {
			if (!wrap.current?.contains(event.target)) setOpen(false);
		};
		document.addEventListener('pointerdown', away);
		return () => document.removeEventListener('pointerdown', away);
	}, [open]);

	const shut = () => {
		setOpen(false);
		toggle.current?.querySelector('button')?.focus();
	};

	const editProfile = () => {
		setOpen(false);
		// A minimized chat would hide the form this opens.
		useShellStore.getState().setMinimized(false);
		showForm('edit-site-profile');
	};

	// The chat goes on the press, so the note it asks for after is theirs to skip.
	const reportBug = () => {
		setOpen(false);
		useShellStore.getState().setMinimized(false);
		flagRun('toolbar');
	};

	return (
		<div ref={wrap} className="relative flex">
			<span ref={toggle} className="flex">
				<ToolButton
					// translators: Tooltip and screen reader label for the gear button at the end of the bar over the website, which opens its settings, like Autosave.
					label={__('Toolbar settings', 'extendify-local')}
					icon={cog}
					aria-haspopup="menu"
					aria-expanded={open}
					aria-controls={open ? `${id}-menu` : undefined}
					onClick={() => setOpen(!open)}
				/>
			</span>
			{open && (
				<div
					id={`${id}-menu`}
					role="menu"
					// translators: Screen reader name for the settings menu of the bar over the website.
					aria-label={__('Toolbar settings', 'extendify-local')}
					onKeyDown={(event) => {
						if (event.key !== 'Escape') return;
						event.stopPropagation();
						shut();
					}}
					className={`absolute end-0 z-100000 flex w-64 flex-col rounded-agentx-menu border border-solid border-agentx-menu-border bg-agentx-menu p-1 text-agentx-menu-item shadow-(--agentx-menu-shadow) ${inChat ? 'bottom-full mb-2' : 'top-full mt-2'}`}
				>
					{!locked && (
						<button
							type="button"
							role="menuitem"
							// biome-ignore lint/a11y/noAutofocus: a menu's first item takes focus when it opens.
							autoFocus
							onClick={editProfile}
							className="agentx-focus-inset flex w-full items-center gap-2 rounded-agentx-menu-item border-0 bg-transparent px-2 py-2 text-start text-agentx-menu-ink hover:bg-agentx-menu-hover focus-visible:bg-agentx-menu-hover"
						>
							<Icon
								icon={siteLogo}
								size={16}
								className="shrink-0 fill-agentx-menu-icon"
							/>
							<span className="font-agentx-settings-item">
								{
									// translators: Item in the settings menu of the bar over the website that opens a form to edit the site's name, tagline, description and tone.
									__('Edit site profile', 'extendify-local')
								}
							</span>
						</button>
					)}
					{window.extAgentXData?.devTool && (
						<button
							type="button"
							role="menuitem"
							onClick={reportBug}
							className="agentx-focus-inset flex w-full items-center gap-2 rounded-agentx-menu-item border-0 bg-transparent px-2 py-2 text-start text-agentx-menu-ink hover:bg-agentx-menu-hover focus-visible:bg-agentx-menu-hover"
						>
							<Icon
								icon={bug}
								size={16}
								className="shrink-0 fill-agentx-menu-icon"
							/>
							<span className="font-agentx-settings-item">
								{
									// translators: Item in the settings menu of the bar over the website; it sends this chat to the people who build the agent and asks what went wrong.
									__('Report agent bug', 'extendify-local')
								}
							</span>
						</button>
					)}
					<Choice
						on={autosave}
						// With no profile to edit, the menu opens on Autosave, its first item.
						autoFocus={locked}
						onPress={() => useShellStore.getState().setAutosave(!autosave)}
						label={
							// translators: Choice in the settings menu of the bar over the website; when on, each change goes live once the agent's turn ends.
							__('Autosave', 'extendify-local')
						}
					/>
				</div>
			)}
		</div>
	);
};

const SiteTools = ({ inChat = false }) => {
	const unsaved = useDraftStore((state) => state.unsaved);
	const current = useDraftStore((state) => state.current);
	const clashes = useDraftStore((state) => state.clashes);
	const canRedo = useDraftStore((state) =>
		state.versions.some(({ undone }) => undone),
	);
	const versions = useDraftStore((state) => state.versions.length);
	const changesOpen = useShellStore((state) => state.changesOpen);
	const autosave = useShellStore((state) => state.autosave);
	const working = useRunStore((state) => state.working);
	const { busy, blocked, run } = useDraftRun();
	// With Autosave on, an undo or redo is saved in the same run.
	const saving = useHeld(
		busy === 'save' || (autosave && ['undo', 'redo'].includes(busy)),
		SAVING_MS,
	);

	// Saves like the block editor does, where the browser would save the page instead.
	useKeyAnywhere((event) => {
		if (event.key.toLowerCase() !== 's') return;
		if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) {
			return;
		}
		event.preventDefault();
		if (unsaved && !clashes.length) run('save', save);
	});

	const stuck = clashes.length > 0;
	// A draft call or the spinner only holds a press; dimming for it would flash the tools.
	const dim = useHeld(working || stuck || changesOpen, SAVING_MS);
	const idle = dim || blocked || saving;
	const [held, setHeld] = useState([]);
	// Read when each runs, so a held press does nothing once there's nothing to act on.
	const actions = {
		undo: () => current && run('undo', undoChange),
		redo: () => canRedo && run('redo', redoChange),
		save: () => unsaved && run('save', save),
	};
	const press = (name) => {
		if (dim) return;
		if (idle) setHeld((was) => [...was, name]);
		else actions[name]();
	};
	// An open Quick Edit editor shows its change on the page before it's in the draft.
	useKeyAnywhere((event) => {
		const name = draftKey(event);
		if (!name || document.querySelector('[data-agentx-editor]')) return;
		event.preventDefault();
		press(name);
	});
	useEffect(() => {
		if (dim && held.length) setHeld([]);
		if (idle || !held.length) return;
		const [next, ...rest] = held;
		setHeld(rest);
		actions[next]();
	}, [held, idle, dim]);
	// The sheet and the gutter live in the chat, which may be minimized.
	const openChat = () => useShellStore.getState().setMinimized(false);

	return (
		<>
			<ToolButton
				// translators: Tooltip and screen reader label for the button over the website that opens the AI Agent's history of changes, saved or not.
				label={__('History', 'extendify-local')}
				icon={backup}
				aria-disabled={!versions}
				aria-haspopup="dialog"
				aria-expanded={changesOpen}
				onClick={(event) => {
					if (!versions) return;
					openChat();
					useShellStore.setState({ changesFrom: event.currentTarget });
					useShellStore.getState().setChangesOpen(!changesOpen);
				}}
			/>
			{/* Autosave leaves nothing unsaved to throw away. */}
			{!autosave && (
				<ToolButton
					// translators: Tooltip and screen reader label for the trash button on the bar over the website; asks before throwing away every change the AI Agent made that isn't saved yet.
					label={__('Discard changes', 'extendify-local')}
					icon={trash}
					// A save leaves nothing to discard, so it would only light up while one spins.
					aria-disabled={dim || saving || !unsaved}
					onClick={() => {
						if (idle || !unsaved) return;
						openChat();
						askDiscard(run);
					}}
				/>
			)}
			<ToolButton
				// translators: Tooltip and screen reader label for the undo button on the bar over the website; undoes the last change the AI Agent made that is not saved yet.
				label={__('Undo', 'extendify-local')}
				keys={current ? shortcut('z') : undefined}
				icon={undoIcon}
				aria-disabled={dim || !current}
				aria-keyshortcuts="Meta+Z Control+Z"
				onClick={() => press('undo')}
			/>
			<ToolButton
				// translators: Tooltip and screen reader label for the redo button on the bar over the website; puts back the last change undone in the AI Agent.
				label={__('Redo', 'extendify-local')}
				keys={canRedo ? shortcut('z', { shift: true }) : undefined}
				icon={redoIcon}
				aria-disabled={dim || !canRedo}
				aria-keyshortcuts="Meta+Shift+Z Control+Shift+Z"
				onClick={() => press('redo')}
			/>
			<ToolButton
				label={
					saving
						? // translators: Tooltip and screen reader label for the save button over the website while the AI Agent's changes save.
							__('Saving…', 'extendify-local')
						: unsaved
							? // translators: Tooltip and screen reader label for the save button over the website; puts the AI Agent's changes live on the site.
								__('Save changes', 'extendify-local')
							: // translators: Tooltip and screen reader label for the save button over the website when every change is already live on the site.
								__('All changes saved', 'extendify-local')
				}
				keys={unsaved ? shortcut('s') : undefined}
				icon={saving ? spinner : disk}
				iconClassName={saving ? 'motion-safe:animate-spin' : ''}
				aria-disabled={!saving && (dim || !unsaved)}
				aria-keyshortcuts="Meta+S Control+S"
				onClick={() => press('save')}
				className={`${TOOL} relative`}
			>
				{unsaved && !autosave && !saving && (
					<span
						data-agentx-unsaved
						aria-hidden="true"
						className="absolute end-0.5 top-0.5 size-1.75 rounded-full bg-agentx-unsaved"
					/>
				)}
			</ToolButton>
			<Divider />
			<SettingsMenu inChat={inChat} />
		</>
	);
};

// Above the chat box, never on its row: placed over the row, they covered what the user typed.
export const DraftNotices = () => {
	const presence = useDraftStore((state) => state.presence);
	const { problem } = useDraftRun();
	if (!presence && !problem) return null;
	return (
		<div className="flex flex-col gap-1">
			{presence && <PresenceNotice presence={presence} />}
			{problem && (
				<p role="alert" className={`${NOTICE_CARD} text-agentx-alert`}>
					{problem}
				</p>
			)}
		</div>
	);
};

export const CanvasBar = () => {
	useEffect(() => {
		useShellStore.setState({ canvasBar: true });
		return () => useShellStore.setState({ canvasBar: false });
	}, []);

	return (
		<div className="flex rounded-agentx-view-switch bg-agentx-view-switch p-1 text-agentx-body">
			<SiteViewButtons />
		</div>
	);
};

export const ChatRail = () => (
	<div
		role="toolbar"
		aria-label={__('Site tools', 'extendify-local')}
		className="flex items-center gap-0.5"
	>
		<SiteTools inChat />
	</div>
);

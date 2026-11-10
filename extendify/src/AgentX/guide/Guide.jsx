import { GHOST, GUIDE_CAPTION, GUIDE_NEXT } from '@agentx/chat/styles';
import { CaretRightIcon, CheckIcon, PartyIcon } from '@agentx/guide/icons';
import { nextLabel, STEPS } from '@agentx/guide/steps';
import { markDone, offered } from '@agentx/lib/guide';
import { HeldPicks, holdPicks } from '@agentx/lib/held-picks';
import { submitOnModEnter } from '@agentx/lib/keyboard';
import { Spinner } from '@agentx/spinner/Spinner';
import { useDraftStore } from '@agentx/state/draft';
import { useGuideStore } from '@agentx/state/guide';
import { useShellStore } from '@agentx/state/shell';
import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __, sprintf } from '@wordpress/i18n';

export const Ring = ({ done, total }) =>
	done >= total ? (
		<span
			aria-hidden="true"
			className="flex size-5 shrink-0 items-center justify-center rounded-full bg-agentx-guide-progress text-agentx-guide-progress-ink"
		>
			<CheckIcon className="size-3.5" />
		</span>
	) : (
		<svg
			viewBox="0 0 20 20"
			aria-hidden="true"
			className="size-5 shrink-0 -rotate-90"
		>
			<circle
				cx="10"
				cy="10"
				r="8"
				fill="none"
				strokeWidth="3"
				className="stroke-agentx-guide-progress-track"
			/>
			<circle
				cx="10"
				cy="10"
				r="8"
				fill="none"
				strokeWidth="3"
				strokeLinecap="round"
				pathLength="1"
				strokeDasharray={`${done / total} 1`}
				className="stroke-agentx-guide-progress"
			/>
		</svg>
	);

export const progressOf = (done, total) =>
	done >= total
		? // translators: Shown in the header of one of the AI Agent's setup guides once every step is finished.
			__('All done', 'extendify-local')
		: sprintf(
				// translators: %1$d is how many steps of one of the AI Agent's setup guides are finished, %2$d how many it has.
				__('%1$d of %2$d done', 'extendify-local'),
				done,
				total,
			);

const Connector = () => (
	<span
		aria-hidden="true"
		style={{
			backgroundImage:
				'repeating-linear-gradient(to bottom, currentColor 0 4px, transparent 4px 8px)',
			backgroundPosition: '0 4px',
		}}
		className="absolute start-[29px] top-11 -bottom-3 w-0.5 text-agentx-guide-line"
	/>
);

const Circle = ({ step, done, open, idle }) => (
	<span
		className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
			done && !open
				? 'bg-agentx-guide-circle-done text-agentx-guide-muted'
				: idle
					? 'bg-agentx-guide-circle-done text-agentx-guide-muted ring-agentx-guide-circle-border group-focus-within:bg-agentx-guide-circle group-focus-within:text-agentx-guide-circle-ink group-focus-within:ring-1 group-hover:bg-agentx-guide-circle group-hover:text-agentx-guide-circle-ink group-hover:ring-1'
					: 'bg-agentx-guide-circle text-agentx-guide-circle-ink ring-1 ring-agentx-guide-circle-border'
		}`}
	>
		{done && !open ? (
			<CheckIcon className="size-4" />
		) : (
			<step.Icon className="size-5" />
		)}
	</span>
);

// A field first, so typing can start right away.
const FIRST_FIELD =
	'input:not([type="hidden"]):not([tabindex="-1"]), textarea, select';
const FIRST_CONTROL =
	'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

const Body = ({ step, chat, takesFocus, onDone }) => {
	const form = useRef(null);
	const [values, setValues] = useState(() => step.form?.());
	// A step that reads what the site has first shows its fields once they're filled.
	const [loading, setLoading] = useState(Boolean(step.load));
	const [unread, setUnread] = useState(false);
	const [busy, setBusy] = useState(false);
	const [problem, setProblem] = useState(false);
	// A step's own form, like a product's, takes the footer's buttons while open.
	const [held, setHeld] = useState(null);
	useEffect(() => {
		if (!takesFocus || loading) return;
		const first =
			form.current?.querySelector(FIRST_FIELD) ??
			form.current?.querySelector(FIRST_CONTROL);
		first?.focus({ preventScroll: true });
	}, [loading]);
	useEffect(() => {
		if (!step.load) return;
		let gone = false;
		step
			.load()
			.then((loaded) => {
				if (gone) return;
				setValues(loaded);
				setLoading(false);
			})
			.catch(() => !gone && setUnread(true));
		return () => {
			gone = true;
		};
	}, []);
	// Saving the draft saves every change in it, not only this step's.
	const [othersUnsaved] = useState(
		() => step.draft && useDraftStore.getState().unsaved,
	);
	const { Tool } = step;
	const stages = step.stages?.() ?? [];
	const [stage, setStage] = useState(stages[0]);
	const later = stages[stages.indexOf(stage) + 1];
	const autosave = useShellStore((state) => state.autosave);
	const label = later ? nextLabel() : step.action({ autosave });

	const finish = async () => {
		setBusy(true);
		setProblem(false);
		try {
			await step.finish?.(values);
			onDone();
		} catch {
			setProblem(true);
			setBusy(false);
		}
	};

	const hold = (action) => {
		setProblem(false);
		setHeld(action);
	};

	const press = async () => {
		setBusy(true);
		setProblem(false);
		try {
			await held.run();
		} catch {
			setProblem(true);
		}
		setBusy(false);
	};

	const act = () => {
		if (held) {
			if (!busy) press();
		} else if (later) setStage(later);
		else if (!busy && !loading) finish();
	};
	const primary = held?.label ?? label;

	return (
		// A form, so Return in a field presses the step's main button like any form's.
		<form
			ref={form}
			onSubmit={(event) => {
				event.preventDefault();
				if (primary) act();
			}}
			onKeyDown={submitOnModEnter}
			className="m-0 flex flex-col gap-4 px-3 pt-1 pb-3"
		>
			{unread ? (
				<p role="alert" className="m-0 text-agentx-caption text-agentx-alert">
					{
						// translators: Shown on a step of one of the AI Agent's setup guides when it couldn't read what the site has for that step.
						__(
							"Couldn't load this step. Please try again later.",
							'extendify-local',
						)
					}
				</p>
			) : (
				<HeldPicks.Provider value={Boolean(step.draft)}>
					<Tool
						chat={chat}
						loading={loading}
						values={values}
						// A function change reads the values as they are by then, so two quick removals both stick.
						onChange={(change) =>
							setValues((was) => ({
								...was,
								...(typeof change === 'function' ? change(was) : change),
							}))
						}
						onDone={onDone}
						stage={stage}
						onStage={setStage}
						onAction={hold}
					/>
				</HeldPicks.Provider>
			)}
			{othersUnsaved && (
				<p className={`m-0 ${GUIDE_CAPTION}`}>
					{
						// translators: Shown on a design step of the AI Agent's Site Guide when the user has other unsaved changes, which its Save button also puts live.
						__(
							'Saving also puts your other unsaved changes live.',
							'extendify-local',
						)
					}
				</p>
			)}
			{problem && (
				<p role="alert" className="m-0 text-agentx-caption text-agentx-alert">
					{
						// translators: Shown on a step of the AI Agent's Site Guide when saving it failed.
						__("Couldn't save that. Please try again.", 'extendify-local')
					}
				</p>
			)}
			<div className="flex items-center justify-end gap-1">
				{held && (
					<button
						type="button"
						disabled={busy}
						onClick={held.cancel}
						className={GHOST}
					>
						{
							// translators: Button that closes a form inside a step of one of the AI Agent's setup guides, like a product's, without saving it.
							__('Cancel', 'extendify-local')
						}
					</button>
				)}
				{primary && (
					<button
						type="submit"
						aria-disabled={busy || loading}
						className={GUIDE_NEXT}
					>
						{busy ? (
							<span className="flex items-center gap-2">
								<Spinner className="size-4 shrink-0" />
								{
									// translators: Shown on the button of a step in one of the AI Agent's setup guides while that step is saving.
									__('Saving…', 'extendify-local')
								}
							</span>
						) : (
							primary
						)}
					</button>
				)}
			</div>
		</form>
	);
};

const GAP = 8;
const TILES_PAD = 4;
const SMALLEST_ROW = 0.75;
const TAKEN_OVER = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

const scrollerOf = (node) => {
	for (let at = node?.parentElement; at; at = at.parentElement) {
		if (/(auto|scroll)/.test(getComputedStyle(at).overflowY)) return at;
	}
	return null;
};

// The opening step's tiles shrink, to three quarters of a row at least, so its buttons fit.
// Set on the step, since a step's loading grid gives way to a new one.
const fitTiles = (node, chat) => {
	const tiles = node.querySelector('[data-agentx-tiles]');
	const first = tiles?.firstElementChild;
	if (!first) return;
	const room =
		chat.clientHeight - (node.offsetHeight - tiles.offsetHeight) - GAP;
	if (room >= tiles.offsetHeight) return;
	const smallest = first.offsetHeight * SMALLEST_ROW + TILES_PAD;
	node.style.setProperty(
		'--agentx-tiles-fit',
		`${Math.round(Math.max(room, smallest))}px`,
	);
};

// Measured by hand, since scrollIntoView stops short by the chat's 100px scroll padding.
const belowOf = (node, chat) =>
	node.getBoundingClientRect().bottom -
	chat.getBoundingClientRect().bottom +
	GAP;

export const Step = ({
	step,
	done,
	open,
	idle,
	last,
	chat,
	scrolls,
	onToggle,
	onDone,
}) => {
	const ref = useRef(null);
	const fixed = !step.Tool;

	useEffect(() => {
		const node = ref.current;
		const chat = open ? scrollerOf(node) : null;
		if (!chat) return;
		let pinned = false;
		const show = () => {
			if (!chat.clientHeight) return;
			if (!scrolls) fitTiles(node, chat);
			const below = belowOf(node, chat);
			// A step a load opened stays at the bottom once it needed to be put there.
			if (below > GAP || (pinned && !scrolls)) {
				chat.scrollTop += below;
				pinned = true;
			}
		};
		show();
		// Tiles load after the step opens and push its buttons down, until the user takes over.
		const watch = window.ResizeObserver ? new ResizeObserver(show) : null;
		watch?.observe(node);
		const stop = () => watch?.disconnect();
		for (const name of TAKEN_OVER) {
			chat.addEventListener(name, stop, { passive: true });
		}
		return () => {
			stop();
			for (const name of TAKEN_OVER) chat.removeEventListener(name, stop);
		};
	}, [open]);

	return (
		<li ref={ref} className="group relative">
			{!last && <Connector />}
			<div
				className={`relative rounded-agentx-guide-step transition-[margin,background-color,box-shadow] ${
					open
						? 'my-2 max-w-agentx-card bg-agentx-guide-step shadow-(--agentx-guide-step-shadow) ring-1 ring-inset ring-agentx-guide-step-border'
						: ''
				}`}
			>
				<button
					type="button"
					aria-expanded={fixed ? undefined : open}
					disabled={fixed}
					onClick={onToggle}
					className={`agentx-focus flex w-full gap-3 rounded-agentx-guide-step border-0 bg-transparent px-3 pb-2 text-start text-agentx-guide-ink ${
						open
							? 'items-start pt-3'
							: `items-center pt-2 ${fixed ? '' : 'hover:bg-agentx-guide-step-hover'}`
					}`}
				>
					<Circle step={step} done={done} open={open} idle={idle} />
					<span className="flex min-w-0 flex-1 flex-col">
						<span
							className={`truncate text-agentx-body font-agentx-guide-title ${
								done && !open
									? 'text-agentx-guide-step-done-ink'
									: idle
										? 'text-agentx-guide-idle-ink group-focus-within:text-agentx-guide-ink group-hover:text-agentx-guide-ink'
										: ''
							}`}
						>
							{step.title()}
						</span>
						{open && (
							<span className={GUIDE_CAPTION}>{step.description()}</span>
						)}
						{done && !open && (
							<span className={`truncate ${GUIDE_CAPTION}`}>
								{
									// translators: Shown under a step of the AI Agent's Site Guide that is finished.
									__('Done', 'extendify-local')
								}
							</span>
						)}
					</span>
					{!fixed && (
						<CaretRightIcon
							className={`size-4 shrink-0 text-agentx-guide-muted transition-[rotate,opacity] ${
								open
									? 'mt-2.5 rotate-90'
									: 'opacity-50 group-focus-within:opacity-100 group-hover:opacity-100 rtl:-scale-x-100'
							}`}
						/>
					)}
				</button>
				{open && (
					<Body step={step} chat={chat} takesFocus={scrolls} onDone={onDone} />
				)}
			</div>
		</li>
	);
};

export const Guide = ({ chat }) => {
	const id = useId();
	const { steps: saved, step: chosen } = useGuideStore();
	const demoSteps = useShellStore((state) => state.chatDemo?.guideSteps);
	const steps = demoSteps ?? saved;
	const shown = STEPS.filter((step) => offered(step.id));
	const isDone = ({ id }) => steps[id] === 'done';
	const done = shown.filter(isDone).length;
	const openId =
		chosen === undefined ? shown.find((step) => !isDone(step))?.id : chosen;
	const holds = Boolean(shown.find((step) => step.id === openId)?.draft);
	// One hold across the look and design steps: a save between them outdates the pages the next one loaded.
	useEffect(() => (holds ? holdPicks() : undefined), [holds]);
	const title = decodeEntities(window.extSharedData?.siteTitle ?? '');
	const next = (at) =>
		useGuideStore.setState({
			step: shown.slice(at + 1).find((step) => !isDone(step))?.id ?? null,
		});

	return (
		<section
			data-agentx-guide
			aria-labelledby={`${id}-title`}
			className="flex flex-col pt-4 text-agentx-body text-agentx-guide-ink"
		>
			<div className="flex flex-col gap-1.5 pb-8">
				<h2 className="m-0 flex items-center gap-2 text-agentx-guide-title font-agentx-guide-title">
					<PartyIcon className="size-5 shrink-0 text-agentx-welcome" />
					<span>
						{
							// translators: Heading in the AI Agent's chat the first time it opens on a site it just built.
							__('Your site is ready!', 'extendify-local')
						}
					</span>
				</h2>
				{title && (
					<p className="m-0">
						{sprintf(
							// translators: %s is the site's title. Shown in the AI Agent's chat the first time it opens on a site it just built, over the Site Guide.
							__('%s is built. A few steps make it yours.', 'extendify-local'),
							title,
						)}
					</p>
				)}
			</div>
			<div className="flex items-center gap-2 pb-3">
				<Ring done={done} total={shown.length} />
				<p id={`${id}-title`} className="m-0 flex-1 font-agentx-guide-title">
					{
						// translators: Heading of the AI Agent's Site Guide, a list of steps to finish setting up the site.
						__('Complete website setup', 'extendify-local')
					}
				</p>
				<span className={`shrink-0 tabular-nums ${GUIDE_CAPTION}`}>
					{progressOf(done, shown.length)}
				</span>
			</div>
			<ol className="m-0 flex list-none flex-col gap-1 p-0">
				{shown.map((step, at) => (
					<Step
						key={step.id}
						step={step}
						done={isDone(step)}
						open={step.id === openId}
						idle={Boolean(openId) && step.id !== openId}
						last={at === shown.length - 1}
						chat={chat}
						// The one a load opens may shrink its tiles to fit; one opened later only scrolls.
						scrolls={chosen !== undefined}
						onToggle={() =>
							useGuideStore.setState({
								step: step.id === openId ? null : step.id,
							})
						}
						onDone={() => {
							markDone(step.id, { finishes: at === shown.length - 1 });
							next(at);
						}}
					/>
				))}
			</ol>
		</section>
	);
};

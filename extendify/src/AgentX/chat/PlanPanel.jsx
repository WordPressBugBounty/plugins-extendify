import { StatusLine } from '@agentx/chat/StatusLine';
import { CARD_ACTION } from '@agentx/chat/styles';
import { stepsOf, usePlanStore } from '@agentx/state/plan';
import { useId, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { chevronDown, chevronRight, Icon } from '@wordpress/icons';

const Mark = ({ className = '', children }) => (
	<svg
		viewBox="0 0 16 16"
		fill="none"
		aria-hidden="true"
		className={`mt-0.5 size-4 shrink-0 ${className}`}
	>
		{children}
	</svg>
);

export const MARKS = {
	done: () => (
		<Mark className="text-agentx-plan-done">
			<circle cx="8" cy="8" r="7" fill="currentColor" />
			<path
				d="m5 8.25 2 2 4-4.25"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="stroke-agentx-plan-done-check"
			/>
		</Mark>
	),
	running: () => (
		<Mark className="animate-spin text-agentx-plan-running">
			<circle
				cx="8"
				cy="8"
				r="6.25"
				stroke="currentColor"
				strokeOpacity="0.2"
				strokeWidth="1.5"
			/>
			<path
				d="M8 1.75A6.25 6.25 0 0 1 14.25 8"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</Mark>
	),
	canceled: () => (
		<Mark className="text-agentx-plan-muted">
			<circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
			<path
				d="m5.75 5.75 4.5 4.5m0-4.5-4.5 4.5"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</Mark>
	),
	pending: () => (
		<Mark className="text-agentx-plan-muted">
			<circle
				cx="8"
				cy="8"
				r="6.25"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeDasharray="2.454 2.454"
			/>
		</Mark>
	),
};

const stateLabel = (state) =>
	({
		// translators: Read out by screen readers after a step of the AI Agent's plan, the list of steps it shows, that the user stopped before it was done.
		canceled: __('Stopped', 'extendify-local'),
		// translators: Read out by screen readers after a finished step in the AI Agent's plan, the list of steps it shows above the chat box.
		done: __('Done', 'extendify-local'),
		// translators: Read out by screen readers after the step the AI Agent is working on in its plan, the list of steps it shows above the chat box.
		running: __('In progress', 'extendify-local'),
		// translators: Read out by screen readers after a step the AI Agent hasn't started in its plan, the list of steps it shows above the chat box.
		pending: __('Not started', 'extendify-local'),
	})[state];

const endedLabel = (ended) =>
	({
		// translators: Read out by screen readers after the title of the AI Agent's plan, a list of steps shown in the chat, once the user stopped it before its steps were done. Describes the plan as a whole.
		canceled: __('Canceled', 'extendify-local'),
		// translators: Read out by screen readers after the title of the AI Agent's plan, a list of steps shown in the chat, once it finished every step. Describes the plan as a whole.
		completed: __('Completed', 'extendify-local'),
		// translators: Read out by screen readers after the title of the AI Agent's plan, a list of steps shown in the chat, once it ended on its own before any step was done. Describes the plan as a whole.
		undone: __('Not done', 'extendify-local'),
	})[ended];

// A plan from before titles has none.
const titleOf = (title) =>
	title ||
	// translators: Title of the list of steps the AI Agent plans to take for the user's request, when the plan has no title of its own. A noun, as in "the plan".
	__('Plan', 'extendify-local');

const finalTitle = ({ title, titleDone }, ended) =>
	titleOf(ended === 'completed' ? titleDone || title : title);

// A step going block by block shows each block under it, so the user sees which one it's on.
const blocksOf = ({ parts = [], names, together, state, done = 0 }) =>
	parts.length > 1 && !together && names
		? parts.map((key, at) => ({
				key,
				name: names[key],
				state:
					state === 'done' || at < done
						? 'done'
						: state === 'running' && at === done
							? 'running'
							: state === 'canceled'
								? 'canceled'
								: 'pending',
			}))
		: [];

export const BOX =
	'rounded-agentx-plan border border-solid border-agentx-plan-border bg-agentx-plan p-3 text-agentx-body text-agentx-plan-ink shadow-(--agentx-plan-shadow) backdrop-blur-(--agentx-plan-blur)';

const Step = ({ step, doubted = false }) => {
	const { title, state } = step;
	// Steps after the plan's rewrite may change, so none of them shows as running.
	const shown = doubted && state === 'running' ? 'pending' : state;
	const StateMark = MARKS[shown];
	// Only the step being worked on opens, so the card shows where the plan is.
	const blocks = shown === 'running' ? blocksOf(step) : [];
	const muted = doubted || shown === 'done';
	return (
		<li className="flex flex-col gap-1.5">
			<span
				className={`flex items-start gap-2 ${muted ? 'text-agentx-plan-muted' : ''}`}
			>
				<StateMark />
				<span className="min-w-0 break-words">{title}</span>
				<span className="sr-only">{stateLabel(shown)}</span>
			</span>
			{blocks.length > 0 && (
				<ol className="m-0 flex list-none flex-col gap-1.5 p-0 ps-6">
					{blocks.map(({ key, name, state: now }) => {
						const BlockMark = MARKS[now];
						return (
							<li
								key={key}
								className={`flex items-start gap-2 ${muted || now === 'done' ? 'text-agentx-plan-muted' : ''}`}
							>
								<BlockMark />
								<span className="min-w-0 break-words">{name}</span>
								<span className="sr-only">{stateLabel(now)}</span>
							</li>
						);
					})}
				</ol>
			)}
		</li>
	);
};

export const PlanPanel = ({
	title,
	steps,
	onStop,
	adjusting = false,
	doing,
}) => {
	const heading = useId();
	// The rewrite takes the place of every step not done, so its line sits where they start.
	const at = adjusting ? steps.findIndex(({ state }) => state !== 'done') : -1;
	const before = at === -1 ? steps : steps.slice(0, at);
	const after = at === -1 ? [] : steps.slice(at);
	return (
		<section
			aria-labelledby={heading}
			className={`flex flex-col gap-1.5 ${BOX}`}
		>
			<div className="flex min-h-6 items-center justify-between gap-2">
				<p
					id={heading}
					className="m-0 min-w-0 break-words font-agentx-plan-title"
				>
					{titleOf(title)}
				</p>
				{onStop && (
					<button
						type="button"
						onClick={onStop}
						// The chat box's own Stop, for the reply, can show at the same time.
						aria-label={
							// translators: Screen reader name of the Stop button on the AI Agent's plan, the list of steps above the chat box. It ends the plan before its steps are done.
							__('Stop the plan', 'extendify-local')
						}
						className={CARD_ACTION}
					>
						<span
							aria-hidden="true"
							className="size-2 rounded-[1px] bg-current"
						/>
						{
							// translators: Words on the button that ends the AI Agent's plan, the list of steps above the chat box, before its steps are done.
							__('Stop', 'extendify-local')
						}
					</button>
				)}
			</div>
			<ol className="m-0 flex list-none flex-col gap-1.5 p-0">
				{before.map((step) => (
					<Step key={step.id} step={step} />
				))}
				{adjusting && (
					<li className="flex items-start gap-2">
						<MARKS.running />
						<span className="min-w-0 break-words">
							{
								// translators: Shown in place of the steps not done yet in the AI Agent's plan, a list of steps in the chat, while it rewrites them after the user asked for a change or a step couldn't be done.
								__('Making plan adjustments', 'extendify-local')
							}
						</span>
					</li>
				)}
				{after.map((step) => (
					<Step key={step.id} step={step} doubted />
				))}
				{doing && (
					<li className="flex items-start gap-2">
						<MARKS.running />
						<StatusLine
							text={doing}
							as="span"
							className="min-w-0 break-words"
						/>
					</li>
				)}
			</ol>
		</section>
	);
};

// A tool line like any other: closed until clicked, and never folded into "N steps".
export const PlanEnded = ({ title, titleDone, ended, steps }) => {
	const [open, setOpen] = useState(false);
	return (
		<section
			aria-label={finalTitle({ title, titleDone }, ended)}
			className="flex flex-col gap-2 text-agentx-body"
		>
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen(!open)}
				className="agentx-focus -mx-1 flex w-fit min-w-0 items-start gap-2 rounded-agentx-control border-0 bg-transparent px-1 py-0 text-start text-agentx-body text-agentx-steps"
			>
				<span className="min-w-0 break-words">
					{finalTitle({ title, titleDone }, ended)}
				</span>
				<span className="sr-only">{endedLabel(ended)}</span>
				<Icon
					icon={open ? chevronDown : chevronRight}
					size={16}
					className={`mt-0.5 shrink-0 fill-agentx-steps ${open ? '' : 'rtl:-scale-x-100'}`}
				/>
			</button>
			{open && (
				<ol className="ms-agentx-steps-indent m-0 flex list-none flex-col gap-1.5 border-0 border-s border-solid border-agentx-steps-line p-0 ps-agentx-steps-indent">
					{steps.map(({ id, title: step, state }) => {
						const StateMark = MARKS[state] ?? MARKS.pending;
						return (
							<li key={id} className="flex items-start gap-2 text-agentx-steps">
								<StateMark />
								<span className="min-w-0 break-words">{step}</span>
								<span className="sr-only">{stateLabel(state)}</span>
							</li>
						);
					})}
				</ol>
			)}
		</section>
	);
};

// While it runs it shows over the chat box instead; a restored chat never has it running.
export const PlanInline = ({ part }) => {
	const running = usePlanStore(
		(state) => state.plan?.toolCallId === part.toolCallId,
	);
	// A rewrite of a running plan shows in that plan.
	if (running || part.state !== 'output-available' || part.input?.revises) {
		return null;
	}
	const { ended, steps } = part.output ?? {};
	// A rewrite during the plan named it again.
	const title = part.output?.title ?? part.input?.title;
	const titleDone = part.output?.titleDone ?? part.input?.titleDone;
	if (ended) {
		return (
			<PlanEnded
				title={title}
				titleDone={titleDone}
				ended={ended}
				steps={steps ?? stepsOf(part.input)}
			/>
		);
	}
	return <PlanPanel title={title} steps={stepsOf(part.input)} />;
};

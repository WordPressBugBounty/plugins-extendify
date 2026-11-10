import { ImageThumb } from '@agentx/chat/ImageThumb';
import { MapResult } from '@agentx/chat/MapResult';
import { resultViewOf } from '@agentx/chat/results';
import { StatusLine, thinking } from '@agentx/chat/StatusLine';
import { readsBack } from '@agentx/chat/tools';
import { triedLabel } from '@agentx/lib/changes';
import { Spinner } from '@agentx/spinner/Spinner';
import { useState } from '@wordpress/element';
import { _n, sprintf } from '@wordpress/i18n';
import {
	chevronDown,
	chevronRight,
	closeSmall,
	Icon,
	mapMarker,
} from '@wordpress/icons';
import { getToolName } from 'ai';

// Only a failed step carries a mark; one that worked reads like the "N steps" toggle.
const Mark = ({ failed }) =>
	failed && (
		<span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-agentx-step-failed text-agentx-step-failed-ink">
			<Icon icon={closeSmall} size={14} className="fill-current" />
		</span>
	);

export const failedStep = (step) => step.state === 'output-error';

// The page turned it down and the agent went on, so it reads as an attempt, not an error.
const triedStep = (step) => !failedStep(step) && Boolean(step.output?.refused);

// The title is the working label; a backend from before step labels sends only that.
// A result can name what it did, when the user chose another change than the agent's.
const doneOf = ({ output }) =>
	Array.isArray(output?.done)
		? output.done.join(', ') || undefined
		: output?.done;

const labelOf = (step, labels) =>
	(failedStep(step)
		? labels?.failed
		: triedStep(step)
			? (triedLabel(step.input?.ops?.[0]) ?? labels?.failed)
			: (doneOf(step) ?? labels?.done)) ??
	step.title ??
	getToolName(step);

const Chevron = ({ open, className }) => (
	<Icon
		icon={open ? chevronDown : chevronRight}
		size={16}
		className={`${className} ${open ? '' : 'rtl:-scale-x-100'}`}
	/>
);

const Step = ({ step, labels }) => {
	const failed = failedStep(step);
	const View = !failed && !triedStep(step) && resultViewOf(step);
	// A picked picture's step stays folded to its line and thumbnail until clicked.
	// A map folds the same way, to its line and a marker.
	const [toggled, setOpen] = useState(null);
	const open = toggled ?? Boolean(step.expanded);
	const label = labelOf(step, labels);

	if (!View) {
		return (
			<li className="flex items-center gap-2 text-agentx-steps">
				<Mark failed={failed} />
				{label}
			</li>
		);
	}

	return (
		<li className="flex flex-col gap-2">
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen(!open)}
				className="agentx-focus -mx-1 flex w-fit items-center gap-2 rounded-agentx-control border-0 bg-transparent px-1 py-0 text-start text-agentx-body text-agentx-steps"
			>
				<Mark />
				{step.output?.image && (
					<ImageThumb
						image={step.output.image}
						alt=""
						className="size-5 p-px"
					/>
				)}
				{View === MapResult && (
					<Icon
						icon={mapMarker}
						size={20}
						className="shrink-0 fill-agentx-steps p-px"
					/>
				)}
				{label}
				<Chevron open={open} className="fill-agentx-steps" />
			</button>
			{open && <View part={step} />}
		</li>
	);
};

const FINISHED = ['output-available', 'output-error'];
const finished = (step) => FINISHED.includes(step.state);

// An edit's own label needs its input, so until then it reads as Thinking.
const NAMED_BY_INPUT = ['edit-blocks'];

const runningLabel = (step, labels) =>
	labels?.working ??
	(NAMED_BY_INPUT.includes(getToolName(step))
		? thinking()
		: (step.title ?? getToolName(step)));

const Running = ({ step, labels }) => (
	<li className="flex items-center gap-2">
		<Spinner />
		<StatusLine text={runningLabel(step, labels)} as="span" className="" />
	</li>
);

export const Steps = ({ steps: parts, labels, working, status, folds }) => {
	const [toggled, setOpen] = useState(null);
	const open = toggled ?? parts.some((part) => part.expanded);
	// A tool cut off by a Stop never finishes.
	const steps = working ? parts : parts.filter(finished);
	if (!steps.length) return null;
	const running = working && steps.findLast((step) => !finished(step));
	const count = steps.filter(finished).length;
	const doing =
		working &&
		(status ??
			(running
				? runningLabel(running, labels[running.toolCallId])
				: thinking()));

	const list = (
		<ul
			className={`m-0 flex list-none flex-col gap-1.5 p-0 text-agentx-body ${
				steps.length > 1
					? 'ms-agentx-steps-indent border-0 border-s border-solid border-agentx-steps-line ps-agentx-steps-indent'
					: ''
			}`}
		>
			{steps.map((step) =>
				finished(step) ? (
					<Step
						key={step.toolCallId}
						step={step}
						labels={labels[step.toolCallId]}
					/>
				) : (
					<Running
						key={step.toolCallId}
						step={step}
						labels={labels[step.toolCallId]}
					/>
				),
			)}
		</ul>
	);
	// Nothing has finished yet, so there's nothing to open.
	if (working && !count) {
		return (
			<div className="flex items-center gap-2 text-agentx-body">
				<Spinner />
				<StatusLine text={doing} as="span" className="" />
			</div>
		);
	}
	// A lone step never hides behind a toggle once the agent is done.
	if (!working && steps.length === 1 && !folds) return list;
	// What the run ended on is what the user asked for, so it never folds away.
	const last = steps.at(-1);
	if (!working && !last.leads && !readsBack(getToolName(last), last.output)) {
		return (
			<div className="flex flex-col gap-2">
				<Steps steps={steps.slice(0, -1)} labels={labels} folds />
				<Steps steps={[last]} labels={labels} />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen(!open)}
				className={`agentx-focus -mx-1 flex w-fit items-center gap-2 rounded-agentx-control border-0 bg-transparent px-1 py-0 text-start text-agentx-body ${
					working ? 'text-agentx-ink' : 'text-agentx-steps'
				}`}
			>
				{working ? (
					<>
						<Spinner />
						<StatusLine text={doing} as="span" className="" />
					</>
				) : (
					sprintf(
						// translators: %d is how many steps the AI Agent took, like reading the site, before its reply. A button that shows or hides the list of steps.
						_n('%d step', '%d steps', count, 'extendify-local'),
						count,
					)
				)}
				<Chevron
					open={open}
					className={working ? 'fill-agentx-steps' : 'fill-current'}
				/>
			</button>
			{open && list}
		</div>
	);
};

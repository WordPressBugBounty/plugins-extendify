import { PlanEnded, PlanPanel } from '@agentx/chat/PlanPanel';
import { stopRestyle, useRestyleStore } from '@agentx/lib/restyle';

// A restored chat has only the call and its answer, so the steps' states come from those.
const stepsOf = ({ input, output }) =>
	(input?.steps ?? []).map(({ id, title, state }) => ({
		id,
		title,
		state: output
			? output.done?.includes(id)
				? 'done'
				: 'canceled'
			: (state ?? 'pending'),
	}));

export const RestylePlan = ({ part }) => {
	const run = useRestyleStore((state) => state.runs[part.toolCallId]);
	const { title, titleDone } = part.input ?? {};
	const steps = run?.steps ?? stepsOf(part);
	const ended =
		run?.ended ??
		(part.output && (part.output.stopped ? 'canceled' : 'completed'));
	if (ended) {
		return (
			<PlanEnded
				title={title}
				titleDone={titleDone}
				ended={ended}
				steps={steps}
			/>
		);
	}
	return (
		<PlanPanel
			title={title}
			steps={steps}
			onStop={run && !run.stopping ? () => stopRestyle(part.toolCallId) : null}
		/>
	);
};

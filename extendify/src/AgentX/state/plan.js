import { movedId } from '@agentx/lib/block-ids';
import { useDraftStore } from '@agentx/state/draft';
import { create } from 'zustand';

// The plan above the chat box; once it ends, its reply shows it instead.
// The one last stopped, completed or undone stays named, so its reply's wrap-up says so.
// Stopped is the user's own Stop; undone is a plan that ended on its own with nothing done.
export const usePlanStore = create(() => ({
	plan: null,
	// Plan mode's progress before its plan comes.
	planning: null,
	stopped: null,
	completed: null,
	undone: null,
}));

// A step runs one edit per part, or one with nothing picked when it has none.
export const editsOf = ({ parts }) => Math.max(parts.length, 1);

export const planningWith = (data) =>
	usePlanStore.setState(({ planning }) => ({
		planning: { steps: [], ...planning, ...data },
	}));

export const stopPlanning = () => usePlanStore.setState({ planning: null });

export const stepsOf = ({ steps }) =>
	steps.map(
		({
			id,
			title,
			prompt,
			parts,
			together,
			move,
			wrap,
			order,
			names,
			adds,
			items,
			form,
			copies,
			fix,
			piece,
			stack,
			styleFrom,
			styleOnly,
		}) => ({
			id,
			title,
			prompt: prompt ?? '',
			parts: parts ?? [],
			state: 'pending',
			done: 0,
			...(together && { together: true }),
			...(move && { move }),
			...(wrap && { wrap }),
			...(order && { order }),
			...(names && { names }),
			...(adds && { adds: true }),
			...(items && { items: true }),
			...(form && { form }),
			...(copies && { copies: true }),
			...(fix && { fix }),
			...(piece && { piece: true }),
			...(stack && { stack: true }),
			...(styleFrom && { styleFrom }),
			...(styleOnly && { styleOnly }),
		}),
	);

// Ids are positions that each edit can shift, so a plan names its blocks by key and keeps each key's id now.
const keyed = (input, taken = 0) => {
	const ids = {};
	const keys = new Map();
	const keyOf = (id) => {
		if (!id) return null;
		if (!keys.has(id)) {
			const key = `k${taken + keys.size + 1}`;
			keys.set(id, key);
			ids[key] = id;
		}
		return keys.get(id);
	};
	const steps = stepsOf(input).map((step) => ({
		...step,
		parts: step.parts.map(keyOf),
		...(step.move && { move: { ...step.move, next: keyOf(step.move.next) } }),
		...(step.wrap && { wrap: step.wrap.map((ids) => ids.map(keyOf)) }),
		// By key, so a block dropping out of the step never shifts the others' names.
		...(step.names && {
			names: Object.fromEntries(
				step.parts.map((id, at) => [keyOf(id), step.names[at]]),
			),
		}),
		...(step.order && {
			order: step.order.map(({ holder, blocks }) => ({
				holder: keyOf(holder),
				blocks: blocks.map(keyOf),
			})),
		}),
	}));
	return { steps, ids, part: keyOf(input.part) };
};

// The block a key names as the page has it now, null once it's gone.
export const idOf = (plan, key) => (key ? (plan?.ids?.[key] ?? null) : null);

export const wrapOf = (plan, step) =>
	step.wrap?.map((keys) => keys.map((key) => idOf(plan, key)));

export const orderOf = (plan, step) =>
	step.order?.map(({ holder, blocks }) => ({
		holder: idOf(plan, holder),
		blocks: blocks.map((key) => idOf(plan, key)),
	}));

// sent is the edit out for the running step, which its own reply has to answer.
export const showPlan = (toolCallId, input) => {
	const { steps, ids, part } = keyed(input);
	usePlanStore.setState({
		planning: null,
		plan: {
			toolCallId,
			title: input.title ?? '',
			titleDone: input.titleDone ?? '',
			ask: input.ask ?? '',
			// What the plan works on, which plan edit reads again on every rewrite.
			part,
			steps,
			ids,
			sent: null,
			revision: 0,
			backs: 0,
			// Rewrites after a step added blocks, which don't count toward giving up.
			adds: 0,
			typed: 0,
			startVersion: useDraftStore.getState().current,
			// A message typed during the plan that the user chose to send once it ends.
			later: '',
		},
	});
};

// Plan edit's steps take the place of every step not done; one partly done keeps what it changed.
export const revisePlan = (input) =>
	usePlanStore.setState(({ plan }) => {
		if (!plan) return {};
		const revision = plan.revision + 1;
		// A step that ended not done keeps its why, which the closing line says.
		const kept = plan.steps
			.filter(
				({ state, done }) =>
					state === 'done' || state === 'canceled' || done > 0,
			)
			.map((step) =>
				step.state === 'canceled'
					? step
					: {
							...step,
							state: 'done',
							parts:
								step.state === 'done'
									? step.parts
									: step.parts.slice(0, step.done),
						},
			);
		// Plan edit can list a done part again, which would apply the same change twice.
		const doneWith = new Set(
			plan.steps.flatMap(({ prompt, parts, done }) =>
				parts
					.slice(0, done)
					.map((key) => `${prompt.toLowerCase()}|${idOf(plan, key)}`),
			),
		);
		// Plan edit read the page now, so its ids get keys of their own.
		const fresh = keyed(input, Object.keys(plan.ids).length);
		// Plan edit sends a step it keeps without its blocks' names, so they carry over by block.
		const named = new Map(
			plan.steps.flatMap(({ names = {} }) =>
				Object.entries(names).map(([key, name]) => [idOf(plan, key), name]),
			),
		);
		const added = fresh.steps.flatMap((step) => {
			const parts = step.parts.filter(
				(key) =>
					!doneWith.has(`${step.prompt.toLowerCase()}|${fresh.ids[key]}`),
			);
			if (step.parts.length && !parts.length) return [];
			const names =
				step.names ??
				(parts.length > 1 && parts.every((key) => named.has(fresh.ids[key]))
					? Object.fromEntries(
							parts.map((key) => [key, named.get(fresh.ids[key])]),
						)
					: undefined);
			return [
				{
					...step,
					parts,
					id: `r${revision}-${step.id}`,
					...(names && { names }),
				},
			];
		});
		return {
			plan: {
				...plan,
				// Plan edit names the whole task again, its kept steps with the new.
				title: input.title || plan.title,
				titleDone: input.titleDone || plan.titleDone,
				steps: [...kept, ...added],
				ids: { ...plan.ids, ...fresh.ids },
				sent: null,
				revision,
			},
		};
	});

export const markDuring = () =>
	usePlanStore.setState(({ plan }) =>
		plan
			? { plan: { ...plan, sent: { during: true }, typed: plan.typed + 1 } }
			: {},
	);

export const markLater = (text) =>
	usePlanStore.setState(({ plan }) =>
		plan ? { plan: { ...plan, sent: null, later: text } } : {},
	);

export const markSentBack = ({ added = false } = {}) =>
	usePlanStore.setState(({ plan }) =>
		plan
			? {
					plan: {
						...plan,
						sent: { edit: true, ...(added && { added: true }) },
						backs: plan.backs + 1,
						adds: plan.adds + (added ? 1 : 0),
					},
				}
			: {},
	);

// A look again after an add that changed nothing leaves the steps as they were.
export const resumePlan = () =>
	usePlanStore.setState(({ plan }) =>
		plan ? { plan: { ...plan, sent: null } } : {},
	);

// A step that copied a block leaves later steps on what it copied working on the copy too.
export const addCopies = (copies, nameOf) =>
	usePlanStore.setState(({ plan }) => {
		if (!plan || !copies.length) return {};
		const ids = { ...plan.ids };
		const copyOf = (id) =>
			copies
				.map(({ from, to }) =>
					id === from
						? to
						: id?.startsWith(`${from}.`)
							? `${to}${id.slice(from.length)}`
							: null,
				)
				.find(Boolean) ?? null;
		const keyFor = (id) => {
			const key = `k${Object.keys(ids).length + 1}`;
			ids[key] = id;
			return key;
		};
		const steps = plan.steps.map((step) => {
			// A move, wrap, reorder or add is planned on exact blocks.
			// A copy step given earlier copies would copy each of them too.
			if (
				step.state !== 'pending' ||
				step.move ||
				step.wrap ||
				step.order ||
				step.adds ||
				step.copies
			) {
				return step;
			}
			const has = new Set(step.parts.map((key) => ids[key]));
			const added = [];
			const parts = step.parts.flatMap((key) => {
				const copy = copyOf(ids[key]);
				if (!copy || has.has(copy)) return [key];
				has.add(copy);
				const made = keyFor(copy);
				added.push(made);
				return [key, made];
			});
			if (!added.length) return step;
			return {
				...step,
				parts,
				...(step.names && {
					names: {
						...step.names,
						...Object.fromEntries(added.map((key) => [key, nameOf(ids[key])])),
					},
				}),
			};
		});
		return { plan: { ...plan, ids, steps } };
	});

export const nextEdit = (plan) => {
	const step =
		plan?.steps.find(({ state }) => state === 'running') ??
		plan?.steps.find(({ state }) => state === 'pending');
	return step ? { step, part: idOf(plan, step.parts[step.done]) } : null;
};

// The part a plan began on can be one picked for an earlier question.
export const lastEdit = (plan) => {
	const step = plan?.steps.findLast(({ state }) => state === 'done');
	const part = step ? idOf(plan, step.parts.at(-1)) : null;
	return part ? { step, part } : null;
};

// Each edit says which ids it moved, which keeps every key on its block; a block gone drops from its step.
export const remapParts = (moves) =>
	usePlanStore.setState(({ plan }) => {
		if (!plan || !moves.length) return {};
		const now = (id) => moves.reduce((at, ids) => at && movedId(at, ids), id);
		const ids = Object.fromEntries(
			Object.entries(plan.ids).map(([key, id]) => [key, id && now(id)]),
		);
		const live = (key) => Boolean(ids[key]);
		const steps = plan.steps.map((step) => {
			if (step.state === 'done') return step;
			const parts = step.parts.filter(live);
			// With every block it works on, or the one a move goes beside, gone, plan edit takes the step.
			const gone =
				(step.parts.length > 0 && !parts.length) ||
				(step.move && !live(step.move.next)) ||
				step.wrap?.some((ids) => !ids.every(live)) ||
				step.order?.some(
					({ holder, blocks }) => !live(holder) || !blocks.every(live),
				);
			return { ...step, parts, ...(gone && { gone: true }) };
		});
		return { plan: { ...plan, ids, steps } };
	});

const MOST_BATCH = 8;

// An add, a placed form, a rewrite of items, a fixEdit, a piece's CSS or a copied look is an edit of its own, never batched.
const alone = (step) =>
	step.adds ||
	step.copies ||
	step.form ||
	step.items ||
	step.fix ||
	step.piece ||
	step.styleFrom;

// The run of single-block steps from the next one on, on blocks of their own, made in one edit when each can be.
export const batchOf = (plan) => {
	const next = nextEdit(plan);
	if (!next) return [];
	// One request makes one change, so "undo that" takes back the whole step.
	const several =
		next.step.parts.length - next.step.done > 1 &&
		!next.step.adds &&
		!next.step.copies &&
		!next.step.piece &&
		!next.step.styleFrom;
	if (next.step.together || several) {
		return next.step.parts
			.slice(next.step.done, next.step.done + MOST_BATCH)
			.map((key) => ({ ...next.step, parts: [idOf(plan, key)] }));
	}
	const at = plan.steps.indexOf(next.step);
	const run = [];
	const parts = new Set();
	for (const step of plan.steps.slice(at)) {
		const part = idOf(plan, step.parts[0]);
		if (step.done || step.parts.length !== 1 || !part || parts.has(part)) {
			break;
		}
		if (alone(step) && run.length) break;
		if (step !== next.step && step.state !== 'pending') break;
		parts.add(part);
		run.push({ ...step, parts: [part] });
		if (alone(step) || run.length === MOST_BATCH) break;
	}
	return run;
};

// The steps one edit made, each listed once per block it made.
export const markMade = (ids) =>
	usePlanStore.setState(({ plan }) => {
		if (!plan?.sent) return {};
		const steps = plan.steps.map((step) => {
			const made = ids.filter((id) => id === step.id).length;
			if (!made) return step;
			const done = step.done + made;
			return {
				...step,
				done,
				state: done >= editsOf(step) ? 'done' : 'running',
			};
		});
		return { plan: { ...plan, steps, sent: null } };
	});

// A step sent again after a batch left it out would read that batch's reply as its own, and send forever.
export const markSent = (sent) =>
	usePlanStore.setState(({ plan }) => {
		if (!plan) return {};
		const steps = plan.steps.map((step) =>
			step.id === sent.step ? { ...step, state: 'running' } : step,
		);
		const sends = (plan.sends ?? 0) + 1;
		return { plan: { ...plan, steps, sent: { ...sent, send: sends }, sends } };
	});

export const markEdited = ({ already } = {}) =>
	usePlanStore.setState(({ plan }) => {
		if (!plan?.sent) return {};
		const steps = plan.steps.map((step) => {
			if (step.id !== plan.sent.step) return step;
			const done = step.done + 1;
			return {
				...step,
				done,
				...(already && { same: (step.same ?? 0) + 1, already }),
				state: done >= editsOf(step) ? 'done' : 'running',
			};
		});
		return { plan: { ...plan, steps, sent: null } };
	});

// The agent couldn't do the step and rewriting the plan has been tried already, so it
// ends not done carrying why, which the plan's closing line says.
export const markNotDone = (why) =>
	usePlanStore.setState(({ plan }) => {
		if (!plan?.sent) return {};
		const steps = plan.steps.map((step) =>
			step.id === plan.sent.step ? { ...step, state: 'canceled', why } : step,
		);
		return { plan: { ...plan, steps, sent: null } };
	});

// The step sent back has no other way, so it ends not done carrying why and the plan goes on.
export const markBackNotDone = (why) =>
	usePlanStore.setState(({ plan }) => {
		if (!plan?.sent?.edit) return {};
		const steps = plan.steps.map((step) =>
			step.state === 'running' ? { ...step, state: 'canceled', why } : step,
		);
		return { plan: { ...plan, steps, sent: null } };
	});

// The user closed the step's card, so it ends not done and the next one goes.
export const markSkipped = () =>
	usePlanStore.setState(({ plan }) => {
		if (!plan?.sent) return {};
		const steps = plan.steps.map((step) =>
			step.id === plan.sent.step ? { ...step, state: 'canceled' } : step,
		);
		return { plan: { ...plan, steps, sent: null } };
	});

// Its card read Completed over a plan whose only step was canceled.
// A step whose every part already showed what it asked changed nothing.
export const madeIn = ({ state, done = 0, same = 0 }) =>
	state === 'done' && same < Math.max(done, 1);

export const endOf = (plan, next) =>
	next || !plan.steps.some(madeIn) ? 'undone' : 'completed';

export const completePlan = () =>
	usePlanStore.setState(({ plan }) => ({
		plan: null,
		completed: plan?.toolCallId ?? null,
	}));

export const stopPlan = () =>
	usePlanStore.setState(({ plan }) => ({
		plan: null,
		stopped: plan?.toolCallId ?? null,
	}));

export const endPlanUndone = () =>
	usePlanStore.setState(({ plan }) => ({
		plan: null,
		undone: plan?.toolCallId ?? null,
	}));

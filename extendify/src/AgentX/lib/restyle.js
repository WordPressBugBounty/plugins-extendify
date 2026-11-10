import { KINDS, SPEEDS } from '@agentx/guide/DesignStep';
import { BLOCK, BLOCK_TYPE, siteFrame } from '@agentx/lib/block-box';
import { designOptions, pickStyle, shownPick } from '@agentx/lib/design';
import { keepMade } from '@agentx/lib/made-colors';
import { saveSetting } from '@agentx/lib/settings';
import { useDraftStore } from '@agentx/state/draft';
import { useSettingsStore } from '@agentx/state/settings';
import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';

// Each restyle's steps as they run, by its tool call, for the plan that shows them.
export const useRestyleStore = create(() => ({ runs: {} }));

const update = (call, change) =>
	useRestyleStore.setState(({ runs }) => ({
		runs: { ...runs, [call]: { ...runs[call], ...change(runs[call]) } },
	}));

const stepTo = (call, id, state) =>
	update(call, ({ steps }) => ({
		steps: steps.map((step) => (step.id === id ? { ...step, state } : step)),
	}));

export const stopRestyle = (call) => update(call, () => ({ stopping: true }));

const animations = () => [
	{ id: `none:${SPEEDS[1].id}`, title: KINDS[0].title() },
	...KINDS.slice(1).flatMap((kind) =>
		SPEEDS.map((speed) => ({
			id: `${kind.id}:${speed.id}`,
			title: `${kind.title()}, ${speed.title()}`,
		})),
	),
];

// The agent offers only shapes on both its own list and this one.
const shapes = () => window.extAgentXData?.shapes ?? {};

// A block edit takes one section's edges off apart from the style's, so the agent tells the two apart.
const edgesOff = () =>
	[
		...(siteFrame()?.contentDocument?.querySelectorAll('.ext-no-edges') ?? []),
	].map((section) => ({
		id: section.getAttribute(BLOCK),
		type: section.getAttribute(BLOCK_TYPE),
		heading: (
			section.querySelector('h1, h2, h3, h4, h5, h6')?.textContent ?? ''
		)
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 60),
	}));

// What the design card offers, so the agent's look picks among options the site has.
export const readDesign = async () => {
	const draft = useDraftStore.getState();
	const [fonts, vibes] = await Promise.all(
		['fonts', 'vibe'].map((layer) => designOptions(layer).catch(() => null)),
	);
	const shown = (layer, list) =>
		(list && shownPick(draft, layer, list)) || undefined;
	return {
		fonts: (fonts?.options ?? []).map(({ id, title, fonts: pair }) => ({
			id,
			title,
			...(pair?.heading && { heading: pair.heading, body: pair.body }),
		})),
		vibes: (vibes?.options ?? []).map(({ id, title }) => ({ id, title })),
		animations: animations(),
		makesStyles: true,
		makesFonts: true,
		shapes: shapes(),
		current: {
			fonts: shown('fonts', fonts),
			vibe: shown('vibe', vibes),
			animation: draft.animation || draft.liveAnimation || undefined,
		},
	};
};

// A served style has no touches to read.
export const readStyle = async () => {
	const draft = useDraftStore.getState();
	const vibes = await designOptions('vibe').catch(() => null);
	const id = (vibes && shownPick(draft, 'vibe', vibes)) || null;
	// The agent writes CSS for a look no touch gives only to a build that applies it.
	const read = {
		vibe: id,
		takesCss: true,
		shapes: shapes(),
		edgesOff: edgesOff(),
	};
	if (!id?.startsWith('made:')) return { style: null, ...read };
	const { style } = await apiFetch({
		path: `/extendify/v1/agentx/design/made-style?id=${encodeURIComponent(id)}`,
	}).catch(() => ({ style: null }));
	return { style, ...read };
};

// Picking the saved animation again drops the pick, as the design card does.
const pickOf = (layer, id) =>
	layer === 'animation' && id === useDraftStore.getState().liveAnimation
		? ''
		: id;

// One pick at a time, each on the site before the next, so the plan reads as it lands.
export const restyleSite = async (
	{ title, titleDone, steps, made, styles, fonts, canvas },
	{ toolCallId },
) => {
	useRestyleStore.setState(({ runs }) => ({
		runs: {
			...runs,
			[toolCallId]: {
				title,
				titleDone,
				steps: steps.map(({ id, title: step }) => ({
					id,
					title: step,
					state: 'pending',
				})),
			},
		},
	}));
	const [schemes, madeStyles, madeFonts] = await Promise.all([
		made ? keepMade(made).catch(() => null) : null,
		styles ? keepMade(styles, { layer: 'vibe' }).catch(() => null) : null,
		fonts ? keepMade(fonts, { layer: 'fonts' }).catch(() => null) : null,
	]);
	const keptFor = { colors: schemes, vibe: madeStyles, fonts: madeFonts };
	// A look not for the effect shown over the site takes it off, unasked.
	if (canvas === null && useSettingsStore.getState().canvas) {
		await saveSetting('canvas', null).catch(() => {});
	}
	const done = [];
	for (const step of steps) {
		if (useRestyleStore.getState().runs[toolCallId]?.stopping) {
			update(toolCallId, ({ steps: shown }) => ({
				ended: 'canceled',
				steps: shown.map((each) =>
					each.state === 'pending' ? { ...each, state: 'canceled' } : each,
				),
			}));
			return { done, stopped: true };
		}
		const option = keptFor[step.layer]?.options[step.made ?? 0];
		// A style step also names a served style, for when its made one can't be built.
		const pick =
			step.layer === 'colors' || step.made !== undefined
				? (option?.id ?? step.pick)
				: step.pick;
		if (!pick) {
			stepTo(toolCallId, step.id, 'canceled');
			continue;
		}
		stepTo(toolCallId, step.id, 'running');
		try {
			await pickStyle(step.layer, pickOf(step.layer, pick), {
				colors: option?.colors,
			});
			stepTo(toolCallId, step.id, 'done');
			done.push(step.id);
		} catch {
			stepTo(toolCallId, step.id, 'canceled');
		}
	}
	update(toolCallId, () => ({ ended: 'completed' }));
	return { done };
};

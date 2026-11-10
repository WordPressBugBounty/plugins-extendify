import { create } from 'zustand';

const shown = window.extAgentXData?.draft;

export const useDraftStore = create((set) => ({
	version: shown?.version ?? 0,
	variation: shown?.variation ?? '',
	colors: shown?.colors ?? '',
	fonts: shown?.fonts ?? '',
	vibe: shown?.vibe ?? '',
	animation: shown?.animation ?? '',
	layout: shown?.layout ?? '',
	liveAnimation: shown?.liveAnimation ?? 'none:medium',
	unsaved: shown?.unsaved ?? false,
	current: shown?.current ?? 0,
	versions: shown?.versions ?? [],
	locks: shown?.locks ?? [],
	clashes: shown?.clashes ?? [],
	presence: null,
	// The chat request the agent is working on, which each draft write records.
	request: null,
	notice: shown?.drift ?? null,
	// A merge that applied every edit says so for a moment, and the bar stays to show it.
	applied: false,
	setApplied: (applied) => set({ applied }),
	// Opening the shell checked the draft.
	checkedAt: Date.now(),
	// Saves so far. The design lists read the site as it is saved, so this is what they turn on.
	saves: 0,
	setVariation: (variation) => set({ variation }),
	// Picks sent but not answered yet, which an earlier call's answer must not undo.
	pending: {},
	// Each layer's last pick, and the history entry it stood on.
	clicks: {},
	setPick: (layer, pick) =>
		set((state) => ({
			[layer]: pick,
			pending: { ...state.pending, [layer]: pick },
		})),
	// True when this was the newest pick, so the caller may correct it.
	settlePick: (layer, pick) => {
		const { pending } = useDraftStore.getState();
		if (pending[layer] !== pick) return false;
		const { [layer]: _settled, ...rest } = pending;
		set({ pending: rest });
		return true;
	},
	// A notice stays until dismissed, so a later answer can't hide it unread.
	receive: ({
		version,
		variation,
		colors = '',
		fonts = '',
		vibe = '',
		animation = '',
		layout = '',
		liveAnimation = 'none:medium',
		unsaved,
		current,
		versions,
		locks,
		clashes = [],
		drift,
	}) =>
		set((state) => ({
			version,
			variation,
			colors,
			fonts,
			vibe,
			animation,
			layout,
			liveAnimation,
			...state.pending,
			unsaved,
			current,
			versions,
			locks,
			clashes,
			notice: drift ?? state.notice,
		})),
	dismiss: () => set({ notice: null }),
}));

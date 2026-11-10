import { create } from 'zustand';

export const useGuideStore = create(() => ({
	steps: window.extAgentXData?.guide?.steps ?? { build: 'done' },
	// Unset until the user opens or closes one, so a load opens the next step.
	step: undefined,
	// The image sheet a guide step opens, drawn by the chat so it rises from the chat box.
	sheet: null,
}));

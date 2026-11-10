import { create } from 'zustand';

// Null where WooCommerce isn't active or the user can't manage it, so nothing offers the guide.
export const useStoreGuideStore = create(() => ({
	...(window.extAgentXData?.storeGuide ?? { steps: {}, has: {} }),
	available: Boolean(window.extAgentXData?.storeGuide),
	// Unset until the user opens or closes one, so the guide opens its next step.
	step: undefined,
	// Asked for in the chat; it goes in once the run that asked ends.
	opening: false,
}));

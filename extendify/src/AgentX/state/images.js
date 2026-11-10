import { create } from 'zustand';

// The page's data predates any logo or icon the agent sets.
export const useImagesStore = create(() => ({
	...window.extAgentXData?.refreshes?.images,
}));

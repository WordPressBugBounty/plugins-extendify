import { create } from 'zustand';

// The site's pages and dashboard screens the agent may open; a plugin installed in the chat adds screens.
export const useScreensStore = create(() => ({
	screens: window.extAgentXData?.screens ?? [],
}));

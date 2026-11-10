import { create } from 'zustand';

const { plugins, abilities = [], summary } = window.extAgentXData ?? {};

// Replaced after an install, so a new plugin's abilities, and what the site now sells, ride the next message.
export const usePluginsStore = create(() => ({
	plugins: { installed: [], recommended: [], canInstall: false, ...plugins },
	abilities,
	summary,
}));

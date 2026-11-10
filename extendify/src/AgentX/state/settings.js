import { create } from 'zustand';

// What each setting is now, since a step's view unmounts when it closes and a later step may change it.
export const useSettingsStore = create(() => ({
	...window.extAgentXData?.settings,
}));

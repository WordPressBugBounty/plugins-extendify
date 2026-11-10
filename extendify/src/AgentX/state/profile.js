import { create } from 'zustand';

// The profile's About and tone; its name and tagline are the site's own settings.
export const useProfileStore = create(() => ({
	...window.extAgentXData?.profile,
}));

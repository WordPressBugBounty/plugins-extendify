import { create } from 'zustand';

// The contact details the site shows, kept as the agent replaces them.
export const useBusinessStore = create(() => ({
	...window.extAgentXData?.business,
}));

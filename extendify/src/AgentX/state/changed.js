import { create } from 'zustand';

// When each value a refresh card watches last changed, from anywhere, so its cooldown restarts.
export const useChangedStore = create(() =>
	Object.fromEntries(
		Object.entries(window.extAgentXData?.refreshes?.changed ?? {}).map(
			([value, at]) => [value, at * 1000],
		),
	),
);

export const markChanged = (value) =>
	useChangedStore.setState({ [value]: Date.now() });

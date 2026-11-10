import { useDraftStore } from '@agentx/state/draft';
import { useRunStore } from '@agentx/state/run';
import { createContext } from '@wordpress/element';
import { create } from 'zustand';

// True inside the Site Guide's look and design steps, whose picks autosave leaves for Next.
export const HeldPicks = createContext(false);

// A save changes what the steps' other options show, so each pick would render the page again.
export const useHeldPicks = create(() => ({
	hold: null,
	picking: 0,
	versions: [],
}));

const reset = (hold) =>
	useHeldPicks.setState({ hold, picking: 0, versions: [] });

// A message to the agent moves on from the steps, so their picks save as any change does.
export const holdPicks = () => {
	reset({});
	const stop = useRunStore.subscribe(({ working }) => working && reset({}));
	return () => {
		stop();
		reset(null);
	};
};

// Held once sent, since the answer reaches the draft, and autosave, before the pick returns.
export const holdPick = async (call) => {
	const { hold } = useHeldPicks.getState();
	if (!hold) return call();
	const settle = (made) =>
		useHeldPicks.getState().hold === hold &&
		useHeldPicks.setState(({ picking, versions }) => ({
			picking: picking - 1,
			versions: made === undefined ? versions : [...versions, made],
		}));
	useHeldPicks.setState(({ picking }) => ({ picking: picking + 1 }));
	try {
		const result = await call();
		settle(useDraftStore.getState().version);
		return result;
	} catch (error) {
		settle();
		throw error;
	}
};

export const isHeld = (version) =>
	useHeldPicks.getState().versions.includes(version);

import { create } from 'zustand';

const seed = (steps) =>
	Object.fromEntries(
		steps
			.flatMap(({ inputSchema }) => Object.keys(inputSchema.properties ?? {}))
			.map((name) => [name, '']),
	);

// Persisting these would rehydrate a canvas the page can no longer show.
export const useCanvasStore = create((set) => ({
	steps: [],
	activeStep: 0,
	values: {},
	startSession: (steps) => set({ steps, activeStep: 0, values: seed(steps) }),
	endSession: () => set({ steps: [], activeStep: 0, values: {} }),
	setValue: (name, value) =>
		set(({ values }) => ({ values: { ...values, [name]: value } })),
	writeValues: (written) =>
		set(({ values }) => ({ values: { ...values, ...written } })),
	goToStep: (index) =>
		set(({ steps }) => ({
			activeStep: Math.min(Math.max(index, 0), steps.length - 1),
		})),
}));

// Sending every step lets the agent write where the user cannot see.
export const activeCanvasStep = () => {
	const { steps, activeStep, values } = useCanvasStore.getState();
	const inputSchema = steps[activeStep]?.inputSchema ?? null;
	const names = Object.keys(inputSchema?.properties ?? {});
	return {
		inputSchema,
		values: Object.fromEntries(names.map((name) => [name, values[name] ?? ''])),
	};
};

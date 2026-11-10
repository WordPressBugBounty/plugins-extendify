import { create } from 'zustand';

// Requests a reply lined up for the parts of the page it changes one at a time, sent in turn.
// from is that reply, so drawing it again can't line them up twice.
export const useTasksStore = create(() => ({
	tasks: [],
	from: null,
}));

export const lineUpTasks = (from, tasks) => {
	if (useTasksStore.getState().from === from) return false;
	useTasksStore.setState({ from, tasks });
	return true;
};

export const takeTask = () => {
	const [next, ...rest] = useTasksStore.getState().tasks;
	useTasksStore.setState({ tasks: rest });
	return next;
};

export const clearTasks = () => useTasksStore.setState({ tasks: [] });

import { formOf, mergedForm } from '@agentx/chat/forms';
import { useFieldTypesStore } from '@agentx/lib/abilities';
import { create } from 'zustand';

// Forms the user hasn't sent or closed; a message typed past one leaves it open.
export const useFormsStore = create(() => ({ forms: [] }));

// A field card drawn before the site's field types came in shows Type as a text box until they do.
useFieldTypesStore.subscribe(() =>
	useFormsStore.setState(({ forms }) => ({
		forms: forms.map((form) => {
			if (form.tool !== 'wpforms__add-field') return form;
			const drawn = formOf({
				type: `tool-${form.tool}`,
				toolCallId: form.call,
				input: form.input,
			});
			return drawn ? { ...form, fields: drawn.fields } : form;
		}),
	})),
);

const changed = (id, change) =>
	useFormsStore.setState(({ forms }) => ({
		forms: forms.map((form) =>
			form.id === id ? { ...form, ...change(form) } : form,
		),
	}));

export const formFor = (call) =>
	useFormsStore.getState().forms.find((form) => form.call === call);

// True when the one open form for the call's tool and record took its values instead.
export const openForm = (form, answered) => {
	const { forms } = useFormsStore.getState();
	const matches = forms.filter(
		({ tool, call, input }) =>
			tool === form.tool && input?.id === form.input?.id && answered(call),
	);
	const open = matches.length === 1 ? matches[0] : undefined;
	useFormsStore.setState({
		forms: open
			? forms.map((each) =>
					each === open
						? { ...mergedForm(each, form), minimized: false }
						: { ...each, minimized: true },
				)
			: [...forms.map((each) => ({ ...each, minimized: true })), form],
	});
	return Boolean(open);
};

export const editForm = (id, name, value) =>
	changed(id, ({ edits }) => ({ edits: { ...edits, [name]: value } }));

export const refillForms = (tool, values) =>
	useFormsStore.setState(({ forms }) => ({
		forms: forms.map((form) =>
			form.tool === tool
				? {
						...form,
						fields: form.fields.map((field) =>
							field.name in values
								? { ...field, value: values[field.name] }
								: field,
						),
					}
				: form,
		),
	}));

export const minimizeForm = (id) => changed(id, () => ({ minimized: true }));

export const minimizeForms = () =>
	useFormsStore.setState(({ forms }) => ({
		forms: forms.map((form) => ({ ...form, minimized: true })),
	}));

// Two open at once could push the conversation out of the chat.
export const restoreForm = (id) =>
	useFormsStore.setState(({ forms }) => ({
		forms: forms.map((form) => ({ ...form, minimized: form.id !== id })),
	}));

export const dropForm = (id) =>
	useFormsStore.setState(({ forms }) => ({
		forms: forms.filter((form) => form.id !== id),
	}));

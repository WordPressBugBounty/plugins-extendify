import { CARDS } from '@agentx/chat/cards';
import { ABILITY_FORMS } from '@agentx/chat/inline';
import {
	abilityNamed,
	abilityOf,
	formFields,
	isDelete,
	runAbility,
} from '@agentx/lib/abilities';
import { saveProfile } from '@agentx/lib/profile';
import { __ } from '@wordpress/i18n';
import { getToolName } from 'ai';

// Every change with fields waits on the user's Submit, so nothing the agent wrote runs unseen.
const abilityForm = (part) => {
	const name = abilityOf(getToolName(part));
	const ability = name && (part.demoState?.ability ?? abilityNamed(name));
	if (!ability || isDelete(ability)) return null;
	const form = ABILITY_FORMS[name] ?? {};
	const input = part.input ?? {};
	const fields = formFields(ability.inputSchema, input, {
		...form,
		labels: form.labels?.(),
		controls: form.controls?.(input, part.demoState),
	});
	if (!fields.length) return null;
	return {
		title: form.title?.(input) || ability.label,
		fields,
		submitLabel: ability.label,
		input,
	};
};

const CARD_FORMS = ['ask-form', 'edit-site-profile'];

// The cards that stay open when the user types past them; null for any other.
export const formOf = (part) => {
	const tool = getToolName(part);
	const drawn = CARD_FORMS.includes(tool)
		? CARDS[tool](part)
		: abilityForm(part);
	if (!drawn) return null;
	const { title, fields, submitLabel, input, labels } = drawn;
	return {
		id: part.toolCallId,
		call: part.toolCallId,
		tool,
		title,
		fields,
		submitLabel,
		input,
		labels,
		edits: {},
		minimized: false,
	};
};

const named = (fields, name) => fields.find((field) => field.name === name);

// Edits show over a field's value, so only the fields the user hasn't touched change.
export const mergedForm = (form, next) => ({
	...form,
	call: next.call,
	title: next.title,
	submitLabel: next.submitLabel,
	input: next.input && { ...form.input, ...next.input },
	fields: [
		...form.fields.map((field) => {
			const update = named(next.fields, field.name);
			return update
				? { ...field, ...update, value: update.value ?? field.value }
				: field;
		}),
		...next.fields.filter(({ name }) => !named(form.fields, name)),
	],
});

const filledIn = (input) =>
	Object.fromEntries(
		Object.entries(input).filter(([, value]) => value !== '' && value != null),
	);

export const formInput = (form, values) =>
	filledIn({
		...ABILITY_FORMS[abilityOf(form.tool)]?.defaults,
		...form.input,
		...values,
	});

const refused = (error) => ({ refused: error?.message || String(error) });

// Submit is the user's confirmation, so a failure goes back to the agent instead of a retry card.
export const formAnswer = async (form, values) => {
	if (form.tool === 'ask-form') return { values };
	if (form.tool === 'edit-site-profile') {
		return saveProfile(values).catch(refused);
	}
	const input = formInput(form, values);
	try {
		const result = await runAbility(abilityOf(form.tool), input);
		const output =
			typeof result === 'object' && result !== null && !Array.isArray(result)
				? result
				: { result };
		return { ...output, input };
	} catch (error) {
		// The user may have changed what the agent sent, which the refusal is about.
		return { ...refused(error), input };
	}
};

const shown = (value) => {
	if (typeof value !== 'boolean') return String(value);
	return value
		? // translators: A ticked checkbox in the message the AI Agent's form sends, like “We deliver: Yes”.
			__('Yes', 'extendify-local')
		: // translators: An unticked checkbox in the message the AI Agent's form sends, like “We deliver: No”.
			__('No', 'extendify-local');
};

// A form sent after the agent moved on goes as the user's own message: its title, then each answer.
export const formText = ({ title, fields }, values) =>
	[
		title,
		...fields
			.filter(({ name }) => values[name] !== '' && values[name] != null)
			.map(({ name, label }) => `${label}: ${shown(values[name])}`),
	].join('\n');

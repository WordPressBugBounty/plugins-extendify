import { showSaved } from '@agentx/lib/settings';
import { markChanged } from '@agentx/state/changed';
import { useProfileStore } from '@agentx/state/profile';
import { useSettingsStore } from '@agentx/state/settings';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

export const CAPS = { name: 100, tagline: 100, about: 500 };

export const TONES = [
	{
		value: 'professional',
		// translators: A tone of voice for the website's writing, in the AI Agent's site profile form.
		label: __('Professional', 'extendify-local'),
	},
	{
		value: 'friendly',
		// translators: A tone of voice for the website's writing, in the AI Agent's site profile form.
		label: __('Friendly', 'extendify-local'),
	},
	{
		value: 'inspirational',
		// translators: A tone of voice for the website's writing, in the AI Agent's site profile form.
		label: __('Inspirational', 'extendify-local'),
	},
	{
		value: 'informative',
		// translators: A tone of voice for the website's writing, in the AI Agent's site profile form.
		label: __('Informative', 'extendify-local'),
	},
	{
		value: 'persuasive',
		// translators: A tone of voice for the website's writing, in the AI Agent's site profile form.
		label: __('Persuasive', 'extendify-local'),
	},
];

const capped = (text, field) => String(text ?? '').slice(0, CAPS[field]);

export const profileOf = () => {
	const { title, description } = useSettingsStore.getState();
	const { about, tone } = useProfileStore.getState();
	return {
		name: capped(title, 'name'),
		tagline: capped(description, 'tagline'),
		about: capped(about, 'about'),
		tone: tone ?? '',
	};
};

// Saved live like a setting, since the name and tagline skip the draft.
export const saveProfile = async (values) => {
	const before = profileOf();
	const { name, tagline, ...profile } = await apiFetch({
		path: '/extendify/v1/agentx/profile',
		method: 'POST',
		data: values,
	});
	useSettingsStore.setState({ title: name, description: tagline });
	useProfileStore.setState(profile);
	const after = profileOf();
	const changed = Object.keys(after).filter(
		(field) => after[field] !== before[field],
	);
	if (!changed.length) {
		return {
			unchanged: true,
			// translators: A step in the AI Agent's chat, after the user saved the site profile form without changing anything.
			done: __('No changes to your site profile', 'extendify-local'),
		};
	}
	if (changed.includes('name')) markChanged('title');
	if (changed.includes('tagline')) markChanged('description');
	// The site draws only the name and tagline, so the rest needs no reload.
	if (changed.includes('name') || changed.includes('tagline')) {
		await showSaved();
	}
	const only = (fields) =>
		Object.fromEntries(changed.map((field) => [field, fields[field]]));
	return { before: only(before), after: only(after) };
};

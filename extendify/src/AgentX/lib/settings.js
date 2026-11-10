import { check } from '@agentx/lib/draft';
import { showCurrent } from '@agentx/lib/show-draft';
import { markChanged } from '@agentx/state/changed';
import { useSettingsStore } from '@agentx/state/settings';
import { setAvailableNotifications } from '@notifications/available';
import apiFetch from '@wordpress/api-fetch';

const OWN_SETTING = {
	'update-site-visibility': 'visibility',
	'update-search-indexing': 'indexing',
	'update-canvas': 'canvas',
};

export const SETTING_TOOLS = [
	'update-setting',
	'choose-setting',
	...Object.keys(OWN_SETTING),
];

export const settingOf = (name, input) => OWN_SETTING[name] ?? input?.setting;

export const showSaved = () =>
	showCurrent({
		// The browser keeps a frame page for 15 seconds, so the same address would show the old title.
		'extendify-frame': Math.random().toString(36).slice(2),
	});

// Saved live, since a setting change skips the draft.
export const saveSetting = async (setting, value) => {
	const saved = await apiFetch({
		path: '/extendify/v1/agentx/setting',
		method: 'POST',
		data: { setting, value },
	});
	useSettingsStore.setState(
		({ [setting]: _, ...rest }) =>
			saved.offered === false ? rest : { ...rest, [setting]: saved.after },
		true,
	);
	setAvailableNotifications(saved.notifications);
	if (saved.before !== saved.after) {
		markChanged(setting);
		// The server put the change in the history; this brings the row and Undo.
		await check().catch(() => {});
	}
	await showSaved();
	return saved;
};

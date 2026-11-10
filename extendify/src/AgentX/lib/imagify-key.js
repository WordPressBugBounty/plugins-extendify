import { abilityNamed, runAbility } from '@agentx/lib/abilities';

const ACCOUNT = 'imagify/get-account';

export const imagifyKeyValid = async () => {
	if (!abilityNamed(ACCOUNT)) return false;
	const account = await runAbility(ACCOUNT, {}).catch(() => null);
	return account?.is_api_key_valid === true;
};

// One watch at a time: a second install would otherwise leave the first listening for good.
let stopWatching = null;

export const stopImagifyWatch = () => {
	stopWatching?.();
	stopWatching = null;
};

// The key is added on Imagify's own tab; coming back is the only sign of it.
export const watchImagifyKey = (found) => {
	stopImagifyWatch();
	let asking = false;
	const check = async () => {
		if (asking || document.visibilityState === 'hidden') return;
		asking = true;
		const valid = await imagifyKeyValid().catch(() => false);
		asking = false;
		if (!valid || stopWatching !== stop) return;
		stopImagifyWatch();
		found();
	};
	const stop = () => {
		document.removeEventListener('visibilitychange', check);
		window.removeEventListener('focus', check);
	};
	document.addEventListener('visibilitychange', check);
	window.addEventListener('focus', check);
	stopWatching = stop;
	return stop;
};

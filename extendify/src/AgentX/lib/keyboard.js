import { useCallback } from '@wordpress/element';
import { isRTL } from '@wordpress/i18n';

const FOCUSABLE =
	'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])';

export const sheetKeys = (event, sheet, close) => {
	// An Escape that ends an input method's composition isn't meant for the sheet.
	if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
		event.stopPropagation();
		close();
		return;
	}
	if (event.key !== 'Tab') return;
	// Focus stays in the sheet while it's open, the way a dialog keeps it.
	const focusable = [...sheet.querySelectorAll(FOCUSABLE)];
	const edge = event.shiftKey ? focusable[0] : focusable.at(-1);
	if (event.target !== edge && event.target !== sheet) return;
	event.preventDefault();
	(event.shiftKey ? focusable.at(-1) : focusable[0])?.focus();
};

// Focus moves only from an empty chat box, never from a message being written.
export const idle = (active) =>
	!active ||
	active === document.body ||
	(active.tagName === 'TEXTAREA' &&
		!active.value &&
		Boolean(active.closest('#extendify-agentx-chat')));

// A form's first field takes focus, so typing fills it in.
const focusFirst = (card) => {
	const target =
		card?.querySelector('[data-agentx-default]') ??
		card?.querySelector(FOCUSABLE);
	if (!target) return;
	document.documentElement.dataset.agentxKeys = '';
	target.focus();
};

// A choice focused as the card shows reads as already picked, and Enter would pick it.
const focusCard = (card) => card?.focus();

// From the card itself, Down reaches the first choice and Up the last.
export const stepKeys = (event) => {
	const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
	if (!step) return;
	const controls = [...event.currentTarget.querySelectorAll(FOCUSABLE)];
	const onCard = event.target === event.currentTarget;
	const at = onCard
		? step > 0
			? -1
			: controls.length
		: controls.indexOf(event.target);
	const next = at === -1 && !onCard ? null : controls[at + step];
	if (!next) return;
	event.preventDefault();
	document.documentElement.dataset.agentxKeys = '';
	next.focus();
};

// Takes focus as it shows; a demo leaves focus where it is.
export const useCardKeys = (demo, { fields = false } = {}) => ({
	ref: useCallback(
		(card) =>
			!demo &&
			idle(document.activeElement) &&
			(fields ? focusFirst(card) : focusCard(card)),
		[],
	),
	tabIndex: -1,
	onKeyDown: stepKeys,
});

export const tabKeys = (event, ids, current, select, buttons) => {
	const at = ids.indexOf(current);
	const step = {
		[isRTL() ? 'ArrowLeft' : 'ArrowRight']: at + 1,
		[isRTL() ? 'ArrowRight' : 'ArrowLeft']: at - 1,
		Home: 0,
		End: ids.length - 1,
	}[event.key];
	if (step === undefined) return;
	event.preventDefault();
	const next = ids[(step + ids.length) % ids.length];
	select(next);
	buttons[next]?.focus();
};

const MOVES = [
	'Tab',
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
	'PageUp',
	'PageDown',
];
const QUIET = ['Shift', 'Meta', 'Control', 'Alt', 'Escape'];

const inField = (target) =>
	Boolean(target?.closest?.('textarea, input, select, [contenteditable]'));

// Rings show only after keyboard moves, not a click or a message sent with Enter.
export const watchKeyboardMode = () => {
	const root = document.documentElement;
	const onKey = (event) => {
		const field = inField(event.target);
		if (event.key === 'Tab' || (MOVES.includes(event.key) && !field)) {
			root.dataset.agentxKeys = '';
		} else if (field && !QUIET.includes(event.key)) {
			delete root.dataset.agentxKeys;
		}
	};
	const onPointer = () => {
		delete root.dataset.agentxKeys;
	};
	const listen = (target) => {
		target.addEventListener('keydown', onKey, true);
		target.addEventListener('pointerdown', onPointer, true);
	};
	const unlisten = (target) => {
		target.removeEventListener('keydown', onKey, true);
		target.removeEventListener('pointerdown', onPointer, true);
	};
	// Keys pressed in the site reach its own window, which a new page replaces.
	const frame = document.getElementById('extendify-agentx-site');
	let site = null;
	const follow = () => {
		if (site) unlisten(site);
		try {
			site = frame.contentWindow;
			listen(site);
		} catch {
			site = null;
		}
	};
	listen(window);
	frame?.addEventListener('load', follow);
	if (frame) follow();
	return () => {
		unlisten(window);
		if (site) unlisten(site);
		frame?.removeEventListener('load', follow);
		delete root.dataset.agentxKeys;
	};
};

// Words being typed undo their own typing; an empty field, like the idle chat box, has none.
const undoesItself = (target) =>
	Boolean(
		target?.closest?.(
			'[contenteditable]:not([contenteditable="false"]), select',
		) || target?.closest?.('input, textarea')?.value.trim(),
	);

// Cmd/Ctrl+Z and Shift with it undo and redo the draft, as in the block editor.
export const draftKey = (event) => {
	if (event.key?.toLowerCase() !== 'z' || event.altKey) return null;
	if (!(event.metaKey || event.ctrlKey) || undoesItself(event.target)) {
		return null;
	}
	return event.shiftKey ? 'redo' : 'undo';
};

// Return adds a line in a textarea, so this sends from any field.
export const submitOnModEnter = (event) => {
	if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
	event.preventDefault();
	event.currentTarget.requestSubmit();
};

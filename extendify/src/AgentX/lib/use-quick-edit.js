import { editableAt, saveWords, startEditing } from '@agentx/lib/quick-edit';
import { useEffect, useRef, useState } from '@wordpress/element';

const FRAME = 'extendify-agentx-site';

// Double-clicking words in the site frame edits them in place; the frame reloads after a save, so each load binds again.
export const useQuickEdit = ({ enabled = true } = {}) => {
	const [editing, setEditing] = useState(null);
	const [saving, setSaving] = useState(false);
	const [refused, setRefused] = useState(null);
	// A synced pattern's words show on every page using it, so the save waits for a yes.
	const [asks, setAsks] = useState(null);
	const pending = useRef(null);

	const save = async (target, html, options) => {
		setSaving(true);
		const result = await saveWords(target, html, options).catch((error) => ({
			refused: error?.message || 'error',
		}));
		setSaving(false);
		setEditing(null);
		if (result?.confirm) {
			pending.current = { target, html };
			setAsks(result.confirm);
			return;
		}
		if (result?.refused) setRefused(result.refused);
	};

	useEffect(() => {
		if (!enabled) return;
		const frame = document.getElementById(FRAME);
		if (!frame) return;
		let site = null;
		const onDoubleClick = (event) => {
			const target = editableAt(event.target);
			if (!target) return;
			event.preventDefault();
			setRefused(null);
			setAsks(null);
			setEditing(target);
			startEditing(target, {
				onCancel: () => setEditing(null),
				onSave: (html) => save(target, html),
			});
		};
		const bind = () => {
			site?.removeEventListener('dblclick', onDoubleClick);
			site = frame.contentDocument;
			site?.addEventListener('dblclick', onDoubleClick);
		};
		bind();
		frame.addEventListener('load', bind);
		return () => {
			frame.removeEventListener('load', bind);
			site?.removeEventListener('dblclick', onDoubleClick);
		};
	}, [enabled]);

	const confirm = () => {
		const waiting = pending.current;
		pending.current = null;
		setAsks(null);
		if (waiting) save(waiting.target, waiting.html, { confirmed: true });
	};

	const dismiss = () => {
		pending.current = null;
		setAsks(null);
		setRefused(null);
	};

	return { editing, saving, refused, asks, confirm, dismiss };
};

import { PRESS, PRIMARY } from '@agentx/chat/styles';
import { saveSetting, settingOf } from '@agentx/lib/settings';
import { useSettingsStore } from '@agentx/state/settings';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { getToolName } from 'ai';

const BUTTON = `agentx-focus min-w-0 max-w-full rounded-agentx-control border border-agentx-button-border bg-agentx-button px-3 py-[5px] text-start text-agentx-body font-agentx-button text-agentx-button-ink [overflow-wrap:anywhere] ${PRESS} hover:bg-agentx-button-hover disabled:opacity-[var(--agentx-disabled-opacity,60%)]`;

const shown = (text) =>
	text ||
	// translators: Shown for an empty site title or tagline in the AI Agent's record of a change.
	__('(empty)', 'extendify-local');

// Only free text can be typed in; the agent sets the rest.
const TYPED = ['title', 'description'];

const againLabel = (before) =>
	before
		? sprintf(
				// translators: %s is a site setting's value, such as its title or time zone, from before the AI Agent changed it. The button saves it again.
				__('Use "%s" again', 'extendify-local'),
				before,
			)
		: // translators: Button that empties the site title or tagline again, as it was before the AI Agent changed it.
			__('Clear it again', 'extendify-local');

export const SettingResult = ({ part }) => {
	const setting = settingOf(getToolName(part), part.input);
	const { before, after, labels } = part.output;
	// Shows what this step did; the live value only hides a revert already made.
	const now = useSettingsStore((state) => state[setting]) ?? after;
	// A setting the site no longer offers would refuse the revert.
	const offered = useSettingsStore((state) => setting in state);
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState('');
	const [saving, setSaving] = useState(false);
	const [failed, setFailed] = useState(false);
	const [reverted, setReverted] = useState(false);
	const field = useRef(null);
	const setNew = useRef(null);
	const record = useRef(null);

	useEffect(() => {
		if (editing) field.current?.focus();
	}, [editing]);

	// The revert button leaves once the old value is back, and a disabled button can't take focus.
	useEffect(() => {
		if (!reverted || saving) return;
		(setNew.current ?? record.current)?.focus();
		setReverted(false);
	}, [reverted, saving]);

	const save = async (next) => {
		setSaving(true);
		setFailed(false);
		try {
			await saveSetting(setting, next);
			setEditing(false);
			setValue('');
		} catch {
			setFailed(true);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div
			ref={record}
			tabIndex={-1}
			className="flex flex-col gap-2 ps-6 text-agentx-body focus:outline-none"
		>
			<dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
				<dt className="text-agentx-record-label">
					{
						// translators: Label for a site setting, such as its title, logo or time zone, as it was before the AI Agent changed it.
						__('Before', 'extendify-local')
					}
				</dt>
				<dd className="m-0 [overflow-wrap:anywhere]">
					{shown(labels?.before ?? before)}
				</dd>
				<dt className="text-agentx-record-label">
					{
						// translators: Label for a site setting, such as its title, logo or time zone, as the AI Agent changed it to.
						__('After', 'extendify-local')
					}
				</dt>
				<dd className="m-0 [overflow-wrap:anywhere]">
					{shown(labels?.after ?? after)}
				</dd>
			</dl>
			<div className="flex flex-wrap gap-2">
				{offered && now !== before && (
					<button
						type="button"
						disabled={saving}
						onClick={() => {
							setReverted(true);
							save(before);
						}}
						className={BUTTON}
					>
						{againLabel(labels?.before ?? before)}
					</button>
				)}
				{!editing && TYPED.includes(setting) && (
					<button
						ref={setNew}
						type="button"
						disabled={saving}
						onClick={() => setEditing(true)}
						className={BUTTON}
					>
						{
							// translators: Button that opens a field to set a new site title or tagline.
							__('Set a new one', 'extendify-local')
						}
					</button>
				)}
			</div>
			{editing && (
				<form
					onSubmit={(event) => {
						event.preventDefault();
						if (value.trim()) save(value.trim());
					}}
					className="m-0 flex gap-2"
				>
					<input
						ref={field}
						value={value}
						disabled={saving}
						onChange={(event) => setValue(event.target.value)}
						aria-label={
							setting === 'title'
								? // translators: Screen reader name for the field where the user writes a new site title.
									__('New site title', 'extendify-local')
								: // translators: Screen reader name for the field where the user writes a new tagline.
									__('New tagline', 'extendify-local')
						}
						className="agentx-focus h-8 min-w-0 flex-1 rounded-agentx-control border border-agentx-field-border bg-agentx-field px-3 text-agentx-body text-agentx-ink"
					/>
					<button
						type="submit"
						disabled={saving || !value.trim()}
						className={PRIMARY}
					>
						{__('Save', 'extendify-local')}
					</button>
				</form>
			)}
			{failed && (
				<p role="alert" className="m-0 text-agentx-alert">
					{
						// translators: Shown when saving a site setting from the AI Agent's chat failed.
						__("Couldn't save it. Please try again.", 'extendify-local')
					}
				</p>
			)}
		</div>
	);
};

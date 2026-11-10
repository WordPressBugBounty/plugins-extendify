import { runAbility } from '@agentx/lib/abilities';
import { shellDocument } from '@agentx/lib/shell-document';
import { track } from '@agentx/lib/track';
import {
	DragHandle,
	FIELD,
	SaveButtons,
	SURFACE,
} from '@agentx/quick-edit/controls';
import { useBesidePart } from '@agentx/quick-edit/place';
import { quietPage } from '@agentx/quick-edit/quiet-page';
import { createPortal, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Sugar Calendar gives a zoned event's times in UTC, and a floating one's own time marked Z.
// The inputs take the event's own time, which its update reads in the event's stored zone.
export const fieldOf = (value, zone, allDay) => {
	const plain = (value ?? '').replace(/Z$/, '');
	if (allDay || !zone) return plain.slice(0, allDay ? 10 : 16);
	const moment = new Date(value);
	const offset = /^UTC([+-])(\d+(?:\.\d+)?)$/.exec(zone);
	if (offset) {
		const hours = Number(offset[2]) * (offset[1] === '-' ? -1 : 1);
		return new Date(moment.getTime() + hours * 3600000)
			.toISOString()
			.slice(0, 16);
	}
	// A zone the browser doesn't know throws, so the times aren't shown wrong.
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-CA', {
			timeZone: zone,
			hourCycle: 'h23',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		})
			.formatToParts(moment)
			.map(({ type, value: part }) => [type, part]),
	);
	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

// Its update takes local times as 2026-09-14T18:00:00, or a date alone for a whole-day event.
const timeOf = (value, allDay) => (allDay ? value : `${value}:00`);

const LABEL = 'flex items-center gap-2 px-1 text-agentx-quick-edit';
const NAME = 'w-16 shrink-0 text-agentx-quick-edit-label';

export const EventBar = ({
	target,
	changed,
	commit = { current: null },
	onDone,
	onFailed,
	failed = null,
}) => {
	const { block, event } = target;
	const bar = useRef(null);
	const first = useRef(null);
	const [was, setWas] = useState(null);
	const [now, setNow] = useState(null);
	const [problem, setProblem] = useState(failed);
	const edits = was
		? Object.fromEntries(
				['title', 'start', 'end']
					.filter((name) => now[name] !== was[name])
					.map((name) => [name, now[name]]),
			)
		: {};
	changed.current = () => Object.keys(edits).length > 0;

	useEffect(() => {
		let current = true;
		runAbility('sc-events/get-event', { id: event })
			.then((got) => {
				if (!current) return;
				const read = {
					title: got.title ?? '',
					start: fieldOf(got.start, got.start_tz, got.all_day),
					end: fieldOf(got.end, got.end_tz || got.start_tz, got.all_day),
					allDay: Boolean(got.all_day),
				};
				setWas(read);
				setNow(read);
			})
			.catch(
				() =>
					current &&
					setProblem(
						// translators: Shown in Quick Edit when an event in a calendar on the user's website couldn't be read.
						__("Couldn't load this event.", 'extendify-local'),
					),
			);
		return () => {
			current = false;
		};
	}, [event]);

	useEffect(() => {
		if (was) first.current?.select();
	}, [was]);

	useEffect(() => {
		const quiet = quietPage(block, { typed: false });
		return () => {
			quiet();
		};
	}, [block]);

	const drag = useBesidePart(bar, block, { inView: true, offset: 2 });

	const save = async () => {
		if (!Object.keys(edits).length) {
			onDone();
			return;
		}
		if (!now.title.trim() || !now.start || !now.end || now.end < now.start) {
			setProblem(
				// translators: Shown in Quick Edit when an event's name is empty or it ends before it starts.
				__(
					'Give the event a name, and an end after its start.',
					'extendify-local',
				),
			);
			return;
		}
		onDone();
		try {
			await runAbility('sc-events/update-event', {
				event_id: event,
				...(edits.title !== undefined && { title: now.title.trim() }),
				// Both go, so the plugin checks the end against the new start.
				...((edits.start !== undefined || edits.end !== undefined) && {
					start: timeOf(now.start, now.allDay),
					end: timeOf(now.end, now.allDay),
				}),
			});
			track('quick-edit-saved', { kind: 'event' });
		} catch (error) {
			onFailed?.(
				error?.message ||
					// translators: Shown in Quick Edit when saving an event in a calendar on the user's website failed.
					__("Couldn't save it. Please try again.", 'extendify-local'),
			);
		}
	};
	commit.current = save;

	const keys = useRef(null);
	keys.current = (key) => {
		// Escape or Enter typed in the chat box mustn't cancel or save the event.
		if (!bar.current?.contains(key.target)) return;
		if (key.key === 'Escape') {
			key.preventDefault();
			key.stopPropagation();
			onDone();
		}
		if (key.key === 'Enter' && key.target.tagName === 'INPUT') {
			key.preventDefault();
			save();
		}
	};
	useEffect(() => {
		const listen = (key) => keys.current(key);
		document.addEventListener('keydown', listen);
		return () => document.removeEventListener('keydown', listen);
	}, []);

	const kind = now?.allDay ? 'date' : 'datetime-local';
	return createPortal(
		<div
			ref={bar}
			data-agentx-editor=""
			role="dialog"
			// translators: Screen reader name for Quick Edit's panel over an event in a calendar on the user's website.
			aria-label={__('Event', 'extendify-local')}
			className={`group fixed top-0 left-0 z-100002 flex w-[26rem] max-w-[calc(100vw-1rem)] flex-col gap-1.5 rounded-agentx-quick-edit p-1 ${SURFACE}`}
		>
			{now ? (
				<>
					<label className={LABEL}>
						<span className={NAME}>
							{
								// translators: Label of the field in Quick Edit for an event's name.
								__('Name', 'extendify-local')
							}
						</span>
						<input
							ref={first}
							value={now.title}
							onChange={(change) =>
								setNow({ ...now, title: change.target.value })
							}
							className={`${FIELD} flex-1`}
						/>
					</label>
					<label className={LABEL}>
						<span className={NAME}>
							{
								// translators: Label of the field in Quick Edit for when an event starts.
								__('Starts', 'extendify-local')
							}
						</span>
						<input
							type={kind}
							value={now.start}
							onChange={(change) =>
								setNow({ ...now, start: change.target.value })
							}
							className={`${FIELD} flex-1`}
						/>
					</label>
					<label className={LABEL}>
						<span className={NAME}>
							{
								// translators: Label of the field in Quick Edit for when an event ends.
								__('Ends', 'extendify-local')
							}
						</span>
						<input
							type={kind}
							value={now.end}
							onChange={(change) =>
								setNow({ ...now, end: change.target.value })
							}
							className={`${FIELD} flex-1`}
						/>
					</label>
				</>
			) : (
				!problem && (
					<span className="px-2 py-1 text-agentx-quick-edit text-agentx-quick-edit-label">
						{
							// translators: Shown in Quick Edit's event panel while the event loads.
							__('Loading…', 'extendify-local')
						}
					</span>
				)
			)}
			<div className="flex items-center">
				<DragHandle onPointerDown={drag} />
				<span className="flex-1" />
				<SaveButtons onCancel={onDone} onSave={save} />
			</div>
			{problem && (
				<p
					role="alert"
					className="m-0 px-2 pb-1 text-agentx-quick-edit text-agentx-quick-edit-problem"
				>
					{problem}
				</p>
			)}
		</div>,
		shellDocument().body,
	);
};

import { editBlocks } from '@agentx/lib/edit-blocks';
import { shellDocument } from '@agentx/lib/shell-document';
import { showCurrent } from '@agentx/lib/show-draft';
import { track } from '@agentx/lib/track';
import {
	Choices,
	DragHandle,
	SaveButtons,
	SURFACE,
} from '@agentx/quick-edit/controls';
import { useBesidePart } from '@agentx/quick-edit/place';
import { quietPage } from '@agentx/quick-edit/quiet-page';
import apiFetch from '@wordpress/api-fetch';
import {
	createPortal,
	useEffect,
	useId,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const VIEWS = [
	// translators: A view of the calendar of events on the user's website, a month at a time.
	['month', __('Month', 'extendify-local')],
	// translators: A view of the calendar of events on the user's website, a week at a time.
	['week', __('Week', 'extendify-local')],
	// translators: A view of the calendar of events on the user's website, a day at a time.
	['day', __('Day', 'extendify-local')],
];

// Sugar Calendar's own defaults, for a block saved without them.
const DEFAULTS = {
	display: 'month',
	showSearch: true,
	showFilters: true,
};

// The block's own attributes; the block renderer refuses the others its data-attributes carry.
const ATTRIBUTES = [
	'accentColor',
	'allowUserChangeDisplay',
	'appearance',
	'calendarId',
	'calendars',
	'display',
	'featuredOnly',
	'showBlockHeader',
	'showFilters',
	'showSearch',
	'speakers',
	'tags',
	'venues',
];

// Only Sugar Calendar draws a view, so WordPress renders the block with the picked settings.
const drawCalendar = async (settings) => {
	const { rendered } = await apiFetch({
		// Sugar Calendar drops events unless context=edit is in the query; the page shows the site's language.
		path: '/wp/v2/block-renderer/sugar-calendar/block?context=edit&_locale=site',
		method: 'POST',
		data: { attributes: settings },
	});
	return new DOMParser()
		.parseFromString(rendered, 'text/html')
		.querySelector('.sugar-calendar-block');
};

export const CalendarBar = ({
	target,
	changed,
	commit = { current: null },
	onDone,
	onFailed,
	failed = null,
}) => {
	const { block } = target;
	const [was] = useState(() =>
		Object.fromEntries(
			Object.entries(DEFAULTS).map(([name, value]) => [
				name,
				target.settings[name] ?? value,
			]),
		),
	);
	const bar = useRef(null);
	const viewId = useId();
	const [now, setNow] = useState(was);
	const [problem] = useState(failed);
	// The page's own nodes while a preview shows, since Sugar Calendar's script listens on them.
	const kept = useRef(null);
	const saved = useRef(false);
	const edits = Object.fromEntries(
		Object.entries(now).filter(([name, value]) => value !== was[name]),
	);
	changed.current = () => Object.keys(edits).length > 0;

	const putBack = useRef(null);
	putBack.current = () => {
		if (!kept.current) return;
		block.className = kept.current.className;
		block.replaceChildren(...kept.current.nodes);
		kept.current = null;
	};

	useEffect(() => {
		const quiet = quietPage(block, { typed: false });
		return () => {
			quiet();
			if (!saved.current) putBack.current();
		};
	}, [block]);

	const drag = useBesidePart(bar, block, { inView: true });

	const { display, showSearch, showFilters } = now;
	useEffect(() => {
		const showing = { display, showSearch, showFilters };
		if (Object.entries(showing).every(([name, value]) => value === was[name])) {
			putBack.current();
			return;
		}
		let latest = true;
		const settings = Object.fromEntries(
			ATTRIBUTES.filter((name) => name in target.settings).map((name) => [
				name,
				target.settings[name],
			]),
		);
		drawCalendar({ ...settings, ...showing })
			.then((fresh) => {
				if (!latest || !fresh || !block.isConnected) return;
				if (!kept.current) {
					kept.current = {
						className: block.className,
						nodes: [...block.childNodes],
					};
				}
				block.className = fresh.className;
				block.replaceChildren(
					...block.ownerDocument.importNode(fresh, true).childNodes,
				);
			})
			// Unpreviewed, a pick still shows once saved.
			.catch(() => {});
		return () => {
			latest = false;
		};
	}, [block, was, target.settings, display, showSearch, showFilters]);

	const save = async () => {
		saved.current = Object.keys(edits).length > 0;
		onDone();
		if (!saved.current) return;
		const result = await editBlocks({
			ops: [
				{
					op: 'set-settings',
					block: target.id,
					type: target.type,
					settings: edits,
					direct: true,
				},
			],
		}).catch((error) => ({ refused: error?.message }));
		if (result?.refused || result?.confirm) {
			putBack.current();
			onFailed?.(
				result.confirm
					? // translators: Shown in Quick Edit when the calendar sits in a part shared by several pages of the user's website, which it can't save yet.
						__(
							'This part shows on other pages too, so it can’t be changed here yet.',
							'extendify-local',
						)
					: result.refused ||
							// translators: Shown in Quick Edit when saving a calendar's settings failed.
							__("Couldn't save it. Please try again.", 'extendify-local'),
			);
			return;
		}
		// A save patches the page in place, leaving the drawn copy without Sugar Calendar's listeners.
		if (kept.current && block.ownerDocument.defaultView) showCurrent();
		track('quick-edit-saved', { kind: 'calendar' });
	};
	commit.current = save;

	const keys = useRef(null);
	keys.current = (key) => {
		// Escape or Enter typed in the chat box mustn't cancel or save the calendar.
		if (!bar.current?.contains(key.target) && key.target !== document.body) {
			return;
		}
		if (key.key === 'Escape') {
			key.preventDefault();
			key.stopPropagation();
			onDone();
		}
		if (key.key === 'Enter' && (key.metaKey || key.ctrlKey)) {
			key.preventDefault();
			save();
		}
	};
	useEffect(() => {
		const listen = (key) => keys.current(key);
		document.addEventListener('keydown', listen);
		return () => document.removeEventListener('keydown', listen);
	}, []);

	return createPortal(
		<div
			ref={bar}
			data-agentx-editor=""
			role="dialog"
			// translators: Screen reader name for Quick Edit's panel over a calendar of events on the user's website.
			aria-label={__('Calendar', 'extendify-local')}
			className={`group fixed top-0 left-0 z-100002 flex w-[26rem] max-w-[calc(100vw-1rem)] flex-col gap-2 rounded-agentx-quick-edit p-2 ${SURFACE}`}
		>
			<div className="flex items-center gap-2 px-1 text-agentx-quick-edit">
				<label
					htmlFor={viewId}
					className="w-20 shrink-0 text-agentx-quick-edit-label"
				>
					{
						// translators: Label of the row in Quick Edit's calendar panel that picks how much of the calendar shows at once.
						__('View', 'extendify-local')
					}
				</label>
				<Choices
					id={viewId}
					value={now.display}
					options={VIEWS}
					onChange={(view) => setNow({ ...now, display: view })}
				/>
			</div>
			<label className="flex items-center gap-2 px-1 text-agentx-quick-edit">
				<input
					type="checkbox"
					checked={now.showSearch}
					onChange={(change) =>
						setNow({ ...now, showSearch: change.target.checked })
					}
					className="size-4 accent-agentx-checkbox"
				/>
				<span>
					{
						// translators: Checkbox in Quick Edit's calendar panel; when checked, visitors get a search box to find events.
						__('Show search', 'extendify-local')
					}
				</span>
			</label>
			<label className="flex items-center gap-2 px-1 text-agentx-quick-edit">
				<input
					type="checkbox"
					checked={now.showFilters}
					onChange={(change) =>
						setNow({ ...now, showFilters: change.target.checked })
					}
					className="size-4 accent-agentx-checkbox"
				/>
				<span>
					{
						// translators: Checkbox in Quick Edit's calendar panel; when checked, visitors can narrow the events shown, like by calendar.
						__('Show filters', 'extendify-local')
					}
				</span>
			</label>
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

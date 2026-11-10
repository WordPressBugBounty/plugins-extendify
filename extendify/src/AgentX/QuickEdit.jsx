import { runAbility } from '@agentx/lib/abilities';
import {
	frameScale,
	openSubmenu,
	siteFrame,
	useSiteDocument,
} from '@agentx/lib/block-box';
import { contactAt, contactLabel } from '@agentx/lib/contact';
import { showTitle } from '@agentx/lib/logo-title';
import { blockById, sendPart } from '@agentx/lib/pick-block';
import {
	actionAt,
	bubbleAt,
	bubbleRows,
	editableAt,
	fieldAbove,
	formOf,
	pressableAt,
	submenuAt,
} from '@agentx/lib/quick-edit';
import { shellDocument } from '@agentx/lib/shell-document';
import { SITE_STOP } from '@agentx/lib/site-focus';
import { track } from '@agentx/lib/track';
import { Editor } from '@agentx/quick-edit/Editor';
import { keyedPart, keyParts, unkeyParts } from '@agentx/quick-edit/part-keys';
import { besidePointer, turnedAway } from '@agentx/quick-edit/place';
import { usePlanStore } from '@agentx/state/plan';
import { useRunStore } from '@agentx/state/run';
import { useSelectionStore } from '@agentx/state/selection';
import { useShellStore } from '@agentx/state/shell';
import {
	createPortal,
	useCallback,
	useEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	arrowUp,
	external,
	Icon,
	page,
	pencil,
	plus,
	seen,
	unseen,
} from '@wordpress/icons';
import {
	motion,
	useMotionValue,
	useReducedMotion,
	useSpring,
} from 'motion/react';

const FOLLOW = { stiffness: 700, damping: 45, mass: 0.6 };
// How long the pointer rests on a part before its bubble shows unclicked.
const LINGER = 1000;
// A page that never comes, like a download, would otherwise keep Quick Edit off.
const LEAVING_MS = 10000;
// Set on the page while a click there works as it does live, for the hand cursor.
const FOLLOWING = 'data-extendify-agentx-following';

const cursorOf = () =>
	getComputedStyle(
		document.getElementById('extendify-agentx-shell') ?? document.body,
	)
		.getPropertyValue('--agentx-quick-edit-cursor')
		.trim() || 'default';

const ROW =
	'agentx-focus-inset flex w-full items-center gap-2 rounded-agentx-quick-edit border-0 bg-transparent px-2.5 py-2 text-start text-agentx-quick-edit font-agentx-quick-edit whitespace-nowrap';

const ICONS = {
	add: plus,
	edit: pencil,
	external,
	send: page,
	up: arrowUp,
	seen,
	unseen,
};

const siteBox = (stop) => {
	const box = stop.getBoundingClientRect();
	return {
		left: Math.max(box.left, 0),
		top: Math.max(box.top, 0),
		right: Math.min(box.right, window.innerWidth),
		bottom: Math.min(box.bottom, window.innerHeight),
	};
};

const samePart = (a, b) =>
	a?.block === b?.block &&
	a?.edits === b?.edits &&
	a?.link?.href === b?.link?.href &&
	a?.action?.control === b?.action?.control &&
	a?.contact?.value === b?.contact?.value;

const toPart = (found) => (now) =>
	found ? (samePart(now?.part, found) ? now : { part: found }) : null;

// The part under the pointer, or the one its spacer sits in.
const editableOf = (part) => editableAt(part.at) ?? editableAt(part.block);

// A part from a page the frame has left, or a block an in-place change replaced, can't be shown or edited.
const fresh = (part) =>
	part?.block.isConnected && part.block.ownerDocument.defaultView ? part : null;

// The part a dismissed bubble named gets none again until the pointer leaves it.
const dismiss = (found) => (now) =>
	found && samePart(now?.part, found)
		? { part: found, dismissed: true }
		: toPart(found)(null);

// Rows a part offers besides sending it, which alone would make every box on the page a tab stop.
const EDITING = ['edit', 'add-field', 'move-up', 'settings', 'title'];

export const QuickEdit = ({ leaveUrls }) => {
	const tool = useShellStore((state) => Boolean(state.canvasTool));
	const loading = useShellStore((state) => state.siteLoading);
	const picking = useSelectionStore((state) => state.picking);
	const asking = useSelectionStore((state) => Boolean(state.confirming));
	const working = useRunStore((state) => state.working);
	const planning = usePlanStore((state) => Boolean(state.plan));
	const minimized = useShellStore((state) => state.minimized);
	const busy = working || planning;
	const doc = useSiteDocument();
	const reduceMotion = useReducedMotion();
	// Set while the pointer is over the site; its part is null while the agent works.
	const [over, setOver] = useState(null);
	const [held, setHeld] = useState(null);
	const [pressable, setPressable] = useState(false);
	const [editing, setEditing] = useState(null);
	const [leaving, setLeaving] = useState(false);
	// Set by the open editor: whether it holds anything a click away would lose.
	const changed = useRef(null);
	const commit = useRef(null);
	// Where a click left the editor, to open the part there once it closes.
	const away = useRef(null);
	const [stop, setStop] = useState(null);
	const bubble = useRef(null);
	// Where the pointer is on the page and on the window, for a scroll to read again.
	const pointer = useRef(null);
	// Where the last press began, since a click past a drag lands on the part around both.
	const pressedOn = useRef(null);
	// The part Enter held, the one focus goes back to once its bubble or editor closes, and the one Tab reached.
	const keyedFrom = useRef(null);
	const returnTo = useRef(null);
	const focused = useRef(null);
	const left = useRef(null);
	const submenu = useRef(null);
	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const springX = useSpring(x, FOLLOW);
	const springY = useSpring(y, FOLLOW);
	// Select, the agent's question, and a loading site's cover take the site's clicks themselves.
	const active =
		!tool && !picking && !asking && !editing && !loading && !leaving;
	const part = fresh(held) ?? fresh(over?.part);
	const translatedBy = doc?.defaultView?.extAgentXTranslatedBy ?? null;
	const visible = Boolean(held || over?.lingered);
	// A change can take the hovered block off the page mid-render, leaving no part to offer.
	const options =
		over && visible && part
			? bubbleRows(part, { translatedBy, minimized })
			: [];
	const rows = options.length ? options : null;
	// A link or a control always works as on the site; a field only while no bubble shows.
	const following = Boolean(part?.link || part?.action) || (!rows && pressable);
	// Shown from a rest: it stays put, and the pointer can move onto it to use it.
	const resting = Boolean(rows && over?.lingered && !held);
	const usable = Boolean(held || resting);
	const approach = useRef(null);
	const shown = useRef(false);
	shown.current = Boolean(rows);
	const near = useRef(null);
	const follow = useRef(null);
	follow.current = (point, { jump = !shown.current } = {}) => {
		near.current = point;
		// Unscaled, since its box is smaller while it scales in and it would overhang.
		const size = {
			width: bubble.current?.offsetWidth ?? 0,
			height: bubble.current?.offsetHeight ?? 0,
		};
		const to = besidePointer(point, size, siteBox(stop));
		x.set(to.x);
		y.set(to.y);
		// A bubble that just showed starts by the pointer, not where it last was.
		if (!jump) return;
		springX.jump(to.x);
		springY.jump(to.y);
	};
	// Placed again once it exists, since a hidden bubble has no size to place by.
	const showBubble = useCallback((element) => {
		bubble.current = element;
		if (element && near.current) follow.current(near.current, { jump: true });
	}, []);

	// Held open by hand, so a submenu stays up while the pointer moves onto its bubble.
	const openOn = (item) => {
		if (submenu.current?.item === item) return;
		submenu.current?.close();
		submenu.current = item ? { item, close: openSubmenu(item) } : null;
	};

	const partAt = ({ x, y }) =>
		bubbleAt(doc.elementFromPoint(x, y), {
			leaveUrls,
			contact: contactAt(doc, x, y),
		});
	const partNow = useRef(null);
	partNow.current = () =>
		pointer.current && doc ? partAt(pointer.current.page) : null;
	const editAt = useRef(null);
	editAt.current = (at) => {
		const found = partAt(at);
		const rows = found ? bubbleRows(found, { translatedBy, minimized }) : [];
		return rows.some((row) => row.id === 'edit') ? editableOf(found) : null;
	};

	// A part Tab stops on is one whose bubble offers a change, as the pointer's would.
	const offersAt = useRef(null);
	offersAt.current = (element) => {
		const found = bubbleAt(element, { leaveUrls });
		// A form's field sits inside the form's block, and a spacer's part is its parent's.
		const own =
			found?.block === element ||
			(found?.edits &&
				element.contains(found.edits) &&
				!element.contains(found.block));
		return Boolean(
			own &&
				bubbleRows(found, { translatedBy, minimized }).some(({ id }) =>
					EDITING.includes(id),
				),
		);
	};

	const screenOf = ({ x, y }) => {
		const box = siteFrame().getBoundingClientRect();
		const scale = frameScale(doc);
		return { x: box.left + x * scale, y: box.top + y * scale };
	};

	const cornerOf = (element) => {
		const box = element.getBoundingClientRect();
		return screenOf({ x: box.left, y: box.top });
	};

	// From the keyboard the bubble opens at the part's corner, and focus comes back to the part after.
	const holdKeyed = (target) => {
		const found = bubbleAt(target, { leaveUrls });
		if (!found) return;
		follow.current(cornerOf(found.block));
		if (busy) {
			setOver({ part: found, lingered: true });
			return;
		}
		if (!bubbleRows(found, { translatedBy, minimized }).length) return;
		keyedFrom.current = { element: target, id: found.id };
		setOver({ part: found });
		setHeld(found);
	};

	// From an event on the page itself, in its own coordinates.
	const read = ({ clientX, clientY }) => {
		if (!doc?.defaultView) return { part: null, element: null };
		const page = { x: clientX, y: clientY };
		pointer.current = { page, screen: screenOf(page) };
		return {
			part: partAt(page),
			element: doc.elementFromPoint(page.x, page.y),
		};
	};

	const letGo = () => {
		keyedFrom.current = null;
		setHeld(null);
		setOver(null);
	};

	useEffect(() => setStop(document.getElementById(SITE_STOP)), []);

	// The frame loaded another page, so the part under the pointer is read again from it.
	useEffect(() => {
		setLeaving(false);
		if (!doc) return;
		setOver((now) => {
			if (!now) return now;
			const part = partNow.current();
			return part ? { ...now, part } : null;
		});
	}, [doc]);

	// Recorded while editing too, when the page's other listeners are off.
	useEffect(() => {
		if (!doc) return;
		const record = ({ target }) => {
			pressedOn.current = target;
		};
		doc.addEventListener('pointerdown', record, { capture: true });
		return () =>
			doc.removeEventListener('pointerdown', record, { capture: true });
	}, [doc]);

	useEffect(() => {
		if (!editing || !doc) return;
		const { target } = editing;
		const part = target.words ?? target.block;
		const listening = new AbortController();
		const { signal } = listening;
		// A change saves as its bar closes; a refused save opens the bar again, saying why.
		const leave = (at) => {
			away.current = at;
			if (changed.current()) commit.current?.();
			else setEditing(null);
		};
		doc.addEventListener(
			'click',
			({ clientX: x, clientY: y }) => {
				// A drag that began in the part, like selecting its words, may end outside it.
				if (part.contains(pressedOn.current)) return;
				const box = part.getBoundingClientRect();
				const inside =
					x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
				if (!inside) leave({ x, y });
			},
			{ capture: true, signal },
		);
		document.addEventListener(
			'pointerdown',
			({ target: on }) => {
				// A press in the bar after a refused save keeps it, so an earlier click opens nothing.
				if (on.closest?.('[data-agentx-editor]')) away.current = null;
				else leave(null);
			},
			{ capture: true, signal },
		);
		document.addEventListener(
			'keydown',
			({ key }) => {
				if (key === 'Escape') away.current = null;
			},
			{ capture: true, signal },
		);
		return () => listening.abort();
	}, [editing, doc]);

	useEffect(() => {
		if (editing && !editing.failed) {
			track('quick-edit-opened', { kind: editing.target.kind ?? 'words' });
		}
	}, [editing]);

	// Saves go out after their bar closes, so a refused one comes back on its part unless another is open.
	const reopen =
		(target) =>
		(failed, kept = {}) =>
			setEditing(
				(now) =>
					now ??
					((target.block ?? target.words)?.isConnected
						? { target: { ...target, ...kept }, failed }
						: null),
			);

	// Read once the editor has gone, since an open one leaves the rest of the page unclickable.
	useEffect(() => {
		const at = away.current;
		away.current = null;
		const target = !editing && at && editAt.current(at);
		if (target) setEditing({ target });
	}, [editing]);

	useEffect(() => {
		if (!over || over.lingered || over.dismissed || held) return;
		const rest = setTimeout(() => {
			// Selected words are being read or copied, not edited.
			if (doc?.getSelection()?.isCollapsed === false) return;
			approach.current = null;
			// Read again, since a click there may have opened or closed it meanwhile.
			const part = partNow.current() ?? fresh(over.part);
			setOver((now) => (now === over ? { part, lingered: true } : now));
		}, LINGER);
		return () => clearTimeout(rest);
	}, [over, held, doc]);

	useEffect(() => {
		if (!active) setOver(null);
	}, [active]);

	useEffect(() => {
		if (!leaving) return;
		const back = setTimeout(() => setLeaving(false), LEAVING_MS);
		return () => clearTimeout(back);
	}, [leaving]);

	// The page's own cursors would say a click there does what it does live.
	useEffect(() => {
		if (!active || !doc?.head) return;
		const style = doc.createElement('style');
		style.textContent = [
			`html, html * { cursor: ${cursorOf()} !important; }`,
			`html[${FOLLOWING}], html[${FOLLOWING}] * { cursor: pointer !important; }`,
		].join('\n');
		doc.head.append(style);
		return () => {
			style.remove();
			doc.documentElement.removeAttribute(FOLLOWING);
		};
	}, [active, doc]);

	useEffect(() => {
		doc?.documentElement?.toggleAttribute(FOLLOWING, active && following);
	}, [doc, active, following]);

	useEffect(() => {
		if (!active || !doc?.body) return;
		// Parts that offer nothing are asked once, since every change to the page asks again.
		let declined = new WeakSet();
		const offers = (element) => {
			if (declined.has(element)) return false;
			const yes = offersAt.current(element);
			if (!yes) declined.add(element);
			return yes;
		};
		// The part focus is on: an in-place change redraws it without its stop, and a live save reloads the page under it.
		let on = left.current?.ownerDocument === doc ? null : left.current;
		left.current = null;
		const key = () => {
			keyParts(doc, offers);
			if (!on || doc.activeElement !== doc.body) return;
			// Focus the user took to the chat stays there.
			if (document.activeElement !== doc.defaultView?.frameElement) return;
			const id = on.getAttribute('data-extendify-block');
			const here = on.ownerDocument === doc && on.isConnected;
			on = keyedPart(here ? on : id && blockById(doc, id));
			if (!on) return;
			focused.current = { element: on, quiet: true };
			on.focus({ preventScroll: true });
		};
		const redrawn = new MutationObserver(key);
		redrawn.observe(doc.body, {
			subtree: true,
			childList: true,
			attributeFilter: ['data-agentx-key'],
		});
		const listening = new AbortController();
		doc.addEventListener(
			'focusin',
			({ target }) => {
				on = keyedPart(target);
			},
			{ signal: listening.signal },
		);
		// Moved on by the user, the part still has its stop.
		doc.addEventListener(
			'focusout',
			({ target }) => {
				if (target.hasAttribute?.('tabindex')) on = null;
			},
			{ signal: listening.signal },
		);
		// Each Tab asks every part again, as one may offer something now.
		for (const view of [window, doc.defaultView]) {
			view?.addEventListener(
				'keydown',
				(event) => {
					if (event.key !== 'Tab') return;
					declined = new WeakSet();
					key();
				},
				{ capture: true, signal: listening.signal },
			);
		}
		key();
		return () => {
			left.current = on;
			redrawn.disconnect();
			listening.abort();
			unkeyParts(doc);
		};
	}, [active, doc]);

	// Focus goes back to a part reached by keyboard once its bubble or editor closes.
	useEffect(() => {
		const back = returnTo.current;
		if (held || editing || !back || !doc) return;
		returnTo.current = null;
		const element = back.element.isConnected
			? back.element
			: blockById(doc, back.id);
		focused.current = { element, quiet: true };
		element?.focus({ preventScroll: true });
	}, [held, editing, doc]);

	useEffect(() => {
		if (!active || !doc?.defaultView) return;
		const listening = new AbortController();
		const { signal } = listening;
		// The page scrolls under a pointer that hasn't moved.
		doc.defaultView.addEventListener(
			'scroll',
			() => {
				// Tab scrolls the part it reached into view after the bubble showed by it.
				if (focused.current?.shown) {
					follow.current(cornerOf(focused.current.element));
					return;
				}
				const at = pointer.current;
				if (!at) return;
				const found = bubbleAt(doc.elementFromPoint(at.page.x, at.page.y), {
					leaveUrls,
					contact: contactAt(doc, at.page.x, at.page.y),
				});
				setOver(toPart(found));
				if (found) follow.current(at.screen);
			},
			{ passive: true, signal },
		);
		// The page takes the pointer itself, so its own hover looks show.
		doc.addEventListener('pointermove', (event) => moveTo.current(event), {
			signal,
		});
		// Moves inside another site's frame, like a booking calendar, never reach the page.
		doc.addEventListener(
			'pointerover',
			(event) => event.target.tagName === 'IFRAME' && moveTo.current(event),
			{ signal },
		);
		doc.addEventListener('click', (event) => clickAt.current(event), {
			capture: true,
			signal,
		});
		doc.addEventListener('keydown', (event) => keyAt.current(event), {
			signal,
		});
		doc.addEventListener('focusin', (event) => focusAt.current(event), {
			signal,
		});
		doc.addEventListener('focusout', (event) => blurAt.current(event), {
			signal,
		});
		siteFrame()?.addEventListener(
			'pointerleave',
			(event) => leaveSite.current(event),
			{ signal },
		);
		// A link's page can take a while, and a bubble showing meanwhile is for the page being left.
		doc.defaultView.addEventListener('beforeunload', () => setLeaving(true), {
			signal,
		});
		return () => {
			listening.abort();
			submenu.current?.close();
			submenu.current = null;
		};
	}, [active, doc, leaveUrls]);

	useEffect(() => {
		if (!held) return;
		const shell = document.getElementById('extendify-agentx-shell');
		const frame = siteFrame();
		// A held menu item keeps its submenu open, even when Enter rather than hover held it.
		const item = submenuAt(held.block);
		const shut = item ? openSubmenu(item) : null;
		const away = () => {
			keyedFrom.current = null;
			setHeld(null);
			setOver(null);
		};
		const onKey = (event) => {
			if (event.key !== 'Escape') return;
			event.preventDefault();
			returnTo.current = keyedFrom.current;
			away();
		};
		shell.inert = true;
		bubble.current
			?.querySelector('[role="menuitem"]')
			?.focus({ preventScroll: true });
		document.addEventListener('keydown', onKey, true);
		frame?.addEventListener('load', away);
		return () => {
			document.removeEventListener('keydown', onKey, true);
			frame?.removeEventListener('load', away);
			shell.inert = false;
			shut?.();
		};
	}, [held]);

	const movingAway = ({ clientX, clientY }, { elsewhere = false } = {}) => {
		const box = bubble.current?.getBoundingClientRect();
		if (!box) return true;
		const { away, closest } = turnedAway(
			box,
			{ x: clientX, y: clientY },
			{ closest: approach.current, elsewhere },
		);
		approach.current = closest;
		return away;
	};

	// While the agent works the page takes no pointer, so the bubble saying so follows the layer.
	const onBusyMove = (event) => {
		const away = resting && movingAway(event);
		if (resting && !away) return;
		setOver((now) =>
			away ? { part: null, dismissed: true } : (now ?? { part: null }),
		);
		follow.current({ x: event.clientX, y: event.clientY });
	};

	const moveTo = useRef(null);
	moveTo.current = (event) => {
		// The pointer takes over from the keyboard, so a scroll follows it again.
		if (focused.current?.shown) focused.current = null;
		const { part: found, element } = read(event);
		const at = pointer.current.screen;
		setPressable(!found && Boolean(pressableAt(element)));
		const away =
			resting &&
			movingAway(
				{ clientX: at.x, clientY: at.y },
				{ elsewhere: !samePart(found, part) },
			);
		if (resting && !away) return;
		openOn(submenuAt(element));
		setOver(away ? dismiss(found) : toPart(found));
		if (found) follow.current(at);
	};

	const leaveBubble = () => {
		approach.current = null;
		setOver((now) => now && { part: now.part, dismissed: true });
	};

	const leaveSite = useRef(null);
	leaveSite.current = (event) => {
		// A bubble over the site, held or reached from a rest, fires a leave.
		if (held || bubble.current?.contains(event.relatedTarget)) return;
		pointer.current = null;
		openOn(null);
		setOver(null);
		setPressable(false);
	};

	const clickAt = useRef(null);
	clickAt.current = (event) => {
		const keyed = event.detail === 0;
		const field =
			!keyed &&
			pressedOn.current?.closest?.(
				'[contenteditable]:not([contenteditable="false"]), input, textarea',
			);
		if (field && !field.contains(event.target)) return;
		// A screen reader activates a part Tab stops on with a click it makes itself.
		if (!event.isTrusted && !(keyed && keyedPart(event.target))) return;
		// The end of a drag that selected words, not a click.
		if (!keyed && doc.getSelection()?.isCollapsed === false) return;
		// Clicks do nothing while the agent works, so the bubble says why at once.
		if (busy) {
			event.preventDefault();
			event.stopPropagation();
			if (keyed) holdKeyed(event.target);
			else setOver((now) => now && { ...now, lingered: true });
			return;
		}
		const { part: found, element } = keyed
			? { part: bubbleAt(event.target, { leaveUrls }), element: event.target }
			: read(event);
		// A link goes where it points, even with its bubble showing.
		if (found?.link && element?.closest('a[href]')) return;
		const offered = found ? bubbleRows(found, { translatedBy, minimized }) : [];
		// A control works as on the site, bubble or not; a field only where nothing is offered.
		const works = keyed
			? actionAt(event.target)
			: (found?.action?.control ??
				(!offered.length && element && pressableAt(element)));
		if (works) {
			// Like a followed link, a pressed control gets no bubble until the pointer leaves it.
			if (!keyed && found) setOver(dismiss(found));
			return;
		}
		// Enter on something with nothing to offer does what it does on the site.
		if (keyed && !offered.length) return;
		event.preventDefault();
		event.stopPropagation();
		if (keyed) {
			holdKeyed(event.target);
			return;
		}
		if (!offered.length) return;
		keyedFrom.current = null;
		setOver({ part: found });
		setHeld(found);
	};

	const keyAt = useRef(null);
	keyAt.current = (event) => {
		// The Enter that saved an editor reaches here too, once it has closed.
		if (event.defaultPrevented) return;
		if (!['Enter', ' '].includes(event.key) || !keyedPart(event.target)) {
			return;
		}
		event.preventDefault();
		holdKeyed(event.target);
	};

	// A part Tab reaches shows what Enter opens there, as a rest does for the pointer.
	const focusAt = useRef(null);
	focusAt.current = ({ target }) => {
		const quiet = focused.current?.quiet && focused.current.element === target;
		focused.current = null;
		const element = keyedPart(target);
		if (quiet || !element || held || !element.matches(':focus-visible')) {
			return;
		}
		const found = bubbleAt(element, { leaveUrls });
		if (!found) return;
		// The pointer's place is stale once the keyboard moves on.
		pointer.current = null;
		focused.current = { element, shown: true };
		follow.current(cornerOf(found.block));
		setOver({ part: found, lingered: true });
	};

	const blurAt = useRef(null);
	blurAt.current = ({ target }) => {
		if (focused.current?.element !== target) return;
		const { shown } = focused.current;
		focused.current = null;
		if (shown && !held) setOver(null);
	};

	const choose = (row) => {
		track('quick-edit-bubble', { row: row.id });
		// Sent to the agent, the part leaves the keyboard in the chat instead.
		returnTo.current = row.id === 'send' ? null : keyedFrom.current;
		if (!fresh(part) || row.href) {
			letGo();
			return;
		}
		if (row.id === 'send') {
			letGo();
			sendPart(part.block, {
				label: part.contact ? contactLabel(part.contact) : null,
			});
			return;
		}
		const form = row.id === 'add-field' && formOf(part);
		if (form) {
			letGo();
			setEditing({
				target: {
					kind: 'field',
					block: form,
					form: Number(form.dataset.formid),
				},
			});
			return;
		}
		const moving = row.id === 'move-up' && fieldAbove(part);
		if (moving) {
			letGo();
			runAbility('extendify/wpforms-move-field', {
				form_id: moving.form,
				field_id: moving.field,
				position: 'above',
				next_to: moving.above,
			})
				.then(() => track('quick-edit-saved', { kind: 'move-field' }))
				// A refused move leaves the form as it was.
				.catch(() => {});
			return;
		}
		if (row.id === 'title') {
			letGo();
			// A refused change leaves the header as it was.
			showTitle(row.logo, !row.shown).catch(() => {});
			return;
		}
		const target = row.id === 'edit' && editableOf(part);
		if (target) {
			letGo();
			setEditing({ target });
			return;
		}
		console.log('Quick Edit:', row.id, {
			block: part.id,
			type: part.type,
			link: part.link?.href ?? null,
		});
	};

	return (
		<>
			{editing && (
				<Editor
					editing={editing}
					changed={changed}
					commit={commit}
					onDone={() => setEditing(null)}
					onFailed={reopen(editing.target)}
				/>
			)}
			{stop &&
				active &&
				busy &&
				createPortal(
					<div
						id="extendify-agentx-quick-edit-layer"
						aria-hidden="true"
						onPointerMove={onBusyMove}
						onPointerLeave={(event) => leaveSite.current(event)}
						onClick={() => setOver((now) => now && { ...now, lingered: true })}
						className="absolute inset-0 cursor-(--agentx-quick-edit-cursor)"
					/>,
					stop,
				)}
			{/* Outside the shell, which goes inert while a part is held. */}
			{createPortal(
				<>
					{held && (
						<div
							aria-hidden="true"
							onClick={letGo}
							className="fixed inset-0 z-100001"
						/>
					)}
					{rows && (
						<motion.div
							ref={showBubble}
							role={usable ? 'menu' : undefined}
							aria-label={
								usable
									? // translators: Screen reader name for the small menu over the user's website that offers to edit the part they clicked or rested the pointer on.
										__('Quick Edit', 'extendify-local')
									: undefined
							}
							aria-hidden={usable ? undefined : 'true'}
							data-agentx-bubble
							onPointerLeave={resting ? leaveBubble : undefined}
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.12 }}
							style={{
								x: reduceMotion ? x : springX,
								y: reduceMotion ? y : springY,
							}}
							className={`fixed top-0 left-0 z-100002 flex origin-top-left flex-col rounded-agentx-bubble-menu bg-agentx-bubble-menu p-1.5 font-agentx shadow-(--agentx-bubble-menu-shadow) ${usable ? '' : 'pointer-events-none'}`}
						>
							{rows.map((row) => {
								// An empty slot keeps a row without an icon in line with the rest.
								const icon = ICONS[row.icon] ? (
									<Icon
										icon={ICONS[row.icon]}
										size={20}
										className="shrink-0 fill-current"
									/>
								) : (
									rows.some((other) => ICONS[other.icon]) && (
										<span aria-hidden="true" className="size-5 shrink-0" />
									)
								);
								const still = row.id === 'translated';
								if (usable && row.href) {
									return (
										<a
											key={row.id}
											href={row.href}
											target="_blank"
											rel="noopener noreferrer"
											role="menuitem"
											onClick={() => choose(row)}
											className={`${ROW} text-agentx-bubble-row-ink no-underline hover:bg-agentx-bubble-row-hover focus-visible:bg-agentx-bubble-row-hover`}
										>
											{icon}
											<span>{row.label}</span>
											<span className="sr-only">
												{
													// translators: Read by screen readers right after an option in the small menu over the user's website, saying it opens in a new browser tab.
													__('(opens in a new tab)', 'extendify-local')
												}
											</span>
										</a>
									);
								}
								return usable && !still ? (
									<button
										key={row.id}
										type="button"
										role="menuitem"
										onClick={() => choose(row)}
										className={`${ROW} text-agentx-bubble-row-ink hover:bg-agentx-bubble-row-hover focus-visible:bg-agentx-bubble-row-hover`}
									>
										{icon}
										<span>{row.label}</span>
									</button>
								) : (
									<span
										key={row.id}
										className={`${ROW} ${still ? 'text-agentx-bubble-row-muted' : 'text-agentx-bubble-row-ink'}`}
									>
										{icon}
										<span>{row.label}</span>
									</span>
								);
							})}
						</motion.div>
					)}
				</>,
				shellDocument().body,
			)}
		</>
	);
};

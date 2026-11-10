import { PRESS } from '@agentx/chat/styles';
import { track } from '@agentx/lib/track';
import { BrandBar, PartnerLogo } from '@agentx/PartnerLogo';
import { useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { chevronDown, chevronUp, Icon } from '@wordpress/icons';

const BAR = 60;
// Open, the sheet leaves the top tenth of the site in view.
const OPEN_SHARE = 0.9;

const useSheet = (startOpen) => {
	const [open, setOpen] = useState(startOpen);
	const [dragHeight, setDragHeight] = useState(null);
	const drag = useRef(null);

	const move = (to, by) => {
		if (to === open) return;
		setOpen(to);
		track('sheet-moved', { open: to, by });
	};

	const onPointerDown = (event) => {
		const sheet = event.currentTarget.closest('section');
		const room = sheet.parentElement.clientHeight;
		event.currentTarget.setPointerCapture(event.pointerId);
		drag.current = {
			y: event.clientY,
			from: sheet.offsetHeight,
			room,
			moved: false,
		};
	};

	// After a release only `moved` is left, for the click that may follow.
	const onPointerMove = (event) => {
		if (!drag.current?.room) return;
		const { y, from, room } = drag.current;
		const height = Math.min(room, Math.max(BAR, from + y - event.clientY));
		if (Math.abs(y - event.clientY) > 4) drag.current.moved = true;
		setDragHeight(height);
	};

	const onPointerUp = () => {
		if (!drag.current?.room) return;
		const { moved, room } = drag.current;
		drag.current = { moved };
		if (moved) move(dragHeight > (BAR + room * OPEN_SHARE) / 2, 'drag');
		setDragHeight(null);
	};

	// A drag ends in a click too, which would undo where it snapped.
	const onClick = (event) => {
		const keyboard = event.detail === 0;
		if (keyboard || !drag.current?.moved) {
			move(!open, keyboard ? 'key' : 'tap');
		}
		drag.current = null;
	};

	const height =
		dragHeight === null
			? open
				? `${OPEN_SHARE * 100}%`
				: `${BAR}px`
			: `${dragHeight}px`;

	return {
		open,
		height,
		dragging: dragHeight !== null,
		handle: {
			onPointerDown,
			onPointerMove,
			onPointerUp,
			onPointerCancel: onPointerUp,
			onClick,
		},
	};
};

export const Phone = ({ chat, site, startOpen }) => {
	const { open, height, dragging, handle } = useSheet(startOpen);

	return (
		<div className="relative flex size-full flex-col">
			<div
				id="extendify-agentx-site-box"
				className="relative min-h-0 flex-1 overflow-hidden bg-agentx-site"
			>
				{site}
			</div>
			<section
				id="extendify-agentx-sheet"
				className={`extendify-agentx-surface absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-agentx-phone-sheet bg-agentx-phone-sheet shadow-(--agentx-phone-sheet-shadow) ${dragging ? '' : 'transition-[height] duration-200'}`}
				style={{ height }}
			>
				{/* A drag or tap anywhere on the bar moves the sheet, grab line included; its button is the keyboard control. */}
				<div
					{...handle}
					className="relative flex h-15 shrink-0 cursor-grab touch-none items-center gap-2 px-4 pt-4 pb-1 select-none"
				>
					<span
						aria-hidden="true"
						className="absolute top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-agentx-phone-sheet-handle"
					/>
					<BrandBar className="flex-1">
						<PartnerLogo
							fallback={
								// translators: Shown on the bar at the bottom of a phone screen that opens the AI Agent's chat, when the host has no logo.
								__('AI Agent', 'extendify-local')
							}
						/>
						<button
							type="button"
							aria-expanded={open}
							aria-controls="extendify-agentx-sheet-chat"
							aria-label={
								// translators: Screen reader label for the button on the bar at the bottom of a phone screen that opens and closes the AI Agent's chat.
								__('AI Agent', 'extendify-local')
							}
							className={`agentx-focus ms-auto inline-flex size-8 shrink-0 items-center justify-center rounded-agentx-header-button border-0 bg-transparent p-0 text-agentx-brand-ink ${PRESS} hover:bg-agentx-brand-hover`}
						>
							<Icon
								icon={open ? chevronDown : chevronUp}
								size={24}
								className="fill-current"
							/>
						</button>
					</BrandBar>
				</div>
				<div
					id="extendify-agentx-sheet-chat"
					hidden={!open && !dragging}
					className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
				>
					{chat}
				</div>
			</section>
		</div>
	);
};

import {
	Children,
	useEffect,
	useId,
	useRef,
	useState,
} from '@wordpress/element';

// Where the handle sits, as shares of its track; null when the row fits.
export const handleOf = ({ scrollLeft, scrollWidth, clientWidth }) => {
	const max = scrollWidth - clientWidth;
	// Subpixel widths can leave a fraction of a pixel to scroll.
	if (max < 1) return null;
	const size = clientWidth / scrollWidth;
	const at = Math.min(Math.abs(scrollLeft) / max, 1);
	return { size, offset: at * (1 - size), value: Math.round(at * 100) };
};

// The scrollLeft that puts the handle's start at offset, a share of its track.
export const scrollLeftAt = (offset, { scrollWidth, clientWidth, rtl }) => {
	const max = scrollWidth - clientWidth;
	if (max < 1) return 0;
	const at = Math.min(Math.max(offset / (1 - clientWidth / scrollWidth), 0), 1);
	// Right to left, scrollLeft runs from 0 at the start down to negative.
	return rtl && at ? -at * max : at * max;
};

const metricsOf = (row) => ({
	scrollLeft: row.scrollLeft,
	scrollWidth: row.scrollWidth,
	clientWidth: row.clientWidth,
	rtl: getComputedStyle(row).direction === 'rtl',
});

// Overlay scrollbars stay hidden until a scroll, so nothing would show the row scrolls.
export const ScrollRow = ({ label, children }) => {
	const id = useId();
	const row = useRef(null);
	const [metrics, setMetrics] = useState(null);
	const count = Children.count(children);
	const handle = metrics && handleOf(metrics);

	useEffect(() => {
		const observer = new ResizeObserver(() =>
			setMetrics(metricsOf(row.current)),
		);
		observer.observe(row.current);
		for (const item of row.current.children) observer.observe(item);
		return () => observer.disconnect();
	}, [count]);

	const scrollTo = (left) => row.current.scrollTo({ left });

	const drag = (event) => {
		if (event.button !== 0) return;
		// The track under the handle would jump the row to the press instead.
		event.stopPropagation();
		event.preventDefault();
		const thumb = event.currentTarget;
		const track = thumb.parentElement.getBoundingClientRect().width;
		const { offset } = handle;
		const startX = event.clientX;
		const done = new AbortController();
		thumb.setPointerCapture(event.pointerId);
		thumb.addEventListener(
			'pointermove',
			({ clientX }) => {
				const moved = (clientX - startX) / track;
				scrollTo(
					scrollLeftAt(offset + (metrics.rtl ? -moved : moved), metrics),
				);
			},
			{ signal: done.signal },
		);
		for (const end of ['pointerup', 'pointercancel']) {
			thumb.addEventListener(end, () => done.abort(), { signal: done.signal });
		}
	};

	const jump = (event) => {
		if (event.button !== 0) return;
		const box = event.currentTarget.getBoundingClientRect();
		const at = metrics.rtl
			? box.right - event.clientX
			: event.clientX - box.left;
		scrollTo(scrollLeftAt(at / box.width - handle.size / 2, metrics));
	};

	// Arrows move the handle the way they point, so they need no right to left swap.
	const keys = (event) => {
		const {
			scrollLeft,
			scrollWidth,
			clientWidth,
			children: items,
		} = row.current;
		const step =
			items.length > 1
				? Math.abs(items[1].offsetLeft - items[0].offsetLeft)
				: clientWidth;
		const end = scrollWidth - clientWidth;
		const left = {
			ArrowLeft: scrollLeft - step,
			ArrowRight: scrollLeft + step,
			Home: 0,
			End: metrics.rtl ? -end : end,
		}[event.key];
		if (left === undefined) return;
		event.preventDefault();
		scrollTo(left);
	};

	return (
		<div className="flex flex-col gap-1">
			<div
				id={`${id}-row`}
				ref={row}
				onScroll={({ currentTarget }) => setMetrics(metricsOf(currentTarget))}
				// The padding keeps a pressed option's ring and focus outline from being cut off.
				className="-m-1 flex gap-2 overflow-x-auto overscroll-x-contain scroll-px-1 p-1 [scrollbar-width:none]"
			>
				{children}
			</div>
			{handle && (
				<div onPointerDown={jump} className="py-2">
					<div className="relative h-1 rounded-full bg-agentx-scroll-track">
						<div
							role="scrollbar"
							tabIndex={0}
							aria-label={label}
							aria-controls={`${id}-row`}
							aria-orientation="horizontal"
							aria-valuenow={handle.value}
							aria-valuemin={0}
							aria-valuemax={100}
							onPointerDown={drag}
							onKeyDown={keys}
							style={{
								width: `${handle.size * 100}%`,
								insetInlineStart: `${handle.offset * 100}%`,
							}}
							// The ::after widens what a pointer can grab without thickening the handle.
							className="agentx-focus absolute inset-y-0 cursor-grab touch-none rounded-full bg-agentx-scroll-thumb active:cursor-grabbing transition-colors after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] hover:bg-agentx-scroll-thumb-hover active:bg-agentx-scroll-thumb-hover"
						/>
					</div>
				</div>
			)}
		</div>
	);
};

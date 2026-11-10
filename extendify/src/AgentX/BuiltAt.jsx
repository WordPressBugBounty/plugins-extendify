import { Tooltip } from '@agentx/Tooltip';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, info } from '@wordpress/icons';

const MINUTE = 60 * 1000;
const UNITS = [
	['day', 86400],
	['hour', 3600],
	['minute', 60],
];

const ago = (at, now) => {
	const passed = Math.max(0, Math.round(now / 1000 - at));
	const words = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
	const [unit, size] = UNITS.find(([, length]) => passed >= length) ?? [
		'minute',
		60,
	];
	return words.format(-Math.floor(passed / size), unit);
};

// Asia/Bangkok reads as Bangkok, the way people name their time.
export const cityOf = (zone = 'UTC') =>
	zone.split('/').pop().replace(/_/g, ' ');

export const BuiltAt = ({ at, changes = [] }) => {
	const [now, setNow] = useState(() => Date.now());
	const [open, setOpen] = useState(false);
	const box = useRef(null);

	useEffect(() => {
		if (!at) return;
		const ticking = setInterval(() => setNow(Date.now()), MINUTE);
		return () => clearInterval(ticking);
	}, [at]);

	useEffect(() => {
		if (!open) return;
		const close = (event) => {
			if (event.key === 'Escape') setOpen(false);
		};
		const away = (event) => {
			if (!box.current?.contains(event.target)) setOpen(false);
		};
		document.addEventListener('keydown', close, true);
		document.addEventListener('mousedown', away, true);
		return () => {
			document.removeEventListener('keydown', close, true);
			document.removeEventListener('mousedown', away, true);
		};
	}, [open]);

	if (!at) return null;
	const time = new Intl.DateTimeFormat(undefined, {
		hour: 'numeric',
		minute: '2-digit',
	}).format(at * 1000);
	const latest = changes[0];
	// translators: Button beside the AI Agent's build time on a test build; opens the list of what changed.
	const label = __('View changes', 'extendify-local');
	return (
		// Three lines at the caption size would outgrow the 40px bar.
		<span
			ref={box}
			className="relative flex max-w-52 flex-col px-1 text-[0.6875rem] leading-tight"
		>
			<span className="truncate">
				{sprintf(
					// translators: %1$s is a time like 1:23 AM and %2$s a city like Bangkok, in the viewer's own time zone. Shown on test builds of the AI Agent: when this build was made.
					__('Last updated at %1$s %2$s time', 'extendify-local'),
					time,
					cityOf(Intl.DateTimeFormat().resolvedOptions().timeZone),
				)}
			</span>
			<span className="truncate">{ago(at, now)}</span>
			{latest && (
				<span className="flex min-w-0 items-center gap-0.5">
					<span className="truncate text-agentx-muted" title={latest}>
						{latest}
					</span>
					<Tooltip text={label}>
						<button
							type="button"
							aria-expanded={open}
							aria-label={label}
							onClick={() => setOpen((was) => !was)}
							className="agentx-focus m-0 flex shrink-0 cursor-pointer items-center rounded-agentx-control border-0 bg-transparent p-0 text-agentx-muted"
						>
							<Icon icon={info} size={14} className="fill-current" />
						</button>
					</Tooltip>
				</span>
			)}
			{open && (
				<div className="absolute top-full right-0 z-10 mt-1 max-h-80 w-72 overflow-auto rounded-agentx-control border border-solid border-agentx-card-border bg-agentx-raised p-2 text-agentx-ink shadow-md">
					<ul className="m-0 flex list-none flex-col gap-1.5 p-0">
						{changes.map((change, place) => (
							<li key={`${place}-${change}`} className="m-0">
								{change}
							</li>
						))}
					</ul>
				</div>
			)}
		</span>
	);
};

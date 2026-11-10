import { useEffect, useMemo, useRef, useState } from '@wordpress/element';

// A tile is a fifth of a card, so its corners and shadow shrink with it.
const SCALE = 0.4;
const scaled = (value) =>
	value?.replace(
		/(\d+(?:\.\d+)?)px/g,
		(_, px) => `${Math.round(Number(px) * SCALE * 10) / 10}px`,
	);

// Button corners alone made eleven vibes look like five, so the tile draws the card too.
const Shape = ({ button = {}, card = {}, image = {} }) => (
	<span
		aria-hidden="true"
		style={{
			borderRadius: scaled(card.radius) ?? '2px',
			border: card.border ?? undefined,
			boxShadow: scaled(card.shadow) ?? undefined,
		}}
		className="flex h-11 w-14 shrink-0 flex-col gap-1 overflow-hidden bg-current/15 p-1.5"
	>
		<span
			style={{ borderRadius: scaled(image.radius) ?? '1px' }}
			className="min-h-0 flex-1 bg-current opacity-30"
		/>
		<span
			style={{ borderRadius: scaled(button.radius) ?? '2px' }}
			className="h-2 w-2/3 shrink-0 bg-current opacity-80"
		/>
	</span>
);

const SITE = 'extendify-agentx-site';
const VARIABLE = /var\((--wp--[a-z0-9-]+)/g;
// A vibe's CSS may never name the colors the tile itself paints with, which left Wave's blank.
const DRAWN_WITH = ['background', 'tertiary'].map(
	(slug) => `--wp--preset--color--${slug}`,
);
// Every style's card shows this one photo, so only the shapes differ.
const PHOTO =
	'https://images.extendify-cdn.com/agents/style-selector-preview.jpg';
// The chat has none of the theme's variables, so the vibe's CSS reads the site's own.
const siteVariables = (css) => {
	try {
		const frame = document.getElementById(SITE);
		const style = frame.contentWindow.getComputedStyle(
			frame.contentDocument.documentElement,
		);
		const names = new Set([
			...DRAWN_WITH,
			...[...css.matchAll(VARIABLE)].map(([, name]) => name),
		]);
		return Object.fromEntries(
			[...names]
				.map((name) => [name, style.getPropertyValue(name).trim()])
				.filter(([, value]) => value),
		);
	} catch {
		return {};
	}
};

// Drawn at full size by the vibe's own CSS, then scaled: cut corners and wavy edges are CSS only.
const SIZE = 160;
const Scene = ({ preview: { slug, css, vars }, className = 'size-11' }) => {
	const box = useRef(null);
	const [scale, setScale] = useState(44 / SIZE);
	useEffect(() => {
		const observer = new ResizeObserver(([{ contentRect }]) =>
			setScale(contentRect.width / SIZE),
		);
		observer.observe(box.current);
		return () => observer.disconnect();
	}, []);
	const scope = `agentx-vibe-${slug}`;
	const [scoped, variables] = useMemo(
		() => [
			// The base comes first and weighs nothing, so the vibe's own rules win.
			`:where(.${scope}) :where(.has-background-background-color){background-color:var(--wp--preset--color--background)}:where(.${scope}) :where(.has-tertiary-background-color){background-color:var(--wp--preset--color--tertiary)}${css.replaceAll(':root', `.${scope}`)}`,
			{ ...siteVariables(css), ...(vars ?? {}) },
		],
		[css, scope, vars],
	);
	return (
		<span
			ref={box}
			aria-hidden="true"
			className={`relative block shrink-0 overflow-hidden rounded-[3px] ${className}`}
		>
			<style>{scoped}</style>
			<span
				className={scope}
				style={{
					...variables,
					position: 'absolute',
					top: 0,
					left: 0,
					width: SIZE,
					height: SIZE,
					transform: `scale(${scale})`,
					transformOrigin: 'top left',
				}}
			>
				<span
					className={`wp-block-group is-style-ext-preset--group--${slug}--section has-background-background-color has-background`}
					style={{
						display: 'block',
						height: '100%',
						padding: 16,
						boxSizing: 'border-box',
					}}
				>
					<span
						className={`wp-block-group is-style-ext-preset--group--${slug}--item-card-1--align-center has-tertiary-background-color has-background`}
						style={{
							display: 'flex',
							height: '100%',
							padding: 0,
							overflow: 'hidden',
							boxSizing: 'border-box',
						}}
					>
						<span
							className="wp-block-image"
							style={{ display: 'block', width: '100%', height: '100%' }}
						>
							<img
								src={PHOTO}
								alt=""
								draggable={false}
								loading="lazy"
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
							/>
						</span>
					</span>
				</span>
			</span>
		</span>
	);
};

export const VibeDrawing = ({ option, className }) =>
	option.preview?.css ? (
		<Scene preview={option.preview} className={className} />
	) : (
		<Shape {...option} />
	);

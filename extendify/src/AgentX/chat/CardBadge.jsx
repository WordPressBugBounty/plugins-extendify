import {
	BrowserIcon,
	ImageIcon,
	PaletteIcon,
	PhoneIcon,
	PlugIcon,
	RocketIcon,
	SlidersIcon,
	SnowflakeIcon,
	StorefrontIcon,
	TextIcon,
} from '@agentx/guide/icons';
import { useState } from '@wordpress/element';

export const CARD_ICONS = {
	text: TextIcon,
	image: ImageIcon,
	browser: BrowserIcon,
	rocket: RocketIcon,
	palette: PaletteIcon,
	sliders: SlidersIcon,
	phone: PhoneIcon,
	store: StorefrontIcon,
	plug: PlugIcon,
	snow: SnowflakeIcon,
};

// wordpress.org has Imagify's icon only as an animated GIF.
export const PLUGIN_LOGOS = {
	imagify:
		'https://extendify-assets.nyc3.cdn.digitaloceanspaces.com/agents/plugins/imagify.png',
	'wp-rocket':
		'https://extendify-assets.nyc3.cdn.digitaloceanspaces.com/assist-recommendations/wprocket.png',
};

export const CardBadge = ({ icon, logo }) => {
	const [failed, setFailed] = useState(false);
	if (logo && !failed) {
		return (
			<img
				src={logo}
				alt=""
				onError={() => setFailed(true)}
				className="size-9 shrink-0 rounded-full object-contain ring-1 ring-agentx-badge-border"
			/>
		);
	}
	const Shown = CARD_ICONS[icon] ?? TextIcon;
	return (
		<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-agentx-badge text-agentx-badge-ink ring-1 ring-agentx-badge-border">
			<Shown className="size-5" />
		</span>
	);
};

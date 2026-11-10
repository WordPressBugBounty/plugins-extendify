import { askCard } from '@agentx/chat/AbilityAsk';
import { formOf } from '@agentx/chat/forms';
import { leaveCard } from '@agentx/chat/LeaveForm';
import { PreviewButton } from '@agentx/chat/PageCard';
import {
	imagifyCoverageCard,
	imagifyInstallCard,
} from '@agentx/chat/suggestions';
import { CanvasTools } from '@agentx/demo/CanvasTools';
import { sampleImages } from '@agentx/demo/sample-images';
import { taskNudge } from '@agentx/lib/nudges';
import { useShellStore } from '@agentx/state/shell';
import { Fragment } from '@wordpress/element';

const asked = (text) => ({
	id: 'demo-asked',
	role: 'user',
	parts: [{ type: 'text', text }],
});

const answered = (text, metadata) => ({
	id: 'demo-answered',
	role: 'assistant',
	parts: text ? [{ type: 'text', text }] : [],
	metadata,
});

const step = (name, title, state = 'output-available', id = name) => ({
	type: `tool-${name}`,
	toolCallId: `demo-${id}`,
	state,
	title,
	input: {},
	...(state === 'output-error' && { errorText: 'Failed' }),
	...(state === 'output-available' && { output: {} }),
});

const labelled = (name, done, failed) => ({
	type: 'data-step',
	id: `demo-${name}`,
	data: { done, failed },
});

const DEMO_PAGE = {
	draft: { title: 'Catering', url: '/', status: 'draft', label: 'Draft' },
	publishing: { url: '/', title: 'Catering', type: 'page', status: 'publish' },
};

const created = () => [
	asked('add a catering page'),
	{
		id: 'demo-answered',
		role: 'assistant',
		parts: [
			{
				...step('create-page', 'Creating your page'),
				input: {
					title: 'Catering',
					description: 'A page about our catering menus',
				},
				output: {
					...DEMO_PAGE.draft,
					steps: ['profile', 'images', 'layout', 'copy', 'page', 'open'],
				},
			},
			labelled('create-page', 'Created your page', "Couldn't create your page"),
		],
		metadata: { workflow: 'create-page' },
	},
];

const waitingOnPage = () => [
	asked('publish my catering page'),
	{
		id: 'demo-answered',
		role: 'assistant',
		parts: [
			step('read-site', 'Reading your site'),
			labelled('read-site', 'Read your site', "Couldn't read your site"),
			{
				type: 'tool-confirm-page-status',
				toolCallId: 'demo-confirm-page-status',
				state: 'input-available',
				title: 'Publishing the page',
				input: DEMO_PAGE.publishing,
				demoState: 'asking',
			},
		],
		metadata: { workflow: 'page-status' },
	},
];

// A demo state opens the steps, since the demo stops clicks.
const contactReply = ({ open = false } = {}) => ({
	id: 'demo-answered',
	role: 'assistant',
	parts: [
		{ ...step('read-site', 'Reading your site'), expanded: open },
		labelled('read-site', 'Read your site', "Couldn't read your site"),
		step('show-page', 'Opening the page'),
		labelled('show-page', 'Opened the page', "Couldn't open the page"),
		{
			type: 'text',
			text: "Here's your **Contact** page. It lists your phone number, email and opening hours.",
		},
	],
	metadata: { workflow: 'answer-questions' },
});

// The second step is still running unless the agent is between tools.
const workingSteps = ({ open = false, between = false } = {}) => [
	{ ...step('read-site', 'Reading your site'), expanded: open },
	labelled('read-site', 'Read your site', "Couldn't read your site"),
	step(
		'show-page',
		'Opening the page',
		between ? 'output-available' : 'input-available',
	),
	labelled('show-page', 'Opened the page', "Couldn't open the page"),
];

// A small stand-in logo, so the demo needs nothing from the media library.
const DEMO_LOGO =
	'data:image/svg+xml,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#2563eb"/><text x="32" y="42" font-size="28" text-anchor="middle" fill="#fff" font-family="sans-serif">B</text></svg>',
	);

const picking = (setting, demoState = 'shown') => ({
	id: 'demo-answered',
	role: 'assistant',
	parts: [
		{
			type: 'tool-media-upload',
			toolCallId: 'demo-media-upload',
			state: 'input-available',
			input: {
				target: setting,
				...(setting === 'block' && {
					block: { id: 'demo:0', type: 'core/image' },
					choose: 'portrait of a smiling dentist',
				}),
				sources: ['upload', 'library', 'stock', 'generate'],
			},
			demoState,
		},
	],
	metadata: {
		workflow: { icon: 'site-icon', logo: 'logo', block: 'block-edit' }[setting],
	},
});

const designing = (tab, id = 'demo-adjust-design', input = {}) => ({
	id: `demo-answered-${id}`,
	role: 'assistant',
	parts: [
		{ type: 'text', text: 'Pick one to try it on your site.' },
		{
			type: 'tool-adjust-design',
			toolCallId: id,
			state: 'output-available',
			input: { tab, ...input },
			output: { shown: true },
		},
	],
	metadata: { workflow: tab },
});

// The colors a model made for "make my site more blue", as the backend builds them.
const madeScheme = ([
	title,
	background,
	foreground,
	primary,
	secondary,
	tertiary,
	weak,
	ink,
]) => {
	const palette = { background, foreground, primary, secondary, tertiary };
	return {
		title,
		settings: {
			color: {
				palette: [
					...Object.entries(palette).map(([slug, color]) => ({
						slug,
						color,
						name: slug,
					})),
					{ slug: 'foreground-alt', color: weak, name: 'foreground-alt' },
				],
			},
			custom: {
				color: { 'background-base': background, 'text-strong': foreground },
				elements: { button: { color: { background: primary, text: ink } } },
			},
		},
	};
};

const MADE_BLUE = [
	[
		'Ocean Breeze',
		'#F0F4F8',
		'#102A43',
		'#0066CC',
		'#3388EE',
		'#FBFCFD',
		'#5B6A7E',
		'#F0F4F8',
	],
	[
		'Deep Azure',
		'#EBF3FA',
		'#1A2B3C',
		'#0044A8',
		'#2675FF',
		'#FAFCFE',
		'#5D6A79',
		'#EBF3FA',
	],
	[
		'Cobalt Sky',
		'#F2F6FA',
		'#1E293B',
		'#547BE8',
		'#3B82F6',
		'#FCFDFE',
		'#626A79',
		'#000000',
	],
	[
		'Electric Indigo',
		'#F5F3FF',
		'#2E1065',
		'#4F46E5',
		'#6366F1',
		'#FDFCFF',
		'#745A99',
		'#F5F3FF',
	],
	[
		'Arctic Frost',
		'#F0FDF4',
		'#064E3B',
		'#0284C7',
		'#38BDF8',
		'#FBFFFC',
		'#547A6B',
		'#000000',
	],
	[
		'Royal Sapphire',
		'#EEF2FF',
		'#1E1B4B',
		'#382FB0',
		'#6366F1',
		'#FBFCFF',
		'#635E86',
		'#EEF2FF',
	],
].map(madeScheme);

const MADE_PRIMARY = {
	only: { slug: 'primary', name: 'Primary' },
	values: [
		{ name: 'Sky Blue', color: '#89CFF0' },
		{ name: 'Deep Navy', color: '#1B2A4A' },
		{ name: 'Teal', color: '#0F766E' },
		{ name: 'Coral', color: '#E07A5F' },
		{ name: 'Plum', color: '#6B2D5C' },
		{ name: 'Forest', color: '#2D6A4F' },
	],
};

const recolored = {
	id: 'demo-answered',
	role: 'assistant',
	parts: [
		{ type: 'step-start' },
		step('edit-blocks', 'Changing the Group'),
		labelled(
			'edit-blocks',
			'Changed the Group style',
			"Couldn't change the Group",
		),
		{ type: 'step-start' },
		{
			type: 'text',
			text: 'I made the section dark blue.',
		},
		{
			type: 'data-nudge',
			data: {
				id: 'adjust-colors',
				lead: 'I also updated the text color for better contrast, but you can change it if you’d like.',
			},
		},
	],
	metadata: { workflow: 'block-edit' },
};

const ADJUST_COLORS = {
	id: 'adjust-colors',
	text: 'Adjust the colors',
	type: 'action',
	card: {
		fallback: 'Do you want to adjust the new colors?',
		button: 'Adjust colors',
		icon: 'palette',
	},
	details: { tool: 'adjust-colors' },
};

const adjustingColors = {
	id: 'demo-answered-colors',
	role: 'assistant',
	parts: [
		{
			type: 'tool-adjust-colors',
			toolCallId: 'demo-adjust-colors',
			state: 'output-available',
			demoState: 'shown',
			input: {
				shown: {
					background: { block: 'demo:0', type: 'core/group' },
					text: [
						{
							block: 'demo:0.0',
							type: 'core/paragraph',
							setting: 'text_color',
						},
					],
					fill: '#1e3a8a',
					ink: '#ffffff',
				},
			},
			output: { shown: true },
		},
	],
	metadata: { workflow: 'block-edit' },
};

// Home pages drawn in a few lines, so the layout thumbnails load nothing from the site.
const samplePage = (hero) =>
	`data:text/html,${encodeURIComponent(
		`<!doctype html><style>body{margin:0;font:2.2vw/1.3 system-ui,sans-serif;color:#1e1e1e;background:#fbf7f2}header{display:flex;justify-content:space-between;padding:2vw 5vw;font-weight:600}nav{display:flex;gap:3vw;font-weight:400}h1{margin:0 0 1.5vw;font-size:5vw;line-height:1.05}p{margin:0 0 2.5vw}a{display:inline-block;padding:1.2vw 2.5vw;border-radius:.6vw;background:#9a3412;color:#fff}.photo{min-height:30vw;border-radius:1vw;background:linear-gradient(135deg,#f59e0b,#9a3412)}.split{display:flex;gap:4vw;align-items:center;padding:5vw}.split>*{flex:1}</style><header>Bloom Bakery<nav><span>Menu</span><span>About</span><span>Contact</span></nav></header>${hero}`,
	)}`;

const HERO_COPY =
	'<h1>Fresh bread every morning</h1><p>Baked by hand in small batches, a short walk from home.</p><a>Order now</a>';

const SAMPLE_LAYOUTS = [
	samplePage(
		`<section style="padding:8vw 5vw;text-align:center">${HERO_COPY}</section>`,
	),
	samplePage(
		`<section class="split"><div>${HERO_COPY}</div><div class="photo"></div></section>`,
	),
	samplePage(
		`<section class="split"><div class="photo"></div><div>${HERO_COPY}</div></section>`,
	),
	samplePage(
		`<section class="photo" style="margin:0 5vw;padding:14vw 5vw 5vw;color:#fff">${HERO_COPY}</section>`,
	),
	samplePage(
		`<section style="padding:6vw 5vw"><div class="photo" style="min-height:18vw;margin-bottom:3vw"></div>${HERO_COPY}</section>`,
	),
];

const choosingLayout = {
	id: 'demo-answered-demo-choose-layout',
	role: 'assistant',
	parts: [
		{ type: 'text', text: 'Pick one to try it on your site.' },
		{
			type: 'tool-choose-layout',
			toolCallId: 'demo-choose-layout',
			state: 'output-available',
			input: {},
			output: { shown: true },
			demoState: { layouts: SAMPLE_LAYOUTS },
		},
	],
	metadata: { workflow: 'site-design' },
};

const [DEMO_PRODUCT, DEMO_PHOTO] = sampleImages('plugins', 2).map(
	({ url }) => url,
);

const woo = (name, label, destructive, idempotent) => ({
	name: `woocommerce/${name}`,
	label,
	plugin: 'WooCommerce',
	annotations: { readonly: false, destructive, idempotent },
});

const PRODUCT_SCHEMA = {
	type: 'object',
	properties: {
		id: { type: 'integer', minimum: 1 },
		product_type_alias: { type: 'string', enum: ['physical'] },
		name: { type: 'string' },
		regular_price: { type: 'string' },
		short_description: { type: 'string' },
		description: { type: 'string' },
	},
};

const wooCard = (name, label, destructive, input) => ({
	type: `tool-woocommerce__${name}`,
	toolCallId: `demo-${name}`,
	state: 'input-available',
	input,
	demoState: {
		ability: {
			...woo(name, label, destructive, false),
			inputSchema: {
				...PRODUCT_SCHEMA,
				required: [destructive ? 'id' : 'name'],
			},
		},
	},
});

const OPTIMIZE = {
	name: 'imagify/optimize-media',
	label: 'Optimize media',
	plugin: 'Imagify',
	annotations: { readonly: false, destructive: true, idempotent: false },
};

const optimized = (output, demoState = 'shown') => [
	asked('optimize hero-banner.jpg'),
	{
		id: 'demo-answered',
		role: 'assistant',
		parts: [
			{ type: 'text', text: 'Optimizing hero-banner.jpg with Imagify.' },
			{
				...step('imagify__optimize-media', 'Running “Optimize media”'),
				input: { media_filename: 'hero-banner.jpg', media_url: DEMO_PHOTO },
				output,
				demoState,
			},
			labelled(
				'imagify__optimize-media',
				'Ran “Optimize media”',
				"Couldn't run “Optimize media”",
			),
		],
		metadata: { workflow: 'plugin:imagify' },
	},
];

const MUG = {
	id: 0,
	name: 'Tuesday Mug',
	permalink: '/',
	status: 'publish',
	price: '12',
	regular_price: '12',
	currency: 'USD',
	currency_symbol: '&#36;',
	images: [{ id: 0, url: DEMO_PRODUCT }],
};

const mugAdded = (product) => [
	asked('add a mug called Tuesday Mug for $12'),
	{
		id: 'demo-answered',
		role: 'assistant',
		parts: [
			{ type: 'text', text: 'Adding Tuesday Mug to your store for $12.' },
			{
				...step('woocommerce__product-create', 'Running “Create product”'),
				input: {
					name: 'Tuesday Mug',
					regular_price: '12',
					short_description: 'A 12 oz mug that says “omg it’s Tuesday”.',
				},
				output: { product },
				demoState: 'shown',
			},
			labelled(
				'woocommerce__product-create',
				'Ran “Create product”',
				"Couldn't run “Create product”",
			),
		],
		metadata: { workflow: 'plugin:woocommerce' },
	},
];

const LITE_FIELD_TYPES = [
	['text', 'Single Line Text', 'placeholder'],
	['textarea', 'Paragraph Text', 'placeholder'],
	['email', 'Email', 'placeholder'],
	['number', 'Numbers', 'placeholder'],
	['select', 'Dropdown', 'choices'],
	['radio', 'Multiple Choice', 'choices'],
	['checkbox', 'Checkboxes', 'choices'],
	['name', 'Name'],
].map(([type, label, takes]) => ({
	type,
	label,
	properties: takes ? [{ key: takes }] : [],
}));

const fieldCard = (input) => ({
	type: 'tool-wpforms__add-field',
	toolCallId: 'demo-add-field',
	state: 'input-available',
	input,
	demoState: {
		ability: {
			name: 'wpforms/add-field',
			label: 'Add Field',
			plugin: 'WPForms',
			annotations: { readonly: false, destructive: false, idempotent: false },
			inputSchema: {
				type: 'object',
				properties: {
					form_id: { type: 'integer' },
					type: { type: 'string' },
					label: { type: 'string' },
					description: { type: 'string' },
					required: { type: 'boolean' },
					placeholder: { type: 'string' },
					choices: { type: 'array' },
				},
				required: ['form_id', 'type'],
			},
		},
		fieldTypes: LITE_FIELD_TYPES,
	},
});

const MUG_FORM = formOf(
	wooCard('product-create', 'Create product', false, {
		name: 'Tuesday Mug',
		regular_price: '12',
	}),
);

// The user asked a side question while the form was open, so its call was answered as still open.
const typedPastForm = [
	asked('add a mug called Tuesday Mug for $12'),
	{
		id: 'demo-form-asked',
		role: 'assistant',
		parts: [
			{
				...wooCard('product-create', 'Create product', false, {}),
				state: 'output-available',
				output: { open: true },
			},
		],
		metadata: { workflow: 'plugin:woocommerce' },
	},
	{
		id: 'demo-side-question',
		role: 'user',
		parts: [{ type: 'text', text: 'what is a good description?' }],
	},
];

const PROFILE = {
	name: 'Rise & Shine Bakery',
	tagline: 'Fresh every morning',
	about:
		'A neighborhood bakery in Portland baking sourdough, croissants and celebration cakes to order since 2012.',
	tone: 'friendly',
};

const profileCall = {
	type: 'tool-edit-site-profile',
	toolCallId: 'demo-edit-site-profile',
	state: 'input-available',
	title: 'Opening your site profile',
	input: {},
};

const filledIn = (form, values) => ({
	...form,
	fields: form.fields.map((field) => ({ ...field, value: values[field.name] })),
});

// A sample, so the state looks the same on any site.
const PROFILE_FORM = filledIn(formOf(profileCall), PROFILE);

const now = Math.floor(Date.now() / 1000);

// The first was saved, the newest undone, and the one before it is what the site shows.
const CHANGES = [
	{
		id: 1,
		at: now - 1500,
		kind: 'colors',
		name: 'Marzipan',
		changed: [],
		saved: true,
	},
	{ id: 2, at: now - 900, kind: 'fonts', name: 'Gotu & Manrope', changed: [] },
	{
		id: 3,
		at: now - 600,
		kind: 'block',
		changed: [
			{ block: 'post:2:0', type: 'core/heading', op: 'text', title: 'Home' },
			{ block: 'post:2:1.0', type: 'core/button', op: 'text', title: 'Home' },
			{
				block: 'part:footer:1',
				type: 'core/site-title',
				op: 'attributes',
				title: 'Home',
			},
		],
	},
	{
		id: 4,
		at: now - 240,
		kind: 'animation',
		animation: 'fade-up:slow',
		changed: [],
	},
	{
		id: 5,
		at: now - 60,
		kind: 'vibe',
		name: 'Soft',
		changed: [],
		undone: true,
	},
];

const buttonTry = (id, at) => ({
	id,
	at,
	kind: 'block',
	changed: [
		{
			block: 'post:2:1.0',
			type: 'core/button',
			op: 'attributes',
			title: 'Home',
		},
	],
});

const CHANGES_DECK = [
	{
		id: 1,
		at: now - 1800,
		kind: 'colors',
		name: 'Marzipan',
		changed: [],
		saved: true,
	},
	{ id: 2, at: now - 1500, kind: 'colors', name: 'Brick', changed: [] },
	{ id: 3, at: now - 1400, kind: 'colors', name: 'Lagoon', changed: [] },
	{ id: 4, at: now - 1300, kind: 'colors', name: 'Midnight', changed: [] },
	buttonTry(5, now - 400),
	buttonTry(6, now - 300),
	buttonTry(7, now - 200),
	buttonTry(8, now - 120),
	{
		id: 9,
		at: now - 30,
		kind: 'block',
		changed: [
			{ block: 'post:2:0', type: 'core/heading', op: 'text', title: 'Home' },
		],
	},
];

const PLAN_TITLE = 'Redo the menu section';

const PLAN = [
	{ id: 's1', title: 'Make the menu headings red' },
	{ id: 's2', title: 'Make the prices bold' },
	{ id: 's3', title: 'Add a line about daily specials' },
];

const RESTYLE = {
	title: 'Make the site more fun',
	titleDone: 'Made the site more fun',
	steps: [
		{ id: 'demo-r1', layer: 'colors', made: 0, title: 'New colors: Candy Pop' },
		{
			id: 'demo-r2',
			layer: 'fonts',
			pick: 'theme:baloo-tamma-2-mulish',
			title: 'New fonts: Baloo Tamma 2 & Mulish',
		},
		{
			id: 'demo-r3',
			layer: 'vibe',
			pick: 'vibe:marzipan-1',
			title: 'New style: Marzipan',
		},
		{
			id: 'demo-r4',
			layer: 'animation',
			pick: 'zoom-in:medium',
			title: 'New animation: Zoom in, Medium',
		},
	],
};

// With no live run behind it, a running look draws its steps' states from the call.
const restyling = (output) => ({
	id: output ? 'demo-restyled' : 'demo-restyling',
	role: 'assistant',
	parts: [
		{ type: 'step-start' },
		{
			type: 'tool-restyle-site',
			toolCallId: output ? 'demo-restyled-call' : 'demo-restyling-call',
			state: output ? 'output-available' : 'input-available',
			input: output
				? RESTYLE
				: {
						...RESTYLE,
						steps: RESTYLE.steps.map((step, at) => ({
							...step,
							state: ['done', 'done', 'running', 'pending'][at],
						})),
					},
			...(output && { output }),
		},
	],
	metadata: { workflow: 'restyle' },
});

const PLAN_ASKED = 'make the menu section red, with bold prices';

const planInChat = (text, ended) => [
	asked(PLAN_ASKED),
	{
		id: 'demo-answered',
		role: 'assistant',
		parts: [
			{ type: 'step-start' },
			{
				type: 'tool-show-plan',
				toolCallId: 'demo-plan',
				state: 'output-available',
				input: { title: PLAN_TITLE, steps: PLAN },
				output: {
					shown: true,
					...(ended && {
						ended,
						steps: PLAN.map((step, at) => ({
							...step,
							state:
								ended === 'completed'
									? 'done'
									: ['done', 'canceled', 'pending'][at],
						})),
					}),
				},
			},
			{ type: 'step-start' },
			{ type: 'text', text },
		],
		metadata: { workflow: 'block-edit' },
	},
];

const MAP_SHOWN =
	'https://maps.google.com/maps?q=Ferry%20Building%2C%20San%20Francisco&output=embed';

const mapAdded = (made) => ({
	...step('edit-blocks', 'Adding to the page', 'output-available', 'map'),
	input: {
		ops: [
			{
				op: 'add',
				block: 'demo:1',
				type: 'core/heading',
				position: 'after',
				new: { type: 'core/html', ...made },
			},
		],
	},
	output: { done: ['Added a map'], maps: [MAP_SHOWN] },
});

const MAP_CLOSING =
	'I added a map of the Ferry Building under the “Contact us” heading.';

const working = (parts, statusText) => ({
	messages: [
		asked('Show me the contact page'),
		{ id: 'demo-answered', role: 'assistant', parts, metadata: {} },
	],
	status: 'streaming',
	statusText,
});

const timezoneSaved = () => [
	asked('set my time zone to Paris'),
	{
		id: 'demo-answered',
		role: 'assistant',
		parts: [
			{ type: 'step-start' },
			step('update-setting', 'Changing your time zone'),
			labelled(
				'update-setting',
				'Changed your time zone',
				"Couldn't change your time zone",
			),
		],
		metadata: { workflow: 'time-zone', wrapUp: true },
	},
];

const pagesAndPosts = () => [
	asked("what's the difference between a page and a post?"),
	answered(
		'Posts are dated entries that show up in your blog, newest first. Pages hold content that stays put, like your About or Contact page.',
		{ workflow: 'answer-questions' },
	),
];

const FEEDBACK = { traceId: 'demo-trace' };

const pluginInstalled = () => [
	asked('I need a contact form'),
	{
		id: 'demo-answered',
		role: 'assistant',
		parts: [
			{
				...step('choose-plugin', 'Asking you to pick a plugin'),
				output: {
					picked: { slug: 'wpforms-lite', name: 'WPForms' },
					done: 'Picked WPForms',
				},
			},
			labelled(
				'choose-plugin',
				'Picked a plugin',
				"Couldn't install the plugin",
			),
			{
				...step('install-plugin', 'Installing WPForms'),
				output: {
					slug: 'wpforms-lite',
					name: 'WPForms',
					version: '1.9.8',
					done: 'Installed and activated WPForms',
				},
			},
			{
				type: 'data-step',
				id: 'demo-install-plugin',
				data: { failed: "Couldn't install WPForms" },
			},
		],
		metadata: { workflow: 'recommend-plugins' },
	},
];

const wrappedUp = (messages, text, nudge, lead) => [
	...messages.slice(0, -1),
	{
		...messages.at(-1),
		parts: [
			...messages.at(-1).parts,
			{ type: 'step-start' },
			{ type: 'text', text },
			...(nudge
				? [{ type: 'data-nudge', data: { id: nudge, ...(lead && { lead }) } }]
				: []),
		],
	},
];

const LEADS = {
	'refresh-tagline':
		"I noticed we haven't updated your tagline in a while. Is it still accurate?",
	'refresh-logo':
		'Take a look at your logo below and let me know if you want to work on it.',
	'refresh-description':
		"I noticed we haven't updated your site description in a while. Is it still accurate?",
	'setup-logo': "I noticed your site doesn't have a logo yet.",
	'setup-store': 'I noticed your store isn’t set up yet.',
	'setup-publish':
		"I noticed your site isn't live yet, so visitors see a Coming Soon page.",
	'setup-fonts': 'Your site still has the fonts it started with.',
	'imagify-coverage':
		"By the way, only 34 of your 56 images are optimized, since you've used all 20MB of this month's free Imagify optimization.",
};

const EXPLORE = {
	id: 'explore',
	text: 'Show me what you can do',
	type: 'placeholder',
	details: { sheet: 'commands' },
};

const refresh = (id, label, shows) => ({
	id,
	text: label,
	type: 'refresh',
	details: { label, ...shows },
});

const REFRESH_TAGLINE = refresh('refresh-tagline', 'Tagline', {
	kind: 'Tagline refresh',
	ask: 'Your tagline was last updated 3 months ago. Want to refresh it?',
	value: PROFILE.tagline,
	icon: 'text',
});

const REFRESH_DESCRIPTION = refresh('refresh-description', 'Site description', {
	kind: 'Site description refresh',
	ask: 'Your site description was last updated 4 months ago. Want to refresh it?',
	value: `${PROFILE.about} Every loaf starts the night before with a slow rise, and the ovens are on by four so the first batch is out when the doors open at seven. We bake for weddings, birthdays and office mornings, deliver across the east side, and keep a gluten-free shelf stocked from Thursday to Sunday.`,
	icon: 'text',
});

const setupCard = (id, label, shows) => ({
	id,
	text: label,
	type: 'setup',
	details: { label, ...shows },
});

const SETUP_LOGO = setupCard('setup-logo', 'Logo', {
	note: "Your site doesn't have a logo yet.",
	kind: 'Site logo setup',
	ask: "I noticed you still don't have a site logo set. Want to do that now?",
	icon: 'image',
	question: 'Do you want to add a logo next?',
	action: 'Add logo',
	bell: { message: 'Help me add a logo' },
});

const SETUP_FONTS = setupCard('setup-fonts', 'Fonts', {
	note: 'Your site still has the fonts it started with.',
	kind: 'Fonts refresh',
	ask: "Your fonts haven't changed since your site was built 2 months ago. Want to try new ones?",
	icon: 'text',
	question: 'Do you want to try new fonts next?',
	action: 'Change fonts',
	bell: { message: 'Help me pick new fonts' },
});

const IMAGIFY_COVERAGE = imagifyCoverageCard({
	optimized: 34,
	total: 56,
	used: '20MB',
});

const SETUP_LIVE = setupCard('setup-publish', 'Site visibility', {
	note: "Your site isn't live yet, so visitors see a Coming Soon page.",
	kind: 'Site launch',
	ask: "I noticed your site isn't live yet, so visitors see a Coming Soon page. Want to publish it now?",
	icon: 'rocket',
	question: 'Do you want to publish your site next?',
	action: 'Publish site',
	bell: { message: 'Help me publish my site' },
});

const REFRESH_LOGO = refresh('refresh-logo', 'Logo', {
	kind: 'Site logo refresh',
	ask: 'Your site logo was last updated 5 months ago. Want to refresh it?',
	image: { url: DEMO_LOGO, name: 'Rise & Shine logo' },
	icon: 'image',
});

const request = (id, text, workflow) => ({
	id,
	text,
	type: 'placeholder',
	details: { workflow },
});

const FONTS = request('fonts', 'Change website fonts', 'fonts');

const SITE_TITLE = request('site-title', 'Change website title', 'site-title');

const TAGLINE = request('tagline', 'Change website tagline', 'tagline');

const NEW_PAGE = request('create-page', 'Create a new page', 'create-page');

const LOGO_REQUEST = request('logo', 'Change website logo', 'logo');

const SITE_PROFILE = {
	...request('site-profile', 'Edit my site profile', 'site-profile'),
	details: { workflow: 'site-profile', form: 'edit-site-profile' },
};

const PUBLISH_SITE = request(
	'publish-site',
	'Make my site live',
	'site-visibility',
);

const proactive = (data) => ({
	id: `demo-proactive-${data.id}`,
	role: 'assistant',
	parts: [{ type: 'data-proactive', data }],
});

const INSTALL_IMAGIFY = request(
	'install-imagify',
	'Install Imagify',
	'recommend-plugins',
);

const LARGE_IMAGES = imagifyInstallCard('speed-imagify');

const slowAnswered = () =>
	wrappedUp(
		[
			asked('Why is my site loading slowly?'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					step('check-site-speed', 'Checking your site speed'),
					labelled(
						'check-site-speed',
						'Checked your site speed',
						"Couldn't check your site speed",
					),
					{
						type: 'text',
						text: 'It looks like you have several large images on the site slowing it down. I recommend we install Imagify to optimize them.',
					},
				],
				metadata: { workflow: 'site-speed' },
			},
		],
		'Would you like me to add it now?',
		'speed-imagify',
	);

const closed = (messages, done) =>
	wrappedUp(
		messages,
		`${done}\n\nLet me know what you would like to do next.`,
		'explore',
	);

const timezoneDone = () =>
	wrappedUp(timezoneSaved(), 'I just set your site to Paris time for you.');

const teamAdded = () => [
	asked('add a team section to my home page'),
	{
		id: 'demo-answered',
		role: 'assistant',
		parts: [
			{ type: 'step-start' },
			step('read-site', 'Reading your site'),
			labelled('read-site', 'Read your site', "Couldn't read your site"),
			step('edit-blocks', 'Adding a team section'),
			labelled(
				'edit-blocks',
				'Added a team section',
				"Couldn't add a team section",
			),
		],
		metadata: { workflow: 'block-edit' },
	},
];

const TEAM_DONE = 'I added a Team section to your home page.';

const [LATTE] = sampleImages('latte', 1).map((image) => ({
	...image,
	name: 'latte.jpg',
}));

const latteSwapped = () => [
	asked('swap this photo for a latte'),
	{
		id: 'demo-answered',
		role: 'assistant',
		parts: [
			{ type: 'step-start' },
			{
				type: 'tool-card-change',
				toolCallId: 'demo-latte',
				state: 'output-available',
				input: { kind: 'block' },
				output: { done: 'Replaced the image', image: LATTE },
			},
			{ type: 'step-start' },
			{ type: 'text', text: "I've updated the image to a latte for you." },
		],
		metadata: { workflow: 'block-edit' },
	},
];

// The agent's swap ends its turn, so the image's card shows under its line.
const latteLed = (nudge, lead) => {
	const [asking, answered] = latteSwapped();
	return [
		asking,
		{
			...answered,
			parts: [
				...answered.parts,
				{ type: 'data-nudge', data: { id: nudge, lead } },
			],
		},
	];
};

const [UPLOADED] = sampleImages('upload', 1).map((image) => ({
	...image,
	name: 'storefront.jpg',
}));

// Everything a run shows but cards and sheets, caught mid-plan with a message queued.
const runInProgress = () => ({
	messages: [
		{
			id: 'demo-run-photo-asked',
			role: 'user',
			parts: [
				{
					type: 'text',
					text: 'Use the photo I uploaded here, and call the site Bloom Bakery',
				},
			],
			metadata: { picked: { type: 'core/image', label: 'Hero image' } },
		},
		{
			id: 'demo-run-photo',
			role: 'assistant',
			parts: [
				{ type: 'step-start' },
				{
					type: 'tool-card-change',
					toolCallId: 'demo-run-upload',
					state: 'output-available',
					input: { kind: 'block' },
					output: { done: 'Replaced the image', image: UPLOADED },
				},
				{
					type: 'tool-choose-setting',
					toolCallId: 'demo-run-title',
					state: 'output-available',
					title: 'Changing your site title',
					input: { setting: 'title', suggestions: [] },
					output: { before: "Palmer's Cafe", after: 'Bloom Bakery' },
					expanded: true,
				},
				labelled(
					'run-title',
					'Changed your site title',
					"Couldn't change your site title",
				),
				{ type: 'step-start' },
				{
					type: 'text',
					text: 'Your photo is in, and the site is now **Bloom Bakery**.',
				},
			],
			metadata: { workflow: 'block-edit' },
		},
		asked(PLAN_ASKED),
		{
			id: 'demo-run-plan-step',
			role: 'assistant',
			parts: [
				{ type: 'step-start' },
				step(
					'edit-blocks',
					'Making the menu headings red',
					'output-available',
					'run-headings',
				),
				labelled(
					'run-headings',
					'Made the menu headings red',
					"Couldn't change the menu headings",
				),
			],
			metadata: { workflow: 'block-edit' },
		},
	],
	status: 'streaming',
	statusText: 'Thinking',
	plan: {
		toolCallId: 'demo-run-plan',
		title: PLAN_TITLE,
		steps: PLAN.map((planStep, at) => ({
			...planStep,
			state: ['done', 'running', 'pending'][at],
		})),
	},
	queued: 'Then make the buttons rounder',
	draft: 'and the footer a bit darker',
});

const failed = (error, rest) => ({
	messages: [asked('Make my site blue')],
	status: 'error',
	error,
	...rest,
});

const ASKED_TAGLINE = {
	type: 'tool-ask-question',
	toolCallId: 'demo-ask-question',
	state: 'output-available',
	title: 'Asking you a question',
	input: {
		question: 'Do you mean the site title or the tagline?',
		options: ['The site title', 'The tagline'],
	},
	output: { answer: 'The tagline' },
	expanded: true,
};

const taglineChanged = () => [
	asked('change the words next to my logo'),
	{
		id: 'demo-answered',
		role: 'assistant',
		parts: [
			ASKED_TAGLINE,
			labelled(
				'ask-question',
				'Asked you a question',
				"Couldn't ask you a question",
			),
			step('update-setting', 'Changing your tagline'),
			labelled(
				'update-setting',
				'Changed your tagline',
				"Couldn't change your tagline",
			),
		],
		metadata: { workflow: 'tagline' },
	},
];

// Each exchange reuses the same message ids, which React needs unique in one chat.
const renamed = (prefix, messages) =>
	messages.map((message) => ({ ...message, id: `${prefix}-${message.id}` }));

const storeSlot = (slot, text) => ({
	id: 'setup-store',
	text: 'Set up my store',
	type: 'action',
	slot,
	card: { text, icon: 'store', button: 'Set up store' },
	details: { storeGuide: true },
});

const STORE_NUDGE = {
	id: 'setup-store',
	placeholder: {
		id: 'setup-store',
		text: 'Set up my store',
		type: 'placeholder',
		slot: 'placeholder',
		details: { storeGuide: true },
	},
	inline: storeSlot('inline', 'Do you want to set up your store?'),
};

const multipleChoice = () => [
	asked('change the title'),
	answered('', {
		question: 'Which title do you mean?',
		options: [
			{
				label: 'Change the site title',
				action: 'start-workflow',
				workflow: 'site-title',
			},
			{
				label: "Change this page's title",
				action: 'start-workflow',
				workflow: 'block-edit',
			},
		],
	}),
];

const formToFill = () => [
	asked('make a page for my bakery'),
	{
		id: 'demo-form',
		role: 'assistant',
		parts: [
			{
				type: 'tool-ask-form',
				toolCallId: 'demo-ask-form',
				state: 'input-available',
				title: 'Asking you to fill in a form',
				input: {
					title: 'A few details for your bakery page',
					fields: [
						{
							name: 'name',
							label: 'Bakery name',
							type: 'text',
							value: 'Rise & Shine',
							required: true,
						},
						{
							name: 'about',
							label: 'What you bake',
							type: 'textarea',
							value: 'Sourdough, croissants and cakes to order.',
						},
						{
							name: 'opens',
							label: 'Opens at',
							type: 'select',
							options: ['6am', '7am', '8am'],
							value: '7am',
						},
						{ name: 'seats', label: 'Seats', type: 'number' },
						{ name: 'cake', label: 'Cakes from', type: 'price' },
						{
							name: 'delivery',
							label: 'We deliver',
							type: 'checkbox',
							value: true,
						},
					],
				},
			},
		],
		metadata: { workflow: 'create-page' },
	},
];

export const STATES = {
	runInProgress: { label: 'A run in progress', ...runInProgress() },
	cardsAndNudges: {
		label: 'Finished cards, a nudge and a pick list',
		messages: [
			...renamed('tagline', taglineChanged()),
			...renamed(
				'page',
				wrappedUp(
					created(),
					'I made the Catering page as a draft.',
					'setup-store',
					LEADS['setup-store'],
				),
			),
		],
		nudges: STORE_NUDGE,
		card: {
			type: 'tool-choose-many',
			toolCallId: 'demo-choose-many-gutter',
			state: 'input-available',
			title: 'Asking which to change',
			input: {
				question: 'Which pages should get the new catering menu link?',
				options: [
					{ label: 'Home', value: 'home', detail: 'Header menu' },
					{ label: 'About', value: 'about', detail: 'Footer' },
					{ label: 'Contact', value: 'contact', detail: 'Under the map' },
				],
				submitLabel: 'Add the link',
			},
		},
	},
	cardsInReplies: { label: 'Cards a reply leaves', messages: [] },
	cardsThatAsk: { label: 'A pick list with details', messages: [] },
	cardAsking: { label: 'A product added, then a page to pick', messages: [] },
	siteGuide: {
		label: 'Site Guide',
		messages: [
			{ id: 'demo-guide', role: 'assistant', parts: [{ type: 'data-guide' }] },
		],
	},
	siteGuideDone: {
		label: 'Site Guide, every step done',
		messages: [
			{ id: 'demo-guide', role: 'assistant', parts: [{ type: 'data-guide' }] },
		],
		guideSteps: Object.fromEntries(
			['build', 'look', 'design', 'logo', 'icon', 'title', 'domain'].map(
				(id) => [id, 'done'],
			),
		),
	},
	siteGuideFinishedStore: {
		label: 'Site Guide finished, then the store',
		messages: [
			{ id: 'demo-guide', role: 'assistant', parts: [{ type: 'data-guide' }] },
			{
				id: 'demo-guide-finished-store',
				role: 'assistant',
				parts: [
					{ type: 'text', text: 'You’ve finished setting up your website.' },
					{
						type: 'data-nudge',
						data: {
							id: 'store-nudge',
							lead: 'Next we should focus on setting up WooCommerce.',
						},
					},
				],
			},
		],
		guideSteps: Object.fromEntries(
			['build', 'look', 'design', 'logo', 'icon', 'title', 'domain'].map(
				(id) => [id, 'done'],
			),
		),
		nudges: {
			inline: {
				id: 'store-nudge',
				text: 'Set up my store',
				type: 'action',
				card: {
					text: 'Do you want to set up your store?',
					icon: 'store',
					button: 'Set up store',
				},
				details: { storeGuide: true },
			},
		},
	},
	siteGuideFinished: {
		label: 'Site Guide finished, then the sample phone next',
		messages: [
			{ id: 'demo-guide', role: 'assistant', parts: [{ type: 'data-guide' }] },
			{
				id: 'demo-guide-finished',
				role: 'assistant',
				parts: [
					{ type: 'text', text: 'You’ve finished setting up your website.' },
					{
						type: 'data-nudge',
						data: {
							id: 'guide-phone',
							lead: 'By the way, I think this needs your attention.',
						},
					},
				],
			},
		],
		guideSteps: Object.fromEntries(
			['build', 'look', 'design', 'logo', 'icon', 'title', 'domain'].map(
				(id) => [id, 'done'],
			),
		),
		nudges: {
			inline: {
				id: 'guide-phone',
				text: 'Update my phone number',
				type: 'action',
				card: {
					text: 'Do you want to update your phone number next?',
					icon: 'phone',
					button: 'Update phone number',
				},
				details: {},
			},
		},
	},
	siteGuideFinishedExplore: {
		label: 'Site Guide finished, then what I can do',
		messages: [
			{ id: 'demo-guide', role: 'assistant', parts: [{ type: 'data-guide' }] },
			{
				id: 'demo-guide-finished',
				role: 'assistant',
				parts: [
					{ type: 'text', text: 'You’ve finished setting up your website.' },
					{
						type: 'data-nudge',
						data: {
							id: 'guide-explore',
							lead: 'There’s more I can help you with.',
						},
					},
				],
			},
		],
		guideSteps: Object.fromEntries(
			['build', 'look', 'design', 'logo', 'icon', 'title', 'domain'].map(
				(id) => [id, 'done'],
			),
		),
		nudges: {
			inline: {
				id: 'guide-explore',
				text: 'Show me what you can do',
				type: 'action',
				card: {
					text: 'Do you want to see what I can do next?',
					icon: 'rocket',
					button: 'Show me what you can do',
				},
				details: { sheet: 'commands' },
			},
		},
	},
	cardTurnedDown: {
		label: 'A card turned down, left as a line',
		messages: [
			{
				id: 'demo-down-asked',
				role: 'user',
				parts: [{ type: 'text', text: 'Change the time zone to New York' }],
			},
			{
				id: 'demo-down-reply',
				role: 'assistant',
				parts: [
					{ type: 'text', text: 'I set your time zone to New York.' },
					{
						type: 'data-nudge',
						data: {
							id: 'store-nudge',
							lead: "I noticed your store isn't set up yet.",
						},
					},
				],
			},
		],
		nudges: {
			placeholder: {
				id: 'store-nudge',
				text: 'Set up my store',
				type: 'placeholder',
				details: { storeGuide: true },
			},
			asked: {
				id: 'store-nudge',
				text: 'Set up my store',
				type: 'action',
				card: {
					text: 'Do you want to set up your store?',
					icon: 'store',
					button: 'Set up store',
				},
				details: { storeGuide: true },
			},
		},
	},
	storeOnShop: {
		label: 'Moving to the shop page, the store setup',
		messages: [
			{
				id: 'demo-shop-asked',
				role: 'user',
				parts: [{ type: 'text', text: 'Change the time zone to New York' }],
			},
			{
				id: 'demo-shop-reply',
				role: 'assistant',
				parts: [{ type: 'text', text: 'I set your time zone to New York.' }],
			},
		],
		nudges: {
			placeholder: {
				id: 'store-nudge',
				text: 'Set up my store',
				type: 'placeholder',
				details: { storeGuide: true },
			},
			gutter: {
				id: 'store-nudge',
				text: 'Set up my store',
				type: 'action',
				slot: 'gutter',
				card: {
					text: 'Your store isn’t set up yet. Want to set it up now?',
					icon: 'store',
					button: 'Set up store',
				},
				details: { storeGuide: true },
			},
		},
	},
	storeFinishedPhone: {
		label: 'Store setup finished, then the sample phone next',
		messages: [
			{
				id: 'demo-store-finished',
				role: 'assistant',
				parts: [
					{ type: 'text', text: 'You’ve finished setting up your store.' },
					{
						type: 'data-nudge',
						data: {
							id: 'guide-phone',
							lead: 'By the way, I think this needs your attention.',
						},
					},
				],
			},
		],
		nudges: {
			inline: {
				id: 'guide-phone',
				text: 'Update my phone number',
				type: 'action',
				card: {
					text: 'Do you want to update your phone number next?',
					icon: 'phone',
					button: 'Update phone number',
				},
				details: {},
			},
		},
	},
	phoneThenExplore: {
		label: 'Phone number updated, then what I can do',
		messages: [
			asked('Update my phone number'),
			{
				id: 'demo-phone-updated',
				role: 'assistant',
				parts: [
					{ type: 'step-start' },
					{
						type: 'text',
						text: 'I changed your phone number to (828) 555-0199 in the header and on the Contact page.',
					},
					{
						type: 'data-nudge',
						data: {
							id: 'guide-explore',
							lead: 'There’s more I can help you with.',
						},
					},
				],
				metadata: { workflow: 'block-edit' },
			},
		],
		nudges: {
			inline: {
				id: 'guide-explore',
				text: 'Show me what you can do',
				type: 'action',
				card: {
					text: 'Do you want to see what I can do next?',
					icon: 'rocket',
					button: 'Show me what you can do',
				},
				details: { sheet: 'commands' },
			},
		},
	},
	thinking: {
		label: 'Status line',
		messages: [asked('Make my site blue')],
		status: 'submitted',
		statusText: 'Reading your message',
	},
	running: {
		label: 'A step running',
		...working(
			[step('read-site', 'Reading your site', 'input-available')],
			'Reading your site',
		),
	},
	working: {
		label: 'Steps while working',
		...working(workingSteps(), 'Opening the page'),
	},
	workingOpened: {
		label: 'Steps while working, opened',
		...working(workingSteps({ open: true }), 'Opening the page'),
	},
	between: {
		label: 'Steps between tools',
		...working(workingSteps({ between: true }), 'Thinking'),
	},
	queued: {
		label: 'A queued message',
		...working(workingSteps(), 'Opening the page'),
		queued: 'Make the heading blue too',
	},
	queuedJoined: {
		label: 'Two queued messages, joined',
		...working(workingSteps(), 'Opening the page'),
		queued: 'Make the heading blue too\n\nAnd a bit bigger',
	},
	// A running plan shows only above the chat box, so its reply shows nothing of it.
	plan: {
		label: 'A plan above the chat box',
		messages: [asked(PLAN_ASKED)],
		plan: {
			toolCallId: 'demo-plan',
			title: PLAN_TITLE,
			steps: PLAN.map((step, at) => ({
				...step,
				state: ['done', 'running', 'pending'][at],
			})),
		},
	},
	nextTask: {
		label: 'The next of several parts, after a reply',
		messages: [
			asked('make the headings red'),
			{
				id: 'demo-lined-up',
				role: 'assistant',
				parts: [
					{ type: 'step-start' },
					{
						type: 'text',
						text: 'I can change one part at a time for now, so I’ll start with “Fresh bread” and line up the rest.',
					},
				],
				metadata: { workflow: 'block-edit' },
			},
			asked('Make the “Fresh bread” heading red'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{ type: 'step-start' },
					{
						type: 'text',
						text: 'The “Fresh bread” heading is red now. The “Visit us” heading is still in its old color.',
					},
				],
				metadata: { workflow: 'block-edit' },
			},
		],
		nudges: taskNudge({
			tasks: [
				{
					text: 'Make the “Visit us” heading red',
					note: 'Do you want to make the “Visit us” heading red next?',
					action: 'Make it red',
				},
				{ text: 'Make the “Our menu” heading red' },
				{ text: 'Make the “Hours” heading red' },
			],
			total: 4,
		}),
	},
	menuTask: {
		label: 'A renamed page, then its menu link as the next task',
		messages: wrappedUp(
			[
				asked('Update page title to Reach our clinic'),
				{
					id: 'demo-renamed',
					role: 'assistant',
					parts: [{ type: 'step-start' }],
					metadata: { workflow: 'block-edit' },
				},
			],
			'I renamed the page to “Reach our clinic”.',
			'next-task',
			'I noticed your menu still says “Contact”.',
		),
		nudges: taskNudge({
			tasks: [
				{
					text: 'Update the menu link',
					note: 'Do you want to update the “Contact” menu link next?',
					action: 'Update menu link',
					icon: 'browser',
					context:
						"Change the “Contact” menu link to “Reach our clinic”, the page's new title.",
				},
			],
			total: 1,
		}),
	},
	planMenuTask: {
		label: "A plan's closing line, then its menu link as the next task",
		messages: [
			asked('Update page title to Reach our clinic'),
			{
				id: 'demo-plan-step',
				role: 'assistant',
				parts: [
					{ type: 'step-start' },
					{ type: 'data-closing', data: {} },
					{
						type: 'text',
						text: 'I changed the page title to “Reach our clinic”.',
					},
					{
						type: 'data-nudge',
						data: {
							id: 'next-task',
							lead: 'I noticed your menu still says “Contact”.',
						},
					},
				],
				metadata: { workflow: 'block-edit', planStep: { plan: 'demo-plan' } },
			},
		],
		nudges: taskNudge({
			tasks: [
				{
					text: 'Update the menu link',
					note: 'Do you want to update the “Contact” menu link next?',
					action: 'Update menu link',
					icon: 'browser',
					context:
						"Change the “Contact” menu link to “Reach our clinic”, the page's new title.",
				},
			],
			total: 1,
		}),
	},
	planImage: {
		label: 'A plan waiting on a picture, in the gutter',
		messages: [
			asked('swap the hero photo for a latte and make the heading bigger'),
			{
				id: 'demo-step-image',
				role: 'assistant',
				parts: [
					{ type: 'step-start' },
					{
						type: 'tool-media-upload',
						toolCallId: 'demo-media-upload',
						state: 'input-available',
						input: {
							target: 'block',
							block: { id: 'demo:0', type: 'core/image' },
							sources: ['upload', 'library', 'stock', 'generate'],
						},
					},
				],
				metadata: {
					workflow: 'block-edit',
					planStep: { id: 's1', plan: 'demo-plan', part: 'demo:0' },
				},
			},
		],
		plan: {
			toolCallId: 'demo-plan',
			title: 'Update the hero',
			steps: [
				{ id: 's1', title: 'Swap the hero photo', state: 'running' },
				{ id: 's2', title: 'Make the heading bigger', state: 'pending' },
			],
		},
	},
	// The plan's card sat far above the step's question, over the chat's lines.
	planAsking: {
		label: 'A plan step asking in the gutter, with a message queued',
		messages: [
			...planInChat('I made the questions italic for you.', 'completed'),
			asked('make the x not italic'),
			{
				id: 'demo-step-ask',
				role: 'assistant',
				parts: [
					{ type: 'step-start' },
					{
						type: 'tool-ask-question',
						toolCallId: 'demo-step-ask-question',
						state: 'input-available',
						input: {
							question:
								'The + at the end of this heading is already not italic. What would you like instead?',
							options: [],
						},
					},
				],
				metadata: {
					workflow: 'block-edit',
					planStep: { id: 's1', plan: 'demo-plan-2', part: 'demo:0' },
				},
			},
		],
		plan: {
			toolCallId: 'demo-plan-2',
			title: 'Make the icons not italic',
			steps: [
				{ id: 's1', title: 'Make the questions not italic', state: 'running' },
				{ id: 's2', title: 'Check the + icons', state: 'pending' },
			],
		},
		queued: 'just the x on each one',
	},
	planStopped: {
		label: 'A stopped plan in the chat',
		messages: planInChat(
			'I stopped after making the menu headings red.',
			'canceled',
		),
	},
	planCompleted: {
		label: 'A completed plan in the chat',
		messages: planInChat(
			'The menu headings are red and the prices are bold.',
			'completed',
		),
	},
	planMap: {
		label: 'A plan that added a map, with its preview',
		messages: [
			asked('add a map of the Ferry Building under the contact heading'),
			{
				id: 'demo-planned',
				role: 'assistant',
				parts: [
					{ type: 'step-start' },
					{
						type: 'tool-show-plan',
						toolCallId: 'demo-map-plan',
						state: 'output-available',
						input: {
							title: 'Add a map',
							titleDone: 'Added a map under the heading',
							steps: [{ id: 's1', title: 'Add a map under the heading' }],
						},
						output: {
							shown: true,
							ended: 'completed',
							steps: [
								{
									id: 's1',
									title: 'Add a map under the heading',
									state: 'done',
								},
							],
						},
					},
				],
				metadata: { workflow: 'block-edit' },
			},
			{
				id: 'demo-plan-step',
				role: 'assistant',
				parts: [
					{ type: 'step-start' },
					mapAdded({ place: 'Ferry Building, San Francisco' }),
					{ type: 'step-start' },
					{ type: 'data-closing', data: {} },
					{ type: 'text', text: MAP_CLOSING },
				],
				metadata: {
					workflow: 'block-edit',
					planStep: { id: 's1', plan: 'demo-map-plan' },
				},
			},
		],
	},
	// A reload or another plan cuts one off, which then shows no word on how it ended.
	planCutOff: {
		label: 'A plan in the chat that never ended',
		messages: planInChat('Here is the plan.'),
	},
	mapAdded: {
		label: 'A map added from a link, with its preview',
		messages: [
			asked('add a map under the contact heading https://maps.app.goo.gl/demo'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{ type: 'step-start' },
					mapAdded({ link: 'https://maps.app.goo.gl/demo' }),
					{ type: 'step-start' },
					{ type: 'text', text: MAP_CLOSING },
				],
				metadata: { workflow: 'block-edit' },
			},
		],
	},
	blockPicked: {
		label: 'A block picked with Select',
		selected: { id: 'demo-heading', type: 'core/heading' },
	},
	sentPicked: {
		label: 'A message sent with a block picked',
		messages: [
			{
				...asked('make this a bit shorter'),
				metadata: { picked: { type: 'core/heading' } },
			},
			answered(
				'I shortened the heading, from Cherry Pie and Strong Black Coffee to Cherry Pie & Strong Coffee.',
			),
		],
	},
	oneStep: {
		label: 'One step over a reply',
		messages: [
			asked("What's my site called?"),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					step('read-site', 'Reading your site'),
					labelled('read-site', 'Read your site', "Couldn't read your site"),
					{ type: 'text', text: 'Your site is called **Bloom Bakery**.' },
				],
				metadata: { workflow: 'answer-questions' },
			},
		],
		nudges: { placeholder: EXPLORE },
	},
	steps: {
		label: 'Steps over a reply, folded',
		messages: [asked('Show me the contact page'), contactReply()],
		nudges: { placeholder: EXPLORE },
	},
	stepsOpened: {
		label: 'Steps over a reply, opened',
		messages: [asked('Show me the contact page'), contactReply({ open: true })],
		nudges: { placeholder: EXPLORE },
	},
	failedStep: {
		label: 'A failed step',
		messages: [
			asked('Show me the contact page'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					step('read-site', 'Reading your site', 'output-error'),
					labelled('read-site', 'Read your site', "Couldn't read your site"),
					{
						type: 'text',
						text: "I couldn't read your site, so I can't open that page. Please try again.",
					},
				],
				metadata: {},
			},
		],
	},
	failedInGroup: {
		label: 'A failed step after a group',
		messages: [
			asked('Show me the contact page and change my site title and tagline'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					step('read-site', 'Reading your site'),
					labelled('read-site', 'Read your site', "Couldn't read your site"),
					step('show-page', 'Opening the page'),
					labelled('show-page', 'Opened the page', "Couldn't open the page"),
					step(
						'update-setting',
						'Changing your site title',
						'output-error',
						'update-title',
					),
					labelled(
						'update-title',
						'Changed your site title',
						"Couldn't change your site title",
					),
					step(
						'update-setting',
						'Changing your tagline',
						'output-available',
						'update-tagline',
					),
					labelled(
						'update-tagline',
						'Changed your tagline',
						"Couldn't change your tagline",
					),
					{
						type: 'text',
						text: "Here's your **Contact** page. I changed your tagline but couldn't change your site title.",
					},
				],
				metadata: { workflow: 'answer-questions' },
			},
		],
	},
	restyleRunning: {
		label: 'A new look being applied as a plan',
		messages: [asked('make my site look more fun'), restyling()],
	},
	restyleDone: {
		label: 'A new look applied, then its colors to fine-tune',
		messages: [
			asked('make my site look more fun'),
			restyling({ done: RESTYLE.steps.map(({ id }) => id) }),
			designing('colors', 'demo-restyle-design', {
				made: { schemes: MADE_BLUE },
			}),
		],
	},
	designColors: {
		label: 'Design card, colors',
		messages: [asked('change my site colors'), designing('colors')],
	},
	designMade: {
		label: 'Design card, colors made for the ask',
		messages: [
			asked('make my site more blue'),
			designing('colors', 'demo-made-design', { made: { schemes: MADE_BLUE } }),
		],
	},
	designMadeOne: {
		label: 'Design card, new values for one color',
		messages: [
			asked('change my primary color'),
			designing('colors', 'demo-made-one-design', { made: MADE_PRIMARY }),
		],
	},
	designAnimation: {
		label: 'Design card, animation',
		messages: [asked('add some animation'), designing('animation')],
	},
	designFolded: {
		label: 'An older design card, folded',
		messages: [
			asked('change my site colors'),
			designing('colors', 'demo-older-design'),
			{ ...asked('show me other colors'), id: 'demo-asked-again' },
			designing('colors'),
		],
	},
	layoutCard: {
		label: 'Layout card',
		messages: [asked('show me other layouts for my home page'), choosingLayout],
	},
	colorsFixed: {
		label: 'Words recolored so they read, with the adjust colors nudge',
		messages: [asked('make this section dark blue'), recolored],
		nudges: {
			inline: {
				...ADJUST_COLORS,
				written: { text: 'Do you want to adjust the text color?' },
			},
		},
	},
	adjustColors: {
		label: 'Adjust colors card',
		messages: [asked('Adjust the colors'), adjustingColors],
	},
	unsaved: {
		label: 'Unsaved changes bar',
		messages: [asked('change my site colors'), designing('colors')],
		unsaved: true,
		count: 3,
	},
	discarding: {
		label: 'Discarding unsaved changes',
		messages: [asked('change my site colors'), designing('colors')],
		unsaved: true,
		count: 3,
		confirm: true,
	},
	changesSheet: {
		label: 'List of unsaved changes',
		messages: [asked('change my site colors'), designing('colors')],
		count: 3,
		changes: {
			versions: CHANGES,
			current: 4,
		},
	},
	changesDeck: {
		label: 'Unsaved changes, stacked',
		messages: [asked('make this button dark'), designing('colors')],
		changes: { versions: CHANGES_DECK, current: 9 },
	},
	changesDeckOpen: {
		label: 'Unsaved changes, a stack opened',
		messages: [asked('make this button dark'), designing('colors')],
		changes: { versions: CHANGES_DECK, current: 9, opened: [8] },
	},
	stuck: {
		label: 'Page changed elsewhere',
		messages: [asked('change my site colors'), designing('colors')],
		count: 3,
		clashes: [{ source: 'post:1', title: 'Home', live: 'demo', here: true }],
	},
	resolved: {
		label: 'Changes applied',
		messages: [asked('change my site colors'), designing('colors')],
		unsaved: true,
		count: 3,
		applied: true,
	},
	resolveFailed: {
		label: 'Changes that could not be applied',
		messages: [asked('change my site colors'), designing('colors')],
		count: 3,
		clashes: [{ source: 'post:1', title: 'Home', live: 'demo', here: true }],
		failed: [
			{
				source: 'post:1',
				title: 'Home',
				reason: 'changed',
				changed: [
					{ type: 'core/heading', name: 'Heading', op: 'text', title: 'Home' },
					{
						type: 'core/button',
						name: 'Button',
						op: 'attributes',
						title: 'Home',
					},
				],
			},
			{ source: 'post:1', title: 'Home', reason: 'old', changed: [] },
		],
	},
	someoneViewing: {
		label: 'Someone viewing this page',
		messages: [asked('change my site colors'), designing('colors')],
		unsaved: true,
		count: 3,
		presence: { name: 'Rosa Palmer', mine: false },
	},
	openInAnotherTab: {
		label: 'This page open in another tab',
		messages: [asked('change my site colors'), designing('colors')],
		unsaved: true,
		count: 3,
		presence: { name: 'You', mine: true },
	},
	logoPicker: {
		label: 'Logo drop zone',
		messages: [asked('change my logo'), picking('logo')],
	},
	iconPicker: {
		label: 'Site icon drop zone',
		messages: [asked('change the favicon'), picking('icon')],
	},
	blockImagePicker: {
		label: 'Image drop zone for a picked image',
		messages: [asked('swap this photo for a latte'), picking('block')],
	},
	imageSaving: {
		label: 'An image uploading',
		messages: [asked('change my logo'), picking('logo', 'processing')],
	},
	librarySheet: {
		label: 'Media library sheet',
		messages: [asked('change my logo'), picking('logo', 'library')],
	},
	stockSheet: {
		label: 'Stock photos sheet',
		messages: [asked('change the favicon'), picking('icon', 'stock')],
	},
	generateSheet: {
		label: 'Generated images sheet',
		messages: [asked('change my logo'), picking('logo', 'generate')],
	},
	questionCard: {
		label: 'Question card',
		messages: [
			asked('change the words next to my logo'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{
						type: 'tool-ask-question',
						toolCallId: 'demo-ask-question',
						state: 'input-available',
						title: 'Asking you a question',
						input: {
							question: 'Do you mean the site title or the tagline?',
							options: ['The site title', 'The tagline'],
						},
					},
				],
				metadata: { workflow: 'site-title' },
			},
		],
	},
	confirmPart: {
		label: 'Which part, boxed on the page',
		messages: [
			asked('make the heading bigger'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{
						type: 'tool-confirm-block',
						toolCallId: 'demo-confirm-block',
						state: 'input-available',
						title: 'Checking which part you mean',
						demoState: 'asking',
						input: {
							id: 'post:2:1',
							question: 'Is this the heading you mean?',
							yes: 'Yes, that one',
							no: 'No, it’s another part',
						},
					},
				],
				metadata: { workflow: 'block-edit' },
			},
		],
	},
	pageChoice: {
		label: 'Which page, for a menu link',
		messages: [
			asked('add a link to the menu'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{
						type: 'tool-choose-page',
						toolCallId: 'demo-choose-page',
						state: 'input-available',
						title: 'Asking which page',
						input: {
							question: 'Which page should the new menu link go to?',
							pages: [
								{ id: 11, title: 'About', url: '/about/' },
								{ id: 18, title: 'About', url: '/about-2/' },
								{ id: 12, title: 'Booking', url: '/booking/' },
								{
									id: 21,
									title:
										'Frequently Asked Questions About Dental Insurance and Payment Plans',
									url: '/faq-insurance-and-payment-plans/',
								},
							],
						},
					},
				],
				metadata: { workflow: 'block-edit' },
			},
		],
	},
	chooseMany: {
		label: 'Which phone numbers to change',
		messages: [
			asked('change my phone number to 828-555-0199'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{
						type: 'tool-choose-many',
						toolCallId: 'demo-choose-many',
						state: 'input-available',
						title: 'Asking which to change',
						input: {
							question:
								'I also found these phone numbers. Which should change to 828-555-0199 too?',
							options: [
								{
									label: '206-555-0101',
									value: '2065550101',
									detail: 'Footer',
								},
								{
									label: '(206) 555-0188',
									value: '2065550188',
									detail: 'Contact page, “Call us” section',
								},
								{
									label: '206.555.0142',
									value: '2065550142',
									detail: 'Booking page',
								},
							],
							submitLabel: 'Change these',
						},
					},
				],
				metadata: { workflow: 'block-edit' },
			},
		],
	},
	detailedQuestionCard: {
		label: 'Question card with descriptions',
		messages: [
			asked('change my date format'),
			{
				id: 'demo-detailed',
				role: 'assistant',
				parts: [
					{
						type: 'tool-ask-detailed-question',
						toolCallId: 'demo-ask-detailed-question',
						state: 'input-available',
						title: 'Asking you a question',
						input: {
							question: 'How should dates look?',
							options: [
								{
									title: 'October 11, 2026',
									description: 'Month name, day, then year',
								},
								{ title: '11/10/2026', description: 'Day, month, then year' },
								{ title: '2026-10-11', description: 'Year, month, then day' },
							],
						},
					},
				],
				metadata: { workflow: 'date-time-format' },
			},
		],
	},
	formCard: { label: 'A form to fill in', messages: formToFill() },
	profileForm: {
		label: 'A site profile form',
		messages: [],
		forms: [PROFILE_FORM],
	},
	formDiscard: {
		label: 'Closing a form with typed text',
		messages: [],
		forms: [PROFILE_FORM],
		gutter: {
			text: 'Discard what you typed in “Your site profile”?',
			button: 'Discard',
			danger: true,
			dismiss: 'Cancel',
			onDismiss: () => {},
		},
	},
	formClosed: {
		label: 'A form closed without saving',
		messages: [
			{
				id: 'demo-closed',
				role: 'assistant',
				parts: [
					{ type: 'step-start' },
					{
						...profileCall,
						state: 'output-available',
						output: {
							skipped: true,
							done: 'Closed “Your site profile” without saving',
						},
					},
				],
			},
		],
	},
	longForm: {
		label: 'A long form, scrolled inside its card',
		messages: [
			asked('add a product for me'),
			{
				id: 'demo-long-form',
				role: 'assistant',
				parts: [
					{
						type: 'tool-ask-form',
						toolCallId: 'demo-ask-long-form',
						state: 'input-available',
						title: 'Asking you to fill in a form',
						input: {
							title: 'Details for your new product',
							fields: [
								{
									name: 'name',
									label: 'Product name',
									type: 'text',
									value: 'Tuesday Mug',
								},
								{ name: 'price', label: 'Price', type: 'price', value: '12' },
								{ name: 'sale', label: 'Sale price', type: 'price' },
								{ name: 'sku', label: 'SKU', type: 'text' },
								{
									name: 'stock',
									label: 'In stock',
									type: 'number',
									value: '40',
								},
								{ name: 'weight', label: 'Weight (oz)', type: 'number' },
								{
									name: 'short',
									label: 'Short description',
									type: 'textarea',
									value: 'A 12 oz mug for anyone who needs a laugh by Tuesday.',
								},
								{ name: 'description', label: 'Description', type: 'textarea' },
								{
									name: 'category',
									label: 'Category',
									type: 'select',
									options: ['Mugs', 'Gifts', 'Kitchen'],
									value: 'Mugs',
								},
								{ name: 'tags', label: 'Tags', type: 'text' },
								{
									name: 'featured',
									label: 'Featured product',
									type: 'checkbox',
								},
								{ name: 'virtual', label: 'Virtual product', type: 'checkbox' },
							],
						},
					},
				],
				metadata: { workflow: 'plugin:woocommerce' },
			},
		],
	},
	answeredQuestion: {
		label: 'An answered question, opened',
		messages: [
			asked('change the words next to my logo'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{
						type: 'tool-ask-question',
						toolCallId: 'demo-ask-question',
						state: 'output-available',
						title: 'Asking you a question',
						input: {
							question: 'Do you mean the site title or the tagline?',
							options: ['The site title', 'The tagline'],
						},
						output: { answer: 'The tagline' },
						expanded: true,
					},
					labelled(
						'ask-question',
						'Asked you a question',
						"Couldn't ask you a question",
					),
					{
						type: 'tool-choose-setting',
						toolCallId: 'demo-choose-tagline',
						state: 'input-available',
						title: 'Changing your tagline',
						input: {
							setting: 'description',
							suggestions: [
								'Fresh bread every morning',
								'Baked with love since 1998',
							],
						},
					},
				],
				metadata: { workflow: 'tagline' },
			},
		],
	},
	titleCard: {
		label: 'Question card for a site title',
		messages: [
			asked('change my site title'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{
						type: 'tool-choose-setting',
						toolCallId: 'demo-choose-setting',
						state: 'input-available',
						title: 'Changing your site title',
						input: {
							setting: 'title',
							suggestions: ['Bloom Bakery', 'Bloom Bread House'],
						},
					},
				],
				metadata: { workflow: 'site-title' },
			},
		],
	},
	savedTitle: {
		label: 'A saved title, opened',
		messages: [
			asked('change my site title'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{ type: 'text', text: 'Pick one of these, or type your own.' },
					{
						type: 'tool-choose-setting',
						toolCallId: 'demo-choose-setting',
						state: 'output-available',
						title: 'Changing your site title',
						input: {
							setting: 'title',
							suggestions: ['Bloom Bakery', 'Bloom Bread House'],
						},
						output: {
							before: "Palmer's Cafe",
							after: 'Bloom Bakery',
						},
						expanded: true,
					},
					labelled(
						'choose-setting',
						'Changed your site title',
						"Couldn't change your site title",
					),
					{ type: 'step-start' },
					{
						type: 'text',
						text: 'I just renamed your site Bloom Bakery for you.',
					},
				],
				metadata: { workflow: 'site-title' },
			},
		],
		nudges: { placeholder: TAGLINE },
	},
	savedTimezone: {
		label: 'A changed time zone, opened',
		messages: [
			asked('set my time zone to Paris'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{
						type: 'tool-update-setting',
						toolCallId: 'demo-update-setting',
						state: 'output-available',
						title: 'Changing your time zone',
						input: { setting: 'timezone', value: 'Europe/Paris' },
						output: {
							before: 'America/New_York',
							after: 'Europe/Paris',
							labels: { before: 'America/New York', after: 'Europe/Paris' },
						},
						expanded: true,
					},
					labelled(
						'update-setting',
						'Changed your time zone',
						"Couldn't change your time zone",
					),
					{ type: 'step-start' },
					{ type: 'text', text: 'I just set your site to Paris time for you.' },
				],
				metadata: { workflow: 'time-zone' },
			},
		],
		nudges: { placeholder: SITE_TITLE },
	},
	unpublished: {
		label: 'A site taken offline, opened',
		messages: [
			asked('take my site offline'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{
						type: 'tool-update-site-visibility',
						toolCallId: 'demo-update-site-visibility',
						state: 'output-available',
						title: 'Changing who can see your site',
						input: { visibility: 'unpublished' },
						output: {
							before: 'published',
							after: 'unpublished',
							labels: { before: 'Published', after: 'Coming soon' },
						},
						expanded: true,
					},
					labelled(
						'update-site-visibility',
						'Changed who can see your site',
						"Couldn't change who can see your site",
					),
					{ type: 'step-start' },
					{
						type: 'text',
						text: 'I just put your site behind a Coming Soon page for you.',
					},
				],
				metadata: { workflow: 'site-visibility' },
			},
		],
		nudges: { placeholder: NEW_PAGE },
	},
	createdPage: {
		label: 'A page made as a draft',
		messages: created(),
		nudges: {
			placeholder: {
				id: 'publish-page',
				text: 'Publish the “Catering” page',
				type: 'placeholder',
				details: { workflow: 'page-status' },
			},
		},
	},
	liveChanged: {
		label: 'Undo over a logo changed somewhere else',
		messages: [
			asked('Use my new logo'),
			{
				id: 'demo-logo-set',
				role: 'assistant',
				parts: [{ type: 'text', text: 'I set your new logo.' }],
			},
		],
		gutter: {
			text: 'Your logo changed somewhere else after I set it. Put the earlier one back anyway?',
			button: 'Put it back',
			dismiss: 'Skip',
			onDismiss: () => {},
			onClose: () => {},
		},
	},
	pageInGutter: {
		label: 'A page card asking',
		messages: waitingOnPage(),
		gutter: {
			text: 'Publish “Catering”?',
			button: 'Publish',
			dismiss: 'Cancel',
			onDismiss: () => {},
			onClose: () => {},
			aside: <PreviewButton page={{ ...DEMO_PAGE.publishing, demo: true }} />,
		},
	},
	pluginsToPick: {
		label: 'Plugins to pick from',
		messages: [
			asked('I need a contact form'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{
						type: 'tool-choose-plugin',
						toolCallId: 'demo-choose-plugin',
						state: 'input-available',
						title: 'Asking you to pick a plugin',
						input: {
							question: 'Which one would you like?',
							plugins: [
								{
									slug: 'wpforms-lite',
									name: 'WPForms',
									description: 'Drag and drop forms with ready-made templates',
								},
								{
									slug: 'contact-form-7',
									name: 'Contact Form 7',
									description: 'Simple forms you set up by hand',
								},
								{
									slug: 'forminator',
									name: 'Forminator',
									description: 'Forms, polls and quizzes in one plugin',
								},
							],
						},
					},
				],
				metadata: { workflow: 'recommend-plugins' },
			},
		],
	},
	pluginToInstall: {
		label: 'One plugin to install',
		messages: [
			asked('I want to take bookings on my site'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{
						type: 'tool-choose-plugin',
						toolCallId: 'demo-choose-plugin',
						state: 'input-available',
						title: 'Asking you to pick a plugin',
						input: {
							question: 'Want SimplyBook.me for your bookings?',
							plugins: [
								{
									slug: 'simplybook',
									name: 'SimplyBook.me',
									description: 'Take bookings and appointments online.',
								},
							],
						},
					},
				],
				metadata: { workflow: 'recommend-plugins' },
			},
		],
	},
	pluginNamed: {
		label: 'A plugin named, to confirm',
		messages: [
			asked('install Yoast SEO'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					step('search-plugins', 'Searching for plugins'),
					labelled(
						'search-plugins',
						'Searched for plugins',
						"Couldn't search for plugins",
					),
					{
						type: 'tool-choose-plugin',
						toolCallId: 'demo-choose-plugin',
						state: 'input-available',
						title: 'Asking you to pick a plugin',
						input: {
							plugins: [
								{
									slug: 'wordpress-seo',
									name: 'Yoast SEO',
									description:
										'Improve how the site shows up in search results.',
								},
							],
						},
					},
				],
				metadata: { workflow: 'recommend-plugins' },
			},
		],
	},
	pluginToTurnOn: {
		label: 'An installed plugin, to turn on',
		messages: [
			asked('turn on TranslatePress'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{
						type: 'tool-choose-plugin',
						toolCallId: 'demo-choose-plugin',
						state: 'input-available',
						title: 'Asking you to pick a plugin',
						input: {
							plugins: [
								{
									slug: 'translatepress-multilingual',
									name: 'TranslatePress',
									description: 'Translate the whole site, right from the page.',
								},
							],
						},
					},
				],
				metadata: { workflow: 'recommend-plugins' },
			},
		],
	},
	pluginInstalled: {
		label: 'A plugin installed',
		messages: wrappedUp(
			pluginInstalled(),
			'I just installed WPForms for you.\n\nLet me know what you would like to do next.',
			'explore',
		),
		nudges: { placeholder: EXPLORE },
	},
	abilityAsking: {
		label: 'An action asking first',
		messages: [asked('optimize hero-banner.jpg')],
		gutter: { ...askCard(OPTIMIZE), onDismiss: () => {} },
	},
	deleteAsking: {
		label: 'A delete asking first',
		messages: [asked('delete the Hoodie')],
		gutter: {
			...askCard(woo('product-delete', 'Delete product', true, true)),
			onDismiss: () => {},
		},
	},
	fieldMoveAsking: {
		label: 'Moving a form field, asking first',
		messages: [asked('move the birthday above the phone')],
		gutter: {
			...askCard({
				name: 'extendify/wpforms-move-field',
				label: 'Move a form field',
				plugin: 'WPForms',
				annotations: { readonly: false, destructive: false, idempotent: true },
			}),
			onDismiss: () => {},
		},
	},
	fieldRemoveAsking: {
		label: 'Removing a form field, asking first',
		messages: [asked('take the birthday field out')],
		gutter: {
			...askCard({
				name: 'extendify/wpforms-remove-field',
				label: 'Remove a form field',
				plugin: 'WPForms',
				annotations: { readonly: false, destructive: true, idempotent: true },
			}),
			onDismiss: () => {},
		},
	},
	productForm: {
		label: 'A plugin form',
		messages: [asked('add a mug called Tuesday Mug for $12')],
		card: wooCard('product-create', 'Create product', false, {
			name: 'Tuesday Mug',
			regular_price: '12',
			short_description: 'A 12 oz mug that says “omg it’s Tuesday”.',
		}),
	},
	productUpdateForm: {
		label: 'A plugin form for a change',
		messages: [asked('make the Hoodie $25')],
		card: wooCard('product-update', 'Update product', true, {
			id: 31,
			product_type_alias: 'physical',
			regular_price: '25',
		}),
	},
	fieldForm: {
		label: 'Add Field, a dropdown with its choices',
		messages: [
			asked('add a dropdown to select New patient or Existing patient'),
		],
		card: fieldCard({
			form_id: 49,
			type: 'select',
			label: 'Patient type',
			choices: [{ label: 'New patient' }, { label: 'Existing patient' }],
		}),
	},
	formKeptOpen: {
		label: 'A form kept open during a reply',
		messages: typedPastForm,
		status: 'submitted',
		statusText: 'Thinking',
		forms: [{ ...MUG_FORM, edits: { regular_price: '14' } }],
	},
	formMinimized: {
		label: 'A form, minimized',
		messages: [
			...typedPastForm,
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{
						type: 'text',
						text: 'Say who it’s for and what makes it fun, like “A 12 oz mug for anyone who needs a laugh by Tuesday.”',
					},
				],
				metadata: { workflow: 'plugin:woocommerce' },
			},
		],
		forms: [{ ...MUG_FORM, minimized: true }],
	},
	leavingForm: {
		label: 'Leaving a form',
		messages: [
			...typedPastForm.slice(0, 2),
			{
				id: 'demo-off-topic',
				role: 'user',
				parts: [{ type: 'text', text: 'can we change my theme colors now?' }],
			},
		],
		forms: [MUG_FORM],
		gutter: { ...leaveCard('Create product'), onDismiss: () => {} },
	},
	productCreated: {
		label: 'A product added',
		messages: closed(
			mugAdded(MUG),
			'I just added Tuesday Mug to your store for you.',
		),
		nudges: { placeholder: EXPLORE },
	},
	productDeleted: {
		label: 'A product added, then deleted',
		messages: closed(
			mugAdded({ ...MUG, deleted: true }),
			'I just added Tuesday Mug to your store for you.',
		),
		nudges: { placeholder: EXPLORE },
	},
	imageOptimizing: {
		label: 'An image optimizing',
		messages: closed(
			optimized({
				status: 'success',
				original_size: 482133,
				optimized_size: null,
			}),
			'I just started optimizing hero-banner.jpg for you.',
		),
		nudges: { placeholder: EXPLORE },
	},
	imageOptimized: {
		label: 'An image optimized',
		messages: closed(
			optimized({
				status: 'success',
				original_size: 482133,
				optimized_size: 279637,
			}),
			'I just optimized hero-banner.jpg for you.',
		),
		nudges: { placeholder: EXPLORE },
	},
	imageAlready: {
		label: 'An image already optimized',
		messages: closed(
			optimized({
				status: 'success',
				original_size: 482133,
				optimized_size: 279637,
				already: true,
			}),
			'I just checked hero-banner.jpg, and it was already optimized.',
		),
		nudges: { placeholder: EXPLORE },
	},
	imageBackground: {
		label: 'An image slow to optimize',
		messages: closed(
			optimized(
				{ status: 'success', original_size: 482133, optimized_size: null },
				'background',
			),
			'I just started optimizing hero-banner.jpg for you.',
		),
		nudges: { placeholder: EXPLORE },
	},
	imageFailed: {
		label: 'An image that failed to optimize',
		messages: closed(
			optimized({
				status: 'error',
				error_message: 'This file type is not supported.',
			}),
			"I couldn't optimize hero-banner.jpg, since Imagify doesn't support its file type.",
		),
		nudges: { placeholder: EXPLORE },
	},
	creditsAsking: {
		label: 'Asking first, with credits',
		messages: [asked('optimize hero-banner.jpg')],
		gutter: { ...askCard(OPTIMIZE, 1), onDismiss: () => {} },
	},
	abilityFailed: {
		label: 'An action that failed',
		messages: [
			asked('make the Hoodie $25'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					step(
						'woocommerce__product-update',
						'Running “Update product”',
						'output-error',
					),
					labelled(
						'woocommerce__product-update',
						'Ran “Update product”',
						"Couldn't run “Update product”",
					),
					{
						type: 'text',
						text: "I couldn't change the price. WooCommerce says there's no product with that ID.",
					},
				],
				metadata: { workflow: 'plugin:woocommerce' },
			},
		],
	},
	offered: {
		label: 'What I can do',
		commands: true,
		messages: [
			asked('what can you do?'),
			{
				id: 'demo-answered',
				role: 'assistant',
				parts: [
					{
						type: 'text',
						text: 'Here are some things I can do on your site. Pick one to get started.',
					},
					{
						type: 'tool-what-can-i-do',
						toolCallId: 'demo-what-can-i-do',
						state: 'output-available',
						input: {},
						output: { shown: true },
					},
				],
				metadata: { workflow: 'what-can-i-do' },
			},
		],
	},
	filtered: {
		label: 'What I can do, filtered',
		commands: { filter: 'time' },
		messages: [],
	},
	nothingMatches: {
		label: 'What I can do, nothing matches',
		commands: { filter: 'invoice' },
		messages: [],
	},
	designNext: {
		label: 'Design card, then a request',
		messages: [asked('change my site colors'), designing('colors')],
		nudges: { placeholder: FONTS },
	},
	changeNext: {
		label: 'A change, then a request',
		messages: timezoneDone(),
		nudges: { placeholder: SITE_TITLE },
	},
	changeRefresh: {
		label: 'A change, then a refresh card',
		messages: wrappedUp(
			pluginInstalled(),
			'I just installed WPForms for you.',
			'refresh-tagline',
			LEADS['refresh-tagline'],
		),
		nudges: { inline: REFRESH_TAGLINE, placeholder: TAGLINE },
	},
	refreshKept: {
		label: 'A refresh card after Keep it',
		messages: wrappedUp(
			pluginInstalled(),
			'I just installed WPForms for you.',
			'refresh-tagline',
			LEADS['refresh-tagline'],
		),
		nudges: {
			inline: { ...REFRESH_TAGLINE, answered: true },
			placeholder: TAGLINE,
		},
	},
	refreshUpdated: {
		label: 'A refresh card after Update',
		messages: wrappedUp(
			pluginInstalled(),
			'I just installed WPForms for you.',
			'refresh-tagline',
			LEADS['refresh-tagline'],
		),
		nudges: {
			inline: { ...REFRESH_TAGLINE, answered: true },
			placeholder: TAGLINE,
		},
		forms: [PROFILE_FORM],
	},
	logoUpdated: {
		label: 'A logo card after Update',
		messages: [
			...wrappedUp(
				timezoneSaved(),
				'I just set your site to Paris time for you.',
				'refresh-logo',
				LEADS['refresh-logo'],
			),
			{ ...asked('Change website logo'), id: 'demo-asked-logo' },
			{ ...picking('logo'), id: 'demo-picking' },
		],
	},
	imagifyQuotaBell: {
		label: "Imagify's monthly quota, under the bell",
		messages: wrappedUp(teamAdded(), TEAM_DONE),
		bell: { 'imagify-quota': { used: '20MB' } },
	},
	imagifyOptimized: {
		label: 'An image added, then what Imagify saved',
		messages: [
			...latteSwapped(),
			proactive({ id: 'imagify-optimized', before: 1_240_000, after: 318_000 }),
		],
	},
	imagifyOutOfCredits: {
		label: "An image added, with Imagify's free month used up",
		messages: latteLed(
			'imagify-out',
			"Your new image wasn't optimized, since this month's free Imagify optimization is used up.",
		),
		nudges: {
			inline: {
				id: 'imagify-out',
				text: 'See plans',
				type: 'action',
				card: {
					text: 'Do you want to see Imagify’s plans?',
					icon: 'image',
					button: 'See plans',
				},
				details: { url: 'https://imagify.io/pricing/' },
			},
		},
	},
	largeImageAdded: {
		label: 'A large image added, with no Imagify',
		messages: latteLed(
			'large-image',
			'Your new image is quite large, which can slow your site down.',
		),
		nudges: {
			inline: imagifyInstallCard('image-size'),
			placeholder: INSTALL_IMAGIFY,
		},
	},
	imagifyCoverage: {
		label: 'A change, then how many images Imagify has optimized',
		messages: wrappedUp(
			teamAdded(),
			TEAM_DONE,
			'imagify-coverage',
			LEADS['imagify-coverage'],
		),
		nudges: { inline: IMAGIFY_COVERAGE },
	},
	imagifySlowAnswer: {
		label: 'Why is my site slow?',
		messages: slowAnswered(),
		nudges: { inline: LARGE_IMAGES, placeholder: INSTALL_IMAGIFY },
	},
	imagifyInstalling: {
		label: 'After Install it, Imagify installing',
		messages: [
			...slowAnswered(),
			{ ...asked('Install Imagify'), id: 'demo-asked-install' },
			{
				id: 'demo-installing',
				role: 'assistant',
				parts: [
					step('install-plugin', 'Installing Imagify', 'input-available'),
				],
				metadata: { workflow: 'recommend-plugins' },
			},
		],
		status: 'streaming',
		statusText: 'Installing Imagify',
	},
	imagifyOptimizeNext: {
		label: 'Imagify installed, then optimizing as the next task',
		messages: [
			...slowAnswered(),
			{ ...asked('Install Imagify'), id: 'demo-asked-install' },
			{
				id: 'demo-installed',
				role: 'assistant',
				parts: [
					step('install-plugin', 'Installing Imagify'),
					labelled(
						'install-plugin',
						'Installed Imagify',
						"Couldn't install Imagify",
					),
					{ type: 'step-start' },
					{ type: 'text', text: 'I installed Imagify.' },
					{
						type: 'data-nudge',
						data: {
							id: 'next-task',
							lead: 'I noticed 22 of your images aren’t optimized yet.',
						},
					},
				],
				metadata: { workflow: 'recommend-plugins' },
			},
		],
		nudges: taskNudge({
			tasks: [
				{
					text: 'Optimize my images',
					note: 'Do you want to optimize your images next?',
					action: 'Optimize images',
					icon: 'image',
				},
			],
			total: 1,
		}),
	},
	setupLogo: {
		label: 'A change, then a missing logo',
		messages: wrappedUp(
			pluginInstalled(),
			'I just installed WPForms for you.',
			'setup-logo',
			LEADS['setup-logo'],
		),
		nudges: { inline: SETUP_LOGO, placeholder: LOGO_REQUEST },
	},
	setupLive: {
		label: 'A change, then a site not live',
		messages: wrappedUp(
			timezoneSaved(),
			'I just set your site to Paris time for you.',
			'setup-publish',
			LEADS['setup-publish'],
		),
		nudges: { inline: SETUP_LIVE, placeholder: PUBLISH_SITE },
	},
	setupDesign: {
		label: 'A change, then a design card',
		messages: wrappedUp(
			timezoneSaved(),
			'I just set your site to Paris time for you.',
			'setup-fonts',
			LEADS['setup-fonts'],
		),
		nudges: { inline: SETUP_FONTS, placeholder: FONTS },
	},
	setupAdded: {
		label: 'A missing logo after Add it',
		messages: [
			...wrappedUp(
				pluginInstalled(),
				'I just installed WPForms for you.',
				'setup-logo',
				LEADS['setup-logo'],
			),
			{ ...asked('Help me add a logo'), id: 'demo-asked-logo' },
			{ ...picking('logo'), id: 'demo-picking' },
		],
	},
	welcomeBack: {
		label: 'Welcome back',
		messages: [],
		welcome: [
			{
				id: 'welcome-logo',
				text: 'Add a site logo',
				details: { workflow: 'logo' },
			},
			{ id: 'welcome-phone', text: 'Update my phone number', details: {} },
			{
				id: 'welcome-orders',
				text: 'Check products sold today',
				details: { workflow: 'plugin:woocommerce' },
			},
		],
	},
	answerNext: {
		label: 'An answer, then what I can do',
		messages: pagesAndPosts(),
		nudges: { placeholder: EXPLORE },
	},
	refreshFolded: {
		label: 'A refresh card that folds',
		messages: wrappedUp(
			timezoneSaved(),
			'I just set your site to Paris time for you.',
			'refresh-description',
			LEADS['refresh-description'],
		),
		nudges: { inline: REFRESH_DESCRIPTION, placeholder: SITE_PROFILE },
	},
	refreshImage: {
		label: 'A refresh card with an image',
		messages: wrappedUp(
			timezoneSaved(),
			'I just set your site to Paris time for you.',
			'refresh-logo',
			LEADS['refresh-logo'],
		),
		nudges: { inline: REFRESH_LOGO, placeholder: LOGO_REQUEST },
	},
	feedback: {
		label: 'Feedback card',
		messages: timezoneDone(),
		nudges: { placeholder: SITE_TITLE },
		rating: FEEDBACK,
	},
	feedbackRated: {
		label: 'Feedback card, after a rating',
		messages: timezoneDone(),
		nudges: { placeholder: SITE_TITLE },
		rating: { ...FEEDBACK, rated: true },
	},
	feedbackSheet: {
		label: 'Feedback sheet',
		messages: timezoneDone(),
		nudges: { placeholder: SITE_TITLE },
		rating: { ...FEEDBACK, rated: true },
		feedback: true,
	},
	choice: { label: 'Multiple choice', messages: multipleChoice() },
	offline: { label: 'Offline', ...failed({}, { offline: true }) },
	busy: { label: 'Too many messages', ...failed({ status: 429 }) },
	failed: { label: 'Failed reply', ...failed({ status: 500 }) },
	noResponse: { label: 'No response', ...failed({ message: 'no-response' }) },
	report: {
		label: 'Report card, after a failed reply',
		...failed({ status: 500 }),
		report: 'ask',
	},
	reportNote: {
		label: 'Report sent, with a note to add',
		...failed({ status: 500 }),
		report: 'note',
	},
	interrupted: {
		label: 'Plan interrupted by a reload',
		messages: [asked('Add three more people to the team section')],
		interrupted: { plan: true },
	},
	tooLong: {
		label: 'Message too long',
		// Past the chat box's 1,500 characters, as a pasted page draft would be.
		draft: Array.from(
			{ length: 9 },
			() =>
				'We are a small family bakery on Main Street, open every day from seven in the morning. Everything is baked fresh on site, from sourdough and rye to seasonal fruit tarts.',
		).join(' '),
	},
	pluginUpdate: {
		label: 'Plugin update',
		pluginUpdate: { version: '99.0.0', nonce: 'demo' },
	},
	pluginUpdateLink: {
		label: 'Plugin update, no button',
		pluginUpdate: { version: '99.0.0' },
		pluginUpdateUrl: '#',
	},
	wordpress: {
		label: 'WordPress too old',
		update: { floor: '7.0', url: '#' },
	},
};

// These reuse other states' messages, so they fill in once STATES exists.
Object.assign(STATES, {
	cardsInReplies: {
		label: 'Cards a reply leaves',
		messages: [
			...renamed('design', [
				asked('change my site colors'),
				designing('colors'),
			]),
			...renamed('page', waitingOnPage()),
		],
	},
	cardsThatAsk: {
		label: 'A pick list with details',
		messages: [
			...renamed('title', STATES.savedTitle.messages),
			...renamed('pick', STATES.chooseMany.messages),
		],
	},
	messagesReply: {
		label: 'A reply with a link and code',
		messages: [
			...renamed('first', STATES.oneStep.messages),
			asked('how do I add a menu link?'),
			answered(
				'Open **Appearance → Menus**, then add the page. The [menu guide](#) walks through it, and the block is `core/navigation`.',
			),
		],
	},
	messagesPlan: {
		...STATES.plan,
		label: 'A plan of steps above the chat box',
	},
	messagesQueued: {
		...STATES.queued,
		label: 'A message queued while the agent works',
	},
	inputDimmed: {
		label: 'The chat box dimmed under an update notice',
		messages: STATES.oneStep.messages,
		update: STATES.wordpress.update,
	},
	inputTyped: {
		label: 'A message typed in the chat box',
		messages: STATES.oneStep.messages,
		draft: 'and make the buttons rounder',
	},
	inputPicked: {
		label: 'A part picked, with a message typed about it',
		messages: STATES.oneStep.messages,
		selected: STATES.blockPicked.selected,
		draft: 'make this a bit shorter',
	},
	cardAsking: {
		label: 'A product added, then a page to pick',
		messages: [
			...renamed('product', STATES.productCreated.messages),
			...renamed('page', STATES.pageChoice.messages),
		],
	},
});

// In the order a chat goes: replies and their steps, what the agent asks, the edits, then each feature.
const GROUPS = [
	[
		'Conversation',
		[
			'runInProgress',
			'cardsAndNudges',
			'cardsInReplies',
			'cardsThatAsk',
			'cardAsking',
			'messagesReply',
			'messagesPlan',
			'messagesQueued',
			'inputDimmed',
			'inputTyped',
			'inputPicked',
		],
	],
	[
		'Steps',
		[
			'thinking',
			'running',
			'oneStep',
			'working',
			'workingOpened',
			'between',
			'steps',
			'stepsOpened',
			'failedStep',
			'failedInGroup',
		],
	],
	[
		'Questions',
		[
			'questionCard',
			'detailedQuestionCard',
			'choice',
			'titleCard',
			'answeredQuestion',
			'interrupted',
			'pageChoice',
			'chooseMany',
			'confirmPart',
		],
	],
	[
		'Nudges',
		[
			'changeNext',
			'designNext',
			'answerNext',
			'setupLogo',
			'setupLive',
			'setupDesign',
			'setupAdded',
			'changeRefresh',
			'refreshFolded',
			'refreshImage',
			'refreshKept',
			'refreshUpdated',
			'logoUpdated',
			'colorsFixed',
			'imagifyCoverage',
			'largeImageAdded',
			'imagifyOutOfCredits',
			'nextTask',
			'menuTask',
			'planMenuTask',
			'siteGuideFinishedStore',
			'siteGuideFinished',
			'siteGuideFinishedExplore',
			'storeFinishedPhone',
			'phoneThenExplore',
			'storeOnShop',
			'cardTurnedDown',
		],
	],
	['Colors', ['colorsFixed', 'adjustColors']],
	[
		'Editing blocks',
		[
			'blockPicked',
			'sentPicked',
			'nextTask',
			'menuTask',
			'planMenuTask',
			'blockImagePicker',
			'mapAdded',
		],
	],
	[
		'Plan',
		[
			'plan',
			'planStopped',
			'planCompleted',
			'planCutOff',
			'planImage',
			'planMap',
			'planAsking',
		],
	],
	[
		'Unsaved changes',
		[
			'unsaved',
			'discarding',
			'changesSheet',
			'changesDeck',
			'changesDeckOpen',
			'stuck',
			'resolved',
			'resolveFailed',
			'someoneViewing',
			'openInAnotherTab',
			'liveChanged',
		],
	],
	[
		'Forms',
		[
			'formCard',
			'profileForm',
			'longForm',
			'formDiscard',
			'formClosed',
			'formKeptOpen',
			'formMinimized',
			'leavingForm',
		],
	],
	['Settings', ['savedTitle', 'savedTimezone', 'unpublished']],
	[
		'Design',
		[
			'restyleRunning',
			'restyleDone',
			'designColors',
			'designMade',
			'designMadeOne',
			'designAnimation',
			'designFolded',
			'layoutCard',
		],
	],
	[
		'Images',
		[
			'logoPicker',
			'iconPicker',
			'imageSaving',
			'librarySheet',
			'stockSheet',
			'generateSheet',
		],
	],
	['Pages', ['createdPage', 'pageInGutter']],
	[
		'Plugins',
		[
			'pluginsToPick',
			'pluginToInstall',
			'pluginNamed',
			'pluginToTurnOn',
			'pluginInstalled',
		],
	],
	[
		'WooCommerce',
		[
			'productForm',
			'productUpdateForm',
			'productCreated',
			'productDeleted',
			'deleteAsking',
			'abilityFailed',
		],
	],
	['WPForms', ['fieldForm', 'fieldMoveAsking', 'fieldRemoveAsking']],
	[
		'Imagify',
		[
			'imagifyQuotaBell',
			'imagifyOptimized',
			'imagifyOutOfCredits',
			'largeImageAdded',
			'imagifyCoverage',
			'imagifySlowAnswer',
			'imagifyInstalling',
			'imagifyOptimizeNext',
			'abilityAsking',
			'creditsAsking',
			'imageOptimizing',
			'imageOptimized',
			'imageAlready',
			'imageBackground',
			'imageFailed',
		],
	],
	['What I can do', ['offered', 'filtered', 'nothingMatches']],
	[
		'Site Guide',
		[
			'siteGuide',
			'siteGuideDone',
			'siteGuideFinishedStore',
			'siteGuideFinished',
			'siteGuideFinishedExplore',
			'storeFinishedPhone',
			'phoneThenExplore',
		],
	],
	['Welcome', ['welcomeBack']],
	['Feedback', ['feedback', 'feedbackRated', 'feedbackSheet']],
	['Report', ['report', 'reportNote']],
	['Queue', ['queued', 'queuedJoined']],
	['Errors', ['offline', 'busy', 'failed', 'noResponse', 'tooLong']],
	['Updates', ['pluginUpdate', 'pluginUpdateLink', 'wordpress']],
];
const grouped = GROUPS.flatMap(([, ids]) => ids);
// A state left out of the groups still shows, at the end.
export const GROUPED = [
	...GROUPS,
	['Other', Object.keys(STATES).filter((id) => !grouped.includes(id))],
].filter(([, ids]) => ids.length);

const Choice = ({ id, label, picked, onPick }) => (
	<label
		className={`flex cursor-pointer items-center gap-2 px-2 py-1 text-sm text-gray-900 ${
			id === picked ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
		}`}
	>
		<input
			type="radio"
			name="agentx-demo-chat-state"
			value={id}
			checked={id === picked}
			onChange={() => onPick(STATES[id] ?? null)}
			className="m-0"
		/>
		{label}
	</label>
);

const matches = (query, ...texts) =>
	!query ||
	texts.some((text) => text.toLowerCase().includes(query.toLowerCase()));

const GROUP_LABEL =
	'm-0 border-t border-gray-200 px-2 pt-2 pb-1 text-xs font-medium tracking-wide text-gray-600 uppercase';

// Radios, so the arrow keys step through the states and each shows at once.
export const ChatStates = ({ query = '' }) => {
	const chatDemo = useShellStore((state) => state.chatDemo);
	const setChatDemo = useShellStore((state) => state.setChatDemo);
	const picked =
		Object.keys(STATES).find((id) => STATES[id] === chatDemo) ?? '';
	const shown = GROUPED.map(([group, ids]) => [
		group,
		ids.filter((id) => matches(query, group, STATES[id].label)),
	]).filter(([, ids]) => ids.length);

	return (
		<fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
			<legend className="mb-2 p-0 font-medium">State</legend>
			<div className="flex max-h-112 flex-col overflow-y-auto rounded-sm border border-gray-300 bg-white">
				<Choice id="" label="Live chat" picked={picked} onPick={setChatDemo} />
				{shown.map(([group, ids]) => (
					<Fragment key={group}>
						<p className={GROUP_LABEL}>{group}</p>
						{ids.map((id) => (
							<Choice
								key={id}
								id={id}
								label={STATES[id].label}
								picked={picked}
								onPick={setChatDemo}
							/>
						))}
					</Fragment>
				))}
				{matches(query, 'Unused', 'Toggle minimize site') && (
					<>
						<p className={GROUP_LABEL}>Unused</p>
						<CanvasTools />
					</>
				)}
			</div>
		</fieldset>
	);
};

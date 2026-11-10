import { TREE_TOKENS } from '@agentx/lib/token-tree';

export const TOKEN_GROUPS = [
	{
		label: 'Shell',
		about:
			'The window around the chat and the site. The gradient covers the surface color.',
		tokens: [
			'--agentx-surface-image',
			'--color-agentx-surface',
			'--color-agentx-ink',
			'--font-agentx',
			'--spacing-agentx-gap',
		],
	},
	{
		label: 'Background',
		about:
			"A shader behind the chat and the site, in place of the surface's gradient, when the design has one. Colors left empty come from the surface and the accent.",
		tokens: [
			'--agentx-bg-color-1',
			'--agentx-bg-color-2',
			'--agentx-bg-color-3',
			'--agentx-bg-speed',
			'--agentx-bg-scale',
			'--agentx-bg-intensity',
			'--agentx-bg-offset-x',
			'--agentx-bg-offset-y',
		],
	},
	{
		label: 'Resize grip',
		about:
			"The grip on the chat's edge by the site, which drags the chat down to its smallest width or up to one and a half times its width for the window, and keeps the change as the window resizes. A double-click puts it back. It shows only under the pointer, in the grip color, and while dragging or with the keyboard on it, in the active color. Not shown while the chat is minimized, on a phone or in wp-admin.",
		tokens: ['--color-agentx-grip', '--color-agentx-grip-active'],
	},
	{
		label: 'Header',
		about:
			"The bar atop the chat and the wp-admin window, with the host's logo. Defaults to the host's banner colors; on a white banner it's clear and the inset is 0.",
		tokens: [
			'--color-agentx-brand',
			'--color-agentx-brand-ink',
			'--color-agentx-brand-border',
			'--color-agentx-welcome',
			'--agentx-brand-border-width',
			'--spacing-agentx-brand-inset',
			'--color-agentx-brand-hover',
			'--color-agentx-brand-focus',
		],
	},
	{
		label: 'Controls',
		about:
			'Buttons in the chat and the toolbar. The focus color rings whatever the keyboard is on.',
		tokens: [
			'--color-agentx-hover',
			'--radius-agentx-control',
			'--color-agentx-focus',
		],
	},
	{
		label: 'Chat',
		about:
			'The chat box, your own messages in the chat, a message queued while the agent works, the outline of the plan of steps above the chat box (and of the same list in the reply once the plan ends), the tiles and buttons of the logo and icon picker, the outlined Keep it and Update buttons and the ringed icon on a refresh card, and the outlined Continue on the next task card. The accent fills the send button, rings the box when you Tab into it, rings a picker tile under the pointer, and fills the first button of a card or a choice, Save, and the Current tag in the list of unsaved changes.',
		tokens: [
			'--color-agentx-field',
			'--color-agentx-field-border',
			'--color-agentx-accent',
			'--color-agentx-accent-ink',
		],
	},
	{
		label: 'Plan',
		about:
			"The Stop button on the plan of steps above the chat box: a square and the word Stop in the shell's ink, outlined in the chat's field border, over this background, clear by default. The pointer darkens it with the hover color.",
		tokens: ['--color-agentx-plan-stop'],
	},
	{
		label: 'Messages',
		about:
			"The conversation. Replies and your own messages take this size, and replies take the shell's ink. The muted color is for Not answered, the buttons under a queued message, the plan's title and the marks of its steps not started or done, the steps toggle, the conversation's scrollbar and the line under the chat box. The alert color marks errors, like Message too long, a failed update and an edit that couldn't be applied. Demo > Chat shows each.",
		tokens: [
			'--text-agentx-message',
			'--text-agentx-message--line-height',
			'--color-agentx-muted',
			'--color-agentx-alert',
		],
	},
	{
		label: 'Working',
		about:
			"The status line while the agent works, in the muted color with the shimmer color sweeping across it, and the steps above a reply: a finished step's check takes the accent and a failed one's cross the alert. Two or more steps fold under a toggle that shows the tool while one runs, and how many steps there were otherwise; a failed step always stands on its own line, and statuses stay on their own line under it. The opened list sits in by the indent, which is also the gap after its line; an indent of 0 and a transparent line set it flush. Demo > Chat shows each.",
		tokens: [
			'--color-agentx-shimmer',
			'--animate-agentx-shimmer',
			'--spacing-agentx-steps-indent',
			'--color-agentx-steps-line',
		],
	},
	{
		label: 'Spinner',
		about: 'The working spinner. Pick one or edit the GLSL.',
		tokens: ['--spacing-agentx-spinner'],
	},
	{
		label: 'Cards',
		about:
			'Every card around the chat box and on the unsaved changes bar, not the design cards in the conversation: the update notices, a multiple choice, a question card (also the plugins to pick from), a form card (also a plugin form, like a new product), a link nudge, the refresh card under a reply that shows a value like the tagline or logo with Keep it and Update, which the line of the reply above it introduces, the next task card under a reply, which shows the next of several parts the agent changes one at a time with Continue and an X that skips the rest, the feedback card asking to rate the agent, the logo and icon picker in the conversation, the page card the agent waits on to publish, unpublish or delete a page, the one-button card that confirms a delete, asks before an action from a plugin changes the site, or retries a failed change, the notice about changes made outside the agent, the offline, too many messages and failed states, the unsaved changes bar with its Resolve, I was unable to merge in the changes and Changes applied states, and the card under the bar while someone else has the page open, whose dot pulses in the presence color. The bar floats over the conversation, so it blurs what scrolls under it. Demo > Chat shows each.',
		tokens: [
			'--color-agentx-notice',
			'--color-agentx-notice-border',
			'--agentx-notice-shadow',
			'--color-agentx-presence',
			'--container-agentx-card',
		],
	},
	{
		label: 'Sheets',
		about:
			"The sheets that slide up over the conversation: one for picking a logo or icon (from the media library, stock photos or generated images), one listing the things you can ask for, opened by typing / in the chat box or by asking, the list of unsaved changes, and the one for writing a comment after rating the agent. The image sheet's tabs, a picked image's ring and Use image take the chat's accent. The list of things to ask for has a filter field in the chat's field colors, and the request Enter would pick shows in the hover color. Demo > Chat shows each tab, and the list filtered and with nothing matching.",
		tokens: ['--color-agentx-sheet', '--agentx-sheet-shadow'],
	},
	{
		label: 'Design cards',
		about:
			"The cards in the conversation for trying the site's design: the design card for colors, fonts, style and animation, the layout card for a ready-made top section on the home page, the page card a new page leaves, with its preview, Publish or Make Draft, and delete, and the cards a plugin's action leaves: a product added to the store, and an image being optimized. On the first two, the option the site shows now carries a check in the picked color. The layout card's home page thumbnails sit in a row that scrolls sideways. Under the row, its handle is a thin track in the Tabs track color with a thumb in the muted color, in the ink color under the pointer. Demo > Chat shows each.",
		tokens: [
			'--color-agentx-card',
			'--color-agentx-card-border',
			'--color-agentx-picked',
		],
	},
	{
		label: 'Selection',
		about:
			'While picking, the block under the pointer takes a box: a grain fill in the fill color, its alpha setting how strong, and a long-dashed edge in the selection color, a little outside the block. A click flies the box into the chat box, where it becomes the pill, and turns picking off. The block the agent asks about takes the same box, with the page around it blurred. A box slides under a header stuck to the top, unless its block is in the header.',
		tokens: ['--color-agentx-selection', '--color-agentx-selection-fill'],
	},
	{
		label: 'Quick Edit',
		about:
			"The site shows its own hover looks, and the pointer over it is the cursor (default for the arrow, crosshair for a plus), but the hand over a link, which a click follows, or a control a click works. The pointer resting on a part for a second, or a click on one that isn't a link, shows a bubble: what a click there would do, Edit with the part's name, then Send to agent while the chat is minimized. A click holds the bubble still; the hover color marks the option under the pointer. No bubble shows while a link's page loads. Edit on a paragraph or heading opens a bar over the words in the same colors; Save closes it at once, and a save the site refuses opens it again saying why. While it's open the rest of the page takes no hover, and a click there closes it if nothing changed, opening the part clicked when it can be edited. The border color draws its dividers and fields, and Save takes the chat's accent. The text color button's underline and the highlight button's fill are the text and highlight colors. The bubble and the editor share the shadow.",
		tokens: [
			'--agentx-quick-edit-cursor',
			'--color-agentx-quick-edit-text',
			'--color-agentx-quick-edit-highlight',
			'--color-agentx-bubble',
			'--color-agentx-bubble-ink',
			'--color-agentx-bubble-border',
			'--color-agentx-bubble-hover',
			'--color-agentx-bubble-muted',
			'--agentx-quick-edit-shadow',
		],
	},
	{
		label: 'Tabs',
		about:
			"Every row of tabs or toggles: the design card's tabs, the animation options, and the desktop and phone buttons above the site, hidden while a tool has the site in the corner. The row sits on the track color, the open one raised on the tab color. The track color is also the layout card's scroll track. Save above the site shows a dot in the unsaved color while anything is unsaved.",
		tokens: [
			'--color-agentx-tabs',
			'--color-agentx-tab',
			'--agentx-tab-shadow',
			'--color-agentx-unsaved',
		],
	},
	{
		label: 'Menu',
		about:
			"The More menu atop the agent: Block Editor and WP Admin, then the divider line, then Close agent. The bell's tasks too, with a divider line between each and over Cleared; a task and the Cleared toggle take the hover color and control radius from Controls. Their border and shadow follow Panels.",
		tokens: ['--color-agentx-menu', '--color-agentx-menu-divider'],
	},
	{
		label: 'Tooltips',
		about:
			'The label a toolbar or card icon shows after a second on hover or keyboard focus, and at once while another is open.',
		tokens: [
			'--color-agentx-tooltip',
			'--color-agentx-tooltip-ink',
			'--animate-agentx-tooltip',
		],
	},
	{
		label: 'Site',
		about:
			'The box the site sits in. The radius also rounds the phone sheet, the Slot bar, the chat box and the plan above it, and at half size the site shrunk into the corner. The background shows only while the site loads.',
		tokens: ['--radius-agentx', '--agentx-site-shadow', '--color-agentx-site'],
	},
	{
		label: 'Panels',
		about:
			"Raised panels: the pressed demo button, and the bar under the site in the Slot template. The shadow is also the More menu's and the Quick Edit bubble's.",
		tokens: [
			'--color-agentx-panel',
			'--color-agentx-panel-border',
			'--agentx-panel-shadow',
		],
	},
	{
		label: 'Switching previews',
		about:
			'Every switch veils the site under a spinner for at least the hold time, while the change loads out of sight. The spinner takes the ink color.',
		tokens: ['--color-agentx-veil', '--agentx-switch-hold'],
	},
	{
		label: 'Working toast',
		about:
			"The toast at the foot of the site while the agent changes it, in the card's colors. A lit arc turns around its edge: its color, how long one turn takes, how thick it draws and how much of the edge it lights. A glow rises off the foot of the frame behind it, off at no height, breathing between half strength and full.",
		tokens: [
			'--color-agentx-working-shine',
			'--agentx-working-shine-speed',
			'--agentx-working-shine-width',
			'--agentx-working-shine-arc',
			'--color-agentx-working-glow',
			'--agentx-working-glow-height',
			'--agentx-working-glow-strength',
			'--agentx-working-glow-speed',
			'--agentx-working-glow-blur',
		],
	},
	{
		label: 'Closed agent',
		about:
			"The toolbar on the closed page, in WordPress's admin bar colors, and the notice on pages that refuse the frame. Neither shows in this view.",
		tokens: [
			'--color-agentx-inverse',
			'--color-agentx-inverse-ink',
			'--color-agentx-inverse-accent',
		],
	},
];

export const TOKENS = [
	...new Set([...TOKEN_GROUPS.flatMap(({ tokens }) => tokens), ...TREE_TOKENS]),
];

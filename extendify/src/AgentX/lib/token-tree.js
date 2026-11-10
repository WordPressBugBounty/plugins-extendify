// The partner-facing tree: General settings across the agent, then each area's own set, then its parts.
// Each token defaults to its parent in agentx.css.
export const TOKEN_TREE = {
	general: [
		{
			label: 'Window',
			tokens: [
				{
					token: '--color-agentx-surface',
					label: 'Background color',
				},
				{
					token: '--agentx-surface-image',
					label: 'Background image',
				},
			],
		},
		{
			label: 'Colors',
			tokens: [
				{
					token: '--color-agentx-raised',
					label: 'Raised surface',
				},
				{
					token: '--color-agentx-ink',
					label: 'Text',
				},
				{
					token: '--color-agentx-muted',
					label: 'Secondary text and icons',
				},
				{
					token: '--color-agentx-placeholder',
					label: 'Placeholder text',
				},
				{
					token: '--color-agentx-accent',
					label: 'Accent',
				},
				{
					token: '--color-agentx-accent-ink',
					label: 'Text and icons on the accent',
				},
				{
					token: '--color-agentx-alert',
					label: 'Errors',
				},
				{
					token: '--color-agentx-border',
					label: 'Border override, every outline and divider once set',
				},
				{
					token: '--color-agentx-hover',
					label: 'Hover fill',
				},
			],
		},
		{
			label: 'Focus',
			tokens: [
				{
					token: '--color-agentx-focus',
					label: 'Keyboard ring color',
				},
				{
					token: '--agentx-focus-width',
					label: 'Keyboard ring width',
				},
			],
		},
		{
			label: 'Shape',
			tokens: [
				{
					token: '--radius-agentx',
					label: 'Large radius',
				},
				{
					token: '--radius-agentx-control',
					label: 'Control radius',
				},
				{
					token: '--spacing-agentx-gap',
					label: 'Gap between the chat and the site',
				},
				{
					token: '--agentx-shadow',
					label:
						'Shadow override for cards, chat box, plan, menus, tooltips and Quick Edit once set',
				},
			],
		},
		{
			label: 'Type',
			tokens: [
				{
					token: '--font-agentx',
					label: 'Font',
				},
				{
					token: '--text-agentx-body',
					label: 'Body text size',
				},
				{
					token: '--text-agentx-body--line-height',
					label: 'Body line height',
				},
				{
					token: '--text-agentx-caption',
					label: 'Small text size',
				},
				{
					token: '--text-agentx-caption--line-height',
					label: 'Small text line height',
				},
				{
					token: '--font-weight-agentx-button',
					label: 'Button, tab and label weight',
				},
				{
					token: '--font-weight-agentx-title',
					label: 'Title weight override',
				},
			],
		},
		{
			label: 'Fields',
			tokens: [
				{
					token: '--color-agentx-field',
					label: 'Fill',
				},
				{
					token: '--color-agentx-field-border',
					label: 'Border',
				},
				{
					token: '--color-agentx-checkbox',
					label: 'Checked checkbox',
				},
			],
		},
		{
			label: 'Main buttons',
			tokens: [
				{
					token: '--color-agentx-primary',
					label: 'Fill',
				},
				{
					token: '--color-agentx-primary-ink',
					label: 'Text',
				},
			],
		},
		{
			label: 'Outlined buttons',
			tokens: [
				{
					token: '--color-agentx-button',
					label: 'Fill',
				},
				{
					token: '--color-agentx-button-ink',
					label: 'Text',
				},
				{
					token: '--color-agentx-button-border',
					label: 'Border',
				},
				{
					token: '--color-agentx-button-hover',
					label: 'Hover fill',
				},
			],
		},
		{
			label: 'Delete and Discard buttons',
			tokens: [
				{
					token: '--color-agentx-danger',
					label: 'Fill',
				},
				{
					token: '--color-agentx-danger-ink',
					label: 'Text',
				},
			],
		},
		{
			label: 'Filled buttons',
			tokens: [
				{
					token: '--agentx-hover-brightness',
					label: 'Hover brightness',
				},
			],
		},
		{
			label: 'Tabs and toggles',
			tokens: [
				{
					token: '--color-agentx-tabs',
					label: 'Track',
				},
				{
					token: '--color-agentx-tab',
					label: 'Selected',
				},
				{
					token: '--agentx-tab-shadow',
					label: 'Selected shadow',
				},
			],
		},
		{
			label: 'States',
			tokens: [
				{
					token: '--agentx-disabled-opacity',
					label:
						'Disabled override, how faded every unavailable control is once set',
				},
				{
					token: '--agentx-press-scale',
					label: 'Press shrink',
				},
			],
		},
	],
	groups: [
		{
			id: 'chat-input',
			label: 'Chat input',
			top: [
				{
					token: '--color-agentx-chat-box',
					label: 'Chat box fill',
				},
				{
					token: '--color-agentx-chat-box-ink',
					label: 'Text and icons in the box',
				},
				{
					token: '--color-agentx-chat-box-muted',
					label: 'Secondary text and icons in and under the box',
				},
				{
					token: '--color-agentx-chat-box-border',
					label: 'Chat box border',
				},
				{
					token: '--agentx-chat-box-border-width',
					label: 'Chat box border width',
				},
				{
					token: '--radius-agentx-chat-box',
					label: 'Chat box radius',
				},
				{
					token: '--agentx-chat-box-shadow',
					label: 'Chat box shadow',
				},
				{
					token: '--color-agentx-chat-box-hover',
					label: 'Hover fill of the buttons in the box',
				},
				{
					token: '--color-agentx-chat-box-focus',
					label: 'Ring when you Tab into the box',
				},
				{
					token: '--agentx-chat-box-disabled-opacity',
					label: "Whole box while it can't take a message",
				},
			],
			parts: [
				{
					label: 'Text field',
					tokens: [
						{
							token: '--color-agentx-chat-box-placeholder',
							label: 'Placeholder',
						},
						{
							token: '--text-agentx-chat-box-input',
							label: 'Text size',
						},
						{
							token: '--text-agentx-chat-box-input--line-height',
							label: 'Line height',
						},
					],
				},
				{
					label: 'History line (History 2 of 5, while Up steps back)',
					tokens: [
						{
							token: '--color-agentx-chat-box-history-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Select button',
					tokens: [
						{
							token: '--color-agentx-select-button',
							label: 'Fill',
						},
						{
							token: '--color-agentx-select-button-ink',
							label: 'Text and crosshair',
						},
						{
							token: '--color-agentx-select-button-hover',
							label: 'Hover fill',
						},
						{
							token: '--radius-agentx-select-button',
							label: 'Radius',
						},
					],
				},
				{
					label: 'Picked part pill and Cancel pill',
					tokens: [
						{
							token: '--color-agentx-pill',
							label: 'Fill',
						},
						{
							token: '--color-agentx-pill-ink',
							label: 'Name, Cancel and X',
						},
						{
							token: '--color-agentx-pill-hover',
							label: 'Hover fill of each half',
						},
						{
							token: '--radius-agentx-pill',
							label: 'Radius',
						},
						{
							token: '--font-weight-agentx-pill',
							label: 'Weight',
						},
					],
				},
				{
					label: 'Send button',
					tokens: [
						{
							token: '--color-agentx-send',
							label: 'Fill',
						},
						{
							token: '--color-agentx-send-ink',
							label: 'Icon',
						},
						{
							token: '--color-agentx-send-hover',
							label: 'Hover fill',
						},
						{
							token: '--radius-agentx-send',
							label: 'Radius',
						},
					],
				},
				{
					label: 'Stop button (while the agent replies)',
					tokens: [
						{
							token: '--color-agentx-stop',
							label: 'Fill',
						},
						{
							token: '--color-agentx-stop-ink',
							label: 'Square',
						},
					],
				},
				{
					label: 'Site tools: History, Discard, Undo, Redo, Save, Settings',
					tokens: [
						{
							token: '--color-agentx-tools-ink',
							label: 'Icons',
						},
						{
							token: '--color-agentx-tools-hover',
							label: 'Hover fill',
						},
						{
							token: '--color-agentx-tools-hover-ink',
							label: 'Hover icon',
						},
						{
							token: '--color-agentx-tools-active',
							label: 'Open fill',
						},
						{
							token: '--color-agentx-tools-active-ink',
							label: 'Open icon',
						},
						{
							token: '--agentx-tools-active-shadow',
							label: 'Open shadow',
						},
						{
							token: '--radius-agentx-tools',
							label: 'Radius',
						},
						{
							token: '--color-agentx-tools-divider',
							label: 'Divider before Settings',
						},
					],
				},
				{
					label: 'Save: unsaved dot and saving spinner',
					tokens: [
						{
							token: '--color-agentx-unsaved',
							label: 'Unsaved dot',
						},
						{
							token: '--color-agentx-saving',
							label: 'Saving spinner arc',
						},
					],
				},
				{
					label:
						'Settings menu (gear): Autosave checkbox and labels; the menu box is Header > Menus',
					tokens: [
						{
							token: '--color-agentx-checkbox-ink',
							label: 'Check mark',
						},
						{
							token: '--color-agentx-checkbox-border',
							label: 'Unchecked border',
						},
						{
							token: '--radius-agentx-checkbox',
							label: 'Checkbox radius',
						},
						{
							token: '--font-weight-agentx-settings-item',
							label: 'Edit site profile and Autosave weight',
						},
					],
				},
				{
					label: 'Disclaimer under the box',
					tokens: [
						{
							token: '--color-agentx-disclaimer-ink',
							label: 'Text',
						},
					],
				},
			],
		},
		{
			id: 'header',
			label: 'Header',
			top: [
				{
					token: '--color-agentx-brand',
					label: 'Logo bar fill',
				},
				{
					token: '--color-agentx-brand-ink',
					label: 'Logo bar text and icons',
				},
				{
					token: '--color-agentx-brand-border',
					label: 'Logo bar border',
				},
				{
					token: '--agentx-brand-border-width',
					label: 'Logo bar border width',
				},
				{
					token: '--spacing-agentx-brand-inset',
					label: 'Logo bar start inset',
				},
				{
					token: '--color-agentx-brand-hover',
					label: 'Hover fill on the logo bar',
				},
				{
					token: '--color-agentx-brand-focus',
					label: 'Focus ring on the logo bar',
				},
				{
					token: '--color-agentx-header-ink',
					label: 'Icons and labels',
				},
				{
					token: '--color-agentx-header-hover',
					label: 'Hover fill',
				},
				{
					token: '--radius-agentx-header-button',
					label: 'Radius',
				},
			],
			parts: [
				{
					label: 'Logo bar shape',
					tokens: [
						{
							token: '--radius-agentx-brand',
							label: 'Radius',
						},
						{
							token: '--agentx-brand-shadow',
							label: 'Shadow',
						},
					],
				},
				{
					label: 'Partner logo',
					tokens: [
						{
							token: '--spacing-agentx-logo',
							label: 'Height',
						},
						{
							token: '--container-agentx-logo-width',
							label: 'Most width',
						},
					],
				},
				{
					label: 'Partner name (when there is no logo)',
					tokens: [
						{
							token: '--text-agentx-brand-name',
							label: 'Size',
						},
						{
							token: '--text-agentx-brand-name--line-height',
							label: 'Line height',
						},
						{
							token: '--font-weight-agentx-brand-name',
							label: 'Weight',
						},
					],
				},
				{
					label: 'AI Agent mark (Two logos)',
					tokens: [
						{
							token: '--color-agentx-mark-ink',
							label: 'Text and sparkle',
						},
						{
							token: '--text-agentx-mark-title',
							label: 'Size',
						},
						{
							token: '--text-agentx-mark-title--line-height',
							label: 'Line height',
						},
						{
							token: '--font-weight-agentx-mark',
							label: 'Weight',
						},
					],
				},
				{
					label: 'Header buttons, all (toggle, bell, More, links, Close)',
					tokens: [
						{
							token: '--color-agentx-header-button',
							label: 'Fill at rest',
						},
						{
							token: '--color-agentx-header-active',
							label: 'Fill while its menu is open',
						},
						{
							token: '--text-agentx-header-label',
							label: 'Label size',
						},
						{
							token: '--text-agentx-header-label--line-height',
							label: 'Label line height',
						},
					],
				},
				{
					label: 'Chat toggle (Minimize, Open)',
					tokens: [
						{
							token: '--color-agentx-chat-toggle-ink',
							label: 'Icon',
						},
						{
							token: '--color-agentx-chat-toggle-hover',
							label: 'Hover fill',
						},
					],
				},
				{
					label: 'Tasks button',
					tokens: [
						{
							token: '--color-agentx-bell-ink',
							label: 'Icon and words',
						},
						{
							token: '--color-agentx-bell-hover',
							label: 'Hover fill',
						},
						{
							token: '--color-agentx-bell-waiting',
							label: 'Fill while tasks wait',
						},
						{
							token: '--agentx-bell-waiting-shadow',
							label: 'Shadow while tasks wait',
						},
						{
							token: '--color-agentx-bell-rest',
							label: 'Fill while none wait',
						},
						{
							token: '--color-agentx-unread',
							label: 'Unread count',
						},
						{
							token: '--color-agentx-unread-ink',
							label: 'Unread count number',
						},
					],
				},
				{
					label: 'More button',
					tokens: [
						{
							token: '--color-agentx-more-ink',
							label: 'Label and dots',
						},
						{
							token: '--color-agentx-more-hover',
							label: 'Hover fill',
						},
					],
				},
				{
					label: 'Spread links (Block Editor, WP Admin) and Close agent X',
					tokens: [
						{
							token: '--color-agentx-header-link-ink',
							label: 'Text and icons',
						},
						{
							token: '--color-agentx-header-link-hover',
							label: 'Hover fill',
						},
					],
				},
				{
					label:
						"Menus, all (More menu, notifications, the chat box's settings menu)",
					tokens: [
						{
							token: '--color-agentx-menu',
							label: 'Fill',
						},
						{
							token: '--color-agentx-menu-border',
							label: 'Border',
						},
						{
							token: '--agentx-menu-shadow',
							label: 'Shadow',
						},
						{
							token: '--radius-agentx-menu',
							label: 'Radius',
						},
						{
							token: '--color-agentx-menu-divider',
							label: 'Divider lines',
						},
					],
				},
				{
					label: 'Menu items',
					tokens: [
						{
							token: '--color-agentx-menu-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-menu-icon',
							label: 'Icons',
						},
						{
							token: '--color-agentx-menu-muted',
							label: 'Headings, Nothing new, Cleared',
						},
						{
							token: '--color-agentx-menu-hover',
							label: 'Hover and keyboard fill',
						},
						{
							token: '--radius-agentx-menu-item',
							label: 'Radius',
						},
						{
							token: '--text-agentx-menu-item',
							label: 'Size',
						},
						{
							token: '--text-agentx-menu-item--line-height',
							label: 'Line height',
						},
					],
				},
				{
					label: 'Notification rows',
					tokens: [
						{
							token: '--color-agentx-notification-ink',
							label: 'Message',
						},
						{
							token: '--color-agentx-notification-icon',
							label: 'Icon',
						},
						{
							token: '--color-agentx-notification-title-ink',
							label: 'Title above the message',
						},
						{
							token: '--color-agentx-notification-hover',
							label: 'Hover fill',
						},
						{
							token: '--color-agentx-notification-dismiss',
							label: 'Dismiss X',
						},
					],
				},
			],
		},
		{
			id: 'messages',
			label: 'Chat messages',
			top: [
				{
					token: '--text-agentx-message',
					label: 'Message text size',
				},
				{
					token: '--text-agentx-message--line-height',
					label: 'Message line height',
				},
				{
					token: '--color-agentx-message-ink',
					label: 'Text in the conversation',
				},
				{
					token: '--color-agentx-message-muted',
					label: 'Secondary text in the conversation',
				},
			],
			parts: [
				{
					label: 'Your message',
					tokens: [
						{
							token: '--color-agentx-user-message',
							label: 'Fill',
						},
						{
							token: '--color-agentx-user-message-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-user-message-border',
							label: 'Border',
						},
						{
							token: '--radius-agentx-user-message',
							label: 'Radius',
						},
						{
							token: '--agentx-user-message-shadow',
							label: 'Shadow',
						},
						{
							token: '--color-agentx-user-message-attachment',
							label: 'Picked block icon',
						},
					],
				},
				{
					label: 'Not answered (under a message whose reply failed)',
					tokens: [
						{
							token: '--color-agentx-not-answered',
							label: 'Text',
						},
					],
				},
				{
					label: 'Agent reply',
					tokens: [
						{
							token: '--color-agentx-reply-ink',
							label: 'Text',
						},
						{
							token: '--leading-agentx-reply',
							label: 'Line height',
						},
						{
							token: '--color-agentx-reply-link',
							label: 'Links',
						},
						{
							token: '--font-weight-agentx-reply-heading',
							label: 'Heading weight',
						},
					],
				},
				{
					label: 'Code in a reply',
					tokens: [
						{
							token: '--color-agentx-code',
							label: 'Inline code and code block fill',
						},
						{
							token: '--radius-agentx-code',
							label: 'Inline code radius',
						},
					],
				},
				{
					label: 'Working status line (Thinking, a running tool)',
					tokens: [
						{
							token: '--color-agentx-status',
							label: 'Text under the sweep',
						},
						{
							token: '--color-agentx-shimmer',
							label: 'Sweep',
						},
						{
							token: '--animate-agentx-shimmer',
							label: 'Sweep animation',
						},
					],
				},
				{
					label: 'Working spinner',
					tokens: [
						{
							token: '--spacing-agentx-spinner',
							label: 'Width',
						},
						{
							token: '--color-agentx-spinner',
							label: 'Main color',
						},
						{
							token: '--color-agentx-spinner-accent',
							label: 'Shader accent',
						},
					],
				},
				{
					label:
						'Steps (toggle, finished steps, opened list, ended plan, page done line)',
					tokens: [
						{
							token: '--color-agentx-steps',
							label: 'Text and chevrons',
						},
						{
							token: '--color-agentx-steps-line',
							label: 'Line beside an opened list',
						},
						{
							token: '--spacing-agentx-steps-indent',
							label: 'Indent',
						},
						{
							token: '--color-agentx-step-failed',
							label: 'Failed step mark',
						},
						{
							token: '--color-agentx-step-failed-ink',
							label: 'Failed step cross',
						},
					],
				},
				{
					label: 'Opened step record (Question, Your answer, Before, After)',
					tokens: [
						{
							token: '--color-agentx-record-label',
							label: 'Labels',
						},
					],
				},
				{
					label: 'Image thumbnails (steps, changes, refresh card, Site Guide)',
					tokens: [
						{
							token: '--color-agentx-thumb',
							label: 'Fill',
						},
						{
							token: '--color-agentx-thumb-border',
							label: 'Border',
						},
						{
							token: '--radius-agentx-thumb',
							label: 'Radius',
						},
					],
				},
				{
					label: 'Plan box',
					tokens: [
						{
							token: '--color-agentx-plan',
							label: 'Fill',
						},
						{
							token: '--color-agentx-plan-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-plan-muted',
							label: 'Done steps and marks',
						},
						{
							token: '--color-agentx-plan-border',
							label: 'Border',
						},
						{
							token: '--radius-agentx-plan',
							label: 'Radius',
						},
						{
							token: '--agentx-plan-shadow',
							label: 'Shadow',
						},
						{
							token: '--agentx-plan-blur',
							label: 'Blur behind',
						},
						{
							token: '--font-weight-agentx-plan-title',
							label: 'Title weight',
						},
					],
				},
				{
					label: 'Plan step marks',
					tokens: [
						{
							token: '--color-agentx-plan-done',
							label: 'Done circle',
						},
						{
							token: '--color-agentx-plan-done-check',
							label: 'Done check',
						},
						{
							token: '--color-agentx-plan-running',
							label: 'Running spinner',
						},
					],
				},
				{
					label: 'Plan Stop button',
					tokens: [
						{
							token: '--color-agentx-plan-stop',
							label: 'Fill',
						},
						{
							token: '--color-agentx-plan-stop-ink',
							label: 'Text and square',
						},
						{
							token: '--color-agentx-plan-stop-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-plan-stop-hover',
							label: 'Hover fill',
						},
						{
							token: '--text-agentx-plan-stop-label',
							label: 'Size',
						},
					],
				},
				{
					label: 'Queued message (typed while the agent works)',
					tokens: [
						{
							token: '--color-agentx-queued',
							label: 'Fill',
						},
						{
							token: '--color-agentx-queued-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-queued-border',
							label: 'Border',
						},
						{
							token: '--radius-agentx-queued',
							label: 'Radius',
						},
						{
							token: '--color-agentx-queued-action',
							label: 'Delete and Send now',
						},
						{
							token: '--color-agentx-queued-action-hover',
							label: 'Delete and Send now on hover',
						},
					],
				},
				{
					label: 'Empty chat greeting',
					tokens: [
						{
							token: '--color-agentx-greeting-ink',
							label: 'Heading',
						},
						{
							token: '--color-agentx-greeting-muted',
							label: 'Subtitle',
						},
						{
							token: '--text-agentx-greeting-title',
							label: 'Heading size',
						},
						{
							token: '--text-agentx-greeting-title--line-height',
							label: 'Heading line height',
						},
						{
							token: '--font-weight-agentx-greeting-title',
							label: 'Heading weight',
						},
					],
				},
				{
					label: 'Suggestion chips',
					tokens: [
						{
							token: '--color-agentx-suggestion',
							label: 'Fill',
						},
						{
							token: '--color-agentx-suggestion-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-suggestion-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-suggestion-hover',
							label: 'Hover fill',
						},
						{
							token: '--radius-agentx-suggestion',
							label: 'Radius',
						},
					],
				},
				{
					label: 'Scrollbar and top fade',
					tokens: [
						{
							token: '--color-agentx-scrollbar',
							label: 'Scrollbar thumb',
						},
						{
							token: '--spacing-agentx-log-fade',
							label: 'Top fade once scrolled',
						},
					],
				},
			],
		},
		{
			id: 'cards',
			label: 'Cards and sheets',
			top: [
				{
					token: '--color-agentx-cards',
					label: 'Fill',
				},
				{
					token: '--color-agentx-cards-ink',
					label: 'Text',
				},
				{
					token: '--color-agentx-cards-muted',
					label: 'Secondary text and X',
				},
				{
					token: '--color-agentx-cards-border',
					label: 'Border override',
				},
				{
					token: '--radius-agentx-cards',
					label: 'Radius',
				},
				{
					token: '--agentx-cards-shadow',
					label: 'Shadow',
				},
				{
					token: '--color-agentx-cards-primary',
					label: 'Fill',
				},
				{
					token: '--color-agentx-cards-primary-ink',
					label: 'Text',
				},
			],
			parts: [
				{
					label: 'All cards, in the chat and the gutter: box',
					tokens: [
						{
							token: '--color-agentx-notice',
							label: 'Fill',
						},
						{
							token: '--color-agentx-notice-border',
							label: 'Border',
						},
						{
							token: '--agentx-notice-shadow',
							label: 'Shadow',
						},
						{
							token: '--color-agentx-notice-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-notice-muted',
							label: 'Hints, captions, details',
						},
						{
							token: '--radius-agentx-notice',
							label: 'Radius',
						},
						{
							token: '--radius-agentx-notice-row',
							label: 'One-row card radius',
						},
						{
							token: '--text-agentx-notice-body',
							label: 'Text size',
						},
						{
							token: '--text-agentx-notice-body--line-height',
							label: 'Line height',
						},
						{
							token: '--container-agentx-card',
							label: 'Width of cards under a reply',
						},
					],
				},
				{
					label:
						'All cards, in the chat and the gutter: question line and close X',
					tokens: [
						{
							token: '--color-agentx-notice-title-ink',
							label: 'Question or title',
						},
						{
							token: '--font-weight-agentx-notice-title',
							label: 'Title weight override',
						},
						{
							token: '--color-agentx-notice-close',
							label: 'X, Minimize, Skip',
						},
					],
				},
				{
					label:
						'Answer options (question answers, multiple choice, image sources, color rows)',
					tokens: [
						{
							token: '--color-agentx-option',
							label: 'Fill',
						},
						{
							token: '--color-agentx-option-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-option-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-option-hover',
							label: 'Hover fill',
						},
						{
							token: '--radius-agentx-option',
							label: 'Radius',
						},
					],
				},
				{
					label: 'Lists (checklist items, page rows)',
					tokens: [
						{
							token: '--color-agentx-list',
							label: 'Fill',
						},
						{
							token: '--color-agentx-list-ink',
							label: 'Row text',
						},
						{
							token: '--color-agentx-list-border',
							label: 'Outline and dividers',
						},
						{
							token: '--color-agentx-list-hover',
							label: 'Row hover fill',
						},
					],
				},
				{
					label:
						'Round badges (refresh and plugin tip icons, numbered markers)',
					tokens: [
						{
							token: '--color-agentx-badge',
							label: 'Fill',
						},
						{
							token: '--color-agentx-badge-ink',
							label: 'Icon and number',
						},
						{
							token: '--color-agentx-badge-border',
							label: 'Ring',
						},
					],
				},
				{
					label: 'Preview eye while the page shows (confirm card, page rows)',
					tokens: [
						{
							token: '--color-agentx-preview-pressed',
							label: 'Icon and border; the fill is 10% of it',
						},
					],
				},
				{
					label: 'Question card',
					tokens: [
						{
							token: '--color-agentx-question-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-question-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-question-card-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Multiple choice card',
					tokens: [
						{
							token: '--color-agentx-choice-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-choice-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-choice-card-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Checklist card (tick several, Change these)',
					tokens: [
						{
							token: '--color-agentx-checklist-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-checklist-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-checklist-card-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Form card (open and minimized)',
					tokens: [
						{
							token: '--color-agentx-form-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-form-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-form-card-ink',
							label: 'Text and labels',
						},
					],
				},
				{
					label:
						'Confirm card (one-button card: delete, publish, retry, save first, discard)',
					tokens: [
						{
							token: '--color-agentx-confirm-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-confirm-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-confirm-card-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Update notices (WordPress too old, agent update)',
					tokens: [
						{
							token: '--color-agentx-update-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-update-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-update-card-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Error card (offline, too many messages, failed reply)',
					tokens: [
						{
							token: '--color-agentx-error-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-error-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-error-card-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Page choice card',
					tokens: [
						{
							token: '--color-agentx-page-choice-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-page-choice-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-page-choice-card-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Color choice card',
					tokens: [
						{
							token: '--color-agentx-color-choice-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-color-choice-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-color-choice-card-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Color picker card',
					tokens: [
						{
							token: '--color-agentx-color-picker-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-color-picker-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-color-picker-card-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-swatch-check-dark',
							label: 'Check on a light swatch',
						},
						{
							token: '--color-agentx-swatch-check-light',
							label: 'Check on a dark swatch',
						},
					],
				},
				{
					label: 'Image card: its choices, then the picker it turns into',
					tokens: [
						{
							token: '--color-agentx-image-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-image-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-image-card-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-image-card-drop',
							label: 'Outline while a file is dragged over',
						},
					],
				},
				{
					label: 'Report note card',
					tokens: [
						{
							token: '--color-agentx-report-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-report-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-report-card-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Link nudge',
					tokens: [
						{
							token: '--color-agentx-nudge-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-nudge-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-nudge-card-ink',
							label: 'Text and link icon',
						},
						{
							token: '--color-agentx-nudge-card-hover',
							label: 'Hover fill',
						},
					],
				},
				{
					label: 'Refresh card',
					tokens: [
						{
							token: '--color-agentx-refresh-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-refresh-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-refresh-card-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-refresh-card-quote',
							label: 'Quote bar beside the value',
						},
					],
				},
				{
					label: 'Next task card',
					tokens: [
						{
							token: '--color-agentx-task-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-task-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-task-card-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Feedback card (How is the AI Agent doing?)',
					tokens: [
						{
							token: '--color-agentx-feedback-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-feedback-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-feedback-card-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Plugin tip card',
					tokens: [
						{
							token: '--color-agentx-proactive-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-proactive-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-proactive-card-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Action card (Publish, Add to menu)',
					tokens: [
						{
							token: '--color-agentx-action-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-action-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-action-card-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Message too long',
					tokens: [
						{
							token: '--color-agentx-too-long-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-too-long-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-too-long-card-ink',
							label: 'Text and icon',
						},
					],
				},
				{
					label: 'Unsaved changes bar',
					tokens: [
						{
							token: '--color-agentx-unsaved-bar',
							label: 'Fill',
						},
						{
							token: '--color-agentx-unsaved-bar-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-unsaved-bar-ink',
							label: 'Text and icons',
						},
						{
							token: '--color-agentx-unsaved-bar-hover',
							label: 'Hover fill',
						},
						{
							token: '--agentx-unsaved-bar-blur',
							label: 'Blur behind',
						},
						{
							token: '--color-agentx-save',
							label: 'Fill',
						},
						{
							token: '--color-agentx-save-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Someone-viewing and failed-save cards',
					tokens: [
						{
							token: '--color-agentx-presence-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-presence-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-presence-card-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-presence',
							label: 'Pulsing dot',
						},
					],
				},
				{
					label:
						'All design cards: box (design, layout, product, image optimizing, Which part?)',
					tokens: [
						{
							token: '--color-agentx-card',
							label: 'Fill',
						},
						{
							token: '--color-agentx-card-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-card-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-card-muted',
							label: 'Secondary text',
						},
						{
							token: '--radius-agentx-card',
							label: 'Radius',
						},
						{
							token: '--agentx-card-shadow',
							label: 'Shadow',
						},
					],
				},
				{
					label: 'Design card header (the row that folds it)',
					tokens: [
						{
							token: '--color-agentx-card-header',
							label: 'Fill',
						},
						{
							token: '--color-agentx-card-header-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-card-header-hover',
							label: 'Hover fill',
						},
						{
							token: '--color-agentx-card-header-border',
							label: 'Line under the open header',
						},
						{
							token: '--color-agentx-card-chevron',
							label: 'Chevron',
						},
						{
							token: '--color-agentx-card-chevron-hover',
							label: 'Chevron on hover',
						},
					],
				},
				{
					label: 'Design card icon circle',
					tokens: [
						{
							token: '--color-agentx-card-icon',
							label: 'Fill',
						},
						{
							token: '--color-agentx-card-icon-ink',
							label: 'Icon',
						},
						{
							token: '--color-agentx-card-icon-border',
							label: 'Ring',
						},
					],
				},
				{
					label: 'Design card title and subtitle',
					tokens: [
						{
							token: '--color-agentx-card-title-ink',
							label: 'Title',
						},
						{
							token: '--text-agentx-card-title',
							label: 'Title size',
						},
						{
							token: '--text-agentx-card-title--line-height',
							label: 'Title line height',
						},
						{
							token: '--font-weight-agentx-card-title',
							label: 'Title weight',
						},
						{
							token: '--color-agentx-card-subtitle',
							label: 'Subtitle',
						},
					],
				},
				{
					label:
						'Design card tabs (Colors, Fonts, Style, Animation) and the speed row',
					tokens: [
						{
							token: '--color-agentx-design-tabs',
							label: 'Track',
						},
						{
							token: '--color-agentx-design-tabs-ink',
							label: 'Tab text',
						},
						{
							token: '--color-agentx-design-tabs-hover-ink',
							label: 'Tab text on hover',
						},
						{
							token: '--color-agentx-design-tab',
							label: 'Selected tab',
						},
						{
							token: '--color-agentx-design-tab-ink',
							label: 'Selected tab text',
						},
						{
							token: '--agentx-design-tab-shadow',
							label: 'Selected tab shadow',
						},
						{
							token: '--color-agentx-design-tabs-disabled-ink',
							label: 'Speed text while unavailable',
						},
					],
				},
				{
					label:
						"Option tiles (Fonts, Style, Animation; Colors tiles keep each scheme's own fill and text)",
					tokens: [
						{
							token: '--color-agentx-design-option',
							label: 'Fill',
						},
						{
							token: '--color-agentx-design-option-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-design-option-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-design-option-hover-border',
							label: 'Border on hover',
						},
						{
							token: '--radius-agentx-design-option',
							label: 'Radius',
						},
						{
							token: '--color-agentx-design-option-loading',
							label: 'Loading placeholders',
						},
					],
				},
				{
					label: 'Picked check badge',
					tokens: [
						{
							token: '--color-agentx-picked',
							label: 'Fill',
						},
						{
							token: '--color-agentx-picked-ink',
							label: 'Check',
						},
						{
							token: '--color-agentx-picked-rim',
							label: 'Rim',
						},
						{
							token: '--agentx-picked-shadow',
							label: 'Shadow',
						},
					],
				},
				{
					label: 'Layout thumbnails and scroll track',
					tokens: [
						{
							token: '--color-agentx-layout-thumb',
							label: 'Fill while loading',
						},
						{
							token: '--color-agentx-layout-thumb-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-layout-thumb-hover-border',
							label: 'Border on hover',
						},
						{
							token: '--color-agentx-layout-thumb-picked',
							label: 'Border of the picked layout',
						},
						{
							token: '--color-agentx-scroll-track',
							label: 'Scroll track',
						},
						{
							token: '--color-agentx-scroll-thumb',
							label: 'Scroll handle',
						},
						{
							token: '--color-agentx-scroll-thumb-hover',
							label: 'Scroll handle on hover and drag',
						},
					],
				},
				{
					label: 'Product and image optimizing photos',
					tokens: [
						{
							token: '--color-agentx-card-image-border',
							label: 'Photo border',
						},
					],
				},
				{
					label:
						'All sheets: panel (logo, icon and image sheet, Things you can ask for, History, Feedback)',
					tokens: [
						{
							token: '--color-agentx-sheet',
							label: 'Fill',
						},
						{
							token: '--agentx-sheet-shadow',
							label: 'Shadow',
						},
						{
							token: '--color-agentx-sheet-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-sheet-muted',
							label: 'Secondary text, headings, captions',
						},
						{
							token: '--color-agentx-sheet-border',
							label: 'Edge',
						},
						{
							token: '--radius-agentx-sheet',
							label: 'Top corners',
						},
						{
							token: '--color-agentx-sheet-hover',
							label: 'Hover fill',
						},
						{
							token: '--color-agentx-sheet-line',
							label: 'Dividers, outlines, grab handle',
						},
						{
							token: '--color-agentx-sheet-scrim',
							label: 'Over the chat while a sheet is open',
						},
					],
				},
				{
					label: 'Sheet title and close X',
					tokens: [
						{
							token: '--color-agentx-sheet-title-ink',
							label: 'Title',
						},
						{
							token: '--text-agentx-sheet-title',
							label: 'Title size',
						},
						{
							token: '--text-agentx-sheet-title--line-height',
							label: 'Title line height',
						},
						{
							token: '--font-weight-agentx-sheet-title',
							label: 'Title weight',
						},
						{
							token: '--color-agentx-sheet-close',
							label: 'Close X',
						},
					],
				},
				{
					label:
						'Image picker and sheet: grab handle and tabs (Upload, Media library, Stock photos, Generate)',
					tokens: [
						{
							token: '--color-agentx-sheet-handle',
							label: 'Grab handle',
						},
						{
							token: '--color-agentx-sheet-handle-hover',
							label: 'Grab handle on hover',
						},
						{
							token: '--color-agentx-sheet-tab-ink',
							label: 'Tab text',
						},
						{
							token: '--color-agentx-sheet-tab-hover',
							label: 'Tab hover fill',
						},
						{
							token: '--color-agentx-sheet-tab-selected-ink',
							label: 'Selected tab text',
						},
						{
							token: '--color-agentx-sheet-tab-indicator',
							label: 'Selected tab underline',
						},
					],
				},
				{
					label: 'Image picker: upload area',
					tokens: [
						{
							token: '--color-agentx-sheet-upload-border',
							label: 'Dashed outline',
						},
						{
							token: '--color-agentx-sheet-upload-active',
							label: 'Outline while a file is dragged over',
						},
						{
							token: '--color-agentx-sheet-upload-ink',
							label: 'Text and icon',
						},
					],
				},
				{
					label:
						'Sheet fields (search, Describe the image, the / filter, comment)',
					tokens: [
						{
							token: '--color-agentx-sheet-field',
							label: 'Fill',
						},
						{
							token: '--color-agentx-sheet-field-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-sheet-field-border',
							label: 'Border',
						},
					],
				},
				{
					label: 'Image picker: image tiles and Current tag',
					tokens: [
						{
							token: '--color-agentx-sheet-tile',
							label: 'Tile and loading fill',
						},
						{
							token: '--color-agentx-sheet-tile-hover-ring',
							label: 'Ring on hover',
						},
						{
							token: '--color-agentx-sheet-tile-picked',
							label: 'Picked ring',
						},
						{
							token: '--color-agentx-sheet-tag',
							label: 'Current tag fill',
						},
						{
							token: '--color-agentx-sheet-tag-ink',
							label: 'Current tag text',
						},
					],
				},
				{
					label: 'Picker and sheet main buttons (Use image, Generate, Send)',
					tokens: [
						{
							token: '--color-agentx-sheet-primary',
							label: 'Fill',
						},
						{
							token: '--color-agentx-sheet-primary-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Things you can ask for (the / list)',
					tokens: [
						{
							token: '--color-agentx-commands-heading',
							label: 'Group headings and icons',
						},
						{
							token: '--color-agentx-commands-item-ink',
							label: 'Requests',
						},
						{
							token: '--color-agentx-commands-item-active',
							label: 'Highlighted request',
						},
					],
				},
				{
					label: 'History sheet: change rows and tags',
					tokens: [
						{
							token: '--color-agentx-history-row',
							label: 'Row fill',
						},
						{
							token: '--color-agentx-history-row-border',
							label: 'Row border',
						},
						{
							token: '--color-agentx-history-row-ink',
							label: 'Row text and icon',
						},
						{
							token: '--color-agentx-history-icon',
							label: 'Icon circle',
						},
						{
							token: '--color-agentx-history-viewing',
							label:
								'Previewed row, Live, Undone and Viewing tags, End preview',
						},
						{
							token: '--color-agentx-history-current',
							label: 'Current tag fill',
						},
						{
							token: '--color-agentx-history-current-ink',
							label: 'Current tag text',
						},
					],
				},
			],
		},
		{
			id: 'quick-edit',
			label: 'Quick Edit',
			top: [
				{
					token: '--color-agentx-bubble',
					label: 'Fill',
				},
				{
					token: '--color-agentx-bubble-ink',
					label: 'Text and icons',
				},
				{
					token: '--color-agentx-bubble-border',
					label: 'Dividers, field outlines, swatch rings',
				},
				{
					token: '--color-agentx-bubble-hover',
					label: 'Hover fill',
				},
				{
					token: '--color-agentx-bubble-muted',
					label: 'Labels and notes',
				},
				{
					token: '--color-agentx-quick-edit-pressed',
					label: 'On, open and selected fill',
				},
				{
					token: '--agentx-quick-edit-shadow',
					label: 'Shadow',
				},
				{
					token: '--radius-agentx-quick-edit',
					label: 'Bar and popover radius',
				},
				{
					token: '--radius-agentx-quick-edit-control',
					label: 'Buttons, fields, tiles radius',
				},
				{
					token: '--text-agentx-quick-edit',
					label: 'Text size',
				},
				{
					token: '--font-weight-agentx-quick-edit',
					label: 'Buttons, rows and titles weight',
				},
				{
					token: '--agentx-quick-edit-cursor',
					label: 'Cursor over the site',
				},
			],
			parts: [
				{
					label: 'Bubble',
					tokens: [
						{
							token: '--color-agentx-bubble-menu',
							label: 'Fill',
						},
						{
							token: '--radius-agentx-bubble-menu',
							label: 'Radius',
						},
						{
							token: '--agentx-bubble-menu-shadow',
							label: 'Shadow',
						},
					],
				},
				{
					label: 'Bubble rows (Expand, Edit, Send to agent)',
					tokens: [
						{
							token: '--color-agentx-bubble-row-ink',
							label: 'Text and icon',
						},
						{
							token: '--color-agentx-bubble-row-hover',
							label: 'Hover and keyboard fill',
						},
						{
							token: '--color-agentx-bubble-row-muted',
							label: 'Edit translations',
						},
					],
				},
				{
					label:
						'Editing bars (words, price, social, event, calendar, image, section)',
					tokens: [
						{
							token: '--color-agentx-quick-edit-bar',
							label: 'Fill',
						},
						{
							token: '--color-agentx-quick-edit-bar-ink',
							label: 'Text',
						},
						{
							token: '--agentx-quick-edit-bar-shadow',
							label: 'Shadow',
						},
						{
							token: '--color-agentx-quick-edit-divider',
							label: 'Dividers',
						},
						{
							token: '--color-agentx-quick-edit-drag',
							label: 'Drag handle on hover (large cards)',
						},
					],
				},
				{
					label:
						'Popovers off a bar (heading levels, colors, button styles, link results)',
					tokens: [
						{
							token: '--color-agentx-quick-edit-popover',
							label: 'Fill',
						},
						{
							token: '--color-agentx-quick-edit-popover-ink',
							label: 'Text',
						},
					],
				},
				{
					label:
						'Tool buttons (Bold, Italic, Link, Align, Heading level, colors)',
					tokens: [
						{
							token: '--color-agentx-quick-edit-tool-ink',
							label: 'Icons',
						},
						{
							token: '--color-agentx-quick-edit-tool-hover',
							label: 'Hover fill',
						},
						{
							token: '--color-agentx-quick-edit-tool-pressed',
							label: 'On, open or current fill',
						},
					],
				},
				{
					label: 'Color button marks',
					tokens: [
						{
							token: '--color-agentx-quick-edit-text',
							label: 'Text color underline',
						},
						{
							token: '--color-agentx-quick-edit-highlight',
							label: 'Highlight chip',
						},
						{
							token: '--color-agentx-quick-edit-highlight-ink',
							label: 'Letter on the highlight chip',
						},
					],
				},
				{
					label: 'Cancel and plain buttons (Cancel, Apply, Clear, Add choice)',
					tokens: [
						{
							token: '--color-agentx-quick-edit-button-ink',
							label: 'Text and icons',
						},
						{
							token: '--color-agentx-quick-edit-button-hover',
							label: 'Hover fill',
						},
					],
				},
				{
					label: 'Save',
					tokens: [
						{
							token: '--color-agentx-quick-edit-save',
							label: 'Fill',
						},
						{
							token: '--color-agentx-quick-edit-save-ink',
							label: 'Text and spinner',
						},
						{
							token: '--color-agentx-quick-edit-save-hover',
							label: 'Hover fill',
						},
					],
				},
				{
					label:
						'Fields (link, alt text, prompt, price, social, event, dropdowns)',
					tokens: [
						{
							token: '--color-agentx-quick-edit-field',
							label: 'Fill',
						},
						{
							token: '--color-agentx-quick-edit-field-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-quick-edit-field-border',
							label: 'Border',
						},
						{
							token: '--color-agentx-quick-edit-field-focus',
							label: 'Border while typing',
						},
					],
				},
				{
					label: 'List options (button styles, link results)',
					tokens: [
						{
							token: '--color-agentx-quick-edit-option-hover',
							label: 'Pointer or arrow-key fill',
						},
						{
							token: '--color-agentx-quick-edit-option-selected',
							label: 'Current choice fill',
						},
						{
							token: '--color-agentx-quick-edit-option-detail',
							label: "A result's address line",
						},
					],
				},
				{
					label: 'Swatches and slider',
					tokens: [
						{
							token: '--color-agentx-quick-edit-swatch-border',
							label: 'Swatch ring',
						},
						{
							token: '--color-agentx-quick-edit-swatch-picked',
							label: 'Picked swatch outline',
						},
						{
							token: '--radius-agentx-quick-edit-swatch',
							label: 'Swatch shape',
						},
						{
							token: '--color-agentx-quick-edit-slider',
							label: 'Overlay strength slider',
						},
					],
				},
				{
					label: 'Labels, notes and problem messages',
					tokens: [
						{
							token: '--color-agentx-quick-edit-label',
							label: 'Field labels and notes',
						},
						{
							token: '--color-agentx-quick-edit-problem',
							label: 'Failed save or load',
						},
					],
				},
				{
					label: 'Image panel: tabs, tiles, upload area, buttons',
					tokens: [
						{
							token: '--color-agentx-quick-edit-tab-ink',
							label: 'Tab text',
						},
						{
							token: '--color-agentx-quick-edit-tab-hover',
							label: 'Tab hover fill',
						},
						{
							token: '--color-agentx-quick-edit-tab-selected',
							label: 'Selected tab fill',
						},
						{
							token: '--color-agentx-quick-edit-tile',
							label: 'Tile fill while loading',
						},
						{
							token: '--color-agentx-quick-edit-tile-picked',
							label: 'Picked tile border',
						},
						{
							token: '--color-agentx-quick-edit-drop-border',
							label: 'Upload outline',
						},
						{
							token: '--color-agentx-quick-edit-drop-active',
							label: 'Upload outline while dragging',
						},
						{
							token: '--color-agentx-quick-edit-image-button',
							label: 'Fill',
						},
						{
							token: '--color-agentx-quick-edit-image-button-ink',
							label: 'Text',
						},
					],
				},
				{
					label: 'Edit ring',
					tokens: [],
				},
				{
					label: 'Selection box',
					tokens: [
						{
							token: '--color-agentx-selection',
							label: 'Edge',
						},
						{
							token: '--color-agentx-selection-fill',
							label: 'Grain fill',
						},
						{
							token: '--agentx-selection-width',
							label: 'Edge width',
						},
						{
							token: '--agentx-selection-grain',
							label: 'Grain strength',
						},
						{
							token: '--agentx-selection-blur',
							label: 'Blur around the asked part',
						},
						{
							token: '--color-agentx-selection-veil',
							label: 'Veil around the asked part',
						},
					],
				},
			],
		},
		{
			id: 'other',
			label: 'Other',
			top: [
				{
					token: '--color-agentx-site',
					label: 'Site box fill while the site loads',
				},
				{
					token: '--agentx-site-shadow',
					label: 'Site box shadow',
				},
				{
					token: '--radius-agentx-site',
					label: 'Site box radius',
				},
				{
					token: '--color-agentx-site-border',
					label: 'Site box edge',
				},
				{
					token: '--color-agentx-panel-border',
					label: 'Border',
				},
				{
					token: '--agentx-panel-shadow',
					label: 'Shadow',
				},
			],
			parts: [
				{
					label: 'Window gradient',
					tokens: [
						{
							token: '--color-agentx-surface-glow-top-left',
							label: 'Top left glow',
						},
						{
							token: '--color-agentx-surface-glow-top',
							label: 'Top glow',
						},
						{
							token: '--color-agentx-surface-glow-left',
							label: 'Left glow',
						},
						{
							token: '--color-agentx-surface-glow-bottom-left',
							label: 'Bottom left glow',
						},
						{
							token: '--color-agentx-surface-glow-bottom-right',
							label: 'Bottom right glow',
						},
						{
							token: '--color-agentx-surface-base-from',
							label: 'Base gradient start',
						},
						{
							token: '--color-agentx-surface-base-to',
							label: 'Base gradient end',
						},
					],
				},
				{
					label: 'Background shader (in place of the gradient)',
					tokens: [
						{
							token: '--agentx-bg-color-1',
							label: 'Color 1',
						},
						{
							token: '--agentx-bg-color-2',
							label: 'Color 2',
						},
						{
							token: '--agentx-bg-color-3',
							label: 'Color 3',
						},
						{
							token: '--agentx-bg-speed',
							label: 'Speed',
						},
						{
							token: '--agentx-bg-scale',
							label: 'Scale',
						},
						{
							token: '--agentx-bg-intensity',
							label: 'Intensity',
						},
						{
							token: '--agentx-bg-offset-x',
							label: 'Offset X',
						},
						{
							token: '--agentx-bg-offset-y',
							label: 'Offset Y',
						},
					],
				},
				{
					label: 'Page preview on the canvas',
					tokens: [
						{
							token: '--color-agentx-page-preview',
							label: 'Fill while loading',
						},
						{
							token: '--radius-agentx-page-preview',
							label: 'Radius',
						},
						{
							token: '--agentx-page-preview-shadow',
							label: 'Shadow',
						},
					],
				},
				{
					label: 'Desktop and phone switch above the site',
					tokens: [
						{
							token: '--color-agentx-view-switch',
							label: 'Track',
						},
						{
							token: '--color-agentx-view-switch-ink',
							label: 'Icons',
						},
						{
							token: '--color-agentx-view-switch-hover',
							label: 'Hover fill',
						},
						{
							token: '--color-agentx-view-switch-hover-ink',
							label: 'Hover icon',
						},
						{
							token: '--color-agentx-view-switch-active',
							label: 'Selected fill',
						},
						{
							token: '--color-agentx-view-switch-active-ink',
							label: 'Selected icon',
						},
						{
							token: '--agentx-view-switch-active-shadow',
							label: 'Selected shadow',
						},
						{
							token: '--radius-agentx-view-switch',
							label: 'Radius',
						},
					],
				},
				{
					label: 'Switching pages',
					tokens: [
						{
							token: '--color-agentx-veil',
							label: 'Veil',
						},
						{
							token: '--agentx-switch-hold',
							label: 'Shortest time shown',
						},
						{
							token: '--color-agentx-switch-spinner',
							label: 'Spinner head',
						},
						{
							token: '--color-agentx-switch-spinner-mid',
							label: 'Spinner middle',
						},
					],
				},
				{
					label: "Resize grip on the chat's edge",
					tokens: [
						{
							token: '--color-agentx-grip',
							label: 'Line under the pointer',
						},
						{
							token: '--color-agentx-grip-active',
							label: 'Line while dragging or focused',
						},
					],
				},
				{
					label: 'Tooltips (every icon button)',
					tokens: [
						{
							token: '--color-agentx-tooltip',
							label: 'Fill',
						},
						{
							token: '--color-agentx-tooltip-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-tooltip-muted',
							label: 'Shortcut keys',
						},
						{
							token: '--radius-agentx-tooltip',
							label: 'Radius',
						},
						{
							token: '--agentx-tooltip-shadow',
							label: 'Shadow',
						},
						{
							token: '--text-agentx-tooltip-label',
							label: 'Size',
						},
						{
							token: '--text-agentx-tooltip-label--line-height',
							label: 'Line height',
						},
						{
							token: '--animate-agentx-tooltip',
							label: 'Entrance',
						},
					],
				},
				{
					label: 'Phone sheet',
					tokens: [
						{
							token: '--color-agentx-phone-sheet',
							label: 'Fill',
						},
						{
							token: '--radius-agentx-phone-sheet',
							label: 'Top corners',
						},
						{
							token: '--agentx-phone-sheet-shadow',
							label: 'Shadow',
						},
						{
							token: '--color-agentx-phone-sheet-handle',
							label: 'Grab line',
						},
					],
				},
				{
					label: 'Floating wp-admin window',
					tokens: [
						{
							token: '--color-agentx-admin-window-border',
							label: 'Border',
						},
						{
							token: '--agentx-admin-window-shadow',
							label: 'Shadow',
						},
						{
							token: '--radius-agentx-admin-window',
							label: 'Radius',
						},
						{
							token: '--color-agentx-admin-window-drag',
							label: 'Drag handle on hover',
						},
					],
				},
				{
					label: 'Slot bar (under the site, Slot layout)',
					tokens: [
						{
							token: '--color-agentx-panel',
							label: 'Fill',
						},
						{
							token: '--radius-agentx-slot',
							label: 'Radius',
						},
					],
				},
				{
					label: 'Closed agent toolbar',
					tokens: [
						{
							token: '--color-agentx-inverse',
							label: 'Fill',
						},
						{
							token: '--color-agentx-inverse-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-inverse-accent',
							label: 'Link text on hover or focus',
						},
						{
							token: '--color-agentx-inverse-hover',
							label: 'Link fill on hover or focus',
						},
					],
				},
				{
					label: 'Site Guide: heading and progress',
					tokens: [
						{
							token: '--color-agentx-welcome',
							label: 'Heading icon',
						},
						{
							token: '--color-agentx-guide-ink',
							label: 'Text',
						},
						{
							token: '--color-agentx-guide-muted',
							label: 'Count, descriptions, caret, notes',
						},
						{
							token: '--text-agentx-guide-title',
							label: 'Heading size',
						},
						{
							token: '--text-agentx-guide-title--line-height',
							label: 'Heading line height',
						},
						{
							token: '--font-weight-agentx-guide-title',
							label: 'Heading and step title weight',
						},
						{
							token: '--color-agentx-guide-progress',
							label: 'Progress ring',
						},
						{
							token: '--color-agentx-guide-progress-track',
							label: 'Progress ring track',
						},
						{
							token: '--color-agentx-guide-progress-ink',
							label: 'Check on a finished guide',
						},
					],
				},
				{
					label: 'Site Guide: step rows, circles and connector',
					tokens: [
						{
							token: '--color-agentx-guide-step-hover',
							label: 'Row hover fill',
						},
						{
							token: '--color-agentx-guide-step-done-ink',
							label: 'Done step title',
						},
						{
							token: '--color-agentx-guide-idle-ink',
							label: 'Step title while another step is open',
						},
						{
							token: '--radius-agentx-guide-step',
							label: 'Row and open step radius',
						},
						{
							token: '--color-agentx-guide-circle',
							label: 'Step circle fill',
						},
						{
							token: '--color-agentx-guide-circle-ink',
							label: 'Step circle icon',
						},
						{
							token: '--color-agentx-guide-circle-border',
							label: 'Step circle ring',
						},
						{
							token: '--color-agentx-guide-circle-done',
							label: 'Done circle fill',
						},
						{
							token: '--color-agentx-guide-line',
							label: 'Dashed connector',
						},
					],
				},
				{
					label: 'Site Guide: open step card and its buttons',
					tokens: [
						{
							token: '--color-agentx-guide-step',
							label: 'Fill',
						},
						{
							token: '--color-agentx-guide-step-border',
							label: 'Border',
						},
						{
							token: '--agentx-guide-step-shadow',
							label: 'Shadow',
						},
						{
							token: '--color-agentx-guide-next',
							label: 'Next and Save fill',
						},
						{
							token: '--color-agentx-guide-next-ink',
							label: 'Next and Save text',
						},
					],
				},
				{
					label: 'Site Guide: fields, domain list, design tiles',
					tokens: [
						{
							token: '--color-agentx-guide-field',
							label: 'Field fill',
						},
						{
							token: '--color-agentx-guide-list',
							label: 'Domain list fill',
						},
						{
							token: '--color-agentx-guide-list-border',
							label: 'Domain list outline and dividers',
						},
						{
							token: '--color-agentx-tile-border',
							label: 'Design tile edge',
						},
						{
							token: '--color-agentx-tile-hover-border',
							label: 'Design tile edge on hover',
						},
						{
							token: '--color-agentx-tile-picked',
							label: 'Picked design tile edge',
						},
						{
							token: '--color-agentx-guide-speed-ink',
							label: 'Animation speed text',
						},
					],
				},
				{
					label: 'Site Guide: logo and icon drop zone',
					tokens: [
						{
							token: '--color-agentx-drop-zone-border',
							label: 'Dashed outline',
						},
						{
							token: '--color-agentx-drop-zone-active',
							label: 'Outline while dragging or pressed',
						},
						{
							token: '--color-agentx-drop-zone-hover',
							label: 'Hover and drag-over fill',
						},
					],
				},
				{
					label: 'Store guide',
					tokens: [
						{
							token: '--color-agentx-guide-divider',
							label: 'Product list dividers',
						},
						{
							token: '--color-agentx-guide-link',
							label: 'WooCommerce links',
						},
						{
							token: '--color-agentx-guide-danger-ink',
							label: 'Remove? confirm',
						},
					],
				},
			],
		},
	],
};

export const TREE_TOKENS = [
	...TOKEN_TREE.general.flatMap(({ tokens }) => tokens),
	...TOKEN_TREE.groups.flatMap(({ top, parts }) => [
		...top,
		...parts.flatMap(({ tokens }) => tokens),
	]),
].map(({ token }) => token);

// Declared nowhere on purpose: each child reads var(--override, its own value), so unset changes nothing.
export const OVERRIDES = [
	'--color-agentx-border',
	'--agentx-shadow',
	'--font-weight-agentx-title',
	'--agentx-disabled-opacity',
	'--color-agentx-cards-border',
	'--font-weight-agentx-notice-title',
];

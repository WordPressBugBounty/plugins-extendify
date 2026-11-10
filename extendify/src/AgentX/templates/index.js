import { Flush } from './Flush';
import { Slot } from './Slot';

// A template only arranges parts the shell built, so none can drop the frame's link rules.
export const SHELL_TEMPLATES = {
	flush: { label: 'Flush', Template: Flush },
	slot: { label: 'Slot below the site', Template: Slot },
};

export const ACTIVE_SHELL_TEMPLATE = 'flush';

// An unknown name falls back to the shipped layout, or an old config draws blank.
export const templateFor = (name) =>
	(SHELL_TEMPLATES[name] ?? SHELL_TEMPLATES[ACTIVE_SHELL_TEMPLATE]).Template;

export const HEADER_TEMPLATES = {
	beside: { label: 'Toggle and bell beside the logo', onBar: true },
	end: { label: 'Toggle and bell right of the chat', onBar: false },
};

// Right of the chat, where the default Flush layout keeps them too.
export const ACTIVE_HEADER_TEMPLATE = 'end';

export const headerFor = (name) =>
	HEADER_TEMPLATES[name] ?? HEADER_TEMPLATES[ACTIVE_HEADER_TEMPLATE];

// What leads the top bar over the chat, and what sits where the chat meets the site.
export const BAR_TEMPLATES = {
	partner: { label: 'Partner logo, then toggle and bell' },
	agent: { label: 'AI Agent, then toggle, bell and partner logo' },
};

export const ACTIVE_BAR_TEMPLATE = 'partner';

export const ACTIONS_TEMPLATES = {
	menu: { label: 'More menu' },
	spread: { label: 'Each link on the bar' },
};

export const ACTIVE_ACTIONS_TEMPLATE = 'menu';

// Where the site's bottom-bar notification shows while the agent is open.
export const NOTIFICATIONS_TEMPLATES = {
	default: { label: 'Default' },
	slot: { label: 'Slot below the site' },
};

export const ACTIVE_NOTIFICATIONS_TEMPLATE = 'default';

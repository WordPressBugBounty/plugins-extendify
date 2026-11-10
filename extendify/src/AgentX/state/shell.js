import { ACTIVE_SPINNER } from '@agentx/spinner/shaders';
import {
	ACTIVE_ACTIONS_TEMPLATE,
	ACTIVE_BAR_TEMPLATE,
	ACTIVE_HEADER_TEMPLATE,
	ACTIVE_NOTIFICATIONS_TEMPLATE,
	ACTIVE_SHELL_TEMPLATE,
} from '@agentx/templates';
import { create } from 'zustand';

const MINIMIZED = 'extendify-agentx-minimized';

// Not a cookie: frame pages vary on cookies, so toggling one would empty their cache.
const remember = (minimized) => {
	try {
		if (minimized) window.localStorage.setItem(MINIMIZED, '1');
		else window.localStorage.removeItem(MINIMIZED);
	} catch {
		// Blocked storage only costs the state across a refresh.
	}
};

const startsMinimized = () => {
	// The closed page's open link asks for the chat.
	if (
		new URLSearchParams(window.location.search).get('extendify-agent-chat') ===
		'open'
	) {
		remember(false);
		return false;
	}
	try {
		return window.localStorage.getItem(MINIMIZED) === '1';
	} catch {
		return false;
	}
};

export const forgetMinimized = () => remember(false);

const CHAT_SCALE = 'extendify-agentx-chat-scale';

const rememberScale = (scale) => {
	try {
		if (scale) window.localStorage.setItem(CHAT_SCALE, String(scale));
		else window.localStorage.removeItem(CHAT_SCALE);
	} catch {
		// Blocked storage only costs the width across a refresh.
	}
};

const savedScale = () => {
	try {
		return Number(window.localStorage.getItem(CHAT_SCALE)) || null;
	} catch {
		return null;
	}
};

const AUTOSAVE = 'extendify-agentx-autosave';

const savedOn = (key) => {
	try {
		return window.localStorage.getItem(key) !== '0';
	} catch {
		return true;
	}
};

const rememberOn = (key, on) => {
	try {
		window.localStorage.setItem(key, on ? '1' : '0');
	} catch {
		// Blocked storage only costs the choice across a refresh.
	}
};

// The partner's design from the Designer; each template falls back to the shipped one by name.
const design = window.extAgentXData?.design ?? {};
const templates = design.templates ?? {};

export const useShellStore = create((set) => ({
	template: templates.template ?? ACTIVE_SHELL_TEMPLATE,
	setTemplate: (template) => set({ template }),
	header: templates.header ?? ACTIVE_HEADER_TEMPLATE,
	setHeader: (header) => set({ header }),
	bar: templates.bar ?? ACTIVE_BAR_TEMPLATE,
	setBar: (bar) => set({ bar }),
	actions: templates.actions ?? ACTIVE_ACTIONS_TEMPLATE,
	setActions: (actions) => set({ actions }),
	notifications: templates.notifications ?? ACTIVE_NOTIFICATIONS_TEMPLATE,
	setNotifications: (notifications) => set({ notifications }),
	spinner: design.spinner ?? ACTIVE_SPINNER,
	setSpinner: (spinner) => set({ spinner, spinnerSource: null }),
	spinnerSource: design.spinnerSource ?? null,
	backdrop: design.shader ?? null,
	setSpinnerSource: (spinnerSource) => set({ spinnerSource }),
	// A demo state the chat shows in place of the conversation.
	chatDemo: null,
	setChatDemo: (chatDemo) => set({ chatDemo }),
	canvasTool: null,
	setCanvasTool: (canvasTool) => set({ canvasTool }),
	// From a switch's first load to its last, even after its blur fades.
	siteLoading: false,
	canvasBar: false,
	changesOpen: false,
	// The button that opened the list of changes, which takes focus back when it closes.
	changesFrom: null,
	setChangesOpen: (changesOpen) => set({ changesOpen }),
	// On unless turned off, so a change goes live once the agent's turn ends.
	autosave: savedOn(AUTOSAVE),
	setAutosave: (autosave) => {
		rememberOn(AUTOSAVE, autosave);
		set({ autosave });
	},
	siteView: 'desktop',
	setSiteView: (siteView) => set({ siteView }),
	// Set by the shell from the window's width, for parts that leave features out on a phone.
	phone: false,
	// Kept here, since switching templates remounts the toolbar.
	devToolView: null,
	// Closing the demo puts the live chat back.
	setDevToolView: (devToolView) =>
		set({ devToolView, ...(devToolView !== 'demo' && { chatDemo: null }) }),
	// Null means the default width for the window.
	chatScale: savedScale(),
	setChatScale: (chatScale) => {
		rememberScale(chatScale);
		set({ chatScale });
	},
	minimized: startsMinimized(),
	setMinimized: (minimized) => {
		remember(minimized);
		set({ minimized });
	},
}));

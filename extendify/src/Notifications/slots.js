import { Bar } from './templates/Bar';
import { Card } from './templates/Card';
import { Pill } from './templates/Pill';

export const SLOTS = {
	ADMIN_DASHBOARD: 'admin-dashboard',
	ADMIN_OTHERS: 'admin-others',
	ADMIN_ASSIST: 'admin-assist',
	AGENT_CHAT: 'agent-chat',
	FRONTEND_BOTTOM: 'frontend-bottom',
	FRONTEND_TOPBAR: 'frontend-topbar',
};

// agent-chat is null because the Agent renders it as a chat suggestion.
const TEMPLATES = {
	[SLOTS.ADMIN_DASHBOARD]: Card,
	[SLOTS.ADMIN_OTHERS]: Card,
	[SLOTS.ADMIN_ASSIST]: Card,
	[SLOTS.AGENT_CHAT]: null,
	[SLOTS.FRONTEND_BOTTOM]: Bar,
	[SLOTS.FRONTEND_TOPBAR]: Pill,
};

export const templateFor = (slot) => TEMPLATES[slot] ?? null;

// Deciding this inside Pill would count a view for a pill that never rendered.
const REQUIREMENTS = {
	[SLOTS.FRONTEND_TOPBAR]: (notification, href) =>
		Boolean(notification['cta-label'] && href),
};

export const fillsSlot = (slot, notification, href) =>
	REQUIREMENTS[slot]?.(notification, href) ?? true;

// The pill stays as the persistent reminder after the bar is dismissed.
const DISMISSAL_EXEMPT = [SLOTS.FRONTEND_TOPBAR];

export const ignoresDismissal = (slot) => DISMISSAL_EXEMPT.includes(slot);

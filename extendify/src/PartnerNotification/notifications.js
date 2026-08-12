import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const storage = {
	setItem: (_name, store) =>
		apiFetch({
			path: '/extendify/v1/shared/update-user-meta',
			method: 'POST',
			data: {
				option: 'notifications',
				value: {
					dismissed: store.state.dismissed,
					viewed: store.state.viewed,
				},
			},
		}),
};

const state = (set, get) => ({
	dismissed: window.extSharedData?.notifications?.dismissed ?? [],
	viewed: window.extSharedData?.notifications?.viewed ?? [],
	isDismissedBanner: (slug) =>
		get().dismissed.some((banner) => banner.slug === slug),
	dismissBanner: (slug) => {
		if (get().isDismissedBanner(slug)) return;
		set((current) => ({
			dismissed: [
				...current.dismissed,
				{ slug, dismissedAt: new Date().toISOString() },
			],
		}));
	},
	hasViewedNotification: (slug, slot, page) =>
		get().viewed.some(
			(view) => view.slug === slug && view.slot === slot && view.page === page,
		),
	recordNotificationView: (slug, slot, page) => {
		if (get().hasViewedNotification(slug, slot, page)) return;
		set((current) => ({
			viewed: [
				...current.viewed,
				{ slug, slot, page, viewedAt: new Date().toISOString() },
			],
		}));
	},
});

export const useNotificationsStore = create(
	persist(devtools(state, { name: 'Extendify Notifications' }), {
		name: 'extendify-notifications',
		storage,
		skipHydration: true,
	}),
);

import { create } from 'zustand';

// The page the site frame shows, as its head describes it.
export const usePageStore = create(() => ({ page: undefined }));

import { setupSuggestions } from '@agentx/chat/suggestions';
import { isLive, STEPS } from '@agentx/guide/steps';
import { shownStoreSteps, storeStepDone } from '@agentx/guide/store/StoreGuide';
import { offered } from '@agentx/lib/guide';
import { ACTED, readHistory } from '@agentx/lib/nudges';
import { useChangedStore } from '@agentx/state/changed';
import { useGuideStore } from '@agentx/state/guide';
import { useImagesStore } from '@agentx/state/images';
import { useSettingsStore } from '@agentx/state/settings';
import { useStoreGuideStore } from '@agentx/state/store-guide';

export const STORE_NUDGE = 'store-nudge';

export const siteFacts = () => {
	const settings = useSettingsStore.getState();
	const { logo, icon } = useImagesStore.getState();
	return {
		logo: Boolean(logo),
		icon: Boolean(icon),
		tagline: Boolean(settings.description?.trim()),
		live: isLive(settings),
		store: !storeUnfinished(),
		'sample-phone': Boolean(window.extAgentXData?.samplePhone),
		guide: guideComplete(useGuideStore.getState().steps),
	};
};

// A design part still as built, and its card never answered, as the backend's setup nudges say.
const untouched =
	(part, id) =>
	({ changed, history }) =>
		!changed[part] && !history[id]?.interactedAt;

const NEEDS = {
	'setup-logo': ({ facts }) => !facts.logo,
	'setup-icon': ({ facts }) => !facts.icon,
	'setup-tagline': ({ facts }) => !facts.tagline,
	'setup-publish': ({ facts }) => !facts.live,
	'setup-colors': untouched('colors', 'setup-colors'),
	'setup-fonts': untouched('fonts', 'setup-fonts'),
	'setup-style': untouched('vibe', 'setup-style'),
	'setup-animation': (context) =>
		Boolean(window.extAgentXData?.animations) &&
		untouched('animation', 'setup-animation')(context),
};

// The Site Guide's skipped parts wait for the user's next session, so a new site starts with an empty bell.
export const outstandingNudges = () => {
	if ((window.extAgentXData?.session?.number ?? 1) < 2) return [];
	const context = {
		facts: siteFacts(),
		changed: useChangedStore.getState(),
		history: readHistory(),
	};
	return setupSuggestions().filter(({ id }) => NEEDS[id]?.(context));
};

export const onShop = (page) => ['shop', 'product'].includes(page?.kind);

export const storeUnfinished = () => {
	const store = useStoreGuideStore.getState();
	return (
		Boolean(store.available) &&
		!shownStoreSteps().every(({ id }) => storeStepDone(store, id))
	);
};

export const guideComplete = (steps) =>
	steps.finished === 'done' ||
	STEPS.filter(({ id }) => offered(id)).every(({ id }) => steps[id] === 'done');

// With the Site Guide done on a site that sells, the store guide is next, until it's done or turned down.
export const storeGuideDue = () => {
	const store = useStoreGuideStore.getState();
	if (!store.available) return false;
	const guideDone = guideComplete(useGuideStore.getState().steps);
	const storeDone = shownStoreSteps().every(({ id }) =>
		storeStepDone(store, id),
	);
	const history = readHistory()[STORE_NUDGE];
	return (
		guideDone && !storeDone && !history?.calledAt && !history?.interactedAt
	);
};

// A store site's setup joins the bell once the user does something other than start it.
export const storeNotified = () => {
	const store = useStoreGuideStore.getState();
	return (
		Boolean(store.available) &&
		Boolean(readHistory()[ACTED]?.since) &&
		!shownStoreSteps().every(({ id }) => storeStepDone(store, id))
	);
};

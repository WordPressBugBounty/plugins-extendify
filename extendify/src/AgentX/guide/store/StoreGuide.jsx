import { CAPTION } from '@agentx/chat/styles';
import { progressOf, Ring, Step } from '@agentx/guide/Guide';
import { StorefrontIcon } from '@agentx/guide/icons';
import { STORE_STEPS } from '@agentx/guide/store/steps';
import {
	markStoreDone,
	refreshStore,
	reportFinished,
} from '@agentx/lib/store-guide';
import { useStoreGuideStore } from '@agentx/state/store-guide';
import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Starter products from the site's build count as there, but only the user's own pass makes them theirs.
const DETECTED = ['details', 'payments', 'tax', 'shipping', 'open'];

export const shownStoreSteps = () =>
	STORE_STEPS.filter((step) => step.shown?.() ?? true);

export const storeStepDone = ({ steps = {}, has = {} }, id) =>
	steps[id] === 'done' || (DETECTED.includes(id) && Boolean(has[id]));

const finish = async () => {
	const store = await refreshStore();
	const skipped = shownStoreSteps().some(
		({ id }) => DETECTED.includes(id) && !store.has?.[id],
	);
	await reportFinished({ skipped });
	useStoreGuideStore.setState({ finishedAt: Date.now() });
};

export const StoreGuide = ({ chat }) => {
	const id = useId();
	const store = useStoreGuideStore();
	const shown = shownStoreSteps();
	const isDone = ({ id: step }) => storeStepDone(store, step);
	const done = shown.filter(isDone).length;
	const openId =
		store.step === undefined
			? shown.find((step) => !isDone(step))?.id
			: store.step;

	// WooCommerce turned off, or a user who can't manage it, leaves a guide put in earlier with nothing to do.
	if (!store.available) {
		return (
			<p className={`m-0 ${CAPTION}`}>
				{
					// translators: Shown in the AI Agent's chat in place of its store setup guide once WooCommerce is turned off.
					__('Store setup needs WooCommerce turned on.', 'extendify-local')
				}
			</p>
		);
	}

	return (
		<section
			data-agentx-guide
			aria-labelledby={`${id}-title`}
			className="flex flex-col text-agentx-body text-agentx-guide-ink"
		>
			<div className="flex flex-col gap-1.5 pb-4">
				<h2 className="m-0 flex items-center gap-2 text-agentx-guide-title font-agentx-guide-title">
					<StorefrontIcon className="size-5 shrink-0 text-agentx-welcome" />
					<span>
						{
							// translators: Heading in the AI Agent's chat over its WooCommerce store setup guide.
							__('Set up your store', 'extendify-local')
						}
					</span>
				</h2>
				<p className="m-0">
					{
						// translators: Shown in the AI Agent's chat under the heading of its WooCommerce store setup guide.
						__(
							'A few steps get your store ready to sell. Skip any you don’t need.',
							'extendify-local',
						)
					}
				</p>
			</div>
			<div className="flex items-center gap-2 pb-3">
				<Ring done={done} total={shown.length} />
				<p id={`${id}-title`} className="m-0 flex-1 font-semibold">
					{
						// translators: Heading of the AI Agent's WooCommerce store setup guide, a list of steps to get the store ready.
						__('Complete store setup', 'extendify-local')
					}
				</p>
				<span className={`shrink-0 tabular-nums ${CAPTION}`}>
					{progressOf(done, shown.length)}
				</span>
			</div>
			<ol className="m-0 flex list-none flex-col gap-1 p-0">
				{shown.map((step, at) => (
					<Step
						key={step.id}
						step={step}
						done={isDone(step)}
						open={step.id === openId}
						last={at === shown.length - 1}
						chat={chat}
						scrolls={store.step !== undefined}
						onToggle={() =>
							useStoreGuideStore.setState({
								step: step.id === openId ? null : step.id,
							})
						}
						onDone={async () => {
							await markStoreDone(step.id);
							refreshStore().catch(() => {});
							const left = shown
								.slice(at + 1)
								.find((next) => !isDone(next))?.id;
							useStoreGuideStore.setState({ step: left ?? null });
							const state = useStoreGuideStore.getState();
							if (shown.every(({ id: each }) => storeStepDone(state, each))) {
								finish().catch(() => {});
							}
						}}
					/>
				))}
			</ol>
		</section>
	);
};

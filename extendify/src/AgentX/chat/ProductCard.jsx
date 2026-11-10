import { InlineCard } from '@agentx/chat/InlineCard';
import { CARD_PRIMARY, PRESS } from '@agentx/chat/styles';
import { runAbility, useProductsStore } from '@agentx/lib/abilities';
import { previewable, showInFrame } from '@agentx/lib/pages';
import { plainText } from '@agentx/lib/plugins';
import { useGutterStore } from '@agentx/state/gutter';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { store } from '@wordpress/icons';
import { addQueryArgs } from '@wordpress/url';

const BUTTON = `agentx-focus shrink-0 rounded-agentx-control border border-solid border-agentx-button-border bg-agentx-button px-3 py-[5px] text-agentx-body font-agentx-button text-agentx-button-ink no-underline ${PRESS} hover:bg-agentx-button-hover`;

// WooCommerce sends a bare decimal, and its symbol as an HTML entity.
const priceOf = ({
	price,
	regular_price: regular,
	currency,
	currency_symbol,
}) => {
	const amount = price || regular;
	if (!amount) return '';
	try {
		return new Intl.NumberFormat(document.documentElement.lang || undefined, {
			style: 'currency',
			currency,
		}).format(Number(amount));
	} catch {
		return `${plainText(currency_symbol)}${amount}`;
	}
};

const failed = () => ({
	// translators: Shown in the AI Agent's chat when publishing a product or turning it back into a draft didn't work.
	text: __("That didn't work. Please try again.", 'extendify-local'),
	// translators: Button that tries a failed change to a product's status again, in the AI Agent's chat.
	button: __('Retry', 'extendify-local'),
});

// Changes at once, as the page card does; only a failure asks, with Retry in the gutter.
const useStatus = (part, product) => {
	const [busy, setBusy] = useState(false);
	const waiting = useGutterStore(
		(state) => state.card?.from === part.toolCallId,
	);
	const inGutter = (card) =>
		useGutterStore.setState({
			card: card && { ...card, from: part.toolCallId },
		});
	const change = async (status) => {
		if (part.demoState) return;
		setBusy(true);
		const asked = useGutterStore.getState().card;
		if (asked?.from === part.toolCallId) inGutter({ ...asked, busy: true });
		try {
			await runAbility(
				'woocommerce/product-update',
				{ id: product.id, status },
				{ confirm: false },
			);
			if (useGutterStore.getState().card?.from === part.toolCallId) {
				inGutter(null);
			}
		} catch {
			inGutter({ ...failed(), onPress: () => change(status) });
		} finally {
			setBusy(false);
		}
	};
	return {
		busy: busy || waiting,
		waiting,
		toggle: () => change(product.status === 'publish' ? 'draft' : 'publish'),
	};
};

export const ProductCard = ({ part, takesFocus }) => {
	const made = part.state === 'output-available' && part.output?.product;
	const changed = useProductsStore((state) => made && state[made.id]);
	const status = useStatus(part, { ...made, ...changed });
	if (!made) return null;
	const product = { ...made, ...changed };
	const image = product.images?.[0]?.url;
	// Its result has no descriptions, so they come from what ran, which the user may have edited.
	const sent = part.output.input ?? part.input;
	const about = plainText(sent?.short_description || sent?.description);
	const adminUrl = window.extSharedData?.adminUrl;

	return (
		<InlineCard
			latest
			takesFocus={takesFocus}
			icon={store}
			title={product.name}
			subtitle={
				product.deleted
					? // translators: Shown on the AI Agent's card for a product it added to the store, once the chat deleted that product.
						__('Deleted', 'extendify-local')
					: priceOf(product)
			}
		>
			{(image || about) && (
				<div className="flex items-start gap-3">
					{image && (
						<img
							src={image}
							alt=""
							className="m-0 size-16 shrink-0 rounded-agentx-control border border-solid border-agentx-card-image-border object-cover"
						/>
					)}
					{about && (
						<p className="m-0 line-clamp-3 min-w-0 flex-1 text-agentx-body text-agentx-card-muted">
							{about}
						</p>
					)}
				</div>
			)}
			{!product.deleted && (
				<div className="flex flex-wrap gap-2">
					{product.permalink && (
						<button
							type="button"
							onClick={() =>
								showInFrame(previewable(product.permalink, product.status))
							}
							className={BUTTON}
						>
							{
								// translators: Button on the AI Agent's card for a product it added to the store; shows the product's page on the site beside the chat.
								__('View product', 'extendify-local')
							}
						</button>
					)}
					{adminUrl && (
						<a
							href={addQueryArgs(`${adminUrl}post.php`, {
								post: product.id,
								action: 'edit',
							})}
							target="_blank"
							rel="noopener noreferrer"
							className={BUTTON}
						>
							{
								// translators: Link on the AI Agent's card for a product it added to the store; opens the product in the WordPress editor in a new tab.
								__('Edit product', 'extendify-local')
							}
						</a>
					)}
					{['publish', 'draft', 'pending', 'private'].includes(
						product.status,
					) && (
						<button
							type="button"
							aria-disabled={status.busy}
							onClick={() => !status.busy && status.toggle()}
							className={`ms-auto ${CARD_PRIMARY}`}
						>
							{product.status === 'publish'
								? // translators: Button on the AI Agent's card for a WooCommerce product; turns the published product back into a draft that shoppers can't see.
									__('Make Draft', 'extendify-local')
								: // translators: Button on the AI Agent's card for a WooCommerce product; publishes it so shoppers can see and buy it.
									__('Publish', 'extendify-local')}
						</button>
					)}
				</div>
			)}
		</InlineCard>
	);
};

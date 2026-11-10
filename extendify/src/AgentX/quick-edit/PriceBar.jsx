import { loadProduct, updateProduct } from '@agentx/lib/products';
import { shellDocument } from '@agentx/lib/shell-document';
import { track } from '@agentx/lib/track';
import { FIELD, SaveButtons, SURFACE } from '@agentx/quick-edit/controls';
import { useBesidePart } from '@agentx/quick-edit/place';
import { quietPage } from '@agentx/quick-edit/quiet-page';
import { createPortal, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Variable and grouped products take their prices from their options or the products in them.
const OWN_PRICE = ['simple', 'external'];

// A price typed in any notation, as the decimal Woo keeps; null when it isn't a price.
export const decimalOf = (typed) => {
	if (!typed.trim()) return '';
	const plain = typed.replace(/[^\d.,]/g, '');
	// Two digits or fewer after the last mark are cents; three are thousands.
	const cents = plain.match(/[.,](\d{1,2})$/);
	const whole = (cents ? plain.slice(0, -cents[0].length) : plain).replace(
		/[.,]/g,
		'',
	);
	if (!/^\d*$/.test(whole) || (!whole && !cents)) return null;
	return cents ? `${whole || '0'}.${cents[1]}` : whole;
};

const PriceField = ({ label, value, onChange, symbol, field }) => (
	<label className="flex items-center gap-1.5 text-agentx-quick-edit">
		<span className="shrink-0 text-agentx-quick-edit-label">{label}</span>
		<span className="relative flex items-center">
			{symbol && (
				<span
					aria-hidden="true"
					className="pointer-events-none absolute left-2 text-agentx-quick-edit-label"
				>
					{symbol}
				</span>
			)}
			<input
				ref={field}
				value={value}
				inputMode="decimal"
				onChange={(event) => onChange(event.target.value)}
				className={`${FIELD} w-24 ${symbol ? 'pl-5' : ''}`}
			/>
		</span>
	</label>
);

export const PriceBar = ({
	target,
	changed,
	commit = { current: null },
	onDone,
	onFailed,
	failed = null,
}) => {
	const { block, product } = target;
	const bar = useRef(null);
	const first = useRef(null);
	const [was, setWas] = useState(null);
	const [regular, setRegular] = useState('');
	const [sale, setSale] = useState('');
	const [problem, setProblem] = useState(failed);
	const [symbol] = useState(
		() =>
			block
				.querySelector('.woocommerce-Price-currencySymbol')
				?.textContent.trim() ?? '',
	);
	const own = OWN_PRICE.includes(was?.type);
	changed.current = () =>
		own &&
		(regular !== (was.regular_price ?? '') || sale !== (was.sale_price ?? ''));

	useEffect(() => {
		let current = true;
		loadProduct(product)
			.then((got) => {
				if (!current) return;
				setWas(got);
				setRegular(got.regular_price ?? '');
				setSale(got.sale_price ?? '');
			})
			.catch(
				() =>
					current &&
					setProblem(
						// translators: Shown in Quick Edit when a product's prices couldn't be read from the user's store.
						__("Couldn't load this product.", 'extendify-local'),
					),
			);
		return () => {
			current = false;
		};
	}, [product]);

	useEffect(() => {
		if (own) first.current?.select();
	}, [own]);

	useEffect(() => {
		const quiet = quietPage(block, { typed: false });
		return () => {
			quiet();
		};
	}, [block]);

	useBesidePart(bar, block, { inView: true });

	const save = async () => {
		if (!own) {
			onDone();
			return;
		}
		const price = decimalOf(regular);
		const offer = decimalOf(sale);
		if (price === null || offer === null) {
			// translators: Shown in Quick Edit when a typed price isn't a number, like 12.50.
			setProblem(
				__('Type each price as a number, like 12.50.', 'extendify-local'),
			);
			return;
		}
		if (offer && (!price || Number(offer) >= Number(price))) {
			setProblem(
				// translators: Shown in Quick Edit when the product's sale price isn't below its regular price.
				__('The sale price has to be lower than the price.', 'extendify-local'),
			);
			return;
		}
		if (price === was.regular_price && offer === was.sale_price) {
			onDone();
			return;
		}
		onDone();
		try {
			// Woo keeps the two as a pair, so both go.
			await updateProduct(product, { regular_price: price, sale_price: offer });
			track('quick-edit-saved', { kind: 'price' });
		} catch (error) {
			onFailed?.(
				error?.message ||
					// translators: Shown in Quick Edit when saving a product's price failed.
					__("Couldn't save it. Please try again.", 'extendify-local'),
			);
		}
	};
	commit.current = save;

	const keys = useRef(null);
	keys.current = (event) => {
		// Escape or Enter typed in the chat box mustn't cancel or save the price.
		if (!bar.current?.contains(event.target)) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onDone();
		}
		if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
			event.preventDefault();
			save();
		}
	};
	useEffect(() => {
		const listen = (event) => keys.current(event);
		document.addEventListener('keydown', listen);
		return () => document.removeEventListener('keydown', listen);
	}, []);

	return createPortal(
		<div
			ref={bar}
			data-agentx-editor=""
			role="toolbar"
			// translators: Screen reader name for Quick Edit's bar over a product's price in the user's online store.
			aria-label={__('Product price', 'extendify-local')}
			className={`group fixed top-0 left-0 z-100002 flex max-w-[calc(100vw-1rem)] flex-col gap-1 rounded-agentx-quick-edit p-1 ${SURFACE}`}
		>
			<div className="flex flex-wrap items-center gap-3 pl-2">
				{own && (
					<>
						<PriceField
							field={first}
							// translators: Label of the field in Quick Edit for a product's regular price.
							label={__('Price', 'extendify-local')}
							value={regular}
							onChange={setRegular}
							symbol={symbol}
						/>
						<PriceField
							// translators: Label of the field in Quick Edit for a product's sale price; left empty, the product isn't on sale.
							label={__('Sale price', 'extendify-local')}
							value={sale}
							onChange={setSale}
							symbol={symbol}
						/>
					</>
				)}
				{was && !own && (
					<span className="max-w-64 text-agentx-quick-edit">
						{
							// translators: Shown in Quick Edit over the price of a product whose price comes from its options, like sizes, or from the products grouped in it.
							__(
								'This price comes from the options in this product, so it can’t be changed here.',
								'extendify-local',
							)
						}
					</span>
				)}
				{!was && !problem && (
					<span className="text-agentx-quick-edit text-agentx-quick-edit-label">
						{
							// translators: Shown in Quick Edit's price bar while the product's prices load.
							__('Loading…', 'extendify-local')
						}
					</span>
				)}
				<SaveButtons onCancel={onDone} onSave={save} />
			</div>
			{problem && (
				<p
					role="alert"
					className="m-0 px-2 pb-1 text-agentx-quick-edit text-agentx-quick-edit-problem"
				>
					{problem}
				</p>
			)}
		</div>,
		shellDocument().body,
	);
};

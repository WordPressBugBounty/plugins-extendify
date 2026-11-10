import { ImageThumb } from '@agentx/chat/ImageThumb';
import {
	GHOST_SMALL,
	GUIDE_CAPTION,
	OUTLINED_SMALL,
} from '@agentx/chat/styles';
import {
	CardIcon,
	DoorOpenIcon,
	OpenInNewIcon,
	PackageIcon,
	ReceiptIcon,
	StorefrontIcon,
	TruckIcon,
} from '@agentx/guide/icons';
import { canInstall, installPlugin } from '@agentx/lib/plugins';
import {
	loadDetails,
	loadPayments,
	loadProducts,
	loadShipping,
	loadTax,
	OFFLINE,
	ONLINE,
	refreshStore,
	removeProduct,
	saveDetails,
	savePayments,
	saveProduct,
	saveShipping,
	saveTax,
	setStoreOpen,
} from '@agentx/lib/store-guide';
import { useGuideStore } from '@agentx/state/guide';
import { useStoreGuideStore } from '@agentx/state/store-guide';
import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __, sprintf } from '@wordpress/i18n';

const INPUT =
	'agentx-focus h-9 w-full min-w-0 rounded-agentx-control border border-solid border-agentx-field-border bg-agentx-guide-field px-2.5 text-agentx-body font-normal text-agentx-ink';
const LABEL =
	'flex min-w-0 flex-col gap-1.5 text-agentx-caption font-agentx-button';

const { adminUrl = '' } = window.extSharedData ?? {};

const Field = ({ label, value, onChange, ...props }) => (
	<label className={LABEL}>
		{label}
		<input
			type="text"
			value={value ?? ''}
			onChange={(event) => onChange(event.target.value)}
			className={INPUT}
			{...props}
		/>
	</label>
);

const SKELETON =
	'animate-pulse rounded-agentx-control bg-agentx-hover motion-reduce:animate-none';

const FieldSkeleton = () => (
	<span className="flex min-w-0 flex-col gap-1.5">
		<span className={`h-4 w-24 ${SKELETON}`} />
		<span className={`h-9 w-full ${SKELETON}`} />
	</span>
);

const ChoiceSkeleton = () => (
	<span className="flex items-center gap-2">
		<span className={`size-4 shrink-0 ${SKELETON}`} />
		<span className={`h-4 w-40 ${SKELETON}`} />
	</span>
);

// Shaped like the step's own fields, so nothing moves once the store's values fill them in.
const Loading = ({ children }) => (
	<output
		// translators: Read out by screen readers on a step of the AI Agent's store setup guide while it reads what the store has.
		aria-label={__('Reading your store…', 'extendify-local')}
		className="flex flex-col gap-3"
	>
		{children}
	</output>
);

// Settings in WooCommerce hold more than a step asks, so each step links to its tab.
const WooLink = ({ tab, children }) => (
	<a
		href={`${adminUrl}admin.php?page=wc-settings&tab=${tab}`}
		target="_blank"
		rel="noopener noreferrer"
		className="inline-flex w-fit items-center gap-1 text-agentx-guide-link underline-offset-2 hover:underline text-agentx-caption"
	>
		{children}
		<OpenInNewIcon className="size-3.5" />
		<span className="sr-only">
			{__('(opens in a new tab)', 'extendify-local')}
		</span>
	</a>
);

// Accents and case aside, so "cote" finds Côte d'Ivoire.
const plain = (text) =>
	text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// WooCommerce lists each country with its states, too many to scroll, so typing narrows them.
export const SearchSelect = ({ label, value, options, onChange }) => {
	const id = useId();
	const list = useRef(null);
	const [open, setOpen] = useState(false);
	const [typed, setTyped] = useState('');
	const [at, setAt] = useState(0);
	const entries = Object.entries(options ?? {}).map(([key, name]) => ({
		key,
		name: decodeEntities(name),
	}));
	const chosen = entries.find((entry) => entry.key === value);
	const words = plain(typed).split(/\s+/).filter(Boolean);
	const found = entries.filter(({ key, name }) =>
		words.every((word) => plain(`${name} ${key}`).includes(word)),
	);

	useEffect(() => {
		list.current
			?.querySelector('[aria-selected="true"]')
			?.scrollIntoView?.({ block: 'nearest' });
	}, [at, open]);

	const show = () => {
		setOpen(true);
		setAt(
			Math.max(
				0,
				found.findIndex((entry) => entry.key === value),
			),
		);
	};
	const close = () => {
		setOpen(false);
		setTyped('');
	};
	const pick = (entry) => {
		onChange(entry.key);
		close();
	};
	const keys = (event) => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!open) return show();
			const step = event.key === 'ArrowDown' ? 1 : -1;
			setAt((was) => Math.min(found.length - 1, Math.max(0, was + step)));
			return;
		}
		if (!open) return;
		// Return picks here, rather than finishing the step.
		if (event.key === 'Enter') {
			event.preventDefault();
			if (found[at]) pick(found[at]);
			return;
		}
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			close();
		}
	};

	return (
		<div className={LABEL}>
			<label htmlFor={`${id}-field`}>{label}</label>
			<input
				id={`${id}-field`}
				type="text"
				role="combobox"
				aria-expanded={open}
				aria-autocomplete="list"
				aria-controls={`${id}-list`}
				aria-activedescendant={
					open && found[at] ? `${id}-${found[at].key}` : undefined
				}
				value={open ? typed : (chosen?.name ?? '')}
				placeholder={open ? chosen?.name : undefined}
				onClick={() => !open && show()}
				onChange={(event) => {
					setTyped(event.target.value);
					setOpen(true);
					setAt(0);
				}}
				onBlur={close}
				onKeyDown={keys}
				autoComplete="off"
				spellCheck={false}
				className={INPUT}
			/>
			{open && (
				<div
					ref={list}
					id={`${id}-list`}
					role="listbox"
					aria-label={label}
					className="flex max-h-56 flex-col overflow-y-auto rounded-agentx-control border border-solid border-agentx-field-border p-1"
				>
					{found.length ? (
						found.map((entry, index) => (
							<button
								key={entry.key}
								type="button"
								id={`${id}-${entry.key}`}
								role="option"
								aria-selected={index === at}
								tabIndex={-1}
								// The field keeps focus, so the list stays open under the pointer.
								onMouseDown={(event) => event.preventDefault()}
								onMouseMove={() => setAt(index)}
								onClick={() => pick(entry)}
								className={`w-full shrink-0 rounded-agentx-control border-0 bg-transparent px-2.5 py-1.5 text-start text-agentx-body text-agentx-ink aria-selected:bg-agentx-hover ${entry.key === value ? 'font-agentx-button' : 'font-normal'}`}
							>
								{entry.name}
							</button>
						))
					) : (
						<p className="m-0 px-2.5 py-1.5 text-agentx-body font-normal text-agentx-guide-muted">
							{
								// translators: Shown in the AI Agent's store setup guide when nothing in a list of countries or currencies matches what the user typed.
								__('No matches', 'extendify-local')
							}
						</p>
					)}
				</div>
			)}
		</div>
	);
};

const DetailsStep = ({ loading, values, onChange }) => {
	if (loading) {
		return (
			<Loading>
				<FieldSkeleton />
				<FieldSkeleton />
				<span className="grid grid-cols-2 gap-3">
					<FieldSkeleton />
					<FieldSkeleton />
				</span>
				<FieldSkeleton />
				<FieldSkeleton />
			</Loading>
		);
	}
	const set = (field) => (value) => onChange({ [field]: value });
	return (
		<div className="flex flex-col gap-3">
			<Field
				// translators: Label of the field for the store's name in the AI Agent's store setup guide; it is the site's title.
				label={__('Store name', 'extendify-local')}
				value={values.name}
				onChange={set('name')}
			/>
			<Field
				// translators: Label of the field for the store's street address in the AI Agent's store setup guide.
				label={__('Address', 'extendify-local')}
				value={values.address}
				onChange={set('address')}
			/>
			<div className="grid grid-cols-2 gap-3">
				<Field
					// translators: Label of the field for the store's city in the AI Agent's store setup guide.
					label={__('City', 'extendify-local')}
					value={values.city}
					onChange={set('city')}
				/>
				<Field
					// translators: Label of the field for the store's postal code in the AI Agent's store setup guide.
					label={__('Postcode', 'extendify-local')}
					value={values.postcode}
					onChange={set('postcode')}
				/>
			</div>
			<SearchSelect
				// translators: Label of the menu of countries and states for the store in the AI Agent's store setup guide; typing in it narrows the list.
				label={__('Country / State', 'extendify-local')}
				value={values.country}
				options={values.countries}
				onChange={(country) => onChange({ country })}
			/>
			<SearchSelect
				// translators: Label of the menu of currencies for the store in the AI Agent's store setup guide; typing in it narrows the list.
				label={__('Currency', 'extendify-local')}
				value={values.currency}
				options={values.currencies}
				onChange={(currency) => onChange({ currency })}
			/>
		</div>
	);
};

const money = (currency, amount) => `${currency}${amount}`;

const ProductRow = ({ product, currency, onEdit, onRemoved }) => {
	const [confirming, setConfirming] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [failed, setFailed] = useState(false);
	const remove = async () => {
		setRemoving(true);
		setFailed(false);
		try {
			await removeProduct(product.id);
			onRemoved();
		} catch {
			setFailed(true);
			setRemoving(false);
			setConfirming(false);
		}
	};
	return (
		<li className="flex items-center gap-3 py-2">
			{product.image ? (
				<img
					src={product.image.url}
					alt=""
					loading="lazy"
					className="size-10 shrink-0 rounded-agentx-control object-cover"
				/>
			) : (
				// An empty square reads as a photo that failed to load.
				<span
					className={`flex size-10 shrink-0 items-center justify-center rounded-agentx-control bg-agentx-hover text-agentx-caption ${GUIDE_CAPTION}`}
				>
					{
						// translators: Shown in place of a product's photo in the AI Agent's store setup guide when the product has none.
						__('None', 'extendify-local')
					}
				</span>
			)}
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate font-medium">{product.name}</span>
				<span className={GUIDE_CAPTION}>
					{product.price === '' ? (
						// translators: Shown under a product with no price in the AI Agent's store setup guide.
						__('No price yet', 'extendify-local')
					) : product.salePrice === '' ? (
						money(currency, product.price)
					) : (
						<>
							<s>{money(currency, product.price)}</s>{' '}
							{money(currency, product.salePrice)}
						</>
					)}
				</span>
				{failed && (
					<span role="alert" className="text-agentx-caption text-agentx-alert">
						{
							// translators: Shown under a product in the AI Agent's store setup guide when removing it failed.
							__("Couldn't remove it. Please try again.", 'extendify-local')
						}
					</span>
				)}
			</span>
			<button
				type="button"
				onClick={onEdit}
				aria-label={sprintf(
					// translators: %s is a product's name. Screen reader name of the button that opens the product's form in the AI Agent's store setup guide.
					__('Edit %s', 'extendify-local'),
					product.name,
				)}
				className={GHOST_SMALL}
			>
				{
					// translators: Button beside a product in the AI Agent's store setup guide that opens its form.
					__('Edit', 'extendify-local')
				}
			</button>
			{confirming ? (
				<button
					type="button"
					disabled={removing}
					onClick={remove}
					className={`${GHOST_SMALL} text-agentx-guide-danger-ink`}
				>
					{removing
						? // translators: Shown on the button while the AI Agent's store setup guide removes a product.
							__('Removing…', 'extendify-local')
						: // translators: The second press that removes a product in the AI Agent's store setup guide, after Remove was pressed once.
							__('Remove?', 'extendify-local')}
				</button>
			) : (
				<button
					type="button"
					onClick={() => setConfirming(true)}
					aria-label={sprintf(
						// translators: %s is a product's name. Screen reader name of the button that removes the product in the AI Agent's store setup guide; it asks once more before removing.
						__('Remove %s', 'extendify-local'),
						product.name,
					)}
					className={GHOST_SMALL}
				>
					{
						// translators: Button beside a product in the AI Agent's store setup guide that moves it to WooCommerce's trash; it asks once more first.
						__('Remove', 'extendify-local')
					}
				</button>
			)}
		</li>
	);
};

const BLANK = {
	name: '',
	price: '',
	salePrice: '',
	description: '',
	image: null,
};

const ProductForm = ({ form, currency, onChange }) => {
	const box = useRef(null);
	const photo = useRef(null);
	useEffect(() => {
		box.current?.querySelector('input')?.focus({ preventScroll: true });
	}, []);
	const set = (field) => (value) =>
		onChange((was) => ({ ...was, [field]: value }));
	const pick = (event) =>
		useGuideStore.setState({
			sheet: {
				which: 'block',
				tab: form.image ? 'library' : 'upload',
				sources: ['upload', 'library', 'stock', 'generate'],
				current: form.image,
				opener: event.currentTarget,
				onImage: (image) => {
					onChange((was) => ({ ...was, image }));
					photo.current?.focus();
				},
			},
		});
	return (
		<div ref={box} className="flex flex-col gap-3">
			<Field
				// translators: Label of a product's name field in the AI Agent's store setup guide.
				label={__('Product name', 'extendify-local')}
				value={form.name}
				onChange={set('name')}
				required
			/>
			<div className="grid grid-cols-2 gap-2">
				<Field
					label={sprintf(
						// translators: %s is the store's currency symbol, like $. Label of a product's price field in the AI Agent's store setup guide.
						__('Price (%s)', 'extendify-local'),
						currency,
					)}
					value={form.price}
					onChange={set('price')}
					inputMode="decimal"
				/>
				<Field
					label={sprintf(
						// translators: %s is the store's currency symbol, like $. Label of a product's sale price field in the AI Agent's store setup guide; it may be left empty.
						__('Sale price (%s, optional)', 'extendify-local'),
						currency,
					)}
					value={form.salePrice}
					onChange={set('salePrice')}
					inputMode="decimal"
				/>
			</div>
			<label className={LABEL}>
				{
					// translators: Label of a product's short description field in the AI Agent's store setup guide.
					__('Short description', 'extendify-local')
				}
				<textarea
					rows={3}
					value={form.description}
					onChange={(event) => set('description')(event.target.value)}
					className={`${INPUT} h-auto py-2`}
				/>
			</label>
			<div className="flex items-center gap-3">
				<ImageThumb
					image={form.image}
					className="size-14 shrink-0"
					// translators: Names the product's photo in its form in the AI Agent's store setup guide.
					alt={__('The product photo', 'extendify-local')}
				/>
				<button
					ref={photo}
					type="button"
					onClick={pick}
					className={OUTLINED_SMALL}
				>
					{form.image
						? // translators: Button in a product's form in the AI Agent's store setup guide that opens the image sheet to pick another photo.
							__('Change photo', 'extendify-local')
						: // translators: Button in a product's form in the AI Agent's store setup guide that opens the image sheet to pick a photo.
							__('Add a photo', 'extendify-local')}
				</button>
			</div>
		</div>
	);
};

const ProductsStep = ({ loading, values, onChange, onAction }) => {
	const currency = useStoreGuideStore((state) => state.currency);
	const [form, setForm] = useState(null);
	// The footer's Save is set when the form opens, so it reads the typed form here.
	const typed = useRef(null);
	typed.current = form;
	const add = useRef(null);

	if (loading) {
		return (
			<Loading>
				{[0, 1].map((row) => (
					<span key={row} className="flex items-center gap-3">
						<span className={`size-10 shrink-0 ${SKELETON}`} />
						<span className="flex flex-1 flex-col gap-1.5">
							<span className={`h-4 w-32 ${SKELETON}`} />
							<span className={`h-3 w-12 ${SKELETON}`} />
						</span>
					</span>
				))}
			</Loading>
		);
	}

	const close = () => {
		setForm(null);
		onAction(null);
		// The Add button exists only once the list replaces the form.
		requestAnimationFrame(() => add.current?.focus());
	};

	const open = (product) => {
		setForm(product ?? BLANK);
		onAction({
			label: product
				? // translators: Button that saves the changes to a product in the AI Agent's store setup guide.
					__('Save product', 'extendify-local')
				: // translators: Button that adds the new product to the store in the AI Agent's store setup guide.
					__('Add product', 'extendify-local'),
			run: async () => {
				await saveProduct(typed.current, product);
				// The product is already saved; a retry after a failed reread would add it twice.
				const products = await loadProducts().catch(() => null);
				if (products) onChange({ products });
				close();
			},
			cancel: close,
		});
	};

	if (form) {
		return <ProductForm form={form} currency={currency} onChange={setForm} />;
	}

	return (
		<div className="flex flex-col gap-3">
			{values.products.length ? (
				<ul className="m-0 flex max-h-80 list-none flex-col divide-y divide-agentx-guide-divider overflow-y-auto p-0">
					{values.products.map((product) => (
						<ProductRow
							key={product.id}
							product={product}
							currency={currency}
							onEdit={() => open(product)}
							onRemoved={() =>
								onChange((was) => ({
									products: was.products.filter(
										(each) => each.id !== product.id,
									),
								}))
							}
						/>
					))}
				</ul>
			) : (
				<p className="m-0">
					{
						// translators: Shown in the AI Agent's store setup guide when the store has no products.
						__('No products yet. Add your first one.', 'extendify-local')
					}
				</p>
			)}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<button
					ref={add}
					type="button"
					onClick={() => open(null)}
					className={OUTLINED_SMALL}
				>
					{
						// translators: Button in the AI Agent's store setup guide that opens the form for a new product.
						__('Add a product', 'extendify-local')
					}
				</button>
				<a
					href={`${adminUrl}edit.php?post_type=product`}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex w-fit items-center gap-1 text-agentx-guide-link underline-offset-2 hover:underline text-agentx-caption"
				>
					{
						// translators: Link in the AI Agent's store setup guide to WooCommerce's list of all the store's products.
						__('All products in WooCommerce', 'extendify-local')
					}
					<OpenInNewIcon className="size-3.5" />
					<span className="sr-only">
						{__('(opens in a new tab)', 'extendify-local')}
					</span>
				</a>
			</div>
		</div>
	);
};

// Online and offline ways to pay work differently, so each gets its own box.
const PayGroup = ({ title, note, children }) => {
	const id = useId();
	return (
		<fieldset
			aria-labelledby={id}
			className="m-0 flex min-w-0 flex-col gap-3 rounded-agentx-control border border-solid border-agentx-field-border p-3"
		>
			<span className="flex flex-col">
				<span id={id} className="font-agentx-guide-title">
					{title}
				</span>
				<span className={GUIDE_CAPTION}>{note}</span>
			</span>
			{children}
		</fieldset>
	);
};

const Online = ({ gateway, installed, onInstalled }) => {
	const id = useId();
	const [state, setState] = useState(installed ? 'done' : 'idle');
	const install = async () => {
		setState('busy');
		try {
			await installPlugin({
				slug: gateway.slug,
				name: gateway.name,
				refresh: false,
			});
			setState('done');
			onInstalled();
		} catch {
			setState('failed');
		}
	};
	return (
		<div className="flex items-center justify-between gap-2">
			<span className="flex min-w-0 flex-col">
				<span className="font-medium">{gateway.name}</span>
				<span id={id} className={GUIDE_CAPTION}>
					{gateway.description()}
				</span>
			</span>
			{state === 'done' ? (
				<a
					href={`${adminUrl}admin.php?page=wc-settings&tab=checkout&section=${gateway.id}`}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={sprintf(
						// translators: %s is a payment plugin's name, like Stripe. Screen reader name of the button in the AI Agent's store setup guide that opens its settings in WooCommerce, to connect an account.
						__('Connect %s', 'extendify-local'),
						gateway.name,
					)}
					className={`shrink-0 ${OUTLINED_SMALL}`}
				>
					{
						// translators: Button in the AI Agent's store setup guide that opens a payment plugin's settings in WooCommerce, to connect an account.
						__('Connect', 'extendify-local')
					}
				</a>
			) : (
				<button
					type="button"
					disabled={state === 'busy'}
					onClick={install}
					aria-describedby={id}
					aria-label={sprintf(
						// translators: %s is a payment plugin's name, like Stripe. Screen reader name of the button in the AI Agent's store setup guide that installs it.
						__('Install %s', 'extendify-local'),
						gateway.name,
					)}
					className={`shrink-0 ${OUTLINED_SMALL}`}
				>
					{state === 'busy'
						? // translators: Shown on the button while the AI Agent's store setup guide installs a payment plugin.
							__('Installing…', 'extendify-local')
						: state === 'failed'
							? // translators: Button in the AI Agent's store setup guide to try installing a payment plugin again.
								__('Try again', 'extendify-local')
							: // translators: Button in the AI Agent's store setup guide that installs a payment plugin, like Stripe.
								__('Install', 'extendify-local')}
				</button>
			)}
		</div>
	);
};

const PaymentsStep = ({ loading, values, onChange }) => {
	const id = useId();
	if (loading) {
		return (
			<Loading>
				{OFFLINE.map(({ id: gateway }) => (
					<ChoiceSkeleton key={gateway} />
				))}
			</Loading>
		);
	}
	return (
		<div className="flex flex-col gap-3">
			{canInstall() && (
				<PayGroup
					// translators: Heading over the payment plugins, like Stripe, in the AI Agent's store setup guide.
					title={__('Online payments', 'extendify-local')}
					// translators: Under the Online payments heading in the AI Agent's store setup guide.
					note={__(
						'Customers pay at checkout. Install one, then connect your account.',
						'extendify-local',
					)}
				>
					{ONLINE.map((gateway) => (
						<Online
							key={gateway.id}
							gateway={gateway}
							installed={values.online[gateway.id]}
							onInstalled={() =>
								onChange({
									online: { ...values.online, [gateway.id]: true },
								})
							}
						/>
					))}
				</PayGroup>
			)}
			<PayGroup
				// translators: Heading over the ways to pay outside the store's checkout, like cash on delivery, in the AI Agent's store setup guide.
				title={__('Offline payments', 'extendify-local')}
				// translators: Under the Offline payments heading in the AI Agent's store setup guide.
				note={__(
					'You collect the money yourself. Turn on the ones you take.',
					'extendify-local',
				)}
			>
				{OFFLINE.map(({ id: gateway, title, description }) => (
					<div key={gateway} className="flex items-start gap-2">
						<input
							id={`${id}-${gateway}`}
							type="checkbox"
							checked={Boolean(values.offline[gateway])}
							onChange={(event) =>
								onChange({
									offline: {
										...values.offline,
										[gateway]: event.target.checked,
									},
								})
							}
							aria-describedby={`${id}-${gateway}-about`}
							className="agentx-focus mt-0.5 size-4 shrink-0"
						/>
						<span className="flex flex-col">
							<label
								htmlFor={`${id}-${gateway}`}
								className="font-agentx-button"
							>
								{title()}
							</label>
							<span id={`${id}-${gateway}-about`} className={GUIDE_CAPTION}>
								{description()}
							</span>
						</span>
					</div>
				))}
			</PayGroup>
			<WooLink tab="checkout">
				{
					// translators: Link in the AI Agent's store setup guide to WooCommerce's payment settings.
					__('Payment settings in WooCommerce', 'extendify-local')
				}
			</WooLink>
		</div>
	);
};

const TaxStep = ({ loading, values, onChange }) => {
	if (loading) {
		return (
			<Loading>
				<ChoiceSkeleton />
				<FieldSkeleton />
				<ChoiceSkeleton />
			</Loading>
		);
	}
	return (
		<div className="flex flex-col gap-3">
			<label className="flex items-center gap-2 text-agentx-body">
				<input
					type="radio"
					checked={values.charges}
					onChange={() => onChange({ charges: true })}
					className="agentx-focus size-4"
				/>
				{
					// translators: A choice in the AI Agent's store setup guide: the store adds sales tax to its prices.
					__('I charge sales tax', 'extendify-local')
				}
			</label>
			{values.charges && (
				<Field
					// translators: Label of the field for the store's sales tax rate, as a percent, in the AI Agent's store setup guide.
					label={__('Tax rate (%)', 'extendify-local')}
					value={values.rate}
					onChange={(rate) => onChange({ rate })}
					inputMode="decimal"
				/>
			)}
			<label className="flex items-center gap-2 text-agentx-body">
				<input
					type="radio"
					checked={!values.charges}
					onChange={() => onChange({ charges: false })}
					className="agentx-focus size-4"
				/>
				{
					// translators: A choice in the AI Agent's store setup guide: the store charges no sales tax.
					__("I don't charge tax", 'extendify-local')
				}
			</label>
			<WooLink tab="tax">
				{
					// translators: Link in the AI Agent's store setup guide to WooCommerce's tax settings.
					__('Tax settings in WooCommerce', 'extendify-local')
				}
			</WooLink>
		</div>
	);
};

const ShippingStep = ({ loading, values, onChange }) => {
	const currency = useStoreGuideStore((state) => state.currency);
	if (loading) {
		return (
			<Loading>
				<FieldSkeleton />
				<FieldSkeleton />
			</Loading>
		);
	}
	return (
		<div className="flex flex-col gap-3">
			<Field
				label={sprintf(
					// translators: %s is the store's currency symbol, like $. Label of the field for the store's flat shipping cost in the AI Agent's store setup guide.
					__('Shipping cost (%s)', 'extendify-local'),
					currency,
				)}
				value={values.cost}
				onChange={(cost) => onChange({ cost })}
				inputMode="decimal"
			/>
			<Field
				label={sprintf(
					// translators: %s is the store's currency symbol, like $. Label of the field for the order total over which shipping is free, in the AI Agent's store setup guide; it may be left empty.
					__('Free shipping over (%s, optional)', 'extendify-local'),
					currency,
				)}
				value={values.freeOver}
				onChange={(freeOver) => onChange({ freeOver })}
				inputMode="decimal"
			/>
			<WooLink tab="shipping">
				{
					// translators: Link in the AI Agent's store setup guide to WooCommerce's shipping settings.
					__('Shipping settings in WooCommerce', 'extendify-local')
				}
			</WooLink>
		</div>
	);
};

const OpenStep = () => {
	const open = useStoreGuideStore((state) => state.has?.open);
	const [busy, setBusy] = useState(false);
	const hide = async () => {
		setBusy(true);
		await setStoreOpen(false).catch(() => {});
		await refreshStore().catch(() => {});
		setBusy(false);
	};
	return (
		<div className="flex flex-col gap-3">
			<p className="m-0">
				{open
					? // translators: Shown on the last step of the AI Agent's store setup guide when customers can already shop.
						__('Your store is open to customers.', 'extendify-local')
					: // translators: Shown on the last step of the AI Agent's store setup guide while the store shows a Coming soon page.
						__(
							'Your store shows a “Coming soon” page. Open it when you’re ready for customers.',
							'extendify-local',
						)}
			</p>
			{open && (
				<button
					type="button"
					disabled={busy}
					onClick={hide}
					className={`w-fit ${OUTLINED_SMALL}`}
				>
					{
						// translators: Button in the AI Agent's store setup guide that puts the store back behind its Coming soon page.
						__('Hide my store again', 'extendify-local')
					}
				</button>
			)}
			<WooLink tab="site-visibility">
				{
					// translators: Link in the AI Agent's store setup guide to WooCommerce's site visibility settings.
					__('Visibility settings in WooCommerce', 'extendify-local')
				}
			</WooLink>
		</div>
	);
};

const nextLabel = () =>
	// translators: Button that finishes a step of the AI Agent's store setup guide and moves on to the next one.
	__('Next', 'extendify-local');

export const STORE_STEPS = [
	{
		id: 'details',
		Icon: StorefrontIcon,
		// translators: A step of the AI Agent's store setup guide.
		title: () => __('Add your store details', 'extendify-local'),
		description: () =>
			// translators: Under a step of the AI Agent's store setup guide.
			__('Your address, country and currency.', 'extendify-local'),
		Tool: DetailsStep,
		load: loadDetails,
		action: nextLabel,
		finish: saveDetails,
	},
	{
		id: 'products',
		Icon: PackageIcon,
		// translators: A step of the AI Agent's store setup guide.
		title: () => __('Set up your products', 'extendify-local'),
		description: () =>
			// translators: Under a step of the AI Agent's store setup guide.
			__('Add, change or remove what you sell.', 'extendify-local'),
		Tool: ProductsStep,
		// Each product saves as its form closes, so Next has nothing left to save.
		load: async () => ({ products: await loadProducts() }),
		action: nextLabel,
	},
	{
		id: 'payments',
		Icon: CardIcon,
		// translators: A step of the AI Agent's store setup guide.
		title: () => __('Choose how you get paid', 'extendify-local'),
		description: () =>
			// translators: Under a step of the AI Agent's store setup guide.
			__('Turn on the ways customers can pay.', 'extendify-local'),
		Tool: PaymentsStep,
		load: async () => {
			const payments = await loadPayments();
			return { ...payments, was: payments.offline };
		},
		action: nextLabel,
		finish: savePayments,
	},
	{
		id: 'tax',
		Icon: ReceiptIcon,
		// translators: A step of the AI Agent's store setup guide.
		title: () => __('Set up sales tax', 'extendify-local'),
		description: () =>
			// translators: Under a step of the AI Agent's store setup guide.
			__('Add a rate, or say you don’t charge tax.', 'extendify-local'),
		Tool: TaxStep,
		load: loadTax,
		action: nextLabel,
		finish: saveTax,
	},
	{
		id: 'shipping',
		Icon: TruckIcon,
		// translators: A step of the AI Agent's store setup guide.
		title: () => __('Set your shipping', 'extendify-local'),
		description: () =>
			// translators: Under a step of the AI Agent's store setup guide.
			__('What shipping costs in your country.', 'extendify-local'),
		Tool: ShippingStep,
		load: loadShipping,
		action: nextLabel,
		finish: saveShipping,
		// A store with nothing to ship has no shipping step.
		shown: () => useStoreGuideStore.getState().ships !== false,
	},
	{
		id: 'open',
		Icon: DoorOpenIcon,
		// translators: A step of the AI Agent's store setup guide.
		title: () => __('Open your store', 'extendify-local'),
		description: () =>
			// translators: Under a step of the AI Agent's store setup guide.
			__('Let customers in.', 'extendify-local'),
		Tool: OpenStep,
		action: () =>
			useStoreGuideStore.getState().has?.open
				? nextLabel()
				: // translators: Button on the last step of the AI Agent's store setup guide that takes the store off its Coming soon page.
					__('Open my store', 'extendify-local'),
		finish: () =>
			useStoreGuideStore.getState().has?.open
				? Promise.resolve()
				: setStoreOpen(true),
	},
];

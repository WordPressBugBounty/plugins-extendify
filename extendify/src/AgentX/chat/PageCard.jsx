import { ACTION_TONE } from '@agentx/chat/ActionCard';
import { AskedLine } from '@agentx/chat/AskedLine';
import { RowCard } from '@agentx/chat/RowCard';
import { OUTLINED_ICON } from '@agentx/chat/styles';
import { SAMPLE_PAGE } from '@agentx/demo/sample-page';
import { PHONE_HEIGHT, PHONE_WIDTH, scaleSite } from '@agentx/lib/fit-site';
import {
	agentPage,
	checkPages,
	deletePage,
	pageTarget,
	setPageStatus,
	usePagesStore,
} from '@agentx/lib/pages';
import { useGutterStore } from '@agentx/state/gutter';
import { usePageStore } from '@agentx/state/page';
import { useShellStore } from '@agentx/state/shell';
import { Tooltip } from '@agentx/Tooltip';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Icon, seen, unseen } from '@wordpress/icons';

const publishLabel = () =>
	// translators: Button that publishes a page or post from the AI Agent's chat.
	__('Publish', 'extendify-local');

const draftLabel = () =>
	// translators: Button that turns a published page or post back into a draft from the AI Agent's chat.
	__('Make Draft', 'extendify-local');

const deleting = (title) => ({
	text: sprintf(
		// translators: %s is the title of one of the site's pages or posts. The AI Agent asks the user to confirm moving it to the WordPress trash.
		__('Delete “%s”? It moves to the trash.', 'extendify-local'),
		title,
	),
	// translators: Button that moves a page or post to the trash, once the user confirms it in the AI Agent's chat.
	button: __('Delete', 'extendify-local'),
	danger: true,
	// translators: Button that keeps a page or post, closing the AI Agent's question about moving it to the trash.
	dismiss: __('Cancel', 'extendify-local'),
});

const roleLine = (role) =>
	({
		homepage:
			// translators: Added to the AI Agent's question about unpublishing or deleting a page when that page is the site's homepage; WordPress then shows the latest posts on the homepage.
			__(
				'It’s your homepage, so your latest posts show there instead.',
				'extendify-local',
			),
		posts:
			// translators: Added to the AI Agent's question about unpublishing or deleting a page when that page is where the site lists its blog posts; the list goes away.
			__(
				'It’s your posts page, so your blog listing turns off.',
				'extendify-local',
			),
	})[role] ?? '';

const opening = (status, title) =>
	sprintf(
		status === 'publish'
			? // translators: %s is the title of one of the site's pages or posts. The AI Agent asks the user to confirm publishing it.
				__('Publish “%s”?', 'extendify-local')
			: // translators: %s is the title of one of the site's pages or posts. The AI Agent asks the user to confirm turning it back into a draft.
				__('Make “%s” a draft?', 'extendify-local'),
		title,
	);

const questionOf = ({ status, title, role }) =>
	[opening(status, title), status === 'publish' ? '' : roleLine(role)]
		.filter(Boolean)
		.join(' ');

const listOf = (names) => {
	try {
		return new Intl.ListFormat(document.documentElement.lang || undefined, {
			type: 'conjunction',
		}).format(names);
	} catch {
		return names.join(', ');
	}
};

// Everything deleting it touches, so the user can cancel and say otherwise.
const deleteQuestion = ({
	title,
	role,
	menus = [],
	keepsMenus = false,
	linkedFrom = [],
	linkedMore = false,
	children = 0,
}) => {
	const menuNames = listOf(menus);
	const linking = linkedMore
		? sprintf(
				// translators: %d is how many of the site's pages the AI Agent found linking to the page it is about to delete, when even more do; it starts a sentence like "More than 10 pages link to it".
				__('More than %d pages', 'extendify-local'),
				linkedFrom.length,
			)
		: linkedFrom.length > 3
			? sprintf(
					// translators: %d is how many of the site's pages link to the page the AI Agent is about to delete; it starts a sentence like "5 pages link to it".
					_n('%d page', '%d pages', linkedFrom.length, 'extendify-local'),
					linkedFrom.length,
				)
			: listOf(linkedFrom);
	return [
		menus.length && !keepsMenus
			? sprintf(
					// translators: %1$s is the title of one of the site's pages or posts, %2$s the names of the site's menus that link to it. The AI Agent asks the user to confirm deleting it and removing its menu links.
					_n(
						'Delete “%1$s” and take it out of the %2$s menu?',
						'Delete “%1$s” and take it out of the %2$s menus?',
						menus.length,
						'extendify-local',
					),
					title,
					menuNames,
				)
			: sprintf(
					// translators: %s is the title of one of the site's pages or posts. The AI Agent asks the user to confirm deleting it.
					__('Delete “%s”?', 'extendify-local'),
					title,
				),
		roleLine(role),
		menus.length && keepsMenus
			? sprintf(
					// translators: %s is the names of the site's menus that link to the page the AI Agent is about to delete, which the user asked to keep; those links stop working.
					_n(
						'Its link in the %s menu stays, and will lead nowhere.',
						'Its links in the %s menus stay, and will lead nowhere.',
						menus.length,
						'extendify-local',
					),
					menuNames,
				)
			: '',
		linkedFrom.length
			? sprintf(
					// translators: %s is the titles of the site's pages that link to the page the AI Agent is about to delete, or how many there are, like "5 pages"; those links stop working.
					_n(
						'%s links to it, and that link will lead nowhere.',
						'%s link to it, and those links will lead nowhere.',
						linkedFrom.length,
						'extendify-local',
					),
					linking,
				)
			: '',
		children
			? sprintf(
					// translators: %d is how many subpages the page the AI Agent is about to delete has; they stay on the site.
					_n(
						'It has %d subpage, which stays on the site.',
						'It has %d subpages, which stay on the site.',
						children,
						'extendify-local',
					),
					children,
				)
			: '',
		// translators: Ends the AI Agent's question about deleting a page or post; WordPress keeps deleted ones in its trash for a while.
		__('It moves to the trash.', 'extendify-local'),
	]
		.filter(Boolean)
		.join(' ');
};

const failed = () => ({
	// translators: Shown in the AI Agent's chat when publishing, unpublishing or deleting a page didn't work.
	text: __("That didn't work. Please try again.", 'extendify-local'),
	// translators: Button that tries a failed change to a page again, in the AI Agent's chat.
	button: __('Retry', 'extendify-local'),
});

const doneOf = (status, type) =>
	({
		publish:
			type === 'post'
				? // translators: A finished step in the AI Agent's chat, after it published a post.
					__('Published the post', 'extendify-local')
				: // translators: A finished step in the AI Agent's chat, after it published a page.
					__('Published the page', 'extendify-local'),
		draft:
			type === 'post'
				? // translators: A finished step in the AI Agent's chat, after it turned a post back into a draft.
					__('Unpublished the post', 'extendify-local')
				: // translators: A finished step in the AI Agent's chat, after it turned a page back into a draft.
					__('Unpublished the page', 'extendify-local'),
		trash:
			type === 'post'
				? // translators: A finished step in the AI Agent's chat, after it moved a post to the trash.
					__('Deleted the post', 'extendify-local')
				: // translators: A finished step in the AI Agent's chat, after it moved a page to the trash.
					__('Deleted the page', 'extendify-local'),
	})[status];

const viewWidth = () =>
	useShellStore.getState().siteView === 'phone'
		? PHONE_WIDTH
		: window.innerWidth;

// Links stay inert, or a click would load another page into the preview.
const PagePreview = ({ page }) => {
	const frame = useRef(null);
	const phone = useShellStore((state) => state.siteView === 'phone');

	// At the site's width, or the page lays out narrower than the site does.
	useEffect(() => scaleSite(frame.current, viewWidth), [phone]);

	return (
		<section
			aria-label={page.title}
			style={
				phone
					? {
							width: PHONE_WIDTH,
							height: `min(${PHONE_HEIGHT}px, calc(100% - 2rem))`,
						}
					: undefined
			}
			className={`relative overflow-hidden rounded-agentx-page-preview bg-agentx-page-preview shadow-(--agentx-page-preview-shadow) ${phone ? 'm-auto max-w-full' : 'size-full'}`}
		>
			<iframe
				ref={frame}
				{...(page.demo
					? { srcDoc: SAMPLE_PAGE }
					: { src: agentPage(page.url) })}
				title={page.title}
				// Without top navigation, the previewed page can't take the agent away.
				sandbox="allow-scripts allow-same-origin"
				onLoad={() =>
					frame.current?.contentDocument?.addEventListener(
						'click',
						(event) => event.preventDefault(),
						true,
					)
				}
				className="absolute start-0 top-0 size-full origin-top-left border-0 rtl:origin-top-right"
			/>
		</section>
	);
};

export const previewOf = (page) => {
	const Preview = () => <PagePreview page={page} />;
	Preview.shows = page.url;
	return Preview;
};

// Closes only a page preview, leaving any other canvas tool open.
export const closePreview = () => {
	const { canvasTool, setCanvasTool } = useShellStore.getState();
	if (canvasTool?.shows) setCanvasTool(null);
};

// The phone layout has no canvas to show it on.
// Named for its page, so it's clear the preview shows that page, not this one without the change.
export const previewLabel = (title) =>
	sprintf(
		// translators: %s is the title of one of the site's pages or posts. Tooltip and screen reader label for the eye button on the AI Agent's cards that shows that page on the canvas beside the chat; pressed again puts the site back.
		__('Preview “%s”', 'extendify-local'),
		title,
	);

export const PreviewButton = ({ page }) => {
	const open = useShellStore((state) => state.canvasTool?.shows === page.url);
	const inView = usePageStore(
		(state) => Boolean(page.id) && state.page?.id === page.id,
	);
	const label = previewLabel(page.title);
	// The site already shows this page, so its preview would show nothing new.
	if (inView) return null;
	return (
		<Tooltip text={label} className="max-[782px]:hidden">
			<button
				type="button"
				aria-pressed={open}
				aria-label={label}
				onClick={() =>
					open
						? closePreview()
						: useShellStore.getState().setCanvasTool(previewOf(page))
				}
				className={`${OUTLINED_ICON} aria-pressed:border-agentx-preview-pressed aria-pressed:bg-agentx-preview-pressed/10 aria-pressed:text-agentx-preview-pressed`}
			>
				<Icon icon={open ? unseen : seen} size={20} className="fill-current" />
			</button>
		</Tooltip>
	);
};

const useMadePage = (part, made, { onChanged, changeWith } = {}) => {
	const demo = Boolean(part.demoState);
	const [page, setPage] = useState({ ...made, role: '', demo });
	const [busy, setBusy] = useState(false);
	const [ready, setReady] = useState(demo || page.status === 'trash');
	// While its confirm or retry waits in the gutter, the page takes no other change.
	const waiting =
		useGutterStore((state) => state.card?.from === part.toolCallId) ||
		part.demoState === 'confirming';

	// Someone may have changed it elsewhere since the agent did.
	useEffect(() => {
		if (demo || page.status === 'trash') return;
		pageTarget(page.url)
			.then(
				(found) => !found.refused && setPage((was) => ({ ...was, ...found })),
			)
			.catch(() => {})
			.finally(() => setReady(true));
	}, []);

	const changedInChat = usePagesStore((state) => page.id && state[page.id]);
	useEffect(() => {
		if (!changedInChat) return;
		setPage((was) => ({
			...was,
			...changedInChat,
			url: changedInChat.url || was.url,
		}));
	}, [changedInChat]);

	// This page's own confirm or retry, which a newer one in the gutter replaces.
	const ownCard = () => {
		const { card } = useGutterStore.getState();
		return card?.from === part.toolCallId ? card : null;
	};
	const inGutter = (card) =>
		useGutterStore.setState({
			card: card && { ...card, from: part.toolCallId },
		});

	const change = async (status) => {
		if (demo) return;
		setBusy(true);
		const asked = ownCard();
		if (asked) inGutter({ ...asked, busy: true });
		try {
			const changed = changeWith
				? await changeWith(page)
				: await setPageStatus(page.url, status);
			setPage((was) => ({
				...was,
				status: changed.after,
				label: changed.labels.after,
				url: changed.url || was.url,
			}));
			if (ownCard()) inGutter(null);
			onChanged?.(changed);
		} catch (error) {
			closePreview();
			// WordPress refused it, so trying again would only be refused again.
			const refused = error?.data?.status >= 400 && error.data.status < 500;
			inGutter(
				refused
					? { text: error.message, onClose: () => inGutter(null) }
					: { ...failed(), onPress: () => change(status) },
			);
		} finally {
			setBusy(false);
		}
	};

	return {
		page,
		ready,
		waiting,
		busy: busy || waiting,
		change,
		inGutter,
		askDelete: () =>
			inGutter({
				...deleting(page.title),
				onPress: () => change('trash'),
				onDismiss: () => inGutter(null),
			}),
	};
};

const confirmOf = (status) =>
	status === 'trash'
		? { button: deleting('').button, danger: true }
		: { button: status === 'publish' ? publishLabel() : draftLabel() };

// A step the chat draws again would put its card up twice; output keeps it across a reload.
const asked = new Set();

const askedOf = (status, type) =>
	({
		publish:
			type === 'post'
				? // translators: A short line in the AI Agent's chat where its card offering to publish a post was turned down.
					__('Asked to publish the post', 'extendify-local')
				: // translators: A short line in the AI Agent's chat where its card offering to publish a page was turned down.
					__('Asked to publish the page', 'extendify-local'),
		draft:
			type === 'post'
				? // translators: A short line in the AI Agent's chat where its card offering to turn a published post back into a draft was turned down.
					__('Asked to unpublish the post', 'extendify-local')
				: // translators: A short line in the AI Agent's chat where its card offering to turn a published page back into a draft was turned down.
					__('Asked to unpublish the page', 'extendify-local'),
		trash:
			type === 'post'
				? // translators: A short line in the AI Agent's chat where its card asking to move a post to the trash was turned down.
					__('Asked to delete the post', 'extendify-local')
				: // translators: A short line in the AI Agent's chat where its card asking to move a page to the trash was turned down.
					__('Asked to delete the page', 'extendify-local'),
	})[status];

export const PageAsk = ({
	part,
	onOutput,
	onAnswer,
	changeWith,
	textOf,
	waiting = false,
}) => {
	const { input } = part;
	// Publishing asks under the reply like any next step; only a delete asks in the gutter.
	const inline = input.status !== 'trash';
	const [doneHere, setDone] = useState(false);
	const { page, ready, change, inGutter } = useMadePage(
		part,
		{
			title: input.title,
			url: input.url,
			// Asked to change it, so it's taken to be the other way until the server says.
			status: input.status === 'publish' ? 'draft' : 'publish',
		},
		{
			onChanged: ({ title, url, inMenu }) => {
				const output = {
					done: true,
					...(inMenu !== undefined && { title, url, inMenu }),
				};
				setDone(true);
				onOutput?.(output);
				onAnswer?.(output);
			},
			changeWith,
		},
	);
	const done = doneHere || Boolean(part.output?.done);
	// The card's answer is its call's output, so a reload sees a turned-down one too.
	const answered = done || Boolean(part.output?.canceled);
	const open = useGutterStore((state) => state.card?.from === part.toolCallId);
	const wasOpen = useRef(false);

	// A sent message closes the card, and the page it shows goes with it.
	useEffect(() => {
		if (wasOpen.current && !open) closePreview();
		wasOpen.current = open;
	}, [open]);

	useEffect(() => {
		if (inline) return;
		// A demo shows its own card, never the live gutter's.
		if (part.demoState || !ready || waiting || asked.has(part.toolCallId)) {
			return;
		}
		if (part.output?.asked || answered || page.status === input.status) {
			return;
		}
		asked.add(part.toolCallId);
		onOutput?.({ asked: true });
		const close = () => {
			closePreview();
			inGutter(null);
			onAnswer?.({ canceled: true });
		};
		// The floating chat in wp-admin has no canvas to show it on.
		const canvas = Boolean(document.getElementById('extendify-agentx-site'));
		inGutter({
			text: textOf
				? textOf(page)
				: questionOf({
						status: input.status,
						title: page.title,
						role: page.role,
					}),
			...confirmOf(input.status),
			// translators: Button that closes the AI Agent's card asking to publish, unpublish or delete a page, leaving the page as it is.
			dismiss: __('Cancel', 'extendify-local'),
			onPress: () => {
				closePreview();
				change(input.status);
			},
			onDismiss: close,
			onClose: close,
			...(canvas && { aside: <PreviewButton page={page} /> }),
		});
	}, [ready, waiting]);

	if (done) {
		return (
			<p className="m-0 text-agentx-body text-agentx-steps">
				{doneOf(input.status, input.type)}
			</p>
		);
	}
	if (part.output?.canceled) {
		return <AskedLine text={askedOf(input.status, input.type)} />;
	}
	if (!inline || !ready) return null;
	return (
		<RowCard
			icon="rocket"
			text={
				textOf
					? textOf(page)
					: questionOf({
							status: input.status,
							title: page.title,
							role: page.role,
						})
			}
			action={confirmOf(input.status).button}
			tone={ACTION_TONE}
			onAct={() => change(input.status)}
			onDismiss={() => {
				// Its call was answered when it showed, so the turn-down goes into that output.
				onOutput?.({ canceled: true });
				onAnswer?.({ canceled: true });
			}}
		/>
	);
};

// The agent's last confirm before deleting, saying what deleting touches.
export const DeleteAsk = ({ part, onOutput, onAnswer }) => {
	const { id, menus } = part.input;
	const settled = Boolean(part.demoState || part.output);
	const [facts, setFacts] = useState(settled ? {} : null);

	useEffect(() => {
		if (facts) return;
		// Without them the card still asks, with what the step carries.
		checkPages({ ids: [id] })
			.then(({ pages }) => setFacts(pages?.[0] ?? {}))
			.catch(() => setFacts({}));
	}, []);

	// Only what the card says goes: no facts, or menus the user can't change, keep the links.
	const takesLinks =
		Boolean(menus) &&
		Boolean(facts?.menus?.length) &&
		facts.menusEditable !== false;

	return (
		<PageAsk
			part={{ ...part, input: { ...part.input, status: 'trash' } }}
			onOutput={onOutput}
			onAnswer={onAnswer}
			waiting={!facts}
			textOf={(page) =>
				deleteQuestion({
					title: facts?.title || page.title,
					role: facts?.role ?? page.role,
					menus: facts?.menus,
					keepsMenus: !takesLinks,
					linkedFrom: facts?.linkedFrom,
					linkedMore: facts?.linkedMore,
					children: facts?.children,
				})
			}
			// The step's id is the page the agent checked, whatever its address resolves to.
			changeWith={() => deletePage({ id, menus: takesLinks })}
		/>
	);
};

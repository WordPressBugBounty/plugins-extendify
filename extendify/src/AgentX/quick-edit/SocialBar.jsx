import { editBlocks } from '@agentx/lib/edit-blocks';
import { shellDocument } from '@agentx/lib/shell-document';
import { track } from '@agentx/lib/track';
import {
	DragHandle,
	FIELD,
	SaveButtons,
	SURFACE,
} from '@agentx/quick-edit/controls';
import { hrefOf } from '@agentx/quick-edit/link';
import { useBesidePart } from '@agentx/quick-edit/place';
import { quietPage } from '@agentx/quick-edit/quiet-page';
import { createPortal, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// The site's own icon, so each row looks like the link it changes.
const Icon = ({ svg }) => {
	const holder = useRef(null);
	useEffect(() => {
		if (svg) holder.current?.replaceChildren(svg.cloneNode(true));
	}, [svg]);
	return (
		<span
			ref={holder}
			aria-hidden="true"
			className="flex size-5 shrink-0 items-center justify-center fill-current [&>svg]:size-5"
		/>
	);
};

export const SocialBar = ({
	target,
	changed,
	commit = { current: null },
	onDone,
	onFailed,
	failed = null,
}) => {
	const { block, links, focus } = target;
	const bar = useRef(null);
	const [urls, setUrls] = useState(() =>
		Object.fromEntries(links.map(({ id, url }) => [id, url])),
	);
	const [problem] = useState(failed);
	changed.current = () => links.some(({ id, url }) => urls[id].trim() !== url);

	useEffect(() => {
		const quiet = quietPage(block, { typed: false });
		const field = bar.current?.querySelector(
			`input[data-link="${CSS.escape(focus ?? links[0].id)}"]`,
		);
		field?.focus();
		field?.select();
		return () => {
			quiet();
		};
	}, [block, focus, links]);

	const drag = useBesidePart(bar, block, { inView: true });

	const save = async () => {
		const changed = links.filter(({ id, url }) => urls[id].trim() !== url);
		onDone();
		if (!changed.length) return;
		// One change, so one Undo takes back every link edited here.
		const result = await editBlocks({
			ops: changed.map(({ id }) => ({
				op: 'set-link',
				block: id,
				type: 'core/social-link',
				url: urls[id].trim() ? hrefOf(urls[id]) : '',
				direct: true,
			})),
		}).catch((error) => ({ refused: error?.message }));
		if (result?.refused || result?.confirm) {
			onFailed?.(
				result.confirm
					? // translators: Shown in Quick Edit when the social links sit in a part shared by several pages of the user's website, which it can't save yet.
						__(
							'This part shows on other pages too, so it can’t be changed here yet.',
							'extendify-local',
						)
					: result.refused ||
							// translators: Shown in Quick Edit when saving the social links failed.
							__("Couldn't save them. Please try again.", 'extendify-local'),
			);
			return;
		}
		track('quick-edit-saved', { kind: 'social' });
	};
	commit.current = save;

	const keys = useRef(null);
	keys.current = (event) => {
		// Escape or Enter typed in the chat box mustn't cancel or save the links.
		if (!bar.current?.contains(event.target)) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onDone();
		}
		if (event.key === 'Enter' && !event.isComposing) {
			if (event.target.tagName === 'BUTTON') return;
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
			role="dialog"
			// translators: Screen reader name for Quick Edit's panel over the social media links on the user's website, for changing where each goes.
			aria-label={__('Social links', 'extendify-local')}
			className={`group fixed top-0 left-0 z-100002 flex w-[26rem] max-w-[calc(100vw-1rem)] flex-col gap-1 rounded-agentx-quick-edit p-1 ${SURFACE}`}
		>
			<div className="flex items-center gap-1">
				<DragHandle onPointerDown={drag} />
				<span className="flex-1 text-agentx-quick-edit font-agentx-quick-edit">
					{
						// translators: Heading of Quick Edit's panel over the social media links on the user's website.
						__('Social links', 'extendify-local')
					}
				</span>
				<SaveButtons onCancel={onDone} onSave={save} />
			</div>
			<div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto px-2 pt-1 pb-2">
				{links.map(({ id, name, icon }) => (
					<label
						key={id}
						className="flex items-center gap-2 text-agentx-quick-edit"
					>
						<Icon svg={icon} />
						<span className="w-24 shrink-0 truncate">{name}</span>
						<input
							data-link={id}
							value={urls[id]}
							onChange={(event) =>
								setUrls((now) => ({ ...now, [id]: event.target.value }))
							}
							// translators: Shown in an empty field of Quick Edit's social links panel; a link left empty doesn't show on the site.
							placeholder={__('No link, hidden', 'extendify-local')}
							className={`${FIELD} min-w-0 flex-1`}
						/>
					</label>
				))}
			</div>
			{problem && (
				<p
					role="alert"
					className="m-0 px-2 pb-2 text-agentx-quick-edit text-agentx-quick-edit-problem"
				>
					{problem}
				</p>
			)}
		</div>,
		shellDocument().body,
	);
};

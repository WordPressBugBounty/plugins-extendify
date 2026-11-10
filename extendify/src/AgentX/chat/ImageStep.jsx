import { ImageSheet } from '@agentx/chat/ImageSheet';
import { shownOf, useImagePick } from '@agentx/chat/image-pick';
import {
	CARD_SHAPE,
	CLOSE,
	IN_CARD_CORNER,
	NOTICE_TITLE,
	OPTION,
} from '@agentx/chat/styles';
import { TypedAnswer } from '@agentx/chat/TypedAnswer';
import { useCardKeys } from '@agentx/lib/keyboard';
import { Tooltip } from '@agentx/Tooltip';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { closeSmall, Icon } from '@wordpress/icons';

// The sheet's tabs keep their short names; the card's options say what each one does.
const actionOf = (source) =>
	({
		// translators: An option on the AI Agent's image card; opens a place to choose an image file from the user's own computer.
		upload: __('Upload an image from your computer', 'extendify-local'),
		// translators: An option on the AI Agent's image card; opens the images already uploaded to the site.
		library: __('Pick one from your media library', 'extendify-local'),
		// translators: An option on the AI Agent's image card; opens a search of free stock photos.
		stock: __('Find a free stock photo', 'extendify-local'),
		// translators: An option on the AI Agent's image card; opens a place to describe an image for AI to create.
		generate: __('Create one with AI', 'extendify-local'),
	})[source];

// Code or a link names no photo; searched as one, it finds a stranger's photo.
const LINKED = /<iframe\b|https?:\/\/|\bwww\.|\b[a-z0-9-]+\.[a-z]{2,}\/\S/i;

export const ImageStep = ({
	part,
	chat,
	floating,
	onAnswer,
	onClose,
	onTyped,
}) => {
	const {
		busy,
		problem,
		sheet,
		take,
		openSheet,
		fromWords,
		which,
		tabs,
		openerRef,
		demo,
		sheetKey,
		sheetProps,
	} = useImagePick(part, {
		floating,
		// A new picture moves the blocks after it, which a plan's later steps follow by id.
		onSaved: (image, moved) =>
			onAnswer(async () => ({
				image: shownOf(image),
				...(moved && { moved }),
			})),
	});
	const keys = useCardKeys(demo);
	// Once a tool opens, the card stays that tool, with no way back to the choices.
	const [shownTab, setShownTab] = useState(sheet);
	useEffect(() => {
		if (sheet) setShownTab(sheet);
	}, [sheet]);
	const [over, setOver] = useState(false);
	const choose =
		which === 'block' && typeof part.input?.choose === 'string'
			? part.input.choose.trim()
			: '';
	const question =
		part.input?.question ||
		{
			// translators: The AI Agent's question on its small card for changing the site's logo.
			logo: __('Which image should be your logo?', 'extendify-local'),
			// translators: The AI Agent's question on its small card for changing the site icon, the small image in the browser tab.
			icon: __('Which image should be your site icon?', 'extendify-local'),
		}[part.input?.target] ||
		// translators: The AI Agent's question on its small card for choosing an image for one spot on the page.
		__('Which image should go here?', 'extendify-local');

	return (
		<section
			{...keys}
			aria-label={question}
			onKeyDown={(event) => {
				keys.onKeyDown(event);
				if (event.key !== 'Escape' || busy || shownTab) return;
				event.stopPropagation();
				onClose();
			}}
			onDragOver={(event) => {
				event.preventDefault();
				setOver(true);
			}}
			onDragLeave={(event) => {
				if (event.currentTarget.contains(event.relatedTarget)) return;
				setOver(false);
			}}
			onDrop={(event) => {
				event.preventDefault();
				setOver(false);
				take(event.dataTransfer.files?.[0]);
			}}
			className={`agentx-focus relative flex flex-col gap-2 ${shownTab ? CARD_SHAPE.replace('p-3', 'p-0') : CARD_SHAPE} border-agentx-image-card-border bg-agentx-image-card text-agentx-image-card-ink ${over ? 'outline-2 outline-agentx-image-card-drop outline-dashed' : ''}`}
		>
			{shownTab ? (
				<ImageSheet
					key={sheetKey}
					{...sheetProps}
					tab={sheet ?? shownTab}
					chat={chat}
					onClose={onClose}
					inline
				/>
			) : (
				<>
					<p className={`m-0 pe-5 ${NOTICE_TITLE}`}>{question}</p>
					{choose && (
						<button
							type="button"
							disabled={busy}
							onClick={() => fromWords(choose)}
							className={OPTION}
						>
							{
								// translators: An option on the AI Agent's image card; the agent finds a photo that fits this spot on the page and puts it in.
								__('Choose for me', 'extendify-local')
							}
						</button>
					)}
					{tabs.map((source) => (
						<button
							key={source}
							ref={(node) => openerRef(source, node)}
							type="button"
							disabled={busy}
							onClick={() => openSheet(source)}
							className={OPTION}
						>
							{actionOf(source)}
						</button>
					))}
					<Tooltip
						text={
							// translators: Closes the AI Agent's small image card; the image stays as it is, and a plan waiting on it goes on.
							__('Skip this image', 'extendify-local')
						}
						className={IN_CARD_CORNER}
					>
						<button
							type="button"
							onClick={onClose}
							disabled={busy}
							aria-label={__('Skip this image', 'extendify-local')}
							className={CLOSE}
						>
							<Icon icon={closeSmall} size={24} className="fill-current" />
						</button>
					</Tooltip>
					<TypedAnswer
						onAnswer={(text) =>
							onTyped && LINKED.test(text) ? onTyped(text) : fromWords(text)
						}
						busy={busy}
						placeholder={
							which === 'block'
								? // translators: Short placeholder in the field on the AI Agent's image card, where the user describes the picture they want and the agent finds a photo for it.
									__('Describe it', 'extendify-local')
								: undefined
						}
					/>
					{problem && (
						<p role="alert" className="m-0 text-agentx-alert">
							{problem}
						</p>
					)}
				</>
			)}
		</section>
	);
};

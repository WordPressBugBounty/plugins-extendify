import {
	BLOCK,
	BLOCK_TYPE,
	siteFrame,
	useSiteDocument,
} from '@agentx/lib/block-box';
import { editBlocks } from '@agentx/lib/edit-blocks';
import { useEffect, useState } from '@wordpress/element';

const TITLE = 'data-extendify-title';

// Only the header's: hiding the footer's title is left to the agent, when asked.
export const headerLogo = (doc = siteFrame()?.contentDocument) =>
	doc?.querySelector(`header [${BLOCK_TYPE}="core/site-logo"][${TITLE}]`) ??
	null;

const stateOf = (logo) =>
	logo && {
		id: logo.getAttribute(BLOCK),
		shown: logo.getAttribute(TITLE) === 'shown',
	};

export const showTitle = (id, visible) =>
	editBlocks({
		ops: [
			{
				op: 'logo-title',
				block: id,
				type: 'core/site-logo',
				visible,
				direct: true,
			},
		],
	});

// The title has no mark of its own, so it goes by the logo beside it.
export const titleRowOf = (part) => {
	if (!part?.block?.closest?.('header')) return null;
	const logo =
		part.type === 'core/site-title'
			? headerLogo(part.block.ownerDocument)
			: part.type === 'core/site-logo'
				? part.block
				: null;
	if (!logo?.hasAttribute(TITLE)) return null;
	if (logo !== part.block && !logo.parentElement?.contains(part.block)) {
		return null;
	}
	const { id, shown } = stateOf(logo);
	return { logo: id, shown };
};

// A redraw swaps the logo for a new element, so its mark is read again.
export const useHeaderLogo = () => {
	const doc = useSiteDocument();
	const [logo, setLogo] = useState(null);
	useEffect(() => {
		if (!doc?.body) return;
		const read = () =>
			setLogo((was) => {
				const now = stateOf(headerLogo(doc));
				return was?.id === now?.id && was?.shown === now?.shown ? was : now;
			});
		read();
		const watching = new MutationObserver(read);
		watching.observe(doc.body, {
			subtree: true,
			childList: true,
			attributeFilter: [TITLE],
		});
		return () => watching.disconnect();
	}, [doc]);
	return logo;
};

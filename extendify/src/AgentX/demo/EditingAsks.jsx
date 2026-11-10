import { submit } from '@agentx/chat/conversation';
import {
	BLOCK,
	BLOCK_TYPE,
	scrollToBlock,
	siteFrame,
} from '@agentx/lib/block-box';
import { selectBlock } from '@agentx/lib/pick-block';
import { presetsOf } from '@agentx/lib/presets';
import { useSelectionStore } from '@agentx/state/selection';
import { useShellStore } from '@agentx/state/shell';
import { Fragment } from '@wordpress/element';

const typeOf = (element) => element.getAttribute(BLOCK_TYPE);
const wordsIn = (element) => element.textContent.replace(/\s+/g, ' ').trim();
// The page's own blocks first, then a synced pattern's, then the header and footer.
const rankOf = (element) => {
	const doc = element.ownerDocument;
	const page = /(?:page-id|postid)-(\d+)/.exec(doc.body.className)?.[1];
	const id = element.getAttribute(BLOCK);
	if (page && id.startsWith(`post:${page}:`)) return 0;
	return id.startsWith('post:') ? 1 : 2;
};

const first =
	(type, also = () => true) =>
	(blocks) =>
		blocks
			.filter((b) => typeOf(b) === type && also(b))
			.sort((a, b) => rankOf(a) - rankOf(b))[0];

const named = (type) =>
	first(type, (b) => wordsIn(b).length > 2 && wordsIn(b).length < 60);

// A section holds a heading and other blocks, so heading and text asks have something to reach.
const section = first(
	'core/group',
	(b) =>
		b.querySelector('[data-extendify-block-type="core/heading"]') &&
		b.querySelectorAll(`[${BLOCK}]`).length > 2 &&
		b.querySelectorAll(`[${BLOCK}]`).length < 15,
);

// The theme color a button shows, by name, so asking for it lands on what it already has.
const buttonColor = (button) => {
	const link = button.querySelector('a, button') ?? button;
	const seen =
		link.ownerDocument.defaultView.getComputedStyle(link).backgroundColor;
	const preset = (presetsOf().colors ?? []).find((p) => p.computed === seen);
	return preset ? `make this button ${preset.name.toLowerCase()}` : null;
};

const opening = (element) => wordsIn(element).split(' ').slice(0, 5).join(' ');

// pick finds the block the demo selects; find names one for the agent to find, with nothing selected.
const ASKS = [
	[
		'Agent finds the block',
		[
			{
				label: 'A heading, by its words',
				find: named('core/heading'),
				text: (b) => `make the “${wordsIn(b)}” heading red`,
			},
			{
				label: 'A button, by its words',
				find: named('core/button'),
				text: (b) => `make the “${wordsIn(b)}” button bigger`,
			},
			{
				label: 'A paragraph, by how it starts',
				find: first('core/paragraph', (b) => wordsIn(b).split(' ').length > 5),
				text: (b) => `make the paragraph that starts “${opening(b)}” italic`,
			},
			{
				label: 'Every heading at once',
				find: () => true,
				text: () => 'make all the headings brown',
			},
			{
				label: 'Undo the last change',
				find: () => true,
				text: () => 'undo that',
			},
		],
	],
	[
		'Demo selects the block',
		[
			{
				label: 'Heading color',
				pick: named('core/heading'),
				text: () => 'make this red',
			},
			{
				label: 'Heading rewrite',
				pick: named('core/heading'),
				text: () => 'make this heading shorter and punchier',
			},
			{
				label: 'Button color it already has',
				pick: first('core/button', buttonColor),
				text: buttonColor,
			},
			{
				label: 'Button place in its row',
				pick: first('core/button'),
				text: () => 'move the button to the left',
			},
			{
				label: 'Section headings color',
				pick: section,
				text: () => 'make the headings in this section brown',
			},
			{
				label: 'Section text, which its words override',
				pick: section,
				text: () => 'make the text in this section smaller',
			},
			{
				label: 'Section redo, a plan',
				pick: section,
				text: () =>
					'redo this section: a new photo, a red heading and a playful line under it',
			},
			{
				label: 'Picture width',
				// An icon-sized picture makes a poor demo of shrinking.
				pick: first('core/image', (b) => b.getBoundingClientRect().width > 150),
				text: () => 'make this picture smaller',
			},
			{
				label: 'Cover photo darker',
				pick: first('core/cover'),
				text: () => 'darken the photo so the words stand out',
			},
			{
				label: 'Columns lined up',
				pick: first('core/columns'),
				text: () => 'line these up at the top',
			},
			{
				label: 'Social icons bigger',
				pick: first('core/social-links'),
				text: () => 'make the icons bigger',
			},
			{
				label: 'Spacer height',
				pick: first('core/spacer'),
				text: () => 'make this gap smaller',
			},
			{
				label: 'Delete a paragraph',
				pick: named('core/paragraph'),
				text: () => 'remove this',
			},
		],
	],
	[
		'Site',
		[
			{
				label: 'Slow site check',
				text: () => 'my site seems slow can you check why',
			},
			{
				label: 'Site title suggestions',
				text: () => 'suggest a better site title',
			},
			{
				label: 'Rename the site',
				text: () => "change the site title to Palmer's Diner",
			},
			{ label: 'New page', text: () => 'create an about page for our team' },
			{
				label: 'Take a page offline',
				text: () => 'take the contact page offline',
			},
		],
	],
	[
		'Design',
		[
			{ label: 'Site colors', text: () => 'change my site colors' },
			{ label: 'Fonts', text: () => 'try different fonts' },
			{ label: 'Animation', text: () => 'add some animation to the page' },
		],
	],
	[
		'Plugins and help',
		[
			{ label: 'Plugin pick', text: () => 'add a contact form to my site' },
			{
				label: 'Plugin for bookings',
				text: () => 'I want people to book tables online',
			},
			{ label: 'What the agent can do', text: () => 'what can you do?' },
			{ label: 'WordPress question', text: () => 'how do I add a new user?' },
		],
	],
];

const matches = (query, ...texts) =>
	!query ||
	texts.some((text) => text.toLowerCase().includes(query.toLowerCase()));

const pageBlocks = () => {
	const doc = siteFrame()?.contentDocument;
	return doc ? [...doc.querySelectorAll(`[${BLOCK}]`)] : [];
};

export const EditingAsks = ({ query }) => {
	const setChatDemo = useShellStore((state) => state.setChatDemo);
	const setDevToolView = useShellStore((state) => state.setDevToolView);
	const blocks = pageBlocks();
	const shown = ASKS.map(([group, asks]) => [
		group,
		asks
			.filter(({ label }) => matches(query, group, label))
			.map((ask) => {
				const block = (ask.pick ?? ask.find)?.(blocks) ?? null;
				const needs = ask.pick || ask.find;
				return { ...ask, block, missing: Boolean(needs) && !block };
			}),
	]).filter(([, asks]) => asks.length);

	const run = ({ pick, block, text }) => {
		setChatDemo(null);
		setDevToolView(null);
		if (pick) {
			selectBlock(block.getAttribute(BLOCK));
			scrollToBlock(block);
		} else {
			useSelectionStore.setState({
				picking: false,
				pickAfter: null,
				block: null,
			});
		}
		submit(text(block));
	};

	if (!shown.length) {
		return <p className="m-0 text-sm text-gray-700">Nothing matches.</p>;
	}
	return (
		<div className="flex max-h-112 flex-col overflow-y-auto rounded-sm border border-gray-300 bg-white">
			{shown.map(([group, asks], at) => (
				<Fragment key={group}>
					<p
						className={`m-0 px-2 pt-2 pb-1 text-xs font-medium tracking-wide text-gray-600 uppercase ${at ? 'border-t border-gray-200' : ''}`}
					>
						{group}
					</p>
					{asks.map((ask) => (
						<button
							key={ask.label}
							type="button"
							disabled={ask.missing}
							title={
								ask.missing ? 'Nothing on this page to try it on' : undefined
							}
							onClick={() => run(ask)}
							className="cursor-pointer border-0 bg-transparent px-2 py-1 text-start text-sm text-gray-900 hover:bg-gray-50 disabled:cursor-default disabled:text-gray-400 disabled:hover:bg-transparent"
						>
							{ask.label}
						</button>
					))}
				</Fragment>
			))}
		</div>
	);
};

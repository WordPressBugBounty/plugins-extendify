import { Tooltip } from '@agentx/Tooltip';

// A three-digit hex needs a letter, so a number like "#123" stays plain.
const HEX =
	/((?<![\w&])#(?:[\da-f]{6}|(?=[\da-f]{0,2}[a-f])[\da-f]{3})(?![\w-]))/i;

const swatched = (node) => {
	if (!node.children || node.tagName === 'pre') return;
	// A rehype plugin changes the tree it's given.
	node.children = node.children.flatMap((child) => {
		if (child.type !== 'text') {
			swatched(child);
			return [child];
		}
		return child.value.split(HEX).flatMap((piece, at) => {
			if (at % 2) {
				return [
					{
						type: 'element',
						tagName: 'span',
						properties: { dataHex: piece },
						children: [{ type: 'text', value: piece }],
					},
				];
			}
			return piece ? [{ type: 'text', value: piece }] : [];
		});
	});
};

// Each hex color in the agent's words becomes a span the chat draws with its swatch.
export const rehypeSwatches = () => swatched;

// Phones have no hover, so the small square beside the hex is the one that always shows.
export const Swatched = ({ hex }) => (
	<Tooltip
		className="align-[-0.125em]"
		text={
			<span
				className="block size-10 rounded-agentx-control border border-solid border-agentx-card-border"
				style={{ backgroundColor: hex }}
			/>
		}
	>
		<span className="inline-flex items-center gap-1 whitespace-nowrap">
			<span
				aria-hidden="true"
				className="inline-block size-3 shrink-0 rounded-[3px] border border-solid border-agentx-card-border"
				style={{ backgroundColor: hex }}
			/>
			<span>{hex}</span>
		</span>
	</Tooltip>
);

export const WithSwatches = ({ text }) =>
	String(text)
		.split(HEX)
		.map((piece, at) => (at % 2 ? <Swatched key={at} hex={piece} /> : piece));

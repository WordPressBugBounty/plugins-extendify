import { makeId } from '@agent/lib/util';

// Providers reject a tool/function name with characters outside this set, and
// ability ids are namespaced with a slash (e.g. woocommerce/products-query).
export const toolName = (id) => id.replace(/[^a-zA-Z0-9_.-]/g, '_');

// The provider rejects a tool result unless it's paired with an assistant
// tool-call sharing its id, so emit both.
export const buildToolMessages = ({ id, inputs, result }) => {
	const toolCallId = makeId();
	const name = toolName(id);
	return [
		{
			role: 'assistant',
			content: [
				{ type: 'tool-call', toolCallId, toolName: name, input: inputs ?? {} },
			],
		},
		{
			role: 'tool',
			content: [
				{
					type: 'tool-result',
					toolCallId,
					toolName: name,
					output: { type: 'json', value: result ?? null },
				},
			],
		},
	];
};

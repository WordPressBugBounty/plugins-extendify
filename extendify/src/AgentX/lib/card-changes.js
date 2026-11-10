// Cards report changes here and the chat turns each into a step, so no card has to load the chat.
let handler = null;
const waiting = [];

export const onCardChange = (handle) => {
	handler = handle;
	for (const change of waiting.splice(0)) handle(change);
};

export const noteChange = (change) =>
	handler ? handler(change) : waiting.push(change);

let folder = null;

export const onCardFold = (handle) => {
	folder = handle;
};

export const noteFold = (toolCallId, folded) => folder?.(toolCallId, folded);

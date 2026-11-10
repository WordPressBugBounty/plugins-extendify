// An id is a position, so after an edit it is read through the ids the draft said moved; null once the block is gone.
// Each entry covers the blocks inside it too, unless one of them has an entry of its own.
export const movedId = (id, ids = {}) => {
	if (!id) return id;
	const split = id.lastIndexOf(':');
	const source = id.slice(0, split);
	const parts = id.slice(split + 1).split('.');
	for (let depth = parts.length; depth > 0; depth--) {
		const prefix = `${source}:${parts.slice(0, depth).join('.')}`;
		if (!(prefix in ids)) continue;
		const to = ids[prefix];
		return to === null ? null : [to, ...parts.slice(depth)].join('.');
	}
	return id;
};

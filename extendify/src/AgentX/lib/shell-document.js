// The shell's own page: the Designer draws the shell inside a frame of its own.
export const shellDocument = () =>
	document.getElementById('extendify-agentx-shell')?.ownerDocument ?? document;

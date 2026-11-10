// As the block editor writes them, so it reads them back as its own colors.
const CLEAR = 'rgba(0, 0, 0, 0)';

const isClear = (value) =>
	!value || /^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/i.test(value.trim());

const atomsOf = (words) => {
	const atoms = [];
	const walk = (node, stack) => {
		for (const [index, child] of [...node.childNodes].entries()) {
			if (child.nodeType === Node.TEXT_NODE) {
				for (let at = 0; at < child.data.length; at++) {
					atoms.push({ node: child, offset: at, stack, text: child.data[at] });
				}
			} else if (child.nodeName === 'BR') {
				atoms.push({ node, offset: index, stack, br: child });
			} else if (child.nodeType === Node.ELEMENT_NODE) {
				walk(child, [...stack, child]);
			}
		}
	};
	walk(words, []);
	return atoms;
};

const offsetAt = (atoms, container, offset) => {
	const point = container.ownerDocument.createRange();
	point.setStart(container, offset);
	return atoms.filter(
		({ node, offset: at }) => point.comparePoint(node, at) < 0,
	).length;
};

const pointAt = (atoms, words, offset) => {
	const atom = atoms[offset];
	if (atom) return [atom.node, atom.offset];
	const last = atoms.at(-1);
	return last ? [last.node, last.offset + 1] : [words, 0];
};

// Counted in characters, so a selection survives the words being rebuilt.
export const spanOf = (words, range) => {
	const atoms = atomsOf(words);
	if (!range || !words.contains(range.commonAncestorContainer)) {
		return { start: 0, end: 0 };
	}
	return {
		start: offsetAt(atoms, range.startContainer, range.startOffset),
		end: offsetAt(atoms, range.endContainer, range.endOffset),
	};
};

export const selectSpan = (words, { start, end }) => {
	const atoms = atomsOf(words);
	const range = words.ownerDocument.createRange();
	range.setStart(...pointAt(atoms, words, start));
	range.setEnd(...pointAt(atoms, words, end));
	const selection = words.ownerDocument.getSelection();
	selection?.removeAllRanges();
	selection?.addRange(range);
};

const slugOf = (mark, pattern) =>
	[...mark.classList]
		.map((name) => pattern.exec(name)?.[1])
		.find((slug) => slug && slug !== 'inline' && !slug.endsWith('-background'));

// The innermost mark's color shows, so later marks win.
const colorsOf = (stack) => {
	const colors = {};
	for (const mark of stack) {
		if (mark.nodeName !== 'MARK') continue;
		const text = slugOf(mark, /^has-(.+)-color$/);
		if (text) colors.text = { slug: text };
		else if (mark.style.color) colors.text = { value: mark.style.color };
		const background = slugOf(mark, /^has-(.+)-background-color$/);
		if (background) colors.background = { slug: background };
		else if (!isClear(mark.style.backgroundColor)) {
			colors.background = { value: mark.style.backgroundColor };
		}
	}
	return colors;
};

const markFor = (doc, { text, background }) => {
	const mark = doc.createElement('mark');
	const classes = ['has-inline-color'];
	const styles = [];
	// A mark draws a yellow background of its own unless told otherwise.
	if (!background) styles.push(`background-color:${CLEAR}`);
	else if (background.slug) {
		classes.push(`has-${background.slug}-background-color`);
	} else styles.push(`background-color:${background.value}`);
	if (text?.slug) classes.push(`has-${text.slug}-color`);
	else if (text) styles.push(`color:${text.value}`);
	if (styles.length) mark.setAttribute('style', styles.join(';'));
	mark.className = classes.join(' ');
	return mark;
};

const build = (doc, atoms) => {
	const fragment = doc.createDocumentFragment();
	const open = [];
	for (const atom of atoms) {
		let same = 0;
		while (same < open.length && open[same].from === atom.stack[same]) same++;
		open.length = same;
		for (const from of atom.stack.slice(same)) {
			const element = from.cloneNode(false);
			(open.at(-1)?.element ?? fragment).append(element);
			open.push({ from, element });
		}
		const parent = open.at(-1)?.element ?? fragment;
		if (atom.br) parent.append(atom.br.cloneNode(false));
		else if (parent.lastChild?.nodeType === Node.TEXT_NODE) {
			parent.lastChild.appendData(atom.text);
		} else parent.append(doc.createTextNode(atom.text));
	}
	return fragment;
};

// With nothing selected every word takes the color, as in the editor.
export const colorWords = (words, { start, end }, kind, color) => {
	const doc = words.ownerDocument;
	const atoms = atomsOf(words);
	const [from, to] = start === end ? [0, atoms.length] : [start, end];
	const key = kind === 'text' ? 'text' : 'background';
	const marks = new Map();
	const next = atoms.map((atom, index) => {
		if (index < from || index >= to || atom.br) return atom;
		const colors = { ...colorsOf(atom.stack), [key]: color };
		if (!color) delete colors[key];
		const rest = atom.stack.filter((element) => element.nodeName !== 'MARK');
		if (!colors.text && !colors.background) return { ...atom, stack: rest };
		const id = JSON.stringify(colors);
		if (!marks.has(id)) marks.set(id, markFor(doc, colors));
		return { ...atom, stack: [...rest, marks.get(id)] };
	});
	words.replaceChildren(build(doc, next));
	return { start: from, end: to };
};

// The theme's own colors, as the page shows them; a palette's card tints are left out.
export const swatchesOf = (presets) =>
	(presets.colors ?? [])
		.filter(({ custom }) => !custom)
		.map(({ slug, name, computed, value, color }) => ({
			slug,
			name,
			css: computed || value || color,
		}))
		.filter(({ css }) => Boolean(css));

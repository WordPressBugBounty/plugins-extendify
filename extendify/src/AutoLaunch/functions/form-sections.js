import { createBlock, parse, serialize } from '@wordpress/blocks';

// Placeholder forms post nowhere; keep only the anchor.
export const emptyFailedFormSections = (patterns) =>
	patterns.map((pattern) => {
		if (!pattern.pluginDependencyFailed) return pattern;
		if (!pattern.code?.includes('dummy-form')) return pattern;

		const [section] = parse(pattern.code);
		if (section?.name !== 'core/group') return pattern;

		return {
			...pattern,
			code: serialize(createBlock(section.name, section.attributes)),
		};
	});

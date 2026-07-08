// Ability workflows are synthesized per-request by the backend under a
// `wp-ability:` id prefix, so they carry no static workflow definition.
export const isAbilityWorkflow = (id) =>
	typeof id === 'string' && id.startsWith('wp-ability:');

// A write to the post the user is looking at won't show until the page reloads.
export const abilityAffectsCurrentPage = (id, input) => {
	const isAbility = (window.extAgentData?.wpAbilities ?? []).some((category) =>
		category.abilities?.some((ability) => ability.name === id),
	);
	const postId = window.extAgentData?.context?.postId;
	return isAbility && Boolean(postId) && Number(input?.id) === Number(postId);
};

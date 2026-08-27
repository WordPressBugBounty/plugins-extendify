import changeHeroSection from '@agent/workflows/theme/tools/change-hero-section';
import updateSiteVibes from '@agent/workflows/theme/tools/update-site-vibes';
import updateVariation from '@agent/workflows/theme/tools/update-variation';

export default async ({
	updatedPageBlocks,
	postId,
	vibeSlug,
	colorAndFontsVariation,
}) => {
	if (!updatedPageBlocks || !vibeSlug || !colorAndFontsVariation) return;

	await Promise.all([
		changeHeroSection({ updatedPageBlocks, postId }),
		(async () => {
			// The vibe write goes last so it owns the contested leaves.
			await updateVariation({ variation: colorAndFontsVariation });
			await updateSiteVibes({ selectedVibe: vibeSlug });
		})(),
	]);
};

import { PRESS } from '@agentx/chat/styles';
import { pickUrl, replayAnimations } from '@agentx/lib/design';
import { pageUrl } from '@agentx/lib/follow-site';
import { useSitePage } from '@agentx/lib/hooks';
import { switchSite } from '@agentx/lib/switch-site';
import { useDraftStore } from '@agentx/state/draft';
import { useRunStore } from '@agentx/state/run';
import { __ } from '@wordpress/i18n';
import { Icon, rotateLeft } from '@wordpress/icons';

// Each cycle is the speed's play time plus the rest its keyframes end with.
const LOOPS = {
	slow: 'group-hover/tile:animate-[agentx-tile-slow_2400ms_ease-out_var(--agentx-tile-delay,0ms)_infinite_both]',
	medium:
		'group-hover/tile:animate-[agentx-tile-medium_2100ms_ease-out_var(--agentx-tile-delay,0ms)_infinite_both]',
	fast: 'group-hover/tile:animate-[agentx-tile-fast_1850ms_ease-out_var(--agentx-tile-delay,0ms)_infinite_both]',
};

const STARTS = {
	fade: '[--agentx-tile-opacity:0]',
	'fade-up': '[--agentx-tile-opacity:0] [--agentx-tile-translate:0_0.4rem]',
	'zoom-in': '[--agentx-tile-opacity:0] [--agentx-tile-scale:0.4]',
};

export const playOf = (kind, speed) =>
	STARTS[kind] ? `${STARTS[kind]} ${LOOPS[speed] ?? LOOPS.medium}` : '';

const siteFrame = () => document.getElementById('extendify-agentx-site');

export const useAnimation = () => {
	const saved = useDraftStore((state) => state.liveAnimation);
	const shown = useDraftStore((state) => state.animation) || saved;
	const [type, speed] = shown.split(':');
	// Picking the saved animation drops the pick, so it isn't left as an unsaved change.
	const pickOf = (id) => (id === saved ? '' : id);
	return { saved, shown, type, speed, pickOf };
};

// A frame showing a color or font preview has its animations off, so it loads the animation first.
const playAgain = async (animation) => {
	const frame = siteFrame();
	if (!frame.contentWindow.ExtendableAnimations?.reset) {
		const href = pageUrl(frame.contentWindow.location.href);
		await switchSite(frame, pickUrl(href, 'animation', animation));
	}
	replayAnimations();
};

// Only replays the frame, so a paused draft still allows it.
export const PlayAgain = () => {
	const page = useSitePage();
	const working = useRunStore((state) => state.working);
	const animation = useDraftStore((state) => state.animation);
	const { type } = useAnimation();
	const disabled = working || !page || type === 'none';

	return (
		<button
			type="button"
			aria-disabled={disabled}
			onClick={() => !disabled && playAgain(animation)}
			className={`agentx-focus flex shrink-0 items-center gap-1 self-start rounded-agentx-control border border-solid border-agentx-button-border bg-agentx-button px-3 py-[5px] text-agentx-body font-agentx-button text-agentx-button-ink ${PRESS} not-aria-disabled:hover:bg-agentx-button-hover aria-disabled:text-agentx-button-ink/[var(--agentx-disabled-opacity,50%)]`}
		>
			<Icon icon={rotateLeft} size={20} className="fill-current" />
			{
				// translators: Plays the site's entrance animations again in the AI Agent's site preview.
				__('Play again', 'extendify-local')
			}
		</button>
	);
};

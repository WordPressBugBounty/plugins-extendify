import { BrandBar } from '@agentx/PartnerLogo';
import { MOVE } from '@agentx/templates/Canvas';
import { useChatWidth } from '@agentx/templates/Chat';
import { useEffect, useRef } from '@wordpress/element';
import { motion, useReducedMotion } from 'motion/react';

// On the logo bar's fill the buttons need its ink, or a dark bar hides them.
const ON_BAR =
	'[--color-agentx-bell-hover:var(--color-agentx-brand-hover)] [--color-agentx-bell-ink:var(--color-agentx-brand-ink)] [--color-agentx-chat-toggle-hover:var(--color-agentx-brand-hover)] [--color-agentx-chat-toggle-ink:var(--color-agentx-brand-ink)] [--color-agentx-header-active:var(--color-agentx-brand-hover)]';

export const TopBar = ({
	brand,
	bell,
	chatToggle,
	toolbar,
	header,
	minimized,
}) => {
	const width = useChatWidth();
	const reduceMotion = useReducedMotion();
	// Only minimizing glides; a resize drag has to keep the bar on the chat's edge.
	const was = useRef(minimized);
	const glide = was.current !== minimized && !reduceMotion;
	useEffect(() => {
		was.current = minimized;
	});
	const buttons = (
		<span
			className={`flex shrink-0 items-center gap-1 ${header.onBar ? ON_BAR : ''}`}
		>
			{chatToggle}
			{bell}
		</span>
	);
	return (
		<div className="flex h-10 shrink-0 items-center">
			<div className="shrink-0 pr-agentx-gap pl-5">
				{/* Over a minimized chat the bar fits its logo, or it hangs over the site. */}
				<motion.div
					initial={false}
					animate={{ width: minimized ? 'auto' : width }}
					transition={glide ? MOVE : { duration: 0 }}
					style={{ maxWidth: width }}
				>
					<BrandBar data-agentx-brand className="min-h-10">
						{brand}
						{header.onBar ? buttons : null}
					</BrandBar>
				</motion.div>
			</div>
			<div className="flex min-w-0 flex-1 items-center gap-1">
				{header.onBar ? null : buttons}
				<div className="ms-auto flex min-w-0 items-center justify-end gap-1">
					{toolbar}
				</div>
			</div>
		</div>
	);
};

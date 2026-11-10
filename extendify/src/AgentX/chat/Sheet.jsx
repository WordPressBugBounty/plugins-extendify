import { SHEET_CLOSE } from '@agentx/chat/styles';
import { sheetKeys } from '@agentx/lib/keyboard';
import { Tooltip } from '@agentx/Tooltip';
import { useId } from '@wordpress/element';
import { closeSmall, Icon } from '@wordpress/icons';
import { motion, useReducedMotion } from 'motion/react';

const SLIDE = { type: 'spring', stiffness: 400, damping: 40 };

export const Sheet = ({
	sheet,
	title,
	closeLabel,
	onClose,
	onKeyDown,
	children,
}) => {
	const id = useId();
	const reduceMotion = useReducedMotion();
	return (
		<>
			<div
				aria-hidden="true"
				onClick={onClose}
				className="absolute inset-0 z-20 bg-agentx-sheet-scrim"
			/>
			{/* Clips only the bottom edge, so the sheet slides up from below with its shadow showing. */}
			<div className="pointer-events-none absolute inset-0 z-30 [clip-path:inset(-3rem_-3rem_0_-3rem)]">
				<motion.div
					ref={sheet}
					role="dialog"
					aria-modal="true"
					aria-labelledby={`${id}-title`}
					// A click on its heading or empty space keeps focus, and with it Escape, in the sheet.
					tabIndex={-1}
					onKeyDown={(event) => {
						onKeyDown?.(event);
						sheetKeys(event, sheet.current, onClose);
					}}
					initial={{ y: '100%' }}
					animate={{ y: 0 }}
					exit={{ y: '100%' }}
					transition={reduceMotion ? { duration: 0 } : SLIDE}
					className="pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-[75%] flex-col rounded-t-agentx-sheet bg-agentx-sheet text-agentx-sheet-ink shadow-(--agentx-sheet-shadow) ring-1 ring-inset ring-agentx-sheet-border outline-none"
				>
					<div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3 pb-2">
						<h2
							id={`${id}-title`}
							className="m-0 text-agentx-sheet-title font-agentx-sheet-title text-agentx-sheet-title-ink"
						>
							{title}
						</h2>
						<Tooltip text={closeLabel} className="-me-3">
							<button
								type="button"
								onClick={onClose}
								aria-label={closeLabel}
								className={SHEET_CLOSE}
							>
								<Icon icon={closeSmall} size={24} className="fill-current" />
							</button>
						</Tooltip>
					</div>
					{children}
				</motion.div>
			</div>
		</>
	);
};

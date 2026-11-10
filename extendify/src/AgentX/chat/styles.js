// Press feedback for a button, felt more than seen; a disabled one takes none.
export const PRESS =
	'transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] not-aria-disabled:not-disabled:active:scale-(--agentx-press-scale)';

// A choice on a card with a swatch or mark before its words.
export const CHOICE_ROW = `agentx-focus flex min-w-0 items-center gap-3 rounded-agentx-option border border-solid border-agentx-option-border bg-agentx-option px-3 py-2 text-start text-agentx-body text-agentx-option-ink ${PRESS} not-disabled:hover:bg-agentx-option-hover disabled:opacity-[var(--agentx-disabled-opacity,60%)]`;

// The plan's Stop and an action card's one button.
export const CARD_ACTION = `agentx-focus inline-flex h-7 shrink-0 items-center gap-1.5 rounded-agentx-control border border-solid border-agentx-plan-stop-border bg-agentx-plan-stop px-2.5 text-agentx-plan-stop-label text-agentx-plan-stop-ink ${PRESS} hover:bg-agentx-plan-stop-hover`;

// A card with colors of its own takes the shape alone, since two important fills on one element fight.
export const CARD_SHAPE =
	'rounded-agentx-notice border border-solid p-3 text-agentx-notice-body shadow-(--agentx-notice-shadow)';

// Every card and bar takes these, so their padding, corners and X agree.
export const CARD = `${CARD_SHAPE} border-agentx-notice-border bg-agentx-notice text-agentx-notice-ink`;

// Buttons 8px in from a card's edge need its corner to be theirs plus 8px, or the curves don't nest.
export const ROW_CORNER = 'rounded-agentx-notice-row';

export const ROW_CARD_SHAPE = `${ROW_CORNER} border border-solid p-[7px] text-agentx-notice-body shadow-(--agentx-notice-shadow)`;

export const ROW_CARD = `${ROW_CARD_SHAPE} border-agentx-notice-border bg-agentx-notice`;

export const NOTICE_TITLE =
	'text-agentx-notice-title-ink [font-weight:var(--font-weight-agentx-notice-title,var(--font-weight-agentx-title,400))]';

export const NOTICE_TITLE_500 =
	'text-agentx-notice-title-ink [font-weight:var(--font-weight-agentx-notice-title,var(--font-weight-agentx-title,500))]';

// No fill, so the glyph can sit on the text's edge.
export const CLOSE_BASE = `agentx-focus flex size-8 shrink-0 items-center justify-center rounded-agentx-control border-0 bg-transparent p-0 ${PRESS} aria-disabled:opacity-[var(--agentx-disabled-opacity,60%)] disabled:opacity-[var(--agentx-disabled-opacity,60%)]`;

export const CLOSE = `${CLOSE_BASE} text-agentx-notice-close enabled:hover:text-agentx-notice-ink`;

export const SHEET_CLOSE = `${CLOSE_BASE} text-agentx-sheet-close enabled:hover:text-agentx-sheet-ink`;

// In a CARD's corner, its glyph lines up with the text's end edge and its first line.
export const IN_CARD_CORNER = 'absolute end-0 top-1.5';

export const OPTION = `agentx-focus w-full rounded-agentx-option border border-agentx-option-border bg-agentx-option min-h-8 px-3 py-[5px] text-start font-agentx-button leading-5 break-words text-agentx-option-ink ${PRESS} enabled:hover:bg-agentx-option-hover disabled:opacity-[var(--agentx-disabled-opacity,60%)]`;

const FILLED = `agentx-focus inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-agentx-control border-0 px-3 text-agentx-body font-agentx-button whitespace-nowrap ${PRESS} not-aria-disabled:not-disabled:hover:brightness-(--agentx-hover-brightness) disabled:opacity-[var(--agentx-disabled-opacity,60%)]`;

// One size for every card's buttons, so no card's main action looks louder than another's.
export const PRIMARY = `${FILLED} bg-agentx-primary text-agentx-primary-ink aria-disabled:bg-agentx-primary/[var(--agentx-disabled-opacity,60%)]`;

export const CARD_PRIMARY = `${FILLED} bg-agentx-cards-primary text-agentx-cards-primary-ink aria-disabled:bg-agentx-cards-primary/[var(--agentx-disabled-opacity,60%)]`;

export const SHEET_PRIMARY = `${FILLED} bg-agentx-sheet-primary text-agentx-sheet-primary-ink aria-disabled:bg-agentx-sheet-primary/[var(--agentx-disabled-opacity,60%)]`;

export const SAVE_BUTTON = `${FILLED} bg-agentx-save text-agentx-save-ink aria-disabled:bg-agentx-save/[var(--agentx-disabled-opacity,60%)]`;

export const GUIDE_NEXT = `${FILLED} bg-agentx-guide-next text-agentx-guide-next-ink aria-disabled:bg-agentx-guide-next/[var(--agentx-disabled-opacity,60%)]`;

// PRIMARY's size, for buttons side by side where neither is louder.
export const OUTLINED = `agentx-focus inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-agentx-control border border-solid border-agentx-button-border bg-agentx-button px-3 text-agentx-body font-agentx-button whitespace-nowrap text-agentx-button-ink ${PRESS} not-aria-disabled:not-disabled:hover:bg-agentx-button-hover disabled:opacity-[var(--agentx-disabled-opacity,60%)]`;

// OUTLINED's look for a button with only an icon, which its padding would squeeze to a dot.
export const OUTLINED_ICON = `agentx-focus inline-flex size-8 shrink-0 items-center justify-center rounded-agentx-control border border-solid border-agentx-button-border bg-agentx-button p-0 text-agentx-button-ink ${PRESS} not-aria-disabled:not-disabled:hover:bg-agentx-button-hover disabled:opacity-[var(--agentx-disabled-opacity,60%)]`;

// The ::after widens what a pointer can hit without moving the text.
const TEXT_ACTION_BASE =
	'agentx-focus relative border-0 bg-transparent p-0 text-agentx-caption font-agentx-button whitespace-nowrap underline decoration-transparent underline-offset-3 transition-colors after:absolute after:-inset-1.5 after:content-[""] not-aria-disabled:hover:decoration-current';

export const TEXT_ACTION = `${TEXT_ACTION_BASE} text-agentx-ink aria-disabled:text-agentx-muted`;

export const HISTORY_ACTION = `${TEXT_ACTION_BASE} text-agentx-history-row-ink aria-disabled:text-agentx-sheet-muted`;

const BUTTON = `agentx-focus inline-flex shrink-0 items-center justify-center gap-1 rounded-agentx-control font-agentx-button whitespace-nowrap ${PRESS} aria-disabled:opacity-[var(--agentx-disabled-opacity,50%)] disabled:opacity-[var(--agentx-disabled-opacity,50%)]`;

export const GHOST = `${BUTTON} h-8 border-0 bg-transparent px-2.5 text-agentx-body text-agentx-muted hover:bg-agentx-hover hover:text-agentx-ink`;

export const GHOST_SMALL = `${BUTTON} h-6 border-0 bg-transparent px-2 text-agentx-caption text-agentx-ink hover:bg-agentx-hover`;

export const OUTLINED_SMALL = `${BUTTON} h-6 border border-solid border-agentx-button-border bg-agentx-button px-2 text-agentx-caption text-agentx-button-ink hover:bg-agentx-button-hover`;

export const TILE = `agentx-focus relative rounded-agentx-control border-0 p-0 ring-1 ring-agentx-tile-border ${PRESS} not-aria-pressed:not-aria-disabled:hover:ring-agentx-tile-hover-border aria-pressed:ring-2 aria-pressed:ring-agentx-tile-picked aria-disabled:opacity-[var(--agentx-disabled-opacity,60%)]`;

export const CAPTION = 'text-agentx-caption text-agentx-muted';

export const GUIDE_CAPTION = 'text-agentx-caption text-agentx-guide-muted';

// Choices in one outline with a hairline between them, so a long list reads as one thing.
export const LIST =
	'm-0 flex list-none flex-col overflow-hidden rounded-agentx-control border border-solid border-agentx-list-border bg-agentx-list text-agentx-list-ink p-0';

export const LIST_ROW =
	'flex min-w-0 items-center border-0 border-t border-solid border-agentx-list-border first:border-t-0';

export const LIST_ICON = `agentx-focus-inset flex size-8 shrink-0 items-center justify-center rounded-agentx-control border-0 bg-transparent p-0 text-agentx-notice-muted ${PRESS} enabled:hover:bg-agentx-list-hover enabled:hover:text-agentx-notice-ink aria-pressed:text-agentx-preview-pressed`;

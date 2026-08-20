import { lock, published } from '@wordpress/icons';

const ICONS = { lock, published };

// An unbundled name renders nothing rather than a broken glyph.
export const iconFor = (name) => ICONS[name] ?? null;

<?php

/**
 * Shapes for made styles.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Shapes for a made style's cards, pictures and tinted bands, each named in its source so the agent can take it off.
 */
class Shapes
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    // The card's words move in by the same depth, so none sits under a cut.
    const CARD_CUTS = ['angled' => '20px', 'cut' => '18px'];
    const LEAF = ['topLeft' => '3rem', 'topRight' => '0.5rem', 'bottomRight' => '3rem', 'bottomLeft' => '0.5rem'];
    // A picture's slant faces the words beside it, else runs along its bottom.
    const SLANTS = [
        'image-1--content-top' => 'polygon(0 12%, 100% 0, 100% 100%, 0 100%)',
        'image-1--content-left' => 'polygon(12% 0, 100% 0, 100% 100%, 0 100%)',
        'image-1--content-right' => 'polygon(0 0, 100% 0, 88% 100%, 0 100%)',
        'bottom' => 'polygon(0 0, 100% 0, 100% 88%, 0 100%)',
    ];
    // A full or wide picture is a hero or a banner, which no shape fits.
    const NOT_WIDE = ':not(.alignfull):not(.alignwide)';
    const BAND = '&.has-tertiary-background-color';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The shapes this build draws, by the touch that picks each, so the agent offers only these.
     *
     * @return array
     */
    public static function names()
    {
        return [
            'cardShape' => ['angled', 'cut', 'leaf'],
            'photoShape' => ['arch', 'circle', 'blob', 'slant'],
            'sectionEdge' => ['slant', 'curve'],
        ];
    }

    /**
     * Whether a card shape clips the card, which would also cut its outline and shadow off.
     *
     * @param string $shape A card shape's name.
     * @return bool
     */
    public static function clips($shape)
    {
        return isset(self::CARD_CUTS[$shape]);
    }

    /**
     * A card shape's corners, or null to keep the style's.
     *
     * @param string $shape A card shape's name.
     * @return array|string|null
     */
    public static function cardRadius($shape)
    {
        if ($shape === 'leaf') {
            return self::LEAF;
        }

        return self::clips($shape) ? '0' : null;
    }

    /**
     * @param string $shape A card shape's name.
     * @return string
     */
    public static function cardCss($shape)
    {
        if ($shape === 'leaf') {
            // A picture at the card's edge would poke out past its round corner.
            return '& { overflow: hidden; }';
        }

        if (!self::clips($shape)) {
            return '';
        }

        $cut = 'var(--ext-cut)';
        $path = $shape === 'angled'
            ? "polygon({$cut} 0, 100% 0, calc(100% - {$cut}) 100%, 0 100%)"
            : "polygon({$cut} 0, calc(100% - {$cut}) 0, 100% {$cut}, 100% calc(100% - {$cut}),"
                . " calc(100% - {$cut}) 100%, {$cut} 100%, 0 calc(100% - {$cut}), 0 {$cut})";
        // A clear border adds to the words' own padding, which a new padding would replace.
        return '& { --ext-cut: ' . self::CARD_CUTS[$shape] . "; clip-path: {$path}; }"
            . ' & > :not(.wp-block-image):not(.wp-block-cover):not(.wp-block-media-text__media)'
            . ' { border-inline: var(--ext-cut) solid transparent; }';
    }

    /**
     * Whether a picture shape clips the picture, which would also cut its outline and shadow off.
     *
     * @param string $shape A picture shape's name.
     * @return bool
     */
    public static function photoClips($shape)
    {
        return $shape === 'slant';
    }

    /**
     * @param string $shape A picture shape's name.
     * @param string $name  The image style it goes on, like image-1--content-left.
     * @return string
     */
    public static function photoCss($shape, $name)
    {
        $on = '&' . self::NOT_WIDE;
        switch ($shape) {
            case 'arch':
                return "{$on} { border-radius: 999px 999px 24px 24px; overflow: hidden; }"
                    . " {$on} img { border-radius: inherit; }";
            case 'circle':
                // Cropped square, a hero photo would lose most of itself.
                return "{$on}:not(.ext-hero-section *):not(.wp-block-post-content > :first-child *) img"
                    . ' { aspect-ratio: 1 !important; height: auto !important; object-fit: cover !important;'
                    . ' border-radius: 50%; }';
            case 'blob':
                return "{$on} img { border-radius: 63% 37% 54% 46% / 55% 48% 52% 45%; }";
            case 'slant':
                return "{$on} img { clip-path: " . (self::SLANTS[$name] ?? self::SLANTS['bottom']) . '; }';
            default:
                return '';
        }
    }

    /**
     * The edge drawn past each tinted band's top and bottom, the way waves are.
     *
     * @param string $shape A band edge's name.
     * @return string
     */
    public static function edgeCss($shape)
    {
        $band = self::BAND;
        $drawn = 'content: ""; position: absolute; left: 0; right: 0; height: var(--ext-edge);'
            . ' background-color: inherit; pointer-events: none;';
        if ($shape === 'slant') {
            $rise = self::mask('M0 10 L100 0 V10 Z');
            // Turned around, the bottom edge runs parallel to the top one.
            return '& { --ext-edge: clamp(16px, 4vw, 56px); }'
                . " {$band} { position: relative; margin-block: var(--ext-edge) !important; }"
                . " {$band}::before { {$drawn} bottom: calc(100% - 1px); {$rise} }"
                . " {$band}::after { {$drawn} top: calc(100% - 1px); transform: rotate(180deg); {$rise} }"
                . self::straightAtTop()
                . self::straightAtBottom();
        }

        if ($shape === 'curve') {
            return '& { --ext-edge: clamp(16px, 3.5vw, 48px); }'
                . " {$band} { position: relative; margin-bottom: var(--ext-edge) !important; }"
                . " {$band}::after { {$drawn} top: calc(100% - 1px); " . self::mask('M0 0 H100 A50 10 0 0 1 0 0 Z')
                . ' }'
                . self::straightAtBottom();
        }

        return '';
    }

    // An edge on the page's first band would cut into the header.
    private static function straightAtTop()
    {
        $band = self::BAND;
        return " {$band}:first-child { margin-top: 0 !important; } {$band}:first-child::before { content: none; }";
    }

    // An edge on the page's last band would leave a gap above the footer.
    private static function straightAtBottom()
    {
        $band = self::BAND;
        return " {$band}:last-child { margin-bottom: 0 !important; } {$band}:last-child::after { content: none; }";
    }

    // The agent's page outline finds a section's edges by their mask, as it finds waves.
    private static function mask($path)
    {
        $svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 10' preserveAspectRatio='none'>"
            . "<path fill='white' d='{$path}'/></svg>";
        $url = 'url("data:image/svg+xml,' . rawurlencode($svg) . '")';
        return "-webkit-mask: {$url} no-repeat center / 100% 100%; mask: {$url} no-repeat center / 100% 100%;";
    }
}

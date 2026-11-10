<?php

/**
 * Rules that undo theme bugs on every page, kept until the theme ships its own.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Zoom-in starts each animated block at 80% until its zoom ends, and the floating header runs its own animation in
 * place of the zoom, so it stayed at 80%. Buttons ease only their background, so a hover's new text color showed on
 * the old background, like white text on a gold button.
 */
class ThemeFixes
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const HANDLE = 'extendify-theme-fixes';
    const CSS = 'header.wp-block-template-part .ext-header-sticky--floating-pill.ext-animate--on'
        . '{transform:none!important}'
        . '.wp-element-button.wp-element-button{transition-property:background-color,color}';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * Loads the rules on the site and in the editor, for every visitor.
     *
     * @return void
     */
    public static function register()
    {
        \add_action('enqueue_block_assets', [self::class, 'enqueue']);
    }

    /**
     * Adds the rules.
     *
     * @return void
     */
    public static function enqueue()
    {
        if (!\wp_style_is(self::HANDLE, 'registered')) {
            \wp_register_style(self::HANDLE, false, [], null);
            \wp_add_inline_style(self::HANDLE, self::CSS);
        }

        \wp_enqueue_style(self::HANDLE);
    }
}

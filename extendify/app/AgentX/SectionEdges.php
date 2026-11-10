<?php

/**
 * Turns off the edges a design draws for a section, like waves, keeping the rest of its style.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * A design draws a section's edges past its box, from its own pseudo-elements, with room kept above and below
 * them. The section's class takes both away; doubled, it outweighs a design's rules, which WordPress wraps in
 * :where().
 */
class SectionEdges
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OFF = 'ext-no-edges';
    const HANDLE = 'extendify-section-edges';
    const CSS = '.ext-no-edges.ext-no-edges{margin-block:0!important}'
        . '.ext-no-edges.ext-no-edges::before,.ext-no-edges.ext-no-edges::after{content:none!important}';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * Loads the rule on the site and in the editor, for every visitor: the class stays in the page's markup.
     *
     * @return void
     */
    public static function register()
    {
        \add_action('enqueue_block_assets', [self::class, 'enqueue']);
    }

    /**
     * Adds the rule.
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

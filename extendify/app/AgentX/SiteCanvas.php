<?php

/**
 * Site canvas.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;

/**
 * An effect drawn over the whole site, like falling snow, that the site never depends on.
 */
class SiteCanvas
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OPTION = 'extendify_site_canvas';
    const EFFECTS = ['snow'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The effect the site shows, or null for none.
     *
     * @return string|null
     */
    public static function current()
    {
        $effect = \get_option(self::OPTION, null);
        return in_array($effect, self::EFFECTS, true) ? $effect : null;
    }

    /**
     * Shows an effect, or none with null.
     *
     * @param string|null $effect One of EFFECTS, or null.
     * @return bool Whether the site can draw it.
     */
    public static function store($effect)
    {
        if ($effect === null) {
            \delete_option(self::OPTION);
            return true;
        }

        if (!in_array($effect, self::EFFECTS, true)) {
            return false;
        }

        \update_option(self::OPTION, $effect);
        return true;
    }

    /**
     * Loads the effect's script, which draws on a canvas above the page that ignores the pointer.
     *
     * @return void
     */
    public static function enqueue()
    {
        $effect = self::current();
        if (!$effect) {
            return;
        }

        \wp_enqueue_script(
            Config::$slug . '-site-canvas',
            \add_query_arg('effect', $effect, EXTENDIFY_BASE_URL . 'public/assets/site-canvas.js'),
            [],
            Config::$version,
            true
        );
    }
}

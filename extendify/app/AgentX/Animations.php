<?php

/**
 * Animations.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * The entrance animations Extendable offers, as a type and a speed.
 */
class Animations
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const PARAM = 'extendify-animation';
    const OPTION = 'extendify_animation_settings';
    const TYPES = ['none' => 'None', 'fade' => 'Fade in', 'fade-up' => 'Fade up', 'zoom-in' => 'Zoom in'];
    const SPEEDS = ['slow', 'medium', 'fast'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * Only Extendable runs these, so another theme has none to offer.
     *
     * @return bool
     */
    public static function available()
    {
        return function_exists('extendable_enqueue_animations');
    }

    /**
     * The animation an id names.
     *
     * @param string $id A type and a speed, like fade-up:slow.
     * @return array|null
     */
    public static function find($id)
    {
        $parts = explode(':', (string) $id);
        if (count($parts) !== 2 || !isset(self::TYPES[$parts[0]]) || !in_array($parts[1], self::SPEEDS, true)) {
            return null;
        }

        return ['type' => $parts[0], 'speed' => $parts[1], 'title' => self::TYPES[$parts[0]] . ", {$parts[1]}"];
    }

    /**
     * The saved animation's id, with the theme's defaults.
     *
     * @return string
     */
    public static function current()
    {
        $saved = (array) \get_option(self::OPTION, []);
        $id = ($saved['type'] ?? 'none') . ':' . ($saved['speed'] ?? 'medium');
        return self::find($id) ? $id : 'none:medium';
    }

    /**
     * Renders the site frame with an animation, without saving it.
     *
     * @param string $id A type and a speed; empty keeps the saved one.
     * @return void
     */
    public static function preview($id)
    {
        $found = self::find($id);
        if (!$found) {
            return;
        }

        \add_filter('pre_option_' . self::OPTION, function () use ($found) {
            return ['type' => $found['type'], 'speed' => $found['speed']];
        });
    }

    /**
     * Saves an animation, and returns the one it replaced so undoing past the save can bring it back.
     *
     * @param string $id A type and a speed; empty saves nothing.
     * @return string|null
     */
    public static function store($id)
    {
        $found = self::find($id);
        if (!$found) {
            return null;
        }

        $replaced = self::current();
        \update_option(self::OPTION, ['type' => $found['type'], 'speed' => $found['speed']]);
        return $replaced;
    }
}

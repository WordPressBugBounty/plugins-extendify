<?php

/**
 * What the agent's refresh cards show, and when each value last changed.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * When each value a refresh or setup card watches last changed.
 */
class Refreshes
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OPTION = 'extendify_agentx_changed';
    const WATCHED = [
        'blogname' => 'title',
        'blogdescription' => 'description',
        'site_logo' => 'logo',
        'site_icon' => 'icon',
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * Records a change made anywhere: the agent, wp-admin or the site editor.
     *
     * @return void
     */
    public static function watch()
    {
        foreach (self::WATCHED as $option => $value) {
            $stamp = function () use ($value) {
                self::stamp($value);
            };
            // An option set for the first time is added, which fires no update.
            \add_action("add_option_{$option}", $stamp);
            \add_action("update_option_{$option}", $stamp);
        }
    }

    /**
     * When each value last changed, and the logo and icon to show.
     *
     * @return array
     */
    public static function current()
    {
        return [
            'changed' => self::changed(),
            'images' => [
                'logo' => self::image((int) \get_option('site_logo')),
                'icon' => self::image((int) \get_option('site_icon')),
            ],
        ];
    }

    private static function changed()
    {
        $changed = \get_option(self::OPTION, []);
        return is_array($changed) ? $changed : [];
    }

    /**
     * Records a change by name, like fonts changed in the design card.
     *
     * @param string $value The name a card watches.
     * @return void
     */
    public static function stamp($value)
    {
        \update_option(self::OPTION, array_merge(self::changed(), [$value => time()]), false);
    }

    private static function image($id)
    {
        $url = $id ? \wp_get_attachment_image_url($id, 'medium') : false;
        if (!$url) {
            return null;
        }

        return [
            'url' => $url,
            'name' => (string) \get_post_meta($id, '_wp_attachment_image_alt', true),
        ];
    }
}

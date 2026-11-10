<?php

/**
 * The changes the agent saves live, outside the draft, read and put back for its history.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Reads and writes the logo, site icon, every setting the agent changes,
 * and a page's published state and featured image.
 */
class LiveSaves
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const IMAGES = ['logo' => 'site_logo', 'icon' => 'site_icon'];
    const SETTINGS = [
        'title' => 'title',
        'tagline' => 'description',
        'timezone' => 'timezone',
        'date_format' => 'date_format',
        'time_format' => 'time_format',
        'start_of_week' => 'start_of_week',
        'language' => 'language',
        'posts_per_page' => 'posts_per_page',
        'comments' => 'default_comment_status',
        'homepage' => 'homepage',
        'visibility' => 'visibility',
        'indexing' => 'indexing',
        'canvas' => 'canvas',
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * One change as the history keeps it, or null when it isn't one it keeps.
     *
     * @param string $key    - logo, icon, status, featured, or a key of SETTINGS.
     * @param mixed  $before - The value before the save.
     * @param mixed  $after  - The value the save left.
     * @param int    $post   - The page or post, for status and featured.
     * @return array|null
     */
    public static function item($key, $before, $after, $post = 0)
    {
        if (isset(self::IMAGES[$key])) {
            return ['key' => $key, 'before' => (int) $before, 'after' => (int) $after];
        }

        if ($key === 'featured' && $post) {
            return ['key' => 'featured', 'post' => (int) $post, 'before' => (int) $before, 'after' => (int) $after];
        }

        if (isset(self::SETTINGS[$key])) {
            return ['key' => $key, 'before' => (string) $before, 'after' => (string) $after];
        }

        if ($key === 'status' && $post) {
            return ['key' => 'status', 'post' => (int) $post, 'before' => (string) $before, 'after' => (string) $after];
        }

        return null;
    }

    /**
     * What the site has now for the change's setting or page.
     *
     * @param array $item - A change from item().
     * @return mixed
     */
    public static function read(array $item)
    {
        if (isset(self::IMAGES[$item['key']])) {
            return (int) \get_option(self::IMAGES[$item['key']], 0);
        }

        if (isset(self::SETTINGS[$item['key']])) {
            return (string) (Settings::current()[self::SETTINGS[$item['key']]] ?? '');
        }

        if ($item['key'] === 'featured') {
            return (int) \get_post_thumbnail_id($item['post'] ?? 0);
        }

        return (string) \get_post_status($item['post'] ?? 0);
    }

    /**
     * Puts the setting or page's state to a value from the change.
     *
     * @param array $item  - A change from item().
     * @param mixed $value - Its before or after value.
     * @return true|\WP_Error
     */
    public static function put(array $item, $value)
    {
        if (isset(self::IMAGES[$item['key']])) {
            \update_option(self::IMAGES[$item['key']], (int) $value);
            return true;
        }

        if (isset(self::SETTINGS[$item['key']])) {
            $saved = Settings::update(self::SETTINGS[$item['key']], $value);
            return \is_wp_error($saved) ? $saved : true;
        }

        if ($item['key'] === 'featured') {
            $post = (int) ($item['post'] ?? 0);
            $value ? \set_post_thumbnail($post, (int) $value) : \delete_post_thumbnail($post);
            return true;
        }

        return PageStatus::setStatus((int) ($item['post'] ?? 0), (string) $value);
    }

    /**
     * One side of a change in words, like Monday for a week that starts on 1.
     *
     * @param array  $item - A change from item().
     * @param string $side - before or after.
     * @return string
     */
    public static function words(array $item, $side)
    {
        return isset(self::SETTINGS[$item['key']])
            ? Settings::label(self::SETTINGS[$item['key']], $item[$side])
            : (string) $item[$side];
    }

    /**
     * Names what changed, for the card that asks before putting a value back over a newer one.
     *
     * @param array $item - A change from item().
     * @return array
     */
    public static function named(array $item)
    {
        if (in_array($item['key'], ['status', 'featured'], true)) {
            return [
                'key' => $item['key'],
                'title' => \wp_specialchars_decode(\get_the_title($item['post']), ENT_QUOTES),
            ];
        }

        // A setting's value reads as its words, like Monday for a week that starts on 1.
        return isset(self::SETTINGS[$item['key']])
            ? ['key' => $item['key'], 'label' => Settings::label(self::SETTINGS[$item['key']], $item['after'])]
            : ['key' => $item['key']];
    }
}

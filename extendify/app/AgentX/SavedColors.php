<?php

/**
 * Saved colors.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * New colors the agent made that a user saved, kept in WordPress's custom palette.
 */
class SavedColors
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OPTION = 'extendify_agentx_saved_colors';
    const NAME_LENGTH = 40;
    const MOST = 20;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * Each saved color's palette slug, with the palette it was saved beside.
     *
     * @return array
     */
    public static function current()
    {
        $saved = \get_option(self::OPTION, []);
        return is_array($saved) ? $saved : [];
    }

    /**
     * The names the agent gave the new colors in a change, by hex.
     *
     * @param mixed $names Each name by its hex, as the change sent them.
     * @return array
     */
    public static function named($names)
    {
        if (!is_array($names)) {
            return [];
        }

        $named = [];
        foreach ($names as $hex => $name) {
            $hex = strtolower((string) $hex);
            $name = trim(mb_substr(\sanitize_text_field((string) $name), 0, self::NAME_LENGTH));
            if (preg_match('/^#[0-9a-f]{6}$/', $hex) && $name !== '') {
                $named[$hex] = $name;
            }
        }

        return array_slice($named, 0, self::MOST, true);
    }

    /**
     * The draft's new colors, each with the palette slug its blocks take, given when the color first comes.
     *
     * @param array $named Each name, or name and slug, by hex.
     * @return array Each name and slug by hex.
     */
    public static function slugged(array $named)
    {
        $taken = self::slugsAndColors(\wp_get_global_settings(['color', 'palette']));
        $slugged = [];
        foreach ($named as $hex => $entry) {
            $name = (string) (is_array($entry) ? ($entry['name'] ?? '') : $entry);
            $slug = is_array($entry) ? (string) ($entry['slug'] ?? '') : '';
            if ($slug === '') {
                $at = array_search($hex, $taken['colors'], true);
                $slug = $at === false
                    ? self::freeSlug($name, array_merge($taken['slugs'], array_column($slugged, 'slug')))
                    : $taken['slugs'][$at];
            }

            $slugged[$hex] = ['name' => $name, 'slug' => $slug];
        }

        return $slugged;
    }

    /**
     * A change's colors by the slugs the draft gave its new ones, so blocks take them like any palette color.
     *
     * @param array $styles  Each setting's value, as the change sent them.
     * @param array $slugged Each drafted color's name and slug by hex.
     * @return array
     */
    public static function bySlug(array $styles, array $slugged)
    {
        foreach ($styles as $setting => $value) {
            $hex = is_string($value) ? strtolower($value) : '';
            if (substr((string) $setting, -6) === '_color' && is_array($slugged[$hex] ?? null)) {
                $styles[$setting] = $slugged[$hex]['slug'];
            }
        }

        return $styles;
    }

    /**
     * User styles with the draft's new colors in the custom palette, beside any already there.
     *
     * @param array $data    User global styles.
     * @param array $slugged Each drafted color's name and slug by hex.
     * @return array
     */
    public static function withDrafted(array $data, array $slugged)
    {
        $palette = $data['settings']['color']['palette'] ?? null;
        $theme = (array) (\WP_Theme_JSON_Resolver::get_theme_data()->get_settings()['color']['palette']['theme'] ?? []);
        $present = array_merge(self::slugsAndColors($palette)['slugs'], array_column($theme, 'slug'));
        $entries = [];
        foreach ($slugged as $hex => $entry) {
            if (is_array($entry) && !in_array($entry['slug'] ?? '', $present, true)) {
                $entries[] = ['slug' => $entry['slug'], 'color' => $hex, 'name' => $entry['name'] ?? ''];
            }
        }

        if ($entries) {
            $data['settings']['color']['palette'] = self::appended($palette, $entries);
        }

        return $data;
    }

    /**
     * Adds each named color the saved content still uses to the custom palette, once, under its drafted slug.
     *
     * @param array  $named   Each name, or name and slug, by hex.
     * @param string $content The content just saved.
     * @return string[] The hexes it added.
     */
    public static function keep(array $named, $content)
    {
        $used = array_filter($named, function ($entry, $hex) use ($content) {
            $slug = is_array($entry) ? (string) ($entry['slug'] ?? '') : '';
            return stripos($content, (string) $hex) !== false || ($slug !== '' && self::uses($content, $slug));
        }, ARRAY_FILTER_USE_BOTH);
        $id = \WP_Theme_JSON_Resolver::get_user_global_styles_post_id();
        if (!$used || !$id) {
            return [];
        }

        $route = \rest_get_route_for_post_type_items('wp_global_styles') . "/{$id}";
        $read = new \WP_REST_Request('GET', $route);
        $read->set_param('context', 'edit');
        $response = \rest_do_request($read);
        if ($response->is_error()) {
            return [];
        }

        $user = $response->get_data();
        $settings = is_array($user['settings'] ?? null) ? $user['settings'] : [];
        // Stored styles, not global settings: the draft's new colors may sit in those for this request.
        $theme = (array) (\WP_Theme_JSON_Resolver::get_theme_data()->get_settings()['color']['palette']['theme'] ?? []);
        $stored = self::slugsAndColors($settings['color']['palette'] ?? null);
        $taken = [
            'slugs' => array_merge($stored['slugs'], array_column($theme, 'slug')),
            'colors' => array_merge($stored['colors'], array_map('strtolower', array_column($theme, 'color'))),
        ];
        $added = [];
        $entries = [];
        foreach ($used as $hex => $entry) {
            $name = (string) (is_array($entry) ? ($entry['name'] ?? '') : $entry);
            $drafted = is_array($entry) ? (string) ($entry['slug'] ?? '') : '';
            if (in_array($hex, $taken['colors'], true)) {
                continue;
            }

            $slug = $drafted !== '' && !in_array($drafted, $taken['slugs'], true)
                ? $drafted
                : self::freeSlug($name, $taken['slugs']);
            $taken['slugs'][] = $slug;
            $entries[] = ['slug' => $slug, 'color' => $hex, 'name' => $name];
            $added[$slug] = $hex;
        }

        if (!$entries) {
            return [];
        }

        $settings['color']['palette'] = self::appended($settings['color']['palette'] ?? null, $entries);
        $write = new \WP_REST_Request('POST', $route);
        $write->set_param('settings', $settings);
        $write->set_param('styles', is_array($user['styles'] ?? null) ? $user['styles'] : []);
        if (\rest_do_request($write)->is_error()) {
            return [];
        }

        \wp_clean_theme_json_cache();
        $saved = array_merge(self::current(), array_fill_keys(array_keys($added), []));
        $palette = self::palette(array_keys($saved));
        foreach (array_keys($added) as $slug) {
            $saved[$slug] = ['palette' => $palette, 'savedAt' => time()];
        }

        \update_option(self::OPTION, $saved, false);
        return array_values($added);
    }

    /**
     * A new color scheme replaces the whole palette, so the saved colors in it are carried over.
     *
     * @param array $from The styles before the scheme.
     * @param array $into The styles the scheme makes.
     * @return array
     */
    public static function carried(array $from, array $into)
    {
        $saved = self::current();
        $was = $from['settings']['color']['palette'] ?? null;
        $list = \wp_is_numeric_array($was) ? $was : (is_array($was) ? ($was['custom'] ?? []) : []);
        $now = self::slugsAndColors($into['settings']['color']['palette'] ?? null)['slugs'];
        $kept = array_values(array_filter($list, function ($entry) use ($saved, $now) {
            $slug = $entry['slug'] ?? null;
            return isset($saved[$slug]) && !in_array($slug, $now, true);
        }));
        if (!$kept) {
            return $into;
        }

        $into['settings']['color']['palette'] = self::appended($into['settings']['color']['palette'] ?? null, $kept);
        return $into;
    }

    /**
     * The palette apart from the saved colors, so another color scheme or style marks those stale.
     *
     * @param string[] $saved The saved colors' slugs.
     * @return string
     */
    public static function palette(array $saved)
    {
        $colors = [];
        // A scheme's colors share their slugs with the theme's, so each origin counts on its own.
        foreach ((array) \wp_get_global_settings(['color', 'palette']) as $origin => $list) {
            foreach ((array) $list as $entry) {
                if (isset($entry['slug'], $entry['color']) && !in_array($entry['slug'], $saved, true)) {
                    $colors["{$origin}:{$entry['slug']}"] = $entry['color'];
                }
            }
        }

        ksort($colors);
        return md5((string) \wp_json_encode([$colors, \wp_get_global_settings(['custom', 'color'])]));
    }

    // Stored palettes are one list or keyed by origin; saved colors join the custom one.
    private static function appended($palette, array $entries)
    {
        if (\wp_is_numeric_array($palette)) {
            return array_merge($palette, $entries);
        }

        $palette = is_array($palette) ? $palette : [];
        $palette['custom'] = array_merge(is_array($palette['custom'] ?? null) ? $palette['custom'] : [], $entries);
        return $palette;
    }

    private static function slugsAndColors($palette)
    {
        $lists = \wp_is_numeric_array($palette) ? [$palette] : (is_array($palette) ? $palette : []);
        $taken = ['slugs' => [], 'colors' => []];
        foreach ($lists as $list) {
            foreach ((array) $list as $entry) {
                $taken['slugs'][] = (string) ($entry['slug'] ?? '');
                $taken['colors'][] = strtolower((string) ($entry['color'] ?? ''));
            }
        }

        return $taken;
    }

    // A block takes a palette color by class, or by variable for a link or an element.
    private static function uses($content, $slug)
    {
        $slug = preg_quote($slug, '/');
        $forms = [
            "has-{$slug}-(?:background-|border-)?color\\b",
            "--color--{$slug}\\)",
            "\\|color\\|{$slug}\"",
        ];
        return preg_match('/' . implode('|', $forms) . '/', $content) === 1;
    }

    private static function freeSlug($name, array $taken)
    {
        $base = \sanitize_title($name) ?: 'saved-color';
        $slug = $base;
        for ($n = 2; in_array($slug, $taken, true); $n++) {
            $slug = "{$base}-{$n}";
        }

        return $slug;
    }
}

<?php

/**
 * Color schemes.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

use Extendify\Constants;

/**
 * The color schemes the agent offers: the theme's own, and the palettes Extendify serves.
 */
class ColorSchemes
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const PARAM = 'extendify-colors';
    const CACHE = 'extendify_agentx_palettes';
    const SWATCHES = ['background', 'foreground', 'primary', 'secondary', 'tertiary'];
    const PAINTED = [
        'background-base', 'text-strong', 'text-weak', 'background-sunken', 'icon-surface', 'icon-ink',
        'background-tint-1', 'background-tint-1-ink', 'background-tint-1-weak',
        'background-tint-2', 'background-tint-2-ink', 'background-tint-2-weak',
        'background-tint-3', 'background-tint-3-ink', 'background-tint-3-weak',
    ];
    const MADE = 'extendify_agentx_made_colors';
    // Enough that every card a long chat still shows finds its options.
    const MOST_MADE = 48;
    // The Christmas set is twelve hand-picked schemes; a made look brings six.
    const MOST_SCHEMES = 12;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * Each scheme's id, its name, and the colors its option shows.
     *
     * @return array
     */
    public static function all()
    {
        $all = [];
        foreach (self::full() as $id => $scheme) {
            $all[] = ['id' => $id, 'title' => $scheme['title'], 'colors' => self::colorsOf($scheme)]
                + self::paintOf($scheme);
        }

        return $all;
    }

    /**
     * The scheme as a theme.json fragment.
     *
     * @param string $id A theme scheme's id starts with theme:, a served palette's with palette:.
     * @return array|null
     */
    public static function find($id)
    {
        if (strpos((string) $id, 'made:') === 0) {
            return ((array) \get_option(self::MADE, []))[$id] ?? null;
        }

        return $id === '' ? null : self::full()[$id] ?? null;
    }

    /**
     * Keeps the schemes the agent made for an ask, so its card's previews and picks find them by id.
     *
     * @param array $made Whole schemes, or one palette color's new values over the colors the site shows now.
     * @return array Each one's id, name, and the colors its option shows.
     */
    public static function made(array $made)
    {
        $schemes = isset($made['only']) ? self::oneColor($made) : self::wholeSchemes($made);
        $kept = (array) \get_option(self::MADE, []);
        $options = [];
        foreach ($schemes as $scheme) {
            $id = 'made:' . substr(md5((string) \wp_json_encode($scheme)), 0, 12);
            unset($kept[$id]);
            $kept[$id] = $scheme;
            $options[] = ['id' => $id, 'title' => $scheme['title'], 'colors' => self::colorsOf($scheme)]
                + self::paintOf($scheme);
        }

        \update_option(self::MADE, array_slice($kept, -self::MOST_MADE, null, true), false);
        return $options;
    }

    private static function wholeSchemes(array $made)
    {
        $schemes = [];
        foreach (array_slice((array) ($made['schemes'] ?? []), 0, self::MOST_SCHEMES) as $scheme) {
            $title = \sanitize_text_field((string) ($scheme['title'] ?? ''));
            $settings = self::colorsOnly(array_intersect_key((array) ($scheme['settings'] ?? []), [
                'color' => true,
                'custom' => true,
            ]));
            if ($title !== '' && !empty($settings['color']['palette'])) {
                $schemes[] = [
                    'title' => $title,
                    'settings' => $settings,
                    'styles' => self::colorsOnly((array) ($scheme['styles'] ?? [])),
                ];
            }
        }

        return $schemes;
    }

    // Each value over the colors the frame shows now, so only that color differs from the site.
    private static function oneColor(array $made)
    {
        $slug = \sanitize_key((string) ($made['only']['slug'] ?? ''));
        if ($slug === '' || !PaletteColors::has($slug)) {
            return [];
        }

        $shown = Draft::shownStyles();
        $schemes = [];
        foreach (array_slice((array) ($made['values'] ?? []), 0, 6) as $value) {
            $hex = \sanitize_hex_color((string) ($value['color'] ?? ''));
            $title = \sanitize_text_field((string) ($value['name'] ?? ''));
            if ($hex && $title !== '') {
                $painted = PaletteColors::repainted($shown, PaletteColors::with('', $slug, $hex));
                $schemes[] = ['title' => $title] + StyleLayers::merge(['colors' => $painted]);
            }
        }

        return $schemes;
    }

    // Admins send these through the chat; only colors, color variables and names go into the site's styles.
    private static function colorsOnly(array $tree)
    {
        $kept = [];
        foreach ($tree as $key => $value) {
            if (!is_int($key) && !preg_match('#^[a-z0-9:/_-]+$#i', (string) $key)) {
                continue;
            }

            if (is_array($value)) {
                $value = self::colorsOnly($value);
                if ($value) {
                    $kept[$key] = $value;
                }

                continue;
            }

            if (in_array($key, ['slug', 'name'], true) && is_string($value)) {
                $kept[$key] = \sanitize_text_field($value);
                continue;
            }

            $color = is_string($value) && (\sanitize_hex_color($value) || $value === 'transparent'
                || preg_match('/^var\(--wp--(preset|custom)--color--[a-z0-9-]+\)$/', $value));
            if ($color) {
                $kept[$key] = $value;
            }
        }

        return $kept;
    }

    /**
     * The colors the site shows now, for the option that keeps them.
     *
     * @return array
     */
    public static function current()
    {
        return self::colorsOf(['settings' => \wp_get_global_settings()]);
    }

    /**
     * The site's own colors and duotones that a pick paints at once, for the option that keeps them.
     *
     * @return array
     */
    public static function currentPaint()
    {
        return self::paintOf(['settings' => \wp_get_global_settings()]);
    }

    // Alternating, so the first options shown hold some of each.
    private static function full()
    {
        $theme = self::theme();
        $served = self::served();
        $full = [];
        for ($index = 0; $index < max(count($theme), count($served)); $index++) {
            $full += array_slice($served, $index, 1, true) + array_slice($theme, $index, 1, true);
        }

        return $full;
    }

    private static function theme()
    {
        $theme = [];
        foreach (StyleVariations::colorOnly() as $slug => $variation) {
            $theme["theme:{$slug}"] = $variation;
        }

        return $theme;
    }

    private static function served()
    {
        $palettes = \get_transient(self::CACHE);
        if (!is_array($palettes)) {
            $brief = function ($args) {
                $args['timeout'] = 5;
                return $args;
            };
            \add_filter('http_request_args', $brief, 101);
            try {
                $response = \wp_remote_get(Constants::AI_HOST . '/api/palettes?palettes=agent');
            } finally {
                \remove_filter('http_request_args', $brief, 101);
            }

            $palettes = json_decode(\wp_remote_retrieve_body($response), true)['palettes'] ?? null;
            // A failed fetch leaves the theme's own schemes, and asks again soon.
            \set_transient(
                self::CACHE,
                is_array($palettes) ? $palettes : [],
                is_array($palettes) ? DAY_IN_SECONDS : 10 * MINUTE_IN_SECONDS
            );
        }

        $served = [];
        foreach (is_array($palettes) ? $palettes : [] as $palette) {
            if (empty($palette['slug']) || empty($palette['title'])) {
                continue;
            }

            // A renamed palette keeps its old name after a dot, like "Linen · Heath".
            $title = trim(explode('·', $palette['title'])[0]);
            $served['palette:' . \sanitize_key($palette['slug'])] = ['title' => $title] + $palette;
        }

        return $served;
    }

    // Buttons and tinted sections read these values directly, so they'd wait for the page's styles.
    private static function paintOf(array $scheme)
    {
        $custom = $scheme['settings']['custom'] ?? [];
        $paint = [];
        foreach (self::PAINTED as $name) {
            $color = \sanitize_hex_color((string) ($custom['color'][$name] ?? ''));
            if ($color) {
                $paint['--wp--custom--color--' . $name] = $color;
            }
        }

        $button = (array) ($custom['elements']['button'] ?? []);
        $states = [
            '' => $button['color'] ?? [],
            'hover--' => $button[':hover']['color'] ?? [],
            'focus--' => $button[':focus']['color'] ?? [],
        ];
        foreach ($states as $state => $colors) {
            foreach (['background', 'text'] as $part) {
                $color = \sanitize_hex_color((string) ($colors[$part] ?? ''));
                if ($color) {
                    $paint['--wp--custom--elements--button--' . $state . 'color--' . $part] = $color;
                }
            }
        }

        // Merged settings key the duotones by origin, like the palette.
        $presets = $scheme['settings']['color']['duotone'] ?? [];
        $entries = \wp_is_numeric_array($presets)
            ? $presets
            : array_merge($presets['default'] ?? [], $presets['theme'] ?? [], $presets['custom'] ?? []);
        $duotone = [];
        foreach ($entries as $entry) {
            $pair = array_map(function ($color) {
                return \sanitize_hex_color((string) $color);
            }, (array) ($entry['colors'] ?? []));
            if (!empty($entry['slug']) && count($pair) === 2 && $pair[0] && $pair[1]) {
                $duotone[\sanitize_key($entry['slug'])] = $pair;
            }
        }

        return array_filter(['paint' => $paint, 'duotone' => $duotone]);
    }

    private static function colorsOf(array $scheme)
    {
        $palette = $scheme['settings']['color']['palette'] ?? [];
        // Merged settings key the palette by origin; a variation's is one list.
        $entries = \wp_is_numeric_array($palette)
            ? $palette
            : array_merge($palette['default'] ?? [], $palette['theme'] ?? [], $palette['custom'] ?? []);
        $bySlug = array_column($entries, 'color', 'slug');
        $custom = $scheme['settings']['custom']['color'] ?? [];
        $colors = [];
        foreach (self::SWATCHES as $slug) {
            $color = $bySlug[$slug] ?? '';
            // Served palettes point their presets at their own custom colors.
            if (preg_match('/^var\(--wp--custom--color--([a-z0-9-]+)\)$/', $color, $match)) {
                $color = $custom[$match[1]] ?? '';
            }

            $colors[$slug] = \sanitize_hex_color($color) ?: null;
        }

        return $colors;
    }
}

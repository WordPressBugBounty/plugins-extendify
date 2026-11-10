<?php

/**
 * Palette colors.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Palette colors the user chose to change everywhere they're used, kept in the draft by slug.
 */
class PaletteColors
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    // WCAG AA for body text.
    const READABLE = 4.5;
    // Below this HSL saturation a text color reads as gray, so a gray stays gray.
    const NEUTRAL = 0.15;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The changes in a draft's palette layer, each new hex by its palette slug.
     *
     * @param mixed $layer The layer as the draft keeps it, a JSON object or empty.
     * @return array
     */
    public static function changes($layer)
    {
        $decoded = is_string($layer) && $layer !== '' ? json_decode($layer, true) : null;
        $changes = [];
        foreach (is_array($decoded) ? $decoded : [] as $slug => $hex) {
            $hex = \sanitize_hex_color((string) $hex);
            if (is_string($slug) && \sanitize_key($slug) === $slug && $hex) {
                $changes[$slug] = strtolower($hex);
            }
        }

        ksort($changes);
        return $changes;
    }

    /**
     * The layer with one more palette color changed.
     *
     * @param mixed  $layer The layer as the draft keeps it.
     * @param string $slug  The palette color's slug.
     * @param string $hex   Its new color.
     * @return string
     */
    public static function with($layer, $slug, $hex)
    {
        $changes = array_merge(self::changes($layer), [$slug => strtolower($hex)]);
        ksort($changes);
        return (string) \wp_json_encode($changes);
    }

    /**
     * Whether the site's palette has a color by this slug, from any origin.
     *
     * @param string $slug The palette color's slug.
     * @return bool
     */
    public static function has($slug)
    {
        foreach ((array) \wp_get_global_settings(['color', 'palette']) as $list) {
            if (in_array($slug, array_column((array) $list, 'slug'), true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * User styles with the layer's colors changed. A color that points at a custom color changes that one,
     * so what else follows it changes too; a theme color the user styles don't list yet joins them with the rest
     * of the theme's palette, since that list replaces the theme's whole.
     *
     * @param array $data  User global styles.
     * @param mixed $layer The draft's palette layer.
     * @return array
     */
    public static function repainted(array $data, $layer)
    {
        $before = $data;
        $data = self::recolored($data, $layer);
        $fixes = self::textFixes($data, $before);
        foreach ($fixes as $fix) {
            $styles = is_array($data['styles'] ?? null) ? $data['styles'] : [];
            $text = $fix['path'] ? 'var(' . self::variableOf($fix['path']) . ", {$fix['text']})" : $fix['text'];
            $data['styles'] = self::withValue($styles, array_merge($fix['path'], ['color', 'text']), $text);
        }

        $kept = self::keptText($data, $before, $fixes);
        if ($kept !== '') {
            $data['styles']['css'] = (string) ($data['styles']['css'] ?? '') . $kept;
        }

        foreach (self::inkFor($data, $before) as $state => $slug) {
            $path = $state === 'color' ? ['color', 'text'] : [$state, 'color', 'text'];
            $button = $data['settings']['custom']['elements']['button'] ?? [];
            $data['settings']['custom']['elements']['button'] = self::withValue(
                is_array($button) ? $button : [],
                $path,
                "var(--wp--preset--color--{$slug})"
            );
        }

        return $data;
    }

    /**
     * The palette color button text takes so it reads once the layer's colors are in, when it needs one.
     *
     * @param array $data  User global styles, before the layer.
     * @param mixed $layer The draft's palette layer.
     * @return array|null The color's slug, name and hex.
     */
    public static function buttonInk(array $data, $layer)
    {
        $recolored = self::recolored($data, $layer);
        $slug = self::inkFor($recolored, $data)['color'] ?? null;
        if ($slug === null) {
            return null;
        }

        $entry = self::entryOf(self::paletteOf($recolored), $slug);
        return [
            'slug' => $slug,
            'name' => (string) ($entry['name'] ?? $slug),
            'value' => self::hexOf($recolored, (string) ($entry['color'] ?? '')),
        ];
    }

    /**
     * The palette colors the layer changed whose text stopped reading on them and was fixed, by name.
     *
     * @param array $data  User global styles, before the layer.
     * @param mixed $layer The draft's palette layer.
     * @return array|null
     */
    public static function textInk(array $data, $layer)
    {
        $fixes = self::textFixes(self::recolored($data, $layer), $data);
        return $fixes ? array_values(array_unique(array_column($fixes, 'on'))) : null;
    }

    // Text the theme or user styles draw on a changed color, which no longer reads there.
    private static function textFixes(array $data, array $before)
    {
        $was = [];
        foreach (self::paletteOf($before) as $entry) {
            $was[$entry['slug']] = self::hexOf($before, (string) ($entry['color'] ?? ''));
        }

        $changed = [];
        foreach (self::paletteOf($data) as $entry) {
            $now = self::hexOf($data, (string) ($entry['color'] ?? ''));
            if ($now !== null && $now !== ($was[$entry['slug']] ?? null)) {
                $changed[$now] = (string) ($entry['name'] ?? $entry['slug']);
            }
        }

        if (!$changed) {
            return [];
        }

        $theme = (array) (\WP_Theme_JSON_Resolver::get_theme_data()->get_raw_data()['styles'] ?? []);
        $styles = array_replace_recursive($theme, is_array($data['styles'] ?? null) ? $data['styles'] : []);
        $root = (string) ($styles['color']['background'] ?? '');
        $fixes = [];
        foreach (self::textNodes($styles) as $path) {
            $node = $path ? self::valueAt($styles, $path) : $styles;
            $colors = is_array($node['color'] ?? null) ? $node['color'] : [];
            if (!is_string($colors['text'] ?? null)) {
                continue;
            }

            $own = (string) ($colors['background'] ?? '');
            $fill = $own !== '' && $own !== 'transparent' ? $own : $root;
            $fillHex = self::hexOf($data, $fill);
            $textHex = self::hexOf($data, $colors['text']);
            $moved = $fillHex !== null && isset($changed[$fillHex]) && self::hexOf($before, $fill) !== $fillHex;
            if (!$moved || $textHex === null || self::contrast($textHex, $fillHex) >= self::READABLE) {
                continue;
            }

            $text = self::readableOn($data, $textHex, $fillHex);
            $fixes[] = ['path' => $path, 'text' => $text, 'was' => $colors['text'], 'on' => $changed[$fillHex]];
        }

        return $fixes;
    }

    // A block filled with another palette color inherits the fixed text, so it keeps the text that read on it,
    // and one filled with the changed color takes the fix. Headings and the like read a variable the nearest
    // filled block sets, since a card can sit inside a section of the changed color.
    private static function keptText(array $data, array $before, array $fixes)
    {
        $kept = [];
        $fixed = [];
        foreach ($fixes as $fix) {
            $property = $fix['path'] ? self::variableOf($fix['path']) : 'color';
            $now = self::hexOf($data, $fix['text']);
            $was = self::hexOf($before, $fix['was']);
            if ($now === null || $was === null) {
                continue;
            }

            foreach (self::paletteOf($data) as $entry) {
                $fill = self::hexOf($data, (string) ($entry['color'] ?? ''));
                $old = self::entryOf(self::paletteOf($before), $entry['slug']);
                if ($fill === null || !$old) {
                    continue;
                }

                $selector = ":root :where(.has-{$entry['slug']}-background-color)";
                if ($fill !== self::hexOf($before, (string) ($old['color'] ?? ''))) {
                    $fixed[] = "{$selector}{{$property}:{$fix['text']}}";
                    continue;
                }

                $reads = self::contrast($now, $fill);
                if ($reads < self::READABLE && self::contrast($was, $fill) > $reads) {
                    $kept[] = "{$selector}{{$property}:{$fix['was']}}";
                }
            }
        }

        return $kept ? implode('', array_merge($kept, $fixed)) : '';
    }

    private static function variableOf(array $path)
    {
        return '--extendify-readable-' . trim(preg_replace('/[^a-z0-9]+/', '-', strtolower(implode('-', $path))), '-');
    }

    // Buttons are left to inkFor, which keeps their states apart.
    private static function textNodes(array $styles)
    {
        $paths = [[]];
        foreach (array_keys((array) ($styles['elements'] ?? [])) as $element) {
            if ($element !== 'button') {
                $paths[] = ['elements', $element];
            }
        }

        foreach ((array) ($styles['blocks'] ?? []) as $block => $node) {
            if (!is_array($node)) {
                continue;
            }

            $paths[] = ['blocks', $block];
            foreach (['elements', 'variations'] as $kind) {
                foreach (array_keys((array) ($node[$kind] ?? [])) as $name) {
                    $paths[] = ['blocks', $block, $kind, $name];
                }
            }
        }

        return $paths;
    }

    // The palette color that reads best and is gray when the text was, else the text's own hue fitted to read.
    private static function readableOn(array $data, $text, $fill)
    {
        $neutral = self::saturation($text) < self::NEUTRAL;
        $best = null;
        foreach (self::paletteOf($data) as $entry) {
            $hex = self::hexOf($data, (string) ($entry['color'] ?? ''));
            if ($hex === null || (self::saturation($hex) < self::NEUTRAL) !== $neutral) {
                continue;
            }

            $contrast = self::contrast($hex, $fill);
            if ($contrast >= self::READABLE && (!$best || $contrast > $best['contrast'])) {
                $best = ['slug' => $entry['slug'], 'contrast' => $contrast];
            }
        }

        return $best ? "var(--wp--preset--color--{$best['slug']})" : self::fitted($text, $fill);
    }

    private static function fitted($text, $fill)
    {
        list($hue, $saturation, $lightness) = self::hsl($text);
        $step = self::luminance($fill) > 0.18 ? -0.02 : 0.02;
        $hex = $text;
        while (self::contrast($hex, $fill) < self::READABLE && $lightness > 0 && $lightness < 1) {
            $lightness = max(0, min(1, $lightness + $step));
            $hex = self::fromHsl($hue, $saturation, $lightness);
        }

        return $hex;
    }

    private static function saturation($hex)
    {
        return self::hsl($hex)[1];
    }

    private static function hsl($hex)
    {
        list($red, $green, $blue) = array_map(function ($at) use ($hex) {
            return hexdec(substr($hex, $at, 2)) / 255;
        }, [1, 3, 5]);
        $max = max($red, $green, $blue);
        $min = min($red, $green, $blue);
        $lightness = ($max + $min) / 2;
        $delta = $max - $min;
        if ($delta == 0) {
            return [0, 0, $lightness];
        }

        $saturation = $delta / (1 - abs(2 * $lightness - 1));
        if ($max === $red) {
            $hue = fmod(($green - $blue) / $delta, 6);
        } elseif ($max === $green) {
            $hue = ($blue - $red) / $delta + 2;
        } else {
            $hue = ($red - $green) / $delta + 4;
        }

        return [fmod($hue * 60 + 360, 360), $saturation, $lightness];
    }

    private static function fromHsl($hue, $saturation, $lightness)
    {
        $chroma = (1 - abs(2 * $lightness - 1)) * $saturation;
        $second = $chroma * (1 - abs(fmod($hue / 60, 2) - 1));
        $rgb = [
            [$chroma, $second, 0],
            [$second, $chroma, 0],
            [0, $chroma, $second],
            [0, $second, $chroma],
            [$second, 0, $chroma],
            [$chroma, 0, $second],
        ][(int) floor($hue / 60) % 6];
        $match = $lightness - $chroma / 2;
        return '#' . implode('', array_map(function ($channel) use ($match) {
            return str_pad(dechex((int) round(($channel + $match) * 255)), 2, '0', STR_PAD_LEFT);
        }, $rgb));
    }

    // A served scheme copies a color's hex into its buttons and two-color filters, so those follow it.
    private static function recolored(array $data, $layer)
    {
        $changes = self::changes($layer);
        if (!$changes) {
            return $data;
        }

        $palette = $data['settings']['color']['palette'] ?? [];
        $lists = \wp_is_numeric_array($palette) ? ['custom' => $palette] : (is_array($palette) ? $palette : []);
        $theme = (array) (\WP_Theme_JSON_Resolver::get_theme_data()->get_settings()['color']['palette']['theme'] ?? []);
        foreach ($changes as $slug => $hex) {
            $origin = self::originOf($lists, $slug);
            $entry = self::entryOf($origin === null ? $theme : (array) $lists[$origin], $slug);
            if (!$entry) {
                continue;
            }

            $was = self::hexOf($data, (string) ($entry['color'] ?? ''));
            if ($was !== null && $was !== $hex) {
                foreach ([['custom', 'elements', 'button'], ['color', 'duotone']] as $path) {
                    $copies = self::valueAt((array) ($data['settings'] ?? []), $path);
                    if (is_array($copies)) {
                        $swapped = self::swapped($copies, $was, $hex);
                        $data['settings'] = self::withValue($data['settings'], $path, $swapped);
                    }
                }
            }

            if (preg_match('/^var\(--wp--custom--color--([a-z0-9-]+)\)$/', (string) ($entry['color'] ?? ''), $match)) {
                $data['settings']['custom']['color'][$match[1]] = $hex;
                continue;
            }

            if ($origin === null) {
                $lists['theme'] = $theme;
                $origin = 'theme';
            }

            $lists[$origin] = array_map(function ($each) use ($slug, $hex) {
                return ($each['slug'] ?? '') === $slug ? array_merge($each, ['color' => $hex]) : $each;
            }, (array) $lists[$origin]);
        }

        if ($lists) {
            $data['settings']['color']['palette'] = $lists;
        }

        return $data;
    }

    // A button state the change didn't touch keeps its colors, even ones a design chose to read less.
    private static function inkFor(array $data, array $before)
    {
        $palette = array_values(array_filter(array_map(function ($entry) use ($data) {
            return ['slug' => $entry['slug'] ?? '', 'hex' => self::hexOf($data, (string) ($entry['color'] ?? ''))];
        }, self::paletteOf($data)), function ($color) {
            return $color['slug'] !== '' && $color['hex'] !== null;
        }));

        $inks = [];
        foreach (['color', ':hover', ':focus'] as $state) {
            list($fill, $text) = self::buttonColors($data, $state);
            $unchanged = self::buttonColors($before, $state) === [$fill, $text];
            if ($unchanged || $fill === null || $text === null || self::contrast($fill, $text) >= self::READABLE) {
                continue;
            }

            usort($palette, function ($a, $b) use ($fill) {
                return self::contrast($b['hex'], $fill) <=> self::contrast($a['hex'], $fill);
            });
            if ($palette && self::contrast($palette[0]['hex'], $fill) > self::contrast($text, $fill)) {
                $inks[$state] = $palette[0]['slug'];
            }
        }

        return $inks;
    }

    private static function buttonColors(array $data, $state)
    {
        $theme = \WP_Theme_JSON_Resolver::get_theme_data()->get_settings();
        $button = array_replace_recursive(
            (array) ($theme['custom']['elements']['button'] ?? []),
            (array) ($data['settings']['custom']['elements']['button'] ?? [])
        );
        $colors = $state === 'color' ? ($button['color'] ?? []) : ($button[$state]['color'] ?? []);
        return [
            self::hexOf($data, (string) ($colors['background'] ?? '')),
            self::hexOf($data, (string) ($colors['text'] ?? '')),
        ];
    }

    // The user's palette lists over the theme's, by slug.
    private static function paletteOf(array $data)
    {
        $palette = $data['settings']['color']['palette'] ?? [];
        $lists = \wp_is_numeric_array($palette) ? [$palette] : (is_array($palette) ? array_values($palette) : []);
        $theme = (array) (\WP_Theme_JSON_Resolver::get_theme_data()->get_settings()['color']['palette']['theme'] ?? []);
        $all = [];
        foreach (array_merge([$theme], $lists) as $list) {
            foreach ((array) $list as $entry) {
                if (is_array($entry) && isset($entry['slug'])) {
                    $all[$entry['slug']] = $entry;
                }
            }
        }

        return array_values($all);
    }

    // A color as the page shows it, through palette and custom variables; null for anything else.
    private static function hexOf(array $data, $value, $depth = 0)
    {
        $color = \sanitize_hex_color($value);
        if ($color) {
            $long = strlen($color) === 4 ? preg_replace('/([0-9a-f])/i', '$1$1', substr($color, 1)) : substr($color, 1);
            return '#' . strtolower($long);
        }

        if ($depth > 3) {
            return null;
        }

        if (preg_match('/^var\(--wp--preset--color--([a-z0-9-]+)\)$/', $value, $match)) {
            $entry = self::entryOf(self::paletteOf($data), $match[1]);
            return $entry ? self::hexOf($data, (string) ($entry['color'] ?? ''), $depth + 1) : null;
        }

        // An earlier fix's text: the variable a filled block sets, else this.
        if (preg_match('/^var\(--extendify-readable-[a-z0-9-]+, (.+)\)$/', $value, $match)) {
            return self::hexOf($data, $match[1], $depth + 1);
        }

        if (preg_match('/^var\(--wp--custom--([a-z0-9-]+(?:--[a-z0-9-]+)*)\)$/', $value, $match)) {
            $path = explode('--', $match[1]);
            $theme = (array) (\WP_Theme_JSON_Resolver::get_theme_data()->get_settings()['custom'] ?? []);
            $held = self::valueAt((array) ($data['settings']['custom'] ?? []), $path) ?? self::valueAt($theme, $path);
            return is_string($held) ? self::hexOf($data, $held, $depth + 1) : null;
        }

        return null;
    }

    private static function contrast($a, $b)
    {
        $lighter = max(self::luminance($a), self::luminance($b));
        $darker = min(self::luminance($a), self::luminance($b));
        return ($lighter + 0.05) / ($darker + 0.05);
    }

    private static function luminance($hex)
    {
        $channels = array_map(function ($at) use ($hex) {
            $channel = hexdec(substr($hex, $at, 2)) / 255;
            return $channel <= 0.03928 ? $channel / 12.92 : pow(($channel + 0.055) / 1.055, 2.4);
        }, [1, 3, 5]);
        return 0.2126 * $channels[0] + 0.7152 * $channels[1] + 0.0722 * $channels[2];
    }

    private static function swapped(array $tree, $was, $hex)
    {
        return array_map(function ($value) use ($was, $hex) {
            if (is_array($value)) {
                return self::swapped($value, $was, $hex);
            }

            return is_string($value) && strtolower($value) === $was ? $hex : $value;
        }, $tree);
    }

    private static function valueAt(array $tree, array $path)
    {
        foreach ($path as $key) {
            if (!is_array($tree) || !array_key_exists($key, $tree)) {
                return null;
            }

            $tree = $tree[$key];
        }

        return $tree;
    }

    private static function withValue(array $tree, array $path, $value)
    {
        $key = array_shift($path);
        $inner = is_array($tree[$key] ?? null) ? $tree[$key] : [];
        $tree[$key] = $path ? self::withValue($inner, $path, $value) : $value;
        return $tree;
    }

    private static function entryOf(array $list, $slug)
    {
        foreach ($list as $entry) {
            if (($entry['slug'] ?? '') === $slug) {
                return $entry;
            }
        }

        return null;
    }

    private static function originOf(array $lists, $slug)
    {
        foreach ($lists as $origin => $list) {
            if (in_array($slug, array_column((array) $list, 'slug'), true)) {
                return $origin;
            }
        }

        return null;
    }
}

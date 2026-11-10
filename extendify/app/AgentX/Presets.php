<?php

/**
 * Theme presets.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * The colors, sizes, fonts, spacing and shadows the site's theme offers, which a block edit may name by slug.
 */
class Presets
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    // The setting path of each kind, and the field that holds a preset's value.
    const KINDS = [
        'colors' => [['color', 'palette'], 'color'],
        'gradients' => [['color', 'gradients'], 'gradient'],
        'fontSizes' => [['typography', 'fontSizes'], 'size'],
        'fontFamilies' => [['typography', 'fontFamilies'], 'fontFamily'],
        'spacing' => [['spacing', 'spacingSizes'], 'size'],
        'shadows' => [['shadow', 'presets'], 'shadow'],
        'duotones' => [['color', 'duotone'], 'colors'],
    ];
    // Core's own palette and gradients would crowd out the theme's, and the agent offers the theme's look.
    const ORIGINS = ['custom', 'theme', 'default'];
    const MOST = 40;
    // The style fields a block takes from the theme when it sets nothing, by the agent's setting names.
    const TYPOGRAPHY = [
        'fontSize' => 'font_size',
        'fontFamily' => 'font_family',
        'fontWeight' => 'font_weight',
        'fontStyle' => 'font_style',
        'textTransform' => 'text_transform',
        'textDecoration' => 'text_decoration',
        'lineHeight' => 'line_height',
        'letterSpacing' => 'letter_spacing',
    ];
    const COLOR = ['text' => 'text_color', 'background' => 'background_color'];
    const TINT = '/^background-?tint-?(\d+)$/i';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function current()
    {
        $presets = [];
        foreach (self::KINDS as $kind => list($path, $field)) {
            $presets[$kind] = self::listed(\wp_get_global_settings($path), $field, $kind);
        }
        $colors = array_slice(array_merge($presets['colors'], self::tints()), 0, self::MOST);
        $presets['colors'] = self::markSaved($colors);
        $presets['defaults'] = self::defaults();

        return $presets;
    }

    // As the frame renders them, since a color scheme being tried changes them from the saved ones.
    public static function duotones()
    {
        list($path, $field) = self::KINDS['duotones'];
        return self::listed(\wp_get_global_settings($path), $field, 'duotones');
    }

    // A saved color's name was made up by the agent, and one saved beside another palette may no longer fit.
    private static function markSaved(array $colors)
    {
        $saved = SavedColors::current();
        $drafted = array_column(array_filter(Draft::get()['named'] ?? [], 'is_array'), 'slug');
        if (!$saved && !$drafted) {
            return $colors;
        }

        $palette = $saved ? SavedColors::palette(array_keys($saved)) : '';
        return array_map(function ($color) use ($saved, $palette, $drafted) {
            if (in_array($color['slug'], $drafted, true)) {
                return $color + ['saved' => true];
            }

            $kept = $saved[$color['slug']] ?? null;
            if ($kept === null) {
                return $color;
            }

            return $color + ['saved' => true] + (($kept['palette'] ?? '') !== $palette ? ['stale' => true] : []);
        }, $colors);
    }

    // A palette's card tints are custom colors, not palette entries, yet the page shows them like any color.
    public static function tints()
    {
        $custom = \wp_get_global_settings(['custom']);
        $colors = is_array($custom['color'] ?? null) ? $custom['color'] : [];
        // A later tint that repeats an earlier one, like tint 4 pointing at tint 3, goes by the earlier name.
        uksort($colors, function ($a, $b) {
            return (int) preg_replace('/\D/', '', (string) $a) <=> (int) preg_replace('/\D/', '', (string) $b);
        });
        $tints = [];
        foreach ($colors as $key => $value) {
            if (!preg_match(self::TINT, (string) $key, $m)) {
                continue;
            }

            $color = self::resolved($value, $custom);
            $known = array_map('strtolower', array_column($tints, 'value'));
            if (!is_string($color) || strpos($color, '#') !== 0 || in_array(strtolower($color), $known, true)) {
                continue;
            }

            $tints[] = [
                'slug' => "background-tint-{$m[1]}",
                'name' => "Tint {$m[1]}",
                'value' => $color,
                'custom' => true,
            ];
        }

        return $tints;
    }

    public static function isTint($slug)
    {
        return is_string($slug) && in_array($slug, array_column(self::tints(), 'slug'), true);
    }

    // What the theme gives text, each heading level and buttons, so "a bit smaller" knows where it starts.
    private static function defaults()
    {
        $styles = \wp_get_global_styles();
        $elements = $styles['elements'] ?? [];
        $custom = \wp_get_global_settings(['custom']);
        $read = function ($style) use ($custom) {
            $values = [];
            foreach (self::TYPOGRAPHY as $field => $setting) {
                $value = self::resolved($style['typography'][$field] ?? null, $custom);
                if ($value !== null) {
                    $values[$setting] = $value;
                }
            }
            foreach (self::COLOR as $field => $setting) {
                $value = self::resolved($style['color'][$field] ?? null, $custom);
                if ($value !== null) {
                    $values[$setting] = $value;
                }
            }
            return $values;
        };

        $defaults = ['body' => $read($styles), 'button' => $read($elements['button'] ?? [])];
        $heading = $read($elements['heading'] ?? []);
        foreach (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as $level) {
            $defaults[$level] = array_merge($heading, $read($elements[$level] ?? []));
        }

        return array_filter($defaults);
    }

    // A preset's slug for a preset variable, a custom variable followed to what it holds, else the CSS value.
    private static function resolved($value, $custom, $depth = 0)
    {
        if (!is_string($value) || $value === '' || $value === 'inherit' || strlen($value) > 200 || $depth > 4) {
            return null;
        }
        if (preg_match('/^var:preset\|[a-z-]+\|([\w-]+)$/', $value, $m)) {
            return $m[1];
        }
        if (preg_match('/^var\(--wp--preset--[a-z-]+?--([\w-]+)\)$/', $value, $m)) {
            return $m[1];
        }
        if (preg_match('/^var(?::custom\||\(--wp--custom--)([\w|-]+?)\)?$/', $value, $m)) {
            $held = $custom;
            foreach (preg_split('/--|\|/', $m[1]) as $key) {
                // WordPress writes camelCase keys kebab-cased into the variable name.
                $camel = lcfirst(str_replace(' ', '', ucwords(str_replace('-', ' ', $key))));
                $held = is_array($held) ? ($held[$key] ?? $held[$camel] ?? null) : null;
            }
            return self::resolved($held, $custom, $depth + 1);
        }
        return strpos($value, 'var(') === false ? $value : null;
    }

    private static function listed($byOrigin, $field, $kind)
    {
        if (!is_array($byOrigin)) {
            return [];
        }

        $origins = isset($byOrigin['slug']) || isset($byOrigin[0]) ? ['theme' => $byOrigin] : $byOrigin;
        $hasTheme = !empty($origins['theme']) || !empty($origins['custom']);
        // A theme's filters are fixed hex pairs, so beside a palette's they show colors the site no longer has.
        $paletteOnly = $kind === 'duotones' && !empty($origins['custom']);
        $listed = [];
        foreach (self::ORIGINS as $origin) {
            // The block editor offers core's own filters only while the theme leaves them on.
            $skipDefault = $origin === 'default' && (
                ($hasTheme && in_array($kind, ['colors', 'gradients'], true))
                || ($kind === 'duotones' && !\wp_get_global_settings(['color', 'defaultDuotone']))
            );
            $skip = $skipDefault || ($paletteOnly && $origin !== 'custom');
            if ($skip || empty($origins[$origin]) || !is_array($origins[$origin])) {
                continue;
            }

            foreach ($origins[$origin] as $preset) {
                if (!isset($preset['slug'], $preset[$field]) || isset($listed[$preset['slug']])) {
                    continue;
                }

                $listed[$preset['slug']] = [
                    'slug' => (string) $preset['slug'],
                    'name' => (string) ($preset['name'] ?? $preset['slug']),
                    'value' => is_string($preset[$field]) ? $preset[$field] : \wp_json_encode($preset[$field]),
                ];
            }
        }

        return array_slice(array_values($listed), 0, self::MOST);
    }
}

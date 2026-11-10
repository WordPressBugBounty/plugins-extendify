<?php

/**
 * Style layers.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Builds global styles from a vibe, a color scheme and fonts.
 */
class StyleLayers
{
    /**
     * Renders the site frame with the picked layers over the saved styles, without saving them.
     *
     * @param array $picks A variation's slug and each layer's picked id, each empty when not picked.
     * @return void
     */
    public static function preview(array $picks)
    {
        if (!empty($picks['named'])) {
            self::drafted((array) $picks['named']);
        }

        $found = self::found($picks);
        if (
            !array_filter($found)
            && !PaletteColors::changes($picks['palette'] ?? '')
            && !ThemeSettings::changes($picks['settings'] ?? '')
        ) {
            return;
        }

        if ($found['vibe']) {
            Vibes::register($found['vibe']);
        }

        \add_filter('wp_theme_json_data_user', function ($data) use ($picks) {
            $saved = $data->get_data();
            return new \WP_Theme_JSON_Data(['version' => $saved['version']] + self::compose($saved, $picks), 'custom');
        });
        // Styles read earlier in the request are cached without the picks.
        \wp_clean_theme_json_cache();
    }

    /**
     * The picked schemes over the saved styles until the returned call, as the frame shows them.
     *
     * @param array $picks Each layer's picked id, and the palette's changed colors.
     * @return callable Takes them away again.
     */
    public static function picked(array $picks)
    {
        if (
            !array_filter(self::found($picks))
            && !PaletteColors::changes($picks['palette'] ?? '')
            && !ThemeSettings::changes($picks['settings'] ?? '')
        ) {
            return function () {
            };
        }

        $add = function ($data) use ($picks) {
            $saved = $data->get_data();
            return new \WP_Theme_JSON_Data(['version' => $saved['version']] + self::compose($saved, $picks), 'custom');
        };
        \add_filter('wp_theme_json_data_user', $add);
        \wp_clean_theme_json_cache();
        return function () use ($add) {
            \remove_filter('wp_theme_json_data_user', $add);
            \wp_clean_theme_json_cache();
        };
    }

    /**
     * The draft's new colors count as palette colors until Save, so the frame shows them and an edit can set one.
     * Runs after a picked scheme, whose palette replaces the whole list.
     *
     * @param array $named Each drafted color's name and slug by hex.
     * @return callable Takes them away again.
     */
    public static function drafted(array $named)
    {
        $add = function ($data) use ($named) {
            $saved = $data->get_data();
            return new \WP_Theme_JSON_Data(
                ['version' => $saved['version']] + SavedColors::withDrafted($saved, $named),
                'custom'
            );
        };
        \add_filter('wp_theme_json_data_user', $add, 20);
        \wp_clean_theme_json_cache();
        return function () use ($add) {
            \remove_filter('wp_theme_json_data_user', $add, 20);
            \wp_clean_theme_json_cache();
        };
    }

    // A variation is a color scheme plus fonts, so a picked layer replaces only its own part.
    public static function compose(array $saved, array $picks)
    {
        $found = self::found($picks);
        if (!array_filter($found)) {
            return ThemeSettings::applied(
                PaletteColors::repainted($saved, $picks['palette'] ?? ''),
                $picks['settings'] ?? ''
            );
        }

        $merged = self::merge([
            'vibe' => $found['vibe'] ?? $saved,
            'colors' => $found['colors'] ?? $found['variation'] ?? $saved,
            'fonts' => $found['fonts'] ?? $found['variation'] ?? $saved,
        ]);
        if (isset($saved['styles']['css'])) {
            $merged['styles']['css'] = $saved['styles']['css'];
        }

        return ThemeSettings::applied(
            PaletteColors::repainted(SavedColors::carried($saved, $merged), $picks['palette'] ?? ''),
            $picks['settings'] ?? ''
        );
    }

    private static function found(array $picks)
    {
        return [
            'variation' => StyleVariations::find($picks['variation'] ?? ''),
            'colors' => ColorSchemes::find($picks['colors'] ?? ''),
            'fonts' => FontPairs::find($picks['fonts'] ?? ''),
            'vibe' => Vibes::find($picks['vibe'] ?? ''),
        ];
    }

    // Each source gives only its layer's leaves, so no layer keeps another's leftovers.
    public static function merge(array $sources)
    {
        $merged = [];
        foreach ($sources as $layer => $data) {
            $sections = array_intersect_key($data, ['settings' => true, 'styles' => true]);
            $merged = array_replace_recursive($merged, self::owned($sections, $layer, []));
        }

        return $merged;
    }

    private static function owned(array $tree, $layer, array $path)
    {
        $owned = [];
        foreach ($tree as $key => $value) {
            $at = array_merge($path, [$key]);
            // Preset lists are one value; merging them item by item mixes palettes.
            if (is_array($value) && $value && !\wp_is_numeric_array($value)) {
                $value = self::owned($value, $layer, $at);
                if ($value) {
                    $owned[$key] = $value;
                }

                continue;
            }

            if (self::layerOf($at) === $layer) {
                $owned[$key] = $value;
            }
        }

        return $owned;
    }

    private static function layerOf(array $path)
    {
        $fontFamilies = array_slice($path, 0, 3) === ['settings', 'typography', 'fontFamilies'];
        if ($fontFamilies || in_array('fontFamily', $path, true)) {
            return 'fonts';
        }

        // A vibe's block styles point at palette slugs, which a color scheme only fills.
        if (in_array('variations', $path, true)) {
            return 'vibe';
        }

        return array_intersect($path, ['color', 'duotone', 'gradient', 'gradients', 'palette']) ? 'colors' : 'vibe';
    }
}

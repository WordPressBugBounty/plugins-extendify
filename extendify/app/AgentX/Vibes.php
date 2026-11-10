<?php

/**
 * Vibes.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

use Extendify\Constants;

/**
 * The site styles the agent offers, served by Extendify: layout, corners, spacing and block styles.
 */
class Vibes
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const PARAM = 'extendify-vibe';
    const CACHE = 'extendify_agentx_vibes';
    // Patterns name their block styles after this vibe, so every vibe's styles take its names.
    const PATTERN_VIBE = 'natural-1';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * Each vibe's id, its name, and the button corner its option shows.
     *
     * @return array
     */
    public static function all()
    {
        $all = [];
        foreach (self::full() as $id => $vibe) {
            $all[] = self::optionOf($id, $vibe);
        }

        return $all;
    }

    /**
     * A vibe's option: its name, and the button, card and picture its tile draws.
     *
     * @param string $id    The vibe's id.
     * @param array  $vibe  The vibe from find().
     * @return array
     */
    public static function optionOf($id, array $vibe)
    {
        return [
            'id' => $id,
            'title' => $vibe['title'],
            'button' => self::buttonOf($vibe),
        ] + self::shapeOf($vibe) + (!empty($vibe['preview']) ? ['preview' => $vibe['preview']] : []);
    }

    /**
     * The vibe as a theme.json fragment, its block styles under the names patterns use.
     *
     * @param string $id A served vibe's id starts with vibe:.
     * @return array|null
     */
    public static function find($id)
    {
        if (strpos((string) $id, 'made:') === 0) {
            return MadeStyles::find($id);
        }

        return $id === '' ? null : self::full()[$id] ?? null;
    }

    /**
     * The button corner the site shows now, for the option that keeps it.
     *
     * @return array
     */
    public static function current()
    {
        $vibe = ['styles' => \wp_get_global_styles()];
        return ['button' => self::buttonOf($vibe)] + self::shapeOf($vibe);
    }

    /**
     * The site's saved look, for the option that keeps it, drawn like a vibe's own.
     *
     * @return array|null
     */
    public static function savedPreview()
    {
        return self::previewOf(\WP_Theme_JSON_Resolver::get_merged_data()->get_raw_data()['styles']['blocks'] ?? []);
    }

    /**
     * What draws a tile's card and section, from block styles under the names patterns use.
     *
     * @param array $blocks Styles by block, as theme.json has them.
     * @return array|null
     */
    public static function previewOf(array $blocks)
    {
        // A page writes a block style's rules only for its own blocks, under numbered names.
        $tree = new \WP_Theme_JSON([
            'version' => \WP_Theme_JSON::LATEST_SCHEMA,
            'styles' => ['blocks' => array_intersect_key($blocks, array_flip(['core/group', 'core/image']))],
        ], 'custom');
        $css = self::previewCss($tree->get_stylesheet(['styles', 'custom-css'], null, [
            'include_block_style_variations' => true,
            'skip_root_layout_styles' => true,
        ]), self::PATTERN_VIBE);
        return $css ? ['slug' => self::PATTERN_VIBE, 'css' => $css] : null;
    }

    /**
     * WordPress drops a block style it doesn't know from user styles, so a vibe's are registered first.
     *
     * @param array $vibe The vibe from find().
     * @return void
     */
    public static function register(array $vibe)
    {
        $registry = \WP_Block_Styles_Registry::get_instance();
        foreach ($vibe['styles']['blocks'] ?? [] as $block => $styles) {
            foreach (array_keys($styles['variations'] ?? []) as $name) {
                if (!$registry->is_registered($block, $name)) {
                    \register_block_style($block, ['name' => $name, 'label' => $name]);
                }
            }
        }
    }

    private static function full()
    {
        $vibes = \get_transient(self::CACHE);
        if (!is_array($vibes)) {
            $brief = function ($args) {
                $args['timeout'] = 5;
                return $args;
            };
            \add_filter('http_request_args', $brief, 101);
            try {
                $response = \wp_remote_get(Constants::AI_HOST . '/api/vibes?vibes=agent');
            } finally {
                \remove_filter('http_request_args', $brief, 101);
            }

            $vibes = json_decode(\wp_remote_retrieve_body($response), true)['vibes'] ?? null;
            // A failed fetch offers no vibes, and asks again soon.
            \set_transient(
                self::CACHE,
                is_array($vibes) ? $vibes : [],
                is_array($vibes) ? DAY_IN_SECONDS : 10 * MINUTE_IN_SECONDS
            );
        }

        $full = [];
        foreach (is_array($vibes) ? $vibes : [] as $vibe) {
            if (empty($vibe['slug']) || $vibe['slug'] === self::PATTERN_VIBE) {
                continue;
            }

            $full['vibe:' . \sanitize_key($vibe['slug'])] = self::converted($vibe);
        }

        return $full;
    }

    // A vibe's block styles sit outside theme.json's styles, keyed by its own name.
    private static function converted(array $vibe)
    {
        $styles = $vibe['styles'] ?? [];
        foreach ($vibe['blocks'] ?? [] as $block => $variations) {
            if (!preg_match('~^[a-z0-9-]+/[a-z0-9-]+$~', $block) || !is_array($variations)) {
                continue;
            }

            foreach ($variations as $name => $style) {
                $renamed = str_replace("--{$vibe['slug']}--", '--' . self::PATTERN_VIBE . '--', $name);
                $styles['blocks'][$block]['variations'][$renamed] = $style;
            }
        }

        $css = self::previewCss($vibe['css'] ?? '', $vibe['slug']);
        return [
            'title' => self::titleOf($vibe),
            'settings' => $vibe['settings'] ?? [],
            'styles' => $styles,
            'preview' => $css ? [
                'slug' => \sanitize_key($vibe['slug']),
                'css' => $css,
                'vars' => self::cssVars($vibe['settings']['custom'] ?? []),
            ] : null,
        ];
    }

    /**
     * A vibe's own custom settings as CSS variables.
     *
     * A tile reads every var() off the site, so without these twelve cards draw one shadow.
     *
     * @param array  $custom The vibe's settings.custom.
     * @param string $prefix The variable name so far.
     * @return array
     */
    private static function cssVars(array $custom, $prefix = '--wp--custom')
    {
        $vars = [];
        foreach ($custom as $key => $value) {
            $name = $prefix . '--' . strtolower(preg_replace('/([a-z0-9])([A-Z])/', '$1-$2', (string) $key));
            if (is_array($value)) {
                $vars = array_merge($vars, self::cssVars($value, $name));
                continue;
            }

            if (is_string($value) || is_numeric($value)) {
                $vars[$name] = (string) $value;
            }
        }

        return $vars;
    }

    // Some vibes differ only in CSS, like Prism's cut corners, so an option carries what draws its card.
    private static function previewCss($css, $slug)
    {
        $kept = [];
        // Foundry's black and white is on every image block, not on its cards.
        $whole = [':root', ':root :where(.wp-block-image img)'];
        $drawn = '/--' . preg_quote($slug, '/') . '--(?:section\b|item-card-1--align-center)/';
        foreach (explode('}', (string) $css) as $rule) {
            $parts = explode('{', $rule, 2);
            $selector = trim($parts[0]);
            if (count($parts) === 2 && (in_array($selector, $whole, true) || preg_match($drawn, $selector))) {
                $kept[] = $selector . '{' . $parts[1] . '}';
            }
        }

        return implode('', $kept);
    }

    // Unnamed vibes carry their slug as a title, like soft-1.
    private static function titleOf(array $vibe)
    {
        $title = $vibe['title'] ?? '';
        return $title && $title !== $vibe['slug']
            ? $title
            : ucfirst(preg_replace('/-\d+$/', '', $vibe['slug']));
    }

    // Eleven vibes share a few button corners, so an option draws its card and picture too.
    private static function shapeOf(array $vibe)
    {
        $blocks = $vibe['styles']['blocks'] ?? [];
        $named = '--' . self::PATTERN_VIBE . '--';
        $card = $blocks['core/group']['variations']['ext-preset--group' . $named . 'item-card-1--align-start'] ?? [];
        $image = $blocks['core/image']['variations']['ext-preset--image' . $named . 'image-1--content-any'] ?? [];
        $border = $card['border'] ?? [];
        $color = self::drawable($border['color'] ?? 'currentColor');
        $line = isset($border['width'])
            ? trim($border['width'] . ' ' . ($border['style'] ?? 'solid') . ' ' . $color)
            : null;
        return [
            'card' => [
                'radius' => self::radiusOf($border['radius'] ?? null),
                'border' => $line,
                'shadow' => isset($card['shadow']) ? self::drawable($card['shadow']) : null,
            ],
            'image' => ['radius' => self::radiusOf($image['border']['radius'] ?? null)],
        ];
    }

    private static function radiusOf($radius)
    {
        if (!is_array($radius)) {
            return is_string($radius) ? $radius : null;
        }

        $corners = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
        return implode(' ', array_map(function ($corner) use ($radius) {
            return $radius[$corner] ?? '0';
        }, $corners));
    }

    // A variable the chat can't read would drop the whole border or shadow, so one left takes the text color.
    private static function drawable($value)
    {
        return preg_replace('/var\([^()]*\)/', 'currentColor', self::resolved($value));
    }

    // The agent's chat has no theme stylesheet, so a preset color or shadow is written out as its value.
    private static function resolved($value)
    {
        $colors = [];
        foreach (\wp_get_global_settings(['color', 'palette']) ?: [] as $palette) {
            foreach ((array) $palette as $color) {
                $colors[$color['slug'] ?? ''] = $color['color'] ?? '';
            }
        }

        $shadows = [];
        foreach (\wp_get_global_settings(['shadow', 'presets']) ?: [] as $presets) {
            foreach ((array) $presets as $shadow) {
                $shadows[$shadow['slug'] ?? ''] = $shadow['shadow'] ?? '';
            }
        }

        $custom = \wp_get_global_settings(['custom']) ?: [];
        $preset = '/var\(--wp--(preset|custom)--([a-z-]+)--([a-z0-9-]+)\)/';
        return preg_replace_callback($preset, function ($found) use ($colors, $shadows, $custom) {
            list(, $kind, $group, $slug) = $found;
            if ($kind === 'preset' && $group === 'color') {
                return $colors[$slug] ?? 'currentColor';
            }

            if ($kind === 'preset' && $group === 'shadow') {
                return self::resolved($shadows[$slug] ?? 'none');
            }

            $value = $custom[$group][$slug] ?? null;
            return is_string($value) ? self::resolved($value) : 'currentColor';
        }, (string) $value);
    }

    private static function buttonOf(array $vibe)
    {
        $name = 'ext-preset--button--' . self::PATTERN_VIBE . '--button-1';
        return ['radius' => $vibe['styles']['blocks']['core/button']['variations'][$name]['border']['radius'] ?? null];
    }
}

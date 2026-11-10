<?php

/**
 * Font pairs.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * The theme's font pairs the agent offers: a heading font and a body font.
 */
class FontPairs
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const PARAM = 'extendify-fonts';

    /**
     * Each pair's id, its name, and the font stacks its option shows.
     *
     * @return array
     */
    public static function all()
    {
        $all = [];
        foreach (self::full() as $id => $pair) {
            $all[] = ['id' => $id, 'title' => $pair['title'], 'fonts' => self::fontsOf($pair['styles'] ?? [])];
        }

        return $all;
    }

    /**
     * The pair as a theme.json fragment.
     *
     * @param string $id A theme pair's id starts with theme:.
     * @return array|null
     */
    public static function find($id)
    {
        if (strpos((string) $id, 'made:') === 0) {
            return MadeFonts::find($id);
        }

        return $id === '' ? null : self::full()[$id] ?? null;
    }

    /**
     * The fonts the site shows now, for the option that keeps them.
     *
     * @return array
     */
    public static function current()
    {
        return self::fontsOf(\wp_get_global_styles());
    }

    /**
     * The theme's font faces, so the options can show in their own fonts outside the site.
     *
     * @return string
     */
    public static function faces()
    {
        ob_start();
        \wp_print_font_faces(\WP_Font_Face_Resolver::get_fonts_from_theme_json());
        return trim(preg_replace('#</?style[^>]*>#', '', ob_get_clean()));
    }

    private static function full()
    {
        $full = [];
        foreach (StyleVariations::fontOnly() as $slug => $variation) {
            $full["theme:{$slug}"] = $variation;
        }

        return $full;
    }

    private static function fontsOf(array $styles)
    {
        $body = $styles['typography']['fontFamily'] ?? '';
        $heading = $styles['elements']['heading']['typography']['fontFamily'] ?? $body;
        return ['heading' => self::stackOf($heading), 'body' => self::stackOf($body)];
    }

    // Variations name a preset, which the shell has no stylesheet for.
    private static function stackOf($font)
    {
        $preset = '/^var(?:\(--wp--preset--font-family--|:preset\|font-family\|)([a-z0-9-]+)\)?$/';
        if (!preg_match($preset, $font, $match)) {
            return $font ?: null;
        }

        $families = \wp_get_global_settings(['typography', 'fontFamilies']);
        $all = array_merge($families['default'] ?? [], $families['theme'] ?? [], $families['custom'] ?? []);
        return array_column($all, 'fontFamily', 'slug')[$match[1]] ?? null;
    }
}

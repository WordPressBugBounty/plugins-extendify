<?php

/**
 * Style variations.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Finds the theme's style variations.
 */
class StyleVariations
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const PARAM = 'extendify-variation';

    public static function all()
    {
        $full = self::full();
        return array_map(function ($slug, $variation) {
            return ['slug' => $slug, 'title' => $variation['title']];
        }, array_keys($full), $full);
    }

    public static function find($slug)
    {
        return $slug === '' ? null : self::full()[$slug] ?? null;
    }

    // The Site Editor lists these as the theme's color palettes.
    public static function colorOnly()
    {
        return self::where(function (array $tree) {
            return $tree && self::limitedTo($tree, ['color']);
        });
    }

    // The Site Editor lists these as the theme's font pairings.
    public static function fontOnly()
    {
        return self::where(function (array $tree) {
            return $tree && self::limitedTo($tree, ['typography', 'spacing']);
        });
    }

    // The Site Editor lists color-only and type-only variations apart.
    private static function full()
    {
        return self::where(function (array $tree) {
            return !self::limitedTo($tree, ['color']) && !self::limitedTo($tree, ['typography', 'spacing']);
        });
    }

    private static function where(callable $kind)
    {
        $found = [];
        foreach (\WP_Theme_JSON_Resolver::get_style_variations() as $variation) {
            $slug = $variation['slug'] ?? \sanitize_title($variation['title']);
            $tree = array_intersect_key($variation, ['settings' => true, 'styles' => true]);
            if (!isset($found[$slug]) && !isset($variation['blockTypes']) && $kind($tree)) {
                $found[$slug] = $variation;
            }
        }

        return $found;
    }

    private static function limitedTo(array $tree, array $keys)
    {
        foreach ($tree as $key => $value) {
            if (in_array($key, $keys, true)) {
                continue;
            }

            if (!is_array($value) || !$value || !self::limitedTo($value, $keys)) {
                return false;
            }
        }

        return true;
    }
}

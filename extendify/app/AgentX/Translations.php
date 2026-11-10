<?php

/**
 * Whether a multilingual plugin shows the page in another language than the site's own.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Names the plugin translating the page in view, since edits there save over the original words.
 */
class Translations
{
    public static function plugin()
    {
        if (self::translatePress()) {
            return 'translatepress';
        }

        if (self::wpml()) {
            return 'wpml';
        }

        if (self::polylang()) {
            return 'polylang';
        }

        return null;
    }

    // TranslatePress keeps the request's language in this global once the request is routed.
    private static function translatePress()
    {
        $settings = \get_option('trp_settings');
        $current = isset($GLOBALS['TRP_LANGUAGE']) ? (string) $GLOBALS['TRP_LANGUAGE'] : '';
        if (!is_array($settings) || empty($settings['default-language']) || $current === '') {
            return false;
        }

        return $current !== (string) $settings['default-language'];
    }

    private static function wpml()
    {
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WPML's own filter
        $current = \apply_filters('wpml_current_language', null);
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WPML's own filter
        $default = \apply_filters('wpml_default_language', null);
        if (!is_string($current) || !is_string($default) || $current === '' || $default === '') {
            return false;
        }

        return $current !== $default;
    }

    private static function polylang()
    {
        if (!function_exists('pll_current_language') || !function_exists('pll_default_language')) {
            return false;
        }

        $current = \pll_current_language('slug');
        $default = \pll_default_language('slug');
        return $current && $default && $current !== $default;
    }
}

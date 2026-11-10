<?php

/**
 * What the site sells, which languages it speaks, and its forms.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Sums up the plugins that change what the agent writes: a store, and a multilingual plugin.
 */
class SiteFacts
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const MOST_FORMS = 20;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * Selling online while WooCommerce is active, languages with a multilingual plugin, and WPForms' forms.
     *
     * @return array
     */
    public static function summary()
    {
        $summary = [];
        if (self::sells()) {
            $summary['selling'] = [
                'plugin' => 'WooCommerce',
                'products' => (int) \wp_count_posts('product')->publish,
            ];
        }

        $languages = self::languages();
        if ($languages) {
            $summary['languages'] = $languages;
        }

        $forms = self::forms();
        if ($forms) {
            $summary['forms'] = ['plugin' => 'WPForms', 'forms' => $forms];
        }

        return $summary;
    }

    // A form block names its form by id, which a plan placing one picks from these.
    private static function forms()
    {
        if (!\function_exists('wpforms')) {
            return [];
        }

        $posts = \get_posts([
            'post_type' => 'wpforms',
            'post_status' => 'publish',
            'numberposts' => self::MOST_FORMS,
            'orderby' => 'ID',
            'order' => 'ASC',
        ]);
        return array_map(function ($post) {
            return ['id' => $post->ID, 'title' => $post->post_title];
        }, $posts);
    }

    private static function sells()
    {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        return \is_plugin_active('woocommerce/woocommerce.php');
    }

    private static function languages()
    {
        if (\function_exists('pll_languages_list')) {
            $names = (array) \pll_languages_list(['fields' => 'name']);
            return ['plugin' => 'Polylang', 'languages' => array_values($names)];
        }

        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WPML's own filter
        $wpml = \apply_filters('wpml_active_languages', null);
        if (is_array($wpml) && $wpml) {
            return ['plugin' => 'WPML', 'languages' => array_values(array_column($wpml, 'native_name'))];
        }

        // The option outlives the plugin, so it counts only while TranslatePress runs.
        $locales = \get_option('trp_settings')['translation-languages'] ?? [];
        if (\class_exists('TRP_Translate_Press') && $locales) {
            return ['plugin' => 'TranslatePress', 'languages' => array_values((array) $locales)];
        }

        return null;
    }
}

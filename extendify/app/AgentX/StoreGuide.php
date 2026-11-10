<?php

/**
 * The WooCommerce store setup guide's progress.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Says whether the store guide can run, what the store already has, and which steps the user finished.
 */
class StoreGuide
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OPTION = 'extendify_agentx_store_guide';
    const STEPS = ['details', 'products', 'payments', 'tax', 'shipping', 'open'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * Keeps the guide from a user WooCommerce's REST routes would refuse every save for.
     *
     * @return boolean
     */
    public static function available()
    {
        return class_exists('WooCommerce') && \current_user_can('manage_woocommerce');
    }

    /**
     * The steps done, what the store already has, and the reads its steps share.
     *
     * @return array|null
     */
    public static function current()
    {
        if (!self::available()) {
            return null;
        }

        return [
            'steps' => self::saved(),
            'has' => self::has(),
            'ships' => self::ships(),
            'currency' => html_entity_decode(\get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8'),
            'shopUrl' => self::shopUrl(),
        ];
    }

    /**
     * Records a step as done.
     *
     * @param string $step - One of STEPS.
     * @return array|\WP_Error
     */
    public static function markDone($step)
    {
        if (!self::available()) {
            return self::refused('WooCommerce is not set up for this user.', 403);
        }

        if (!in_array($step, self::STEPS, true)) {
            return self::refused('The store guide has no such step.', 400);
        }

        \update_option(self::OPTION, array_merge(self::saved(), [$step => 'done']), false);
        return self::current();
    }

    /**
     * @param string  $why    - What the user can't do.
     * @param integer $status - The HTTP status.
     * @return \WP_Error
     */
    public static function refused($why, $status)
    {
        return new \WP_Error('extendify_agentx_store_guide', $why, ['status' => $status]);
    }

    private static function saved()
    {
        $saved = \get_option(self::OPTION, []);
        return is_array($saved) ? array_intersect_key($saved, array_flip(self::STEPS)) : [];
    }

    // What each step sets up that the store already has, as WooCommerce's own task list reads it.
    private static function has()
    {
        global $wpdb;
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Woo has no API that counts zones or rates cheaply.
        $zones = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}woocommerce_shipping_zones");
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery
        $rates = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}woocommerce_tax_rates");

        return [
            'details' => (bool) (\get_option('woocommerce_store_address') && \get_option('woocommerce_store_city')),
            'products' => (int) (\wp_count_posts('product')->publish ?? 0) > 0,
            'payments' => self::hasGateway(),
            'tax' => $rates > 0,
            'shipping' => $zones > 0,
            'open' => \get_option('woocommerce_coming_soon') !== 'yes',
        ];
    }

    // An empty store may still add things to ship.
    private static function ships()
    {
        if ((int) (\wp_count_posts('product')->publish ?? 0) === 0) {
            return true;
        }

        // AutoLaunch's products have no _downloadable row, so the query asks for physical ones.
        return (bool) \wc_get_products(['status' => 'publish', 'virtual' => false, 'limit' => 1, 'return' => 'ids']);
    }

    private static function hasGateway()
    {
        $gateways = \WC()->payment_gateways();
        if (!$gateways) {
            return false;
        }

        foreach ($gateways->payment_gateways() as $gateway) {
            if ($gateway->enabled === 'yes') {
                return true;
            }
        }

        return false;
    }

    private static function shopUrl()
    {
        $shop = (int) \wc_get_page_id('shop');
        $url = $shop > 0 ? \get_permalink($shop) : '';
        return \esc_url_raw($url ?: \home_url('/'));
    }
}

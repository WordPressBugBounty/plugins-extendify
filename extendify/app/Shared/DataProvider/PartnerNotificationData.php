<?php

/**
 * Partner notification data.
 */

namespace Extendify\Shared\DataProvider;

defined('ABSPATH') || die('No direct access.');

use Extendify\Constants;
use Extendify\PartnerData;

/**
 * Fetches and caches the partner notifications.
 */
class PartnerNotificationData
{
    /**
     * Registers the wp-cron handler that refreshes stale notifications.
     *
     * @return void
     */
    public static function scheduleCache()
    {
        \add_action('extendify_partner_notifications_refresh', [self::class, 'refresh']);
    }

    /**
     * Returns the cached notifications, refreshing on cold start and
     * scheduling a background refresh when the cache is stale.
     *
     * @return array
     */
    public static function get()
    {
        if (!PartnerData::$id) {
            return [];
        }

        $locale = \get_locale();
        $cached = \get_option('extendify_partner_notifications_' . $locale);

        if (!is_array($cached) || !isset($cached['fetchedAt'])) {
            return self::refresh($locale) ?? [];
        }

        $age = time() - $cached['fetchedAt'];
        if ($age > DAY_IN_SECONDS) {
            if (!\wp_next_scheduled('extendify_partner_notifications_refresh', [$locale])) {
                \wp_schedule_single_event(time(), 'extendify_partner_notifications_refresh', [$locale]);
                if (\is_admin()) {
                    \spawn_cron();
                }
            }
        }

        return $cached['data'] ?? [];
    }

    /**
     * Fetch partner notifications from the API and persist them.
     * Called synchronously on cold start and via wp-cron when the cache is stale.
     *
     * @param string $locale - Locale to fetch (cron may run in a different site locale).
     * @return array|null
     */
    public static function refresh($locale)
    {
        if (!PartnerData::$id) {
            return [];
        }

        $optionKey = 'extendify_partner_notifications_' . $locale;

        $url = \add_query_arg(
            ['wp_language' => $locale],
            Constants::AI_HOST . '/api/notifications/' . rawurlencode(PartnerData::$id)
        );
        $response = \wp_remote_get($url, ['headers' => ['Accept' => 'application/json']]);
        $result = \is_wp_error($response)
            ? null
            : json_decode(\wp_remote_retrieve_body($response), true);

        if (!is_array($result) || empty($result['success']) || !is_array($result['data'] ?? null)) {
            // Back off: stamp the cache as fetched ~23h ago so we retry in ~1h instead of every request.
            $cached = \get_option($optionKey);
            \update_option(
                $optionKey,
                [
                    'data' => is_array($cached) ? ($cached['data'] ?? []) : [],
                    'fetchedAt' => time() - (DAY_IN_SECONDS - HOUR_IN_SECONDS),
                ],
                false
            );
            return null;
        }

        $notifications = $result['data'];
        \update_option(
            $optionKey,
            ['data' => $notifications, 'fetchedAt' => time()],
            false
        );
        return $notifications;
    }
}

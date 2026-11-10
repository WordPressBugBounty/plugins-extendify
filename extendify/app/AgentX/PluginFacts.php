<?php

/**
 * What other plugins report about the site, for the cards the agent shows on its own.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Reads a plugin's own account data in the background and serves the last read.
 */
class PluginFacts
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OPTION = 'extendify_agentx_plugin_facts';
    const EVENT = 'extendify_agentx_plugin_facts_refresh';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * Runs the refresh when wp-cron fires its event.
     *
     * @return void
     */
    public static function watch()
    {
        \add_action(self::EVENT, [self::class, 'refresh']);
    }

    /**
     * The last read for each plugin still active, queueing the next read once a day has passed.
     *
     * @return array
     */
    public static function current()
    {
        if (!self::readsImagify()) {
            // A key kept from before or set by the host makes installing Imagify worth offering.
            return !\function_exists('get_imagify_user') && self::imagifyKeySaved() ? ['imagify-key' => true] : [];
        }

        $stored = self::stored();
        // Imagify's account request can block for ten seconds, so the page never makes it.
        if (time() - ($stored['checkedAt'] ?? 0) > DAY_IN_SECONDS && !\wp_next_scheduled(self::EVENT)) {
            \wp_schedule_single_event(time(), self::EVENT);
        }

        // Imagify answers with an API key only, so the chat waits on an image's status only then.
        $facts = ['imagify-key' => true];
        foreach (['imagify-quota', 'imagify-coverage'] as $fact) {
            if (isset($stored[$fact])) {
                $facts[$fact] = $stored[$fact];
            }
        }

        return $facts;
    }

    /**
     * Reads how much of Imagify's monthly quota is used, from its account.
     *
     * @return void
     */
    public static function refresh()
    {
        if (!self::readsImagify()) {
            return;
        }

        // A failed read still counts as the day's try, and the last good one stays.
        $stored = array_merge(self::stored(), ['checkedAt' => time()]);
        $quota = self::quotaOf(\get_imagify_user());
        if ($quota) {
            $stored['imagify-quota'] = $quota;
        }

        $coverage = self::coverage();
        if ($coverage) {
            $stored['imagify-coverage'] = $coverage;
        }

        \update_option(self::OPTION, $stored, false);
    }

    private static function quotaOf($user)
    {
        if (\is_wp_error($user) || !is_object($user)) {
            return null;
        }

        $used = (float) ($user->consumed_current_month_quota ?? 0);
        $quota = (float) ($user->quota ?? 0);
        $consumed = $used;
        $extra = (float) ($user->extra_quota ?? 0);
        $extraUsed = (float) ($user->extra_quota_consumed ?? 0);
        // Imagify's own rule: a bought pack counts only while some of it is left.
        if ($extraUsed < $extra) {
            $quota += $extra;
            $consumed += $extraUsed;
        }

        if ($quota <= 0) {
            return null;
        }

        return [
            'used' => round($used, 1),
            'quota' => round($quota, 1),
            // Floored, so 79.6% never rounds up into the card.
            'percent' => (int) min(100, floor($consumed / $quota * 100)),
            // Imagify's free plan is id 1, and the card's upgrade copy is written for it.
            'free' => (int) ($user->plan_id ?? 0) === 1,
            'readAt' => time(),
        ];
    }

    // Counted from postmeta, too slow for a page load on a large library.
    private static function coverage()
    {
        $counts = ['imagify_count_attachments', 'imagify_count_optimized_attachments'];
        if (count(array_filter($counts, 'function_exists')) < count($counts)) {
            return null;
        }

        $total = (int) \imagify_count_attachments();
        return $total > 0
            ? ['optimized' => (int) \imagify_count_optimized_attachments(), 'total' => $total, 'readAt' => time()]
            : null;
    }

    private static function readsImagify()
    {
        if (!\function_exists('get_imagify_user')) {
            return false;
        }

        // The accessor also reads a key set by the IMAGIFY_API_KEY constant.
        if (\function_exists('get_imagify_option')) {
            return (bool) \get_imagify_option('api_key');
        }

        return self::imagifyKeySaved();
    }

    private static function imagifyKeySaved()
    {
        if (\defined('IMAGIFY_API_KEY') && \IMAGIFY_API_KEY) {
            return true;
        }

        $settings = (array) \get_option('imagify_settings', []);
        return !empty($settings['api_key']);
    }

    private static function stored()
    {
        $stored = \get_option(self::OPTION, []);
        return is_array($stored) ? $stored : [];
    }
}

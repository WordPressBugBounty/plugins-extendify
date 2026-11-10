<?php

/**
 * WordPress version.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * The WordPress versions the agent can chat on: the newest major and the one before it.
 */
class WordPressVersion
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const FLOOR = '7.0';

    // Core's update check names the newest release, so the floor moves without a plugin release.
    public static function floor()
    {
        $newest = '';
        foreach (\get_site_transient('update_core')->updates ?? [] as $update) {
            $current = self::major($update->current ?? '');
            if ($current && version_compare($current, $newest, '>')) {
                $newest = $current;
            }
        }

        if (!$newest) {
            return self::FLOOR;
        }

        list($major, $minor) = array_map('intval', explode('.', $newest));
        $before = $minor > 0 ? $major . '.' . ($minor - 1) : ($major - 1) . '.9';
        // A host that blocks the check can keep an answer from years ago.
        return version_compare($before, self::FLOOR, '>') ? $before : self::FLOOR;
    }

    public static function supported($version)
    {
        return version_compare(self::major($version) ?: '0', self::floor(), '>=');
    }

    // A release candidate counts as its major, so 7.1-RC2 is 7.1.
    private static function major($version)
    {
        return preg_match('/^(\d+)\.(\d+)/', (string) $version, $parts) ? $parts[1] . '.' . $parts[2] : '';
    }
}

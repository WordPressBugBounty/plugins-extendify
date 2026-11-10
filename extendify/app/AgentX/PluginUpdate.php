<?php

/**
 * Plugin update.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * The update WordPress's own update check has waiting for this plugin.
 */
class PluginUpdate
{
    public static function waiting($file, $installed)
    {
        $update = \get_site_transient('update_plugins')->response[$file] ?? null;
        $version = $update->new_version ?? '';
        // Core keeps the last answer until its next check, even after the plugin updates.
        if (!$version || !version_compare($version, $installed, '>')) {
            return null;
        }

        return [
            'version' => $version,
            'plugin' => $file,
            'slug' => $update->slug ?? dirname($file),
            'nonce' => self::canRun() ? \wp_create_nonce('updates') : '',
        ];
    }

    // Opening it checks for plugin updates again within a minute; plugins.php waits an hour.
    public static function url()
    {
        // Keeps the link from users core won't let update plugins, and from hosts forbidding file changes.
        return \current_user_can('update_plugins') ? \admin_url('update-core.php') : '';
    }

    private static function canRun()
    {
        // Keeps core's update nonce from users it won't let update, and from hosts forbidding file changes.
        if (!\current_user_can('update_plugins')) {
            return false;
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        // Any other method asks for FTP credentials, which the chat has no form for.
        return \get_filesystem_method() === 'direct';
    }
}

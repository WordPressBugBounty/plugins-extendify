<?php

/**
 * Plugins the agent can recommend and install.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\DataProvider\ProductsData;

/**
 * Lists the site's plugins and the partner's picks, and installs free plugins from WordPress.org.
 */
class Plugins
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    // Plugin blocks Quick Edit can't change, by the settings page that can; known ahead, as only wp-admin lists menus.
    const SETTINGS = [
        'simplybook/widget' => [
            'name' => 'SimplyBook.me',
            'page' => 'simplybook-integration',
            'capability' => 'simplybook_manage',
        ],
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * What the agent knows about plugins before it recommends one.
     *
     * @return array
     */
    public static function current()
    {
        return [
            'installed' => self::installed(),
            'recommended' => self::recommended(),
            'canInstall' => self::canInstall(),
            'settings' => self::settings(),
        ];
    }

    /**
     * The settings page of each active plugin on the known list, by the block it shows on the site.
     *
     * @return array
     */
    public static function settings()
    {
        $registry = \WP_Block_Type_Registry::get_instance();
        $settings = [];
        foreach (self::SETTINGS as $block => $plugin) {
            // Blocks the link for users its page would refuse, since the page asks for this capability.
            if (!$registry->is_registered($block) || !\current_user_can($plugin['capability'])) {
                continue;
            }

            $settings[] = [
                'block' => $block,
                'name' => $plugin['name'],
                'url' => \admin_url('admin.php?page=' . $plugin['page']),
            ];
        }

        return $settings;
    }

    /**
     * Every installed plugin, by the slug WordPress.org knows it by.
     *
     * @return array
     */
    public static function installed()
    {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        $installed = [];
        foreach (\get_plugins() as $file => $plugin) {
            $installed[] = [
                'slug' => self::slugOf($file),
                'name' => $plugin['Name'],
                'active' => \is_plugin_active($file),
            ];
        }

        return $installed;
    }

    /**
     * The partner's plugin picks for the agent, leaving out the installed ones.
     *
     * @return array
     */
    public static function recommended()
    {
        $installed = array_column(self::installed(), 'slug');
        $recommended = [];
        foreach (ProductsData::get() as $product) {
            if (!in_array('ai-agent', $product['slots'] ?? [], true) || ($product['ctaType'] ?? '') !== 'plugin') {
                continue;
            }

            // Products are sanitized into strings, so a missing plugin slug arrives empty.
            $slug = ($product['ctaPluginSlug'] ?? '') ?: ($product['slug'] ?? '');
            if (!$slug || in_array($slug, $installed, true)) {
                continue;
            }

            $recommended[] = [
                'slug' => $slug,
                'name' => self::plain($product['title'] ?? ''),
                'description' => self::plain($product['description'] ?? ''),
            ];
        }

        return $recommended;
    }

    /**
     * Whether this user can install and activate plugins on this site from the chat.
     *
     * @return boolean
     */
    public static function canInstall()
    {
        // Blocks users core won't let install or activate plugins, and hosts forbidding file changes.
        if (!\current_user_can('install_plugins') || !\current_user_can('activate_plugins')) {
            return false;
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        // Any other method asks for FTP credentials, which the chat has no form for.
        return \get_filesystem_method() === 'direct';
    }

    /**
     * Whether this user can update a plugin on this site from the chat.
     *
     * @return boolean
     */
    public static function canUpdate()
    {
        // Blocks users core won't let update plugins, and hosts forbidding file changes.
        if (!\current_user_can('update_plugins')) {
            return false;
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        // Any other method asks for FTP credentials, which the chat has no form for.
        return \get_filesystem_method() === 'direct';
    }

    /**
     * Updates one installed plugin to the newest version WordPress.org has.
     *
     * @param string $file - Its plugin file, like extendify/extendify.php.
     * @return array|\WP_Error
     */
    public static function update($file)
    {
        // Blocks users core won't let update plugins, and hosts forbidding file changes.
        if (!self::canUpdate()) {
            return self::refused('This user or site cannot update plugins from the chat.', 403);
        }

        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        if (!array_key_exists($file, \get_plugins())) {
            return self::refused(sprintf('%s is not installed on this site.', $file), 404);
        }

        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        // Otherwise core updates every language pack on the site, stalling this request past a minute.
        \remove_action('upgrader_process_complete', ['Language_Pack_Upgrader', 'async_upgrade'], 20);
        // The newest version is read from the update transient, which a stale one leaves empty.
        \wp_update_plugins();
        $skin = new \WP_Ajax_Upgrader_Skin();
        $upgrader = new \Plugin_Upgrader($skin);
        $done = $upgrader->upgrade($file);
        $errors = \is_wp_error($done) ? $done : $skin->get_errors();
        $data = \get_plugin_data(WP_PLUGIN_DIR . '/' . $file, false, false);
        if (!$done || $errors->has_errors()) {
            return self::refused(sprintf(
                '%1$s could not be updated. %2$s',
                $data['Name'],
                $errors->get_error_message() ?: 'WordPress gave no reason.'
            ), 500);
        }

        return ['file' => $file, 'name' => $data['Name'], 'version' => $data['Version']];
    }

    /**
     * Installs a free plugin from WordPress.org, or finds the installed one, and activates it.
     *
     * @param string $slug - Its slug on WordPress.org.
     * @return array|\WP_Error
     */
    public static function install($slug)
    {
        if (!preg_match('/^[a-z0-9][a-z0-9_-]*$/', $slug)) {
            return self::refused(sprintf('%s is not a WordPress.org plugin slug.', $slug), 400);
        }

        if (!self::canInstall()) {
            return self::refused('This user or site cannot install plugins from the chat.', 403);
        }

        $file = self::fileOf($slug);
        if (!$file) {
            $file = self::download($slug);
            if (\is_wp_error($file)) {
                return $file;
            }
        }

        $data = \get_plugin_data(WP_PLUGIN_DIR . '/' . $file, false, false);
        if (!\is_plugin_active($file)) {
            $activated = \activate_plugin($file);
            if (\is_wp_error($activated)) {
                return self::refused(
                    sprintf('%1$s could not be activated. %2$s', $data['Name'], $activated->get_error_message()),
                    500
                );
            }
        }

        return ['slug' => $slug, 'name' => $data['Name'], 'version' => $data['Version'], 'active' => true];
    }

    private static function download($slug)
    {
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
        $api = \plugins_api('plugin_information', ['slug' => $slug, 'fields' => ['sections' => false]]);
        // A failed request carries its reason as data; WordPress.org's own refusal comes bare.
        if (\is_wp_error($api) && $api->get_error_data() !== null) {
            return self::refused(sprintf('WordPress.org could not be reached for %s. Try again later.', $slug), 500);
        }

        if (\is_wp_error($api) || empty($api->download_link)) {
            return self::refused(sprintf('%s is not a free plugin on WordPress.org.', $slug), 404);
        }

        // Otherwise core updates every language pack on the site, stalling this request past a minute.
        \remove_action('upgrader_process_complete', ['Language_Pack_Upgrader', 'async_upgrade'], 20);
        $skin = new \WP_Ajax_Upgrader_Skin();
        $upgrader = new \Plugin_Upgrader($skin);
        $installed = $upgrader->install($api->download_link);
        $errors = \is_wp_error($installed) ? $installed : $skin->get_errors();
        $file = $installed && !$errors->has_errors() ? $upgrader->plugin_info() : false;
        if (!$file) {
            return self::refused(sprintf(
                '%1$s could not be installed. %2$s',
                self::plain($api->name ?? $slug),
                $errors->get_error_message() ?: 'WordPress could not find the plugin it installed.'
            ), 500);
        }

        return $file;
    }

    private static function fileOf($slug)
    {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        foreach (array_keys(\get_plugins()) as $file) {
            if (self::slugOf($file) === $slug) {
                return $file;
            }
        }

        return '';
    }

    // A single-file plugin like hello.php sits in the plugins folder itself.
    private static function slugOf($file)
    {
        $folder = dirname($file);
        return $folder === '.' ? basename($file, '.php') : $folder;
    }

    private static function plain($text)
    {
        return trim(html_entity_decode(\wp_strip_all_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }

    private static function refused($message, $status)
    {
        return new \WP_Error('extendify_agentx_plugin', $message, ['status' => $status]);
    }
}

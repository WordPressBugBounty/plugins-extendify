<?php

/**
 * Admin.
 */

namespace Extendify\PartnerNotification;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;

class Admin
{
    public function __construct()
    {
        \add_action('admin_enqueue_scripts', [$this, 'loadScriptsAndStyles']);
        \add_action('admin_notices', [$this, 'renderMountPoint']);
    }

    /**
     * Adds the banner bundle on eligible admin screens
     *
     * @return void
     */
    public function loadScriptsAndStyles()
    {
        if (!$this->currentSlot()) {
            return;
        }

        $version = constant('EXTENDIFY_DEVMODE') ? uniqid() : Config::$version;
        $scriptAssetPath = EXTENDIFY_PATH . 'public/build/'
            . Config::$assetManifest['extendify-partner-notification.php'];
        $fallback = [
            'dependencies' => [],
            'version' => $version,
        ];
        $scriptAsset = file_exists($scriptAssetPath) ? require $scriptAssetPath : $fallback;

        foreach ($scriptAsset['dependencies'] as $style) {
            \wp_enqueue_style($style);
        }

        \wp_enqueue_script(
            Config::$slug . '-partner-notification-scripts',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-partner-notification.js'],
            array_merge([Config::$slug . '-shared-scripts'], $scriptAsset['dependencies']),
            $scriptAsset['version'],
            true
        );

        \wp_set_script_translations(
            Config::$slug . '-partner-notification-scripts',
            'extendify-local',
            EXTENDIFY_PATH . 'languages/js'
        );

        \wp_enqueue_style(
            Config::$slug . '-partner-notification-styles',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-partner-notification.css'],
            [],
            Config::$version,
            'all'
        );
    }

    /**
     * Prints the banner mount node on eligible admin screens
     *
     * @return void
     */
    public function renderMountPoint()
    {
        $slot = $this->currentSlot();
        if (!$slot) {
            return;
        }

        ?>
        <div
            class="extendify-partner-notification"
            data-ext-partner-notification
            data-slot="<?php echo \esc_attr($slot); ?>"
            data-test="partner-notification-<?php echo \esc_attr($slot); ?>">
        </div>
        <?php
    }

    private function currentSlot()
    {
        $screen = \get_current_screen();
        if (!$screen) {
            return null;
        }

        if ($screen->id === 'dashboard') {
            return 'dashboard';
        }

        return $this->isExcludedScreen($screen) ? null : 'admin-others';
    }

    private function isExcludedScreen($screen)
    {
        if ($screen->base === 'post') {
            return true;
        }

        $excludedIds = ['site-editor', 'plugins', 'plugin-install', 'plugin-editor'];
        if (in_array($screen->id, $excludedIds, true)) {
            return true;
        }

        return strpos($screen->id, '_page_') !== false;
    }
}

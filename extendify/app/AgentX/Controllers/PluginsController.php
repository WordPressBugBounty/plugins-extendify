<?php

/**
 * Plugins controller.
 */

namespace Extendify\AgentX\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\AgentX\Abilities;
use Extendify\AgentX\Plugins;
use Extendify\AgentX\Screens;
use Extendify\AgentX\SiteFacts;
use Extendify\AgentX\StoreGuide;

/**
 * Lists the site's plugins, abilities and summary again, and installs the plugin the user picked.
 */
class PluginsController
{
    // A plugin installed in the chat adds what the page loaded without, like WooCommerce's store guide.
    public static function index()
    {
        return new \WP_REST_Response([
            'plugins' => Plugins::current(),
            'abilities' => Abilities::discover(),
            'summary' => SiteFacts::summary(),
            'storeGuide' => StoreGuide::current(),
            'screens' => Screens::all(),
        ]);
    }

    public static function install(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $installed = Plugins::install((string) ($params['slug'] ?? ''));
        return \is_wp_error($installed) ? $installed : new \WP_REST_Response($installed);
    }

    /**
     * Updates one installed plugin.
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response|\WP_Error
     */
    public static function update(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $updated = Plugins::update((string) ($params['file'] ?? ''));
        return \is_wp_error($updated) ? $updated : new \WP_REST_Response($updated);
    }
}

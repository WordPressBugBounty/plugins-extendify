<?php

/**
 * Settings controller.
 */

namespace Extendify\AgentX\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\AgentX\Settings;
use Extendify\Notifications\Availability;

/**
 * Saves a site setting the agent changed.
 */
class SettingsController
{
    public static function update(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $saved = Settings::update((string) ($params['setting'] ?? ''), $params['value'] ?? null);
        if (\is_wp_error($saved)) {
            return $saved;
        }

        return new \WP_REST_Response($saved + ['notifications' => Availability::now()]);
    }
}

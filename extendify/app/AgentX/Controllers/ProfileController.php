<?php

/**
 * Profile controller.
 */

namespace Extendify\AgentX\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\AgentX\Profile;

/**
 * Saves the site profile from the agent's form.
 */
class ProfileController
{
    public static function update(\WP_REST_Request $request)
    {
        $saved = Profile::save($request->get_json_params() ?: []);
        return \is_wp_error($saved) ? $saved : new \WP_REST_Response($saved);
    }
}

<?php

/**
 * Maps controller.
 */

namespace Extendify\AgentX\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\AgentX\Edits\Maps;

/**
 * The address a map pasted into the chat draws, so it shows there as a map.
 */
class MapsController
{
    public static function preview(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $src = Maps::srcOf([
            'embed' => (string) ($params['embed'] ?? ''),
            'link' => (string) ($params['link'] ?? ''),
        ]);
        return \is_wp_error($src) ? $src : new \WP_REST_Response(['src' => $src]);
    }
}

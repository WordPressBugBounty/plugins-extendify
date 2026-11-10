<?php

/**
 * Guide controller.
 */

namespace Extendify\AgentX\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\AgentX\Guide;
use Extendify\AgentX\StoreGuide;
use Extendify\Assist\Controllers\DomainsSuggestionController;
use Extendify\Shared\Services\Sanitizer;

/**
 * Saves the Site Guide's progress from the agent.
 */
class GuideController
{
    public static function update(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $saved = Guide::markDone(\sanitize_key((string) ($params['step'] ?? '')), !empty($params['finishes']));
        return \is_wp_error($saved) ? $saved : new \WP_REST_Response($saved);
    }

    public static function store()
    {
        $store = StoreGuide::current();
        return $store === null
            ? StoreGuide::refused('WooCommerce is not set up for this user.', 403)
            : new \WP_REST_Response($store);
    }

    public static function storeStep(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $saved = StoreGuide::markDone(\sanitize_key((string) ($params['step'] ?? '')));
        return \is_wp_error($saved) ? $saved : new \WP_REST_Response($saved);
    }

    // A new site's scheduled domain fetch may not have run yet.
    public static function domains()
    {
        $domains = \get_transient('extendify_domains');
        if (empty($domains)) {
            $domains = Sanitizer::sanitizeArray(DomainsSuggestionController::fetchDomainSuggestions()->get_data());
            \set_transient('extendify_domains', $domains);
        }

        return new \WP_REST_Response(['domains' => is_array($domains) ? array_values($domains) : []]);
    }
}

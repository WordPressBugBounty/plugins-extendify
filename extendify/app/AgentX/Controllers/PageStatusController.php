<?php

/**
 * Page status controller.
 */

namespace Extendify\AgentX\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\AgentX\FoundText;
use Extendify\AgentX\PageStatus;

/**
 * Checks, publishes, unpublishes, trashes or restores the site's pages and posts for the agent.
 */
class PageStatusController
{
    public static function findText(\WP_REST_Request $request)
    {
        return new \WP_REST_Response(
            $request->get_param('phones')
                ? ['numbers' => FoundText::phones()]
                : ['found' => FoundText::where((string) $request->get_param('text'))]
        );
    }

    public static function target(\WP_REST_Request $request)
    {
        $target = PageStatus::target((string) $request->get_param('url'));
        return \is_wp_error($target) ? $target : new \WP_REST_Response($target);
    }

    public static function change(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $changed = PageStatus::change((string) ($params['url'] ?? ''), (string) ($params['status'] ?? ''));
        return \is_wp_error($changed) ? $changed : new \WP_REST_Response($changed);
    }

    public static function facts(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $urls = array_map('strval', (array) ($params['urls'] ?? []));
        $ids = array_merge((array) ($params['ids'] ?? []), array_map([PageStatus::class, 'find'], $urls));
        return new \WP_REST_Response(['pages' => PageStatus::facts(array_values(array_unique(array_filter($ids))))]);
    }

    public static function delete(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $deleted = PageStatus::delete((int) ($params['id'] ?? 0), !empty($params['menus']));
        return \is_wp_error($deleted) ? $deleted : new \WP_REST_Response($deleted);
    }

    public static function trashed()
    {
        return new \WP_REST_Response(['items' => PageStatus::trashed()]);
    }

    public static function restore(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $restored = PageStatus::restore((int) ($params['id'] ?? 0));
        return \is_wp_error($restored) ? $restored : new \WP_REST_Response($restored);
    }
}

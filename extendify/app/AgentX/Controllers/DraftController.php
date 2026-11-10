<?php

/**
 * Draft controller.
 */

namespace Extendify\AgentX\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\AgentX\Draft;

/**
 * Applies the agent's changes to the user's draft, steps through its versions, and saves it.
 */
class DraftController
{
    public static function editBlock(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        return self::respond($params, 'editBlock', [(string) ($params['block'] ?? ''), $params]);
    }

    public static function replaceText(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        return self::respond($params, 'replaceText', [
            (array) ($params['pairs'] ?? []),
            (string) ($params['block'] ?? ''),
            (string) ($params['turn'] ?? ''),
            (array) ($params['keep'] ?? []),
        ]);
    }

    public static function chooseVariation(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        return self::respond($params, 'chooseVariation', [\sanitize_text_field((string) ($params['variation'] ?? ''))]);
    }

    public static function chooseStyle(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        return self::respond($params, 'chooseStyle', [
            \sanitize_key((string) ($params['layer'] ?? '')),
            \sanitize_text_field((string) ($params['pick'] ?? '')),
        ]);
    }

    public static function choosePalette(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        return self::respond($params, 'choosePalette', [
            \sanitize_key((string) ($params['slug'] ?? '')),
            (string) ($params['color'] ?? ''),
            \sanitize_text_field((string) ($params['name'] ?? '')),
            (string) ($params['turn'] ?? ''),
        ]);
    }

    public static function chooseThemeSetting(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        return self::respond($params, 'chooseThemeSetting', [
            \sanitize_key((string) ($params['setting'] ?? '')),
            $params['value'] ?? null,
            (string) ($params['turn'] ?? ''),
        ]);
    }

    public static function chooseLayout(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        return self::respond($params, 'chooseLayout', [\sanitize_text_field((string) ($params['layout'] ?? ''))]);
    }

    public static function chooseLook(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        return self::respond($params, 'chooseLook', array_map(function ($key) use ($params) {
            return \sanitize_text_field((string) ($params[$key] ?? ''));
        }, ['layout', 'variation', 'vibe']));
    }

    public static function undo(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        return self::respond($params, 'undo', [\sanitize_key((string) ($params['live'] ?? ''))]);
    }

    public static function drop(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        return self::respond($params, 'drop', [\absint($params['count'] ?? 0)]);
    }

    public static function redo(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        return self::respond($params, 'redo', [\sanitize_key((string) ($params['live'] ?? ''))]);
    }

    public static function restore(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        return self::respond($params, 'restore', [
            (int) ($params['id'] ?? 0),
            \sanitize_key((string) ($params['live'] ?? '')),
        ]);
    }

    public static function live(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $state = Draft::live(
            \sanitize_key((string) ($params['key'] ?? '')),
            (int) ($params['before'] ?? 0),
            (int) ($params['after'] ?? 0)
        );
        return \is_wp_error($state) ? $state : new \WP_REST_Response($state);
    }

    public static function revert(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $keys = is_array($params['keys'] ?? null) ? array_map('strval', $params['keys']) : [];
        return self::respond($params, 'revert', [(int) ($params['version'] ?? 0), $keys]);
    }

    public static function changes(\WP_REST_Request $request)
    {
        $ids = array_map('intval', array_filter(explode(',', (string) $request->get_param('ids'))));
        return new \WP_REST_Response(['changes' => Draft::changes($ids)]);
    }

    public static function discard(\WP_REST_Request $request)
    {
        return self::respond($request->get_json_params() ?: [], 'discard');
    }

    public static function save(\WP_REST_Request $request)
    {
        return self::respond($request->get_json_params() ?: [], 'save');
    }

    public static function resolve(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $seen = is_array($params['seen'] ?? null) ? $params['seen'] : [];
        return self::respond($params, 'resolve', [\sanitize_key((string) ($params['how'] ?? '')), $seen]);
    }

    public static function presence(\WP_REST_Request $request)
    {
        return new \WP_REST_Response(['presence' => Draft::presence((int) $request->get_param('post'))]);
    }

    public static function check(\WP_REST_Request $request)
    {
        return self::respond($request->get_json_params() ?: []);
    }

    private static function respond(array $params, $write = '', array $args = [])
    {
        $before = Draft::get()['version'];
        $result = Draft::run($params['shown'] ?? null, $write, $args, $params['request'] ?? null);
        $version = Draft::get()['version'];
        if ($version !== $before) {
            // Site frame pages vary on cookies, so a page cached before the change is not reused.
            \header(sprintf(
                'Set-Cookie: %s=%d; Path=%s; SameSite=Lax; HttpOnly%s',
                Draft::COOKIE,
                $version,
                COOKIEPATH,
                \is_ssl() ? '; Secure' : ''
            ), false);
        }

        return \is_wp_error($result) ? \rest_convert_error_to_response($result) : new \WP_REST_Response($result);
    }
}

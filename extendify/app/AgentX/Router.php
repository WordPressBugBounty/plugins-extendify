<?php

/**
 * Router.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;

/**
 * Decides which view of the agent a request gets.
 */
class Router
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const EDITOR_PARAMS = [
        'elementor-preview',
        'et_fb',
        'fl_builder',
        'bricks',
        'ct_builder',
        'oxygen',
        'oxygen_iframe',
        'breakdance',
        'breakdance_iframe',
        'trp-edit-translation',
    ];

    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OPEN_PARAMS = ['extendify-launch-success', 'extendify-open-agent'];

    // A fetch can't send Sec-Fetch-Dest: iframe, so the agent names the frame view instead.
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const FRAME_FETCH = 'extendify-frame-fetch';

    /**
     * Returns normal, toolbar, frame, shell, prerender, warning, fallback, open or close.
     */
    public static function decide(array $request)
    {
        $inEditor = array_intersect(self::EDITOR_PARAMS, array_keys($request['query']));
        $fetched = $request['dest'] === 'empty' && isset($request['query'][self::FRAME_FETCH]);
        $inFrame = ($request['dest'] === 'iframe' || $fetched) && $request['site'] === 'same-origin';
        // A draft shown in the frame, or one the agent opened, is the agent's page, not WordPress's preview.
        $context = $inFrame || isset($request['query'][PageStatus::PREVIEW_PARAM])
            ? array_diff($request['context'], ['preview'])
            : $request['context'];
        // A form sent from the frame's page, like Add to cart, answers in the frame.
        $read = $request['method'] === 'GET'
            || ($request['method'] === 'POST' && $request['dest'] === 'iframe');
        // Visitors and other roles must always get the theme's own page.
        if (!$request['user'] || !$request['capable'] || !$read || $context || $inEditor) {
            return 'normal';
        }

        if ($request['dest'] === 'iframe' || $fetched) {
            return $inFrame ? 'frame' : 'normal';
        }

        $owner = $request['cookie'] === (string) $request['user'];
        $launched = array_intersect(self::OPEN_PARAMS, array_keys($request['query']));
        $action = $request['query']['extendify-agent'] ?? ($launched && !$owner ? 'open' : '');

        // A shown prerender opens the agent with a fetch.
        if ($request['dest'] === 'empty') {
            return $request['site'] === 'same-origin' && $action === 'open' ? 'open' : 'normal';
        }

        if (!in_array($request['dest'], ['document', ''], true)) {
            return 'normal';
        }

        if ($action === 'bypass') {
            return $owner ? 'fallback' : 'normal';
        }

        // A prerender may never be shown, so it must not write the cookie.
        if (strpos($request['purpose'], 'prerender') !== false) {
            return ($owner && $action !== 'close') || $action === 'open' ? 'prerender' : 'normal';
        }

        if (in_array($action, ['open', 'close'], true)) {
            return $action;
        }

        if (!$owner) {
            return 'toolbar';
        }

        // Without Sec-Fetch-Dest the frame's own request would nest another shell.
        return $request['dest'] === '' ? 'warning' : 'shell';
    }

    public static function request()
    {
        $context = [
            'admin' => \is_admin(),
            'rest' => \wp_is_serving_rest_request(),
            'ajax' => \wp_doing_ajax(),
            'cron' => \wp_doing_cron(),
            'feed' => \is_feed(),
            'embed' => \is_embed(),
            'robots' => \is_robots(),
            'favicon' => \is_favicon(),
            'preview' => \is_preview(),
            'customizer' => \is_customize_preview(),
        ];

        return [
            'user' => \get_current_user_id(),
            'capable' => \current_user_can(Config::$requiredCapability),
            'cookie' => \sanitize_text_field(\wp_unslash($_COOKIE[Admin::COOKIE] ?? '')),
            'method' => \sanitize_text_field(\wp_unslash($_SERVER['REQUEST_METHOD'] ?? '')),
            'dest' => \sanitize_text_field(\wp_unslash($_SERVER['HTTP_SEC_FETCH_DEST'] ?? '')),
            'site' => \sanitize_text_field(\wp_unslash($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '')),
            'purpose' => \sanitize_text_field(\wp_unslash($_SERVER['HTTP_SEC_PURPOSE'] ?? '')),
            // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read only, to pick the view
            'query' => \map_deep(\wp_unslash($_GET), 'sanitize_text_field'),
            'context' => array_keys(array_filter($context)),
        ];
    }
}

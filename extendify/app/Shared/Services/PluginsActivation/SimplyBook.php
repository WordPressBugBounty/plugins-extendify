<?php

namespace Extendify\Shared\Services\PluginsActivation;

defined('ABSPATH') || die('No direct access.');

class SimplyBook extends PluginActivation
{
    public static function slug(): string
    {
        return 'simplybook';
    }

    protected static function simplybookNonce(): string
    {
        return \wp_create_nonce('simplybook_nonce');
    }

    public static function createAccount(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!static::isActive()) {
            return static::pluginNotActiveResponse();
        }

        // Reset onboarding data to have a fresh start
        delete_option('simplybook_onboarding_completed');
        static::dispatchOnboarding('retry_onboarding');

        $create = static::dispatchOnboarding('create_account', [
            'email' => \sanitize_email($request->get_param('email')),
            'terms-and-conditions' => (bool) $request->get_param('termsAgreed'),
            'marketing-consent' => (bool) $request->get_param('marketingConsent'),
            'captcha_token' => \sanitize_text_field($request->get_param('captcha_token')),
        ]);
        if ($create->is_error()) {
            return $create;
        }

        $finish = static::dispatchOnboarding('finish_onboarding');
        if ($finish->is_error()) {
            return $finish;
        }

        return new \WP_REST_Response(['success' => true], 200);
    }

    protected static function dispatchOnboarding(string $action, array $body = []): \WP_REST_Response
    {
        $request = new \WP_REST_Request('POST', '/simplybook/v1/onboarding/' . $action);
        $request->set_header('Content-Type', 'application/json');
        $request->set_body(\wp_json_encode(array_merge($body, ['nonce' => static::simplybookNonce()])));

        return \rest_do_request($request);
    }
}

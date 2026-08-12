<?php

namespace Extendify\Shared\Services\PluginsActivation;

defined('ABSPATH') || die('No direct access.');

class Metricool extends PluginActivation
{
    public static function slug(): string
    {
        return 'metricool';
    }

    public static function createAccountRoute(): string
    {
        // Metricool registers its logout route only when the request URL contains "/metricool/v".
        return '/' . static::slug() . '/v1/create-account';
    }

    public static function scriptData(): array
    {
        return [
            'recaptchaSiteKey' => static::recaptchaSiteKey(),
            'recaptchaAction' => 'signup',
        ];
    }

    // Metricool assesses the captcha itself, so a token minted with any other site key fails.
    protected static function recaptchaSiteKey(): string
    {
        $config = WP_PLUGIN_DIR . '/' . static::slug() . '/config/env.php';
        $env = is_readable($config) ? require $config : [];
        $key = $env['metricool']['google_recaptcha_key'] ?? '';

        return is_string($key) ? $key : '';
    }

    public static function createAccount(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!static::isActive()) {
            return static::pluginNotActiveResponse();
        }

        $create = static::dispatch('onboarding/create_account', [
            'email' => \sanitize_email($request->get_param('email')),
            'terms' => (bool) $request->get_param('termsAgreed'),
            'marketing' => (bool) $request->get_param('marketingConsent'),
            'captcha' => \sanitize_text_field($request->get_param('captcha_token')),
            'password' => static::generatePassword(),
        ]);
        if ($create->is_error()) {
            // Metricool 500 = account created but a later step failed; not retryable.
            if ($create->get_status() >= 500) {
                static::dispatch('logout');
            }
            return $create;
        }

        $finish = static::dispatch('onboarding/finish_onboarding');
        $completed = $finish->get_data()['data']['onboarding']['state']['completed'] ?? false;
        if ($finish->is_error() || !$completed) {
            static::dispatch('logout');
            return $finish->is_error() ? $finish : new \WP_REST_Response([
                'code' => 'metricool_onboarding_incomplete',
                'message' => \__('Metricool onboarding did not complete.', 'extendify-local'),
            ], 500);
        }

        return new \WP_REST_Response(['success' => true], 200);
    }

    protected static function generatePassword(): string
    {
        // wp_generate_password() draws uniformly — a class Metricool requires can be missing.
        do {
            $password = \wp_generate_password(20, true);
        } while (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,20}$/', $password));

        return $password;
    }

    protected static function dispatch(string $route, array $body = []): \WP_REST_Response
    {
        $request = new \WP_REST_Request('POST', '/metricool/v1/' . $route);
        $request->set_header('Content-Type', 'application/json');
        $request->set_body(\wp_json_encode(array_merge(
            $body,
            ['nonce' => \wp_create_nonce('metricool_nonce')]
        )));

        return \rest_do_request($request);
    }
}

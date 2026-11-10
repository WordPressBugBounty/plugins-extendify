<?php

/**
 * Logo preview.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Renders the site frame with a picked logo, without saving it.
 */
class LogoPreview
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const PARAM = 'extendify-logo';

    /**
     * An attachment id renders as the saved logo would. A stock or generated image isn't in the media library
     * yet, so its URL takes the logo's place inside the markup the site logo block wraps.
     *
     * @param string $logo An attachment id or an image URL.
     * @return void
     */
    public static function preview($logo)
    {
        if (preg_match('/\A\d+\z/', $logo)) {
            \add_filter('pre_option_site_logo', function () use ($logo) {
                return (int) $logo;
            });
            return;
        }

        $url = \esc_url_raw($logo, ['https', 'http']);
        if (!$url) {
            return;
        }

        \add_filter('get_custom_logo', function () use ($url) {
            return sprintf(
                '<a href="%1$s" class="custom-logo-link" rel="home">'
                . '<img src="%2$s" class="custom-logo" alt="%3$s"></a>',
                \esc_url(\home_url('/')),
                \esc_url($url),
                \esc_attr(\get_bloginfo('name'))
            );
        });
    }
}

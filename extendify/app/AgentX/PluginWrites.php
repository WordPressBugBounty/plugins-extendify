<?php

/**
 * Other plugins' writes, run by the agent.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Lets the agent's own ability runs write where a plugin keeps AI writes off by default.
 */
class PluginWrites
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    // The switches WPForms and Charitable keep for outside AI clients, off until the site owner turns them on.
    const FILTERS = ['wpforms_integrations_abilities_allow_write', 'charitable_abilities_allow_write'];
    const HEADER = 'HTTP_X_EXTENDIFY_AGENT';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function allow()
    {
        foreach (self::FILTERS as $filter) {
            \add_filter($filter, [self::class, 'fromAgent']);
        }
    }

    // The user approved this write on the agent's card; any other client keeps the site owner's setting.
    public static function fromAgent($allowed)
    {
        if ($allowed || empty($_SERVER[self::HEADER])) {
            return $allowed;
        }

        // Blocks outside clients: a REST nonce comes only with a logged-in browser session.
        $nonce = \sanitize_text_field(\wp_unslash($_SERVER['HTTP_X_WP_NONCE'] ?? ''));
        return (bool) \wp_verify_nonce($nonce, 'wp_rest');
    }
}

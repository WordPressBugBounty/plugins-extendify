<?php

/**
 * Abilities for partner plugins that register none of their own.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

use Extendify\AgentX\PluginAbilities\Bookly;
use Extendify\AgentX\PluginAbilities\Brevo;
use Extendify\AgentX\PluginAbilities\EventsCalendar;
use Extendify\AgentX\PluginAbilities\GiveWP;
use Extendify\AgentX\PluginAbilities\WPForms;

/**
 * Registers our abilities for each such plugin that is active, so a block from it reaches the agent with tools.
 */
class PluginAbilities
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const PREFIX = 'extendify';
    const PLUGINS = [
        EventsCalendar::class,
        GiveWP::class,
        Bookly::class,
        Brevo::class,
        WPForms::class,
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function register()
    {
        // After the plugins' own, so a category a plugin already made is joined, not made twice.
        \add_action('wp_abilities_api_categories_init', [self::class, 'categories'], 20);
        \add_action('wp_abilities_api_init', [self::class, 'abilities']);
    }

    public static function categories()
    {
        foreach (self::active() as $plugin) {
            list($slug, $label, $description) = $plugin::category();
            if (function_exists('wp_has_ability_category') && \wp_has_ability_category($slug)) {
                continue;
            }

            \wp_register_ability_category($slug, ['label' => $label, 'description' => $description]);
        }
    }

    public static function abilities()
    {
        foreach (self::active() as $plugin) {
            list($slug) = $plugin::category();
            foreach ($plugin::abilities() as $name => $ability) {
                \wp_register_ability(self::PREFIX . '/' . $name, ['category' => $slug] + $ability);
            }
        }
    }

    private static function active()
    {
        return array_filter(self::PLUGINS, function ($plugin) {
            return $plugin::active();
        });
    }
}

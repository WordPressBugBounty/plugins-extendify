<?php

/**
 * Design controller.
 */

namespace Extendify\AgentX\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\AgentX\ColorSchemes;
use Extendify\AgentX\FontPairs;
use Extendify\AgentX\Layouts;
use Extendify\AgentX\Looks;
use Extendify\AgentX\MadeFonts;
use Extendify\AgentX\MadeStyles;
use Extendify\AgentX\Vibes;

/**
 * Lists what the agent's design card offers.
 */
class DesignController
{
    public static function colors()
    {
        $options = ColorSchemes::all();
        $current = ['colors' => ColorSchemes::current()] + ColorSchemes::currentPaint();
        return new \WP_REST_Response([
            'options' => $options,
            'current' => $current,
            'live' => self::live($options, $current),
        ]);
    }

    // Colors or styles made for the user's ask, listed ahead of the site's own.
    public static function made(\WP_REST_Request $request)
    {
        $params = $request->get_json_params() ?: [];
        $made = $params['made'] ?? null;
        if (!is_array($made)) {
            return new \WP_REST_Response(['options' => []]);
        }

        $layer = $params['layer'] ?? '';
        $options = $layer === 'vibe'
            ? MadeStyles::made($made)
            : ($layer === 'fonts' ? MadeFonts::made($made) : ColorSchemes::made($made));
        return new \WP_REST_Response(['options' => $options]);
    }

    public static function madeStyle(\WP_REST_Request $request)
    {
        return new \WP_REST_Response(['style' => MadeStyles::source((string) $request->get_param('id'))]);
    }

    public static function fonts()
    {
        $options = FontPairs::all();
        $current = ['fonts' => FontPairs::current()];
        return new \WP_REST_Response([
            'options' => $options,
            'current' => $current,
            'live' => self::live($options, $current),
            'faces' => FontPairs::faces(),
        ]);
    }

    public static function vibe()
    {
        $options = Vibes::all();
        $current = Vibes::current();
        return new \WP_REST_Response([
            'options' => $options,
            'current' => $current + ['preview' => Vibes::savedPreview()],
            'live' => self::live($options, $current),
        ]);
    }

    public static function layout()
    {
        return new \WP_REST_Response([
            'options' => Layouts::all(),
            'current' => ['name' => Layouts::current()],
            'home' => \home_url('/'),
        ]);
    }

    // Matched by value, since the site keeps no record of which option its styles came from.
    public static function live(array $options, array $current)
    {
        $same = array_filter($options, function ($option) use ($current) {
            return array_intersect_key($option, $current) == $current;
        });
        return array_values(array_column($same, 'id'));
    }

    public static function look()
    {
        return new \WP_REST_Response(['options' => Looks::all(), 'home' => \home_url('/')]);
    }
}

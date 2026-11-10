<?php

/**
 * Whole looks for the Site Guide.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Pairs each served home page layout with a style variation and a vibe.
 */
class Looks
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const COUNT = 8;

    /**
     * Each look's id and the draft picks that make it.
     *
     * @return array
     */
    public static function all()
    {
        $variations = array_column(StyleVariations::all(), 'slug');
        $vibes = array_column(Vibes::all(), 'id');
        $layouts = array_slice(array_column(Layouts::all(), 'id'), 0, self::COUNT);
        return array_map(function ($layout, $at) use ($variations, $vibes) {
            return ['id' => $layout, 'picks' => [
                'layout' => $layout,
                'variation' => $variations ? $variations[$at % count($variations)] : '',
                'vibe' => $vibes ? $vibes[$at % count($vibes)] : '',
            ]];
        }, $layouts, array_keys($layouts));
    }
}

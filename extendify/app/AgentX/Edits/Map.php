<?php

/**
 * Change a map already on the page.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Points a placed map at a new place, or changes its height, rebuilding it from an address Maps built.
 */
class Map extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'map';
    const PLACES = ['embed', 'link', 'place'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $block = Tree::blockAt($blocks, $path);
        $now = $block['blockName'] === 'core/html' ? Maps::drawn($block['innerHTML']) : null;
        if (!$now) {
            return self::refuse('not_a_map', 'This block is no map to change.');
        }

        $place = array_intersect_key($args, array_flip(self::PLACES));
        if (!$place && !array_key_exists('height', $args)) {
            return self::refuse('bad_args', "Send the map's new place or height.");
        }

        $src = $place ? Maps::srcOf($place) : $now['src'];
        if (\is_wp_error($src)) {
            return $src;
        }

        $height = array_key_exists('height', $args) ? $args['height'] : $now['height'];
        return ['blocks' => Tree::setAt($blocks, $path, Maps::blockOf($src, $height)), 'at' => $path, 'block' => $path];
    }
}

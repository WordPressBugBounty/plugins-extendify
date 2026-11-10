<?php

/**
 * Show or hide the site title beside the logo.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Hides the site title beside a logo with WordPress's own block visibility, so showing it again is exact.
 */
class LogoTitle extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'title-shown';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        if (!self::supported()) {
            return self::refuse('no_block_visibility', 'This WordPress cannot hide a block; that needs 6.9 or later.');
        }

        if (Tree::blockAt($blocks, $path)['blockName'] !== 'core/site-logo') {
            return self::refuse('not_a_logo', 'Send the logo the site title sits beside.');
        }

        if (!is_bool($args['visible'] ?? null)) {
            return self::refuse('bad_args', 'Send visible as true or false.');
        }

        $parent = array_slice($path, 0, -1);
        $at = self::titleIn(Tree::children($blocks, $parent));
        if ($at === null) {
            return self::refuse('no_title', 'No site title sits beside this logo.');
        }

        $title = array_merge($parent, $at);
        $block = Tree::blockAt($blocks, $title);
        $block['attrs'] = self::withVisibility($block['attrs'], $args['visible']);
        // A hidden title has no element to swap, so the swap holds the group around it.
        return ['blocks' => Tree::setAt($blocks, $title, $block), 'at' => $parent, 'block' => $title];
    }

    public static function reportFor(array $before, $after = null)
    {
        return is_array($after) && self::hidden($after) ? 'title-hidden' : self::REPORT;
    }

    public static function supported()
    {
        return function_exists('wp_render_block_visibility_support');
    }

    /**
     * Whether the site title among a logo's sibling blocks shows.
     *
     * @param array $siblings - The parsed blocks beside the logo, the logo among them.
     * @return string|null 'shown', 'hidden', or null when no title sits beside it.
     */
    public static function stateIn(array $siblings)
    {
        $siblings = array_values(Tree::named($siblings));
        $at = self::titleIn($siblings);
        if ($at === null) {
            return null;
        }

        $title = count($at) === 1 ? $siblings[$at[0]] : array_values(Tree::named($siblings[$at[0]]['innerBlocks']))[0];
        return self::hidden($title) ? 'hidden' : 'shown';
    }

    private static function titleIn(array $siblings)
    {
        foreach (array_values($siblings) as $index => $block) {
            if ($block['blockName'] === 'core/site-title') {
                return [$index];
            }

            $inner = array_values(Tree::named($block['innerBlocks']));
            $own = implode('', array_filter($block['innerContent'], 'is_string'));
            $alone = count($inner) === 1 && $inner[0]['blockName'] === 'core/site-title';
            if ($block['blockName'] === 'core/group' && $alone && trim(\wp_strip_all_tags($own)) === '') {
                return [$index, 0];
            }
        }

        return null;
    }

    private static function hidden(array $block)
    {
        return ($block['attrs']['metadata']['blockVisibility'] ?? null) === false;
    }

    private static function withVisibility(array $attrs, $visible)
    {
        if (!$visible) {
            $attrs['metadata']['blockVisibility'] = false;
            return $attrs;
        }

        unset($attrs['metadata']['blockVisibility']);
        if (empty($attrs['metadata'])) {
            unset($attrs['metadata']);
        }

        return $attrs;
    }
}

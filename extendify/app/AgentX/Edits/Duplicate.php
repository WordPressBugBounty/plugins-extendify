<?php

/**
 * Duplicate a block.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Puts a copy of a block right after it.
 */
class Duplicate extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'duplicate';
    const KEEPS_CONTENT = true;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        return self::inParent($blocks, $path, function ($children, $index) {
            array_splice($children, $index + 1, 0, [self::copy($children[$index])]);
            return [$children, $index + 1];
        });
    }

    // A copy is a new block, and an HTML id must stay unique on the page.
    private static function copy(array $block)
    {
        unset($block['attrs'][Tree::MARK]);
        if (isset($block['attrs']['anchor'])) {
            unset($block['attrs']['anchor']);
            $block = self::withOpening($block, function ($opening) {
                $tags = new \WP_HTML_Tag_Processor($opening);
                if ($tags->next_tag()) {
                    $tags->remove_attribute('id');
                }

                return $tags->get_updated_html();
            });
        }

        $block['innerBlocks'] = array_map([self::class, 'copy'], $block['innerBlocks']);
        return $block;
    }
}

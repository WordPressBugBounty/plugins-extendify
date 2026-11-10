<?php

/**
 * Puts the blocks of side-by-side columns in one column, in reading order.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * The edit that undoes columns: their blocks take the columns' place, the left column's first.
 */
class Stack extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'stack';
    // "Put the Columns in one column", since the columns are gone once it's done.
    const NAMES_MADE = false;
    // An FAQ or list split across the columns becomes one, or its items sit in separate lists.
    const MERGED = ['core/accordion', 'core/list'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The blocks with the columns at the path replaced by the blocks inside them.
     *
     * @param array $blocks  The page's blocks.
     * @param array $path    Where the columns are.
     * @param array $args    No args.
     * @param array $context The edit's context.
     * @return array|\WP_Error
     */
    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $columns = Tree::blockAt($blocks, $path);
        if (($columns['blockName'] ?? '') !== 'core/columns') {
            return self::refuse('unsupported', 'Only columns stack into one.');
        }

        $inside = [];
        foreach ($columns['innerBlocks'] as $column) {
            foreach ($column['innerBlocks'] ?? [] as $block) {
                $inside[] = $block;
            }
        }

        if (!$inside) {
            return self::refuse('unsupported', 'These columns hold nothing to stack.');
        }

        $parent = array_slice($path, 0, -1);
        $at = (int) end($path);
        $children = Tree::children($blocks, $parent);
        $stacked = self::merged($inside);
        $kept = array_merge(array_slice($children, 0, $at), $stacked, array_slice($children, $at + 1));
        return [
            'blocks' => Tree::withChildren($blocks, $parent, $kept),
            'at' => $parent,
            'block' => array_merge($parent, [$at]),
        ];
    }

    // One list or FAQ per column joins into the first, keeping its look.
    private static function merged(array $inside)
    {
        $names = array_unique(array_column($inside, 'blockName'));
        if (count($inside) < 2 || count($names) !== 1 || !in_array($names[0], self::MERGED, true)) {
            return $inside;
        }

        $items = [];
        foreach ($inside as $list) {
            foreach ($list['innerBlocks'] as $item) {
                $items[] = $item;
            }
        }

        $first = $inside[0];
        $opening = (string) ($first['innerContent'][0] ?? '');
        $closing = (string) (end($first['innerContent']) ?: '');
        $content = [$opening];
        foreach ($items as $index => $item) {
            if ($index > 0) {
                $content[] = "\n\n";
            }

            $content[] = null;
        }

        $content[] = $closing;
        return [array_merge($first, [
            'innerBlocks' => $items,
            'innerContent' => $content,
            'innerHTML' => $opening . $closing,
        ])];
    }
}

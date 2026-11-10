<?php

/**
 * Remove a block.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Takes a block off the page, and any wrapper it leaves empty.
 */
class Remove extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'remove';
    const KEEPS_CONTENT = true;
    // Blocks that only arrange others, so one left empty when its last block is removed goes too.
    const WRAPPERS = [
        'core/accordion',
        'core/buttons',
        'core/column',
        'core/columns',
        'core/group',
        'core/list',
        'core/social-links',
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $whole = count(Tree::named($blocks)) === 1;
        // A wrapper left empty, like a button group without its one button, goes too, short of emptying the source.
        while (count($path) > ($whole ? 2 : 1) && self::alone($blocks, $path)) {
            array_pop($path);
        }

        if ($whole && count($path) === 1) {
            return self::refuse('last_block', 'Removing this block would leave nothing here.');
        }

        $gone = ['blockName' => null, 'attrs' => [], 'innerBlocks' => [], 'innerHTML' => '', 'innerContent' => []];
        return [
            'blocks' => \parse_blocks(\serialize_blocks(Tree::replaceAt($blocks, Tree::keysOf($blocks, $path), $gone))),
            // Undo can't find a swap to nothing, so the swap holds the parent.
            'at' => array_slice($path, 0, -1),
            'block' => null,
        ];
    }

    // A wrapper that shows something of its own, like a background image, stays.
    public static function alone(array $blocks, array $path)
    {
        $parent = Tree::blockAt($blocks, array_slice($path, 0, -1));
        $own = implode('', array_filter($parent['innerContent'], 'is_string'));
        return count(Tree::named($parent['innerBlocks'])) === 1
            && in_array($parent['blockName'], self::WRAPPERS, true)
            && empty($parent['attrs']['style']['background'])
            && trim(\wp_strip_all_tags($own)) === ''
            && !preg_match('/<(img|video|audio|iframe|svg)\b|url\(/i', $own);
    }
}

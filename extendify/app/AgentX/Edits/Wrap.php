<?php

/**
 * Wrap blocks in columns.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Puts blocks that sit together side by side in columns, each column holding the blocks its list names.
 */
class Wrap extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'wrap';
    // "Put the Paragraph in columns", not the Columns it made.
    const NAMES_MADE = false;
    const MOST_COLUMNS = 4;
    // Parents that hold only one kind of block, which columns can't stand in.
    const CLOSED = [
        'core/list',
        'core/columns',
        'core/navigation',
        'core/navigation-submenu',
        'core/social-links',
        'core/gallery',
        'core/buttons',
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $layout = $args['columns'] ?? null;
        $shaped = is_array($layout) && count($layout) >= 2 && count($layout) <= self::MOST_COLUMNS
            && count(array_filter($layout, 'is_array')) === count($layout);
        if (!$shaped) {
            return self::refuse('bad_args', 'Send two to four columns, each a list of block ids.');
        }

        $parent = array_slice($path, 0, -1);
        // "make these 3 columns" on a two-column FAQ named questions from both columns.
        $spread = self::besideOthers($blocks, $parent, $layout, $context['source'])
            ? null
            : self::respread($blocks, $path, $layout, $context['source']);
        if ($spread !== null) {
            return $spread;
        }

        $holder = $parent ? Tree::blockAt($blocks, $parent) : null;
        if (in_array($holder['blockName'] ?? '', self::CLOSED, true)) {
            return self::refuse('wrong_place', 'Those blocks can\'t go in columns where they are.');
        }

        // Columns in a grid become one of its items, squeezed into one cell of the row.
        if (($holder['attrs']['layout']['type'] ?? null) === 'grid') {
            return self::refuse('wrong_place', 'These sit in a grid, whose items per row an edit on the grid sets.');
        }

        $children = Tree::children($blocks, $parent);
        $indexes = [];
        $columns = [];
        foreach ($layout as $ids) {
            $column = [];
            foreach ($ids as $id) {
                $at = self::pathOf($blocks, (string) $id, $context['source']);
                if ($at === null || array_slice($at, 0, -1) !== $parent) {
                    return self::refuse('wrong_place', 'Blocks go in columns only beside the others in their section.');
                }

                $index = (int) end($at);
                if (in_array($index, $indexes, true)) {
                    return self::refuse('bad_args', 'Each block goes in one column.');
                }

                $indexes[] = $index;
                $column[] = $children[$index];
            }

            $columns[] = $column;
        }

        if (!in_array((int) end($path), $indexes, true)) {
            return self::refuse('bad_args', 'The block the edit names goes in one of the columns.');
        }

        $made = self::columnsOf($columns);
        $at = min($indexes);
        $kept = [];
        foreach ($children as $index => $child) {
            if ($index === $at) {
                $kept[] = $made;
            }

            if (!in_array($index, $indexes, true)) {
                $kept[] = $child;
            }
        }

        return [
            'blocks' => Tree::withChildren($blocks, $parent, $kept),
            'at' => $parent,
            'block' => array_merge($parent, [array_search($made, $kept, true)]),
        ];
    }

    private static function besideOthers(array $blocks, array $parent, array $layout, $source)
    {
        foreach ($layout as $ids) {
            foreach ($ids as $id) {
                $at = self::pathOf($blocks, (string) $id, $source);
                if ($at === null || array_slice($at, 0, -1) !== $parent) {
                    return false;
                }
            }
        }

        return true;
    }

    // Blocks in side-by-side columns, or one list or FAQ's items in each, dealt into the columns the layout names.
    private static function respread(array $blocks, array $path, array $layout, $source)
    {
        foreach ([2, 3] as $depth) {
            if (count($path) <= $depth) {
                continue;
            }

            $at = array_slice($path, 0, -$depth);
            $columns = Tree::blockAt($blocks, $at);
            if (($columns['blockName'] ?? '') !== 'core/columns') {
                continue;
            }

            list($cells, $lists, $items) = self::itemsIn($columns);
            if (($lists !== []) !== ($depth === 3)) {
                continue;
            }

            $dealt = self::dealt($blocks, $at, $items, $layout, $source);
            if ($dealt === null) {
                return null;
            }

            $made = [];
            foreach ($dealt as $index => $inner) {
                $cell = self::widthless($index < count($cells) ? $cells[$index] : self::copyOf($cells[0]));
                $list = $lists[$index] ?? ($lists ? self::copyOf($lists[0]) : null);
                $held = $list === null || !$inner ? $inner : [self::holding($list, $inner)];
                $made[] = self::holding($cell, $held);
            }

            $parent = array_slice($at, 0, -1);
            $siblings = Tree::children($blocks, $parent);
            $siblings[(int) end($at)] = self::holding($columns, $made);
            return [
                'blocks' => Tree::withChildren($blocks, $parent, $siblings),
                'at' => $parent,
                'block' => $at,
            ];
        }

        return null;
    }

    // A list or FAQ in every column is dealt by its items, never as one block.
    private static function itemsIn(array $columns)
    {
        $cells = array_values(Tree::named($columns['innerBlocks']));
        $inner = array_map(function ($cell) {
            return array_values(Tree::named($cell['innerBlocks'] ?? []));
        }, $cells);
        $kinds = array_unique(array_map(function ($held) {
            return count($held) === 1 && in_array($held[0]['blockName'], Stack::MERGED, true)
                ? $held[0]['blockName']
                : '';
        }, $inner));
        $listed = count($kinds) === 1 && reset($kinds) !== '';
        $lists = $listed ? array_column($inner, 0) : [];
        $items = [];
        foreach ($inner as $column => $held) {
            $from = $listed ? array_values(Tree::named($held[0]['innerBlocks'])) : $held;
            foreach ($from as $index => $block) {
                $items[] = [
                    'at' => $listed ? [$column, 0, $index] : [$column, $index],
                    'block' => $block,
                ];
            }
        }

        return [$cells, $lists, $items];
    }

    // The items each new column holds, or null unless the layout names every item once.
    private static function dealt(array $blocks, array $at, array $items, array $layout, $source)
    {
        $byPath = [];
        foreach ($items as $index => $item) {
            $byPath[implode('.', array_merge($at, $item['at']))] = $index;
        }

        $seen = [];
        $dealt = [];
        foreach ($layout as $ids) {
            $column = [];
            foreach ($ids as $id) {
                $found = self::pathOf($blocks, (string) $id, $source);
                $index = $found === null ? null : ($byPath[implode('.', $found)] ?? null);
                if ($index === null || isset($seen[$index])) {
                    return null;
                }

                $seen[$index] = true;
                $column[] = $items[$index]['block'];
            }

            $dealt[] = $column;
        }

        return count($seen) === count($items) ? $dealt : null;
    }

    // A new column or list is a copy of one already there, so the ids before the edit can't land on it.
    private static function copyOf(array $block)
    {
        unset($block['attrs'][Tree::MARK]);
        return $block;
    }

    // A width set for the old count would crowd the new one, so each new column takes an equal share.
    private static function widthless(array $cell)
    {
        unset($cell['attrs']['width']);
        return self::withOpening($cell, function ($opening) {
            $opening = preg_replace('/flex-basis:[^;"]*;?/', '', $opening);
            return preg_replace('/\sstyle=""/', '', $opening);
        });
    }

    private static function holding(array $block, array $children)
    {
        $content = $block['innerContent'] ?? [];
        $slots = array_keys($content, null, true);
        if ($slots) {
            $opening = implode('', array_slice($content, 0, $slots[0]));
            $closing = implode('', array_slice($content, end($slots) + 1));
        } else {
            // An empty holder is one string, opened and closed around nothing.
            $markup = implode('', array_filter($content, 'is_string'));
            $end = strrpos($markup, '</');
            $opening = $end === false ? $markup : substr($markup, 0, $end);
            $closing = $end === false ? '' : substr($markup, $end);
        }
        $rebuilt = [$opening];
        foreach (array_keys(array_values($children)) as $index) {
            if ($index > 0) {
                $rebuilt[] = "\n\n";
            }

            $rebuilt[] = null;
        }

        $rebuilt[] = $closing;
        return array_merge($block, [
            'innerBlocks' => array_values($children),
            'innerContent' => $rebuilt,
            'innerHTML' => $opening . $closing,
        ]);
    }

    // An empty column is a place for a block still to come.
    private static function columnsOf(array $columns)
    {
        $markup = "<!-- wp:columns -->\n<div class=\"wp-block-columns\">";
        foreach ($columns as $inner) {
            $markup .= "<!-- wp:column -->\n<div class=\"wp-block-column\">"
                . implode("\n\n", array_map('serialize_block', $inner))
                . "</div>\n<!-- /wp:column -->";
        }

        $markup .= "</div>\n<!-- /wp:columns -->";
        return \parse_blocks($markup)[0];
    }
}

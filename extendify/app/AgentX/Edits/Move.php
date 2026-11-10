<?php

/**
 * Move a block.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Moves a block among its siblings, or next to or inside any other block in its page or part.
 */
class Move extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'move';
    const PLACES = ['up', 'down', 'first', 'last', 'before', 'after', 'start', 'end'];
    // Parents that hold only these kinds of blocks, which stand nowhere else.
    const ONLY = [
        'core/list' => ['core/list-item'],
        'core/columns' => ['core/column'],
        'core/navigation' => ['core/navigation-link', 'core/navigation-submenu'],
        'core/navigation-submenu' => ['core/navigation-link', 'core/navigation-submenu'],
        'core/social-links' => ['core/social-link'],
        'core/gallery' => ['core/image'],
        'core/buttons' => ['core/button'],
        'core/accordion' => ['core/accordion-item'],
        'core/accordion-item' => ['core/accordion-heading', 'core/accordion-panel'],
    ];
    // Blocks that stand at the top of a page on their own, as a section does.
    const SECTIONS = ['core/group', 'core/cover'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $to = (string) ($args['to'] ?? '');
        if (!in_array($to, self::PLACES, true)) {
            return self::refuse('bad_args', 'Say where to move the block.');
        }

        if (in_array($to, ['up', 'down', 'first', 'last'], true)) {
            return self::amongSiblings($blocks, $path, $to, null, max(1, (int) ($args['steps'] ?? 1)));
        }

        $id = (string) ($args['next'] ?? '');
        $next = self::pathOf($blocks, $id, $context['source']);
        $beside = in_array($to, ['before', 'after'], true);
        if ($next === null && $beside) {
            $next = self::referenceIn($blocks, $id);
        }

        if ($next === null) {
            $split = strrpos($id, ':');
            return $split !== false && substr($id, 0, $split) !== $context['source']
                ? self::refuse('other_source', 'A block moves only within its own page or part.')
                : self::refuse('not_found', 'No block has that id.');
        }

        if (self::within($next, $path)) {
            return self::refuse('wrong_place', 'A block can\'t go inside itself.');
        }

        $parent = array_slice($path, 0, -1);
        $inside = in_array($to, ['start', 'end'], true);
        if ($inside && self::same($next, $parent)) {
            return self::amongSiblings($blocks, $path, $to === 'start' ? 'first' : 'last', null);
        }

        if (!$inside && self::same(array_slice($next, 0, -1), $parent)) {
            return self::amongSiblings($blocks, $path, $to, $next);
        }

        return self::elsewhere($blocks, $path, $next, $to, $id, $context['source']);
    }

    // A synced pattern stands on the page as a reference block, which is the place beside it or anything in it.
    public static function referenceIn(array $blocks, $id)
    {
        $synced = preg_match('/^post:(\d+):\d+(\.\d+)*$/', (string) $id, $match)
            && \get_post_type((int) $match[1]) === 'wp_block';
        if (!$synced) {
            return null;
        }

        return Tree::pathWhere($blocks, function ($block) use ($match) {
            return $block['blockName'] === 'core/block' && (int) ($block['attrs']['ref'] ?? 0) === (int) $match[1];
        });
    }

    private static function amongSiblings(array $blocks, array $path, $to, $next, $steps = 1)
    {
        return self::inParent($blocks, $path, function ($children, $index) use ($to, $next, $steps) {
            $count = count($children);
            // "up five" with two above goes as far as it can.
            $target = [
                'up' => max($index - $steps, 0),
                'down' => min($index + $steps, $count - 1),
                'first' => 0,
                'last' => $count - 1,
            ][$to] ?? null;
            if ($next !== null) {
                $other = (int) end($next);
                $target = $to === 'before' ? $other - ($other > $index ? 1 : 0) : $other + ($other < $index ? 1 : 0);
            }

            if ($target < 0 || $target >= $count || $target === $index) {
                return self::refuse('cant_move', 'The block is already as far as it can go.');
            }

            $moving = array_splice($children, $index, 1);
            array_splice($children, $target, 0, $moving);
            return [$children, $target];
        });
    }

    private static function elsewhere(array $blocks, array $path, array $next, $to, $id, $source)
    {
        $moving = Tree::blockAt($blocks, $path);
        list($without, $gone) = self::without($blocks, $path);
        $inside = in_array($to, ['start', 'end'], true);
        // A wrapper the block left empty went too, so a place beside it is where it stood.
        if (!$inside && self::within($next, $gone)) {
            $parent = array_slice($gone, 0, -1);
            $index = (int) end($gone);
        } else {
            $anchor = self::pathOf($without, $id, $source);
            if ($anchor === null) {
                return self::refuse('wrong_place', 'That block went with the wrapper this one left empty.');
            }

            $parent = $inside ? $anchor : array_slice($anchor, 0, -1);
            $index = $inside
                ? ($to === 'start' ? 0 : count(Tree::children($without, $parent)))
                : (int) end($anchor) + ($to === 'after' ? 1 : 0);
        }

        $holder = $parent ? Tree::blockAt($without, $parent)['blockName'] : '';
        if ($inside && !in_array($holder, Add::HOLDERS, true) && !isset(self::ONLY[$holder])) {
            return self::refuse('wrong_place', 'Only a section, group or column holds other blocks.');
        }

        // A column stands only in columns, so moved anywhere else it brings the blocks it holds.
        $carried = $moving['blockName'] === 'core/column' && $holder !== 'core/columns'
            ? array_values(array_filter($moving['innerBlocks'] ?? [], function ($block) {
                return !empty($block['blockName']);
            }))
            : [$moving];
        if (!$carried) {
            return self::refuse('wrong_place', 'That column holds nothing to move.');
        }

        foreach ($carried as $block) {
            if (!self::fits($block['blockName'], $holder)) {
                return self::refuse('wrong_place', 'That kind of block can\'t go there.');
            }
        }

        $children = Tree::children($without, $parent);
        $placed = $carried;
        $depth = 0;
        if (count($placed) === 1 && $placed[0]['blockName'] === 'core/button' && $holder !== 'core/buttons') {
            $placed = [self::wrapped('core/buttons', [], $placed)];
            $depth++;
        }

        if (!$parent && (count($placed) > 1 || !in_array($placed[0]['blockName'], self::SECTIONS, true))) {
            $placed = [self::wrapped('core/group', self::sectionLook($children, $index), $placed)];
            $depth++;
        }

        array_splice($children, $index, 0, $placed);
        return [
            'blocks' => Tree::withChildren($without, $parent, $children),
            'at' => Tree::commonPrefix(array_slice($gone, 0, -1), $parent),
            'block' => array_merge($parent, [$index], array_fill(0, $depth, 0)),
        ];
    }

    // Takes the block out, and each wrapper it leaves empty; the path of the outermost that went.
    private static function without(array $blocks, array $path)
    {
        while (count($path) > 1 && Remove::alone($blocks, $path)) {
            array_pop($path);
        }

        $parent = array_slice($path, 0, -1);
        $children = Tree::children($blocks, $parent);
        array_splice($children, (int) end($path), 1);
        return [Tree::withChildren($blocks, $parent, $children), $path];
    }

    private static function fits($type, $holder)
    {
        if (isset(self::ONLY[$holder])) {
            return in_array($type, self::ONLY[$holder], true);
        }

        // A button gets a group of its own, and an image stands anywhere.
        foreach (self::ONLY as $kinds) {
            if (in_array($type, $kinds, true) && !in_array($type, ['core/button', 'core/image'], true)) {
                return false;
            }
        }

        return true;
    }

    // A bare block among the page's sections stands out, so its group takes a neighbor's section style and spacing.
    private static function sectionLook(array $children, $index)
    {
        $look = ['align' => 'full', 'layout' => ['type' => 'constrained']];
        $nearest = array_keys($children);
        usort($nearest, function ($a, $b) use ($index) {
            $from = function ($at) use ($index) {
                return $at < $index ? $index - 1 - $at : $at - $index;
            };
            return [$from($a), $a] <=> [$from($b), $b];
        });
        foreach ($nearest as $at) {
            $near = $children[$at];
            $classes = explode(' ', (string) ($near['attrs']['className'] ?? ''));
            // A hero fills the screen with no padding, which a plain block shouldn't copy.
            $section = in_array('ext-section', $classes, true) && !in_array('ext-hero-section', $classes, true);
            if (($near['blockName'] ?? '') !== 'core/group' || !$section) {
                continue;
            }

            $kept = array_values(array_filter($classes, function ($class) {
                return $class === 'ext-section' || preg_match('/^is-style-[\w-]+--section$/', $class);
            }));
            $spacing = array_intersect_key($near['attrs']['style']['spacing'] ?? [], ['padding' => 1, 'margin' => 1]);
            return $look
                + ['className' => implode(' ', $kept)]
                + ($spacing ? ['style' => ['spacing' => $spacing]] : []);
        }

        return $look;
    }

    private static function wrapped($name, array $attrs, array $inners)
    {
        $classes = array_filter([
            \wp_get_block_default_classname($name),
            isset($attrs['align']) ? 'align' . $attrs['align'] : '',
            $attrs['className'] ?? '',
        ]);
        $css = isset($attrs['style']) ? (string) (\wp_style_engine_get_styles($attrs['style'])['css'] ?? '') : '';
        $open = '<div class="' . \esc_attr(implode(' ', $classes)) . '"'
            . ($css === '' ? '' : ' style="' . \esc_attr($css) . '"') . '>';
        $block = [
            'blockName' => $name,
            'attrs' => $attrs,
            'innerBlocks' => $inners,
            'innerHTML' => $open . '</div>',
            'innerContent' => array_merge([$open], array_fill(0, count($inners), null), ['</div>']),
        ];
        return array_values(Tree::named(\parse_blocks(\serialize_block($block))))[0];
    }

    private static function same(array $a, array $b)
    {
        return array_map('strval', $a) === array_map('strval', $b);
    }

    // Whether a path is the other one or inside it.
    private static function within(array $path, array $of)
    {
        return self::same(array_slice($path, 0, count($of)), $of);
    }
}

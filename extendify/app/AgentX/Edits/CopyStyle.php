<?php

/**
 * Copy a block's look.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Gives a block the look another block keeps, all of it or the settings named, as that block has them.
 */
class CopyStyle extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'style';
    // Where a block's style supports keep each part of its look, by the name a step asks for it by.
    const PARTS = [
        'text_color' => [['textColor'], ['style', 'color', 'text']],
        'background_color' => [
            ['backgroundColor'],
            ['gradient'],
            ['style', 'color', 'background'],
            ['style', 'color', 'gradient'],
        ],
        'link_color' => [['style', 'elements', 'link']],
        'type' => [['fontSize'], ['fontFamily'], ['style', 'typography']],
        'spacing' => [['style', 'spacing']],
        'border' => [['borderColor'], ['style', 'border']],
        'shadow' => [['style', 'shadow']],
    ];
    // A look's style variant, like a button's outline, is a class that no setting holds.
    const STYLE = 'style';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $from = self::pathOf($blocks, (string) ($args['from'] ?? ''), $context['source']);
        if ($from === null) {
            return self::refuse('not_found', 'No block on this page or part has the id in from.');
        }

        $only = array_values(array_intersect((array) ($args['only'] ?? []), self::parts()));
        $source = Tree::blockAt($blocks, $from);
        $block = Tree::blockAt($blocks, $path);
        // A whole look pairs inner blocks by place, which only blocks of one kind share.
        if (!$only && $source['blockName'] !== $block['blockName']) {
            return self::refuse('other_kind', 'A whole look comes from a block of its own kind; name settings.');
        }

        $copied = $only ? self::withParts($source, $block, $only) : self::copied($source, $block);
        return ['blocks' => Tree::setAt($blocks, $path, $copied), 'at' => $path, 'block' => $path];
    }

    private static function copied(array $source, array $block)
    {
        $copied = self::withParts($source, $block, self::parts());
        $twins = $source['innerBlocks'] ?? [];
        $copied['innerBlocks'] = array_map(function ($inner, $index) use ($twins) {
            $twin = $twins[$index] ?? null;
            return $twin && $twin['blockName'] === $inner['blockName'] ? self::copied($twin, $inner) : $inner;
        }, $copied['innerBlocks'] ?? [], array_keys($copied['innerBlocks'] ?? []));
        return $copied;
    }

    // What the source doesn't set comes off the block too, so the two look the same.
    private static function withParts(array $source, array $block, array $parts)
    {
        $attrs = $block['attrs'];
        foreach ($parts as $part) {
            if ($part === self::STYLE) {
                $attrs = $source['blockName'] === $block['blockName']
                    ? self::withVariant($attrs, $source['attrs'], $block['blockName'])
                    : $attrs;
                continue;
            }

            foreach (self::PARTS[$part] as $keys) {
                $attrs = self::put($attrs, $keys, self::read($source['attrs'], $keys));
            }
        }

        return Style::reattributed($block, $attrs);
    }

    private static function parts()
    {
        return array_merge(array_keys(self::PARTS), [self::STYLE]);
    }

    // Only the classes WordPress lists as this kind's styles move; the rest place the block in its pattern.
    private static function withVariant(array $attrs, array $from, $name)
    {
        $variants = array_map(function ($style) {
            return 'is-style-' . $style;
        }, self::variants($name));
        $classesOf = function (array $attrs) {
            return preg_split('/\s+/', (string) ($attrs['className'] ?? ''), -1, PREG_SPLIT_NO_EMPTY);
        };
        $kept = array_filter($classesOf($attrs), function ($class) use ($variants) {
            return !in_array($class, $variants, true);
        });
        $taken = array_filter($classesOf($from), function ($class) use ($variants) {
            return in_array($class, $variants, true);
        });
        $classes = array_values(array_unique(array_merge($kept, $taken)));
        if (!$classes) {
            unset($attrs['className']);
            return $attrs;
        }

        $attrs['className'] = implode(' ', $classes);
        return $attrs;
    }

    // WordPress keeps a kind's own styles, like a button's outline, apart from those a theme registers.
    private static function variants($name)
    {
        $type = \WP_Block_Type_Registry::get_instance()->get_registered($name);
        $own = $type && is_array($type->styles) ? array_column($type->styles, 'name') : [];
        $added = array_keys(\WP_Block_Styles_Registry::get_instance()->get_registered_styles_for_block($name));
        return array_merge($own, $added);
    }

    private static function read(array $attrs, array $keys)
    {
        foreach ($keys as $key) {
            if (!is_array($attrs) || !array_key_exists($key, $attrs)) {
                return null;
            }

            $attrs = $attrs[$key];
        }

        return $attrs;
    }

    private static function put(array $attrs, array $keys, $value)
    {
        $key = array_shift($keys);
        if (!$keys) {
            if ($value === null) {
                unset($attrs[$key]);
            } else {
                $attrs[$key] = $value;
            }

            return $attrs;
        }

        $inner = is_array($attrs[$key] ?? null) ? $attrs[$key] : [];
        $attrs[$key] = self::put($inner, $keys, $value);
        return $attrs;
    }
}

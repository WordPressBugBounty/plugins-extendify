<?php

/**
 * Block tree.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Walks parsed blocks by the positions the site frame's block ids name.
 */
class Tree
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    // Each block's id before an edit, carried in its attributes so the new ids can be read after it.
    const MARK = 'extendifyWas';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    // Ids count named blocks only, as BlockIds does.
    public static function named(array $blocks)
    {
        return array_filter($blocks, function ($block) {
            return !empty($block['blockName']);
        });
    }

    public static function keysOf(array $blocks, array $path)
    {
        $keys = [];
        foreach ($path as $index) {
            $named = array_keys(self::named($blocks));
            if (!isset($named[$index])) {
                return null;
            }

            $keys[] = $named[$index];
            $blocks = $blocks[$named[$index]]['innerBlocks'];
        }

        return $keys;
    }

    public static function at(array $blocks, array $keys)
    {
        $block = ['innerBlocks' => $blocks];
        foreach ($keys as $key) {
            $block = $block['innerBlocks'][$key];
        }

        return $block;
    }

    public static function replaceAt(array $blocks, array $keys, array $block)
    {
        $key = array_shift($keys);
        if (!$keys) {
            $blocks[$key] = $block;
            return $blocks;
        }

        $blocks[$key]['innerBlocks'] = self::replaceAt($blocks[$key]['innerBlocks'], $keys, $block);
        return $blocks;
    }

    public static function blockAt(array $blocks, array $path)
    {
        $keys = self::keysOf($blocks, $path);
        return $keys === null ? null : self::at($blocks, $keys);
    }

    public static function setAt(array $blocks, array $path, array $block)
    {
        return self::replaceAt($blocks, self::keysOf($blocks, $path), $block);
    }

    public static function children(array $blocks, array $parent)
    {
        $holder = $parent ? self::blockAt($blocks, $parent)['innerBlocks'] : $blocks;
        return array_values(self::named($holder));
    }

    // A parent holds one innerContent slot per inner block, so a new list is rebuilt from markup.
    public static function withChildren(array $blocks, array $parent, array $children)
    {
        if (!$parent) {
            return \parse_blocks(implode("\n\n", array_map('serialize_block', $children)));
        }

        $holder = self::blockAt($blocks, $parent);
        $content = $holder['innerContent'];
        $slots = array_keys($content, null, true);
        $opening = $slots ? implode('', array_slice($content, 0, $slots[0])) : '';
        $closing = $slots ? implode('', array_slice($content, end($slots) + 1)) : '';
        // An empty holder, like the column a wrap leaves, is one string, opened and closed around nothing.
        if (!$slots) {
            $markup = implode('', array_filter($content, 'is_string'));
            $end = strrpos($markup, '</');
            $opening = $end === false ? $markup : substr($markup, 0, $end);
            $closing = $end === false ? '' : substr($markup, $end);
        }
        // The whitespace the parent kept between its blocks, so a reorder keeps the markup's shape.
        $glue = count($slots) > 1
            ? implode('', array_slice($content, $slots[0] + 1, $slots[1] - $slots[0] - 1))
            : "\n\n";
        $rebuilt = [$opening];
        foreach (array_keys($children) as $index) {
            if ($index > 0) {
                $rebuilt[] = $glue;
            }

            $rebuilt[] = null;
        }

        $rebuilt[] = $closing;
        $holder['innerBlocks'] = array_values($children);
        $holder['innerContent'] = $rebuilt;
        $holder['innerHTML'] = implode('', array_filter($rebuilt, 'is_string'));
        return \parse_blocks(\serialize_blocks(self::setAt($blocks, $parent, $holder)));
    }

    public static function mark(array $blocks, $prefix = '')
    {
        $index = 0;
        foreach ($blocks as $key => $block) {
            if (empty($block['blockName'])) {
                continue;
            }

            $path = $prefix === '' ? (string) $index : "{$prefix}.{$index}";
            $blocks[$key]['attrs'][self::MARK] = $path;
            $blocks[$key]['innerBlocks'] = self::mark($block['innerBlocks'], $path);
            $index++;
        }

        return $blocks;
    }

    public static function marks(array $blocks, $prefix = '')
    {
        $found = [];
        $index = 0;
        foreach (self::named($blocks) as $block) {
            $path = $prefix === '' ? (string) $index : "{$prefix}.{$index}";
            if (isset($block['attrs'][self::MARK])) {
                $found[$block['attrs'][self::MARK]] = $path;
            }

            $found += self::marks($block['innerBlocks'], $path);
            $index++;
        }

        return $found;
    }

    public static function unmark(array $blocks)
    {
        foreach ($blocks as $key => $block) {
            if (empty($block['blockName'])) {
                continue;
            }

            unset($blocks[$key]['attrs'][self::MARK]);
            $blocks[$key]['innerBlocks'] = self::unmark($block['innerBlocks']);
        }

        return $blocks;
    }

    // Only the ids that changed, and only where a parent's change doesn't already say it.
    public static function moved(array $was, array $now, $source)
    {
        $paths = array_values(array_unique(array_map('strval', $was)));
        usort($paths, function ($a, $b) {
            return (substr_count($a, '.') - substr_count($b, '.')) ?: strnatcmp($a, $b);
        });
        $moved = [];
        foreach ($paths as $path) {
            $to = $now[$path] ?? null;
            if (self::follow($moved, $path) !== $to) {
                $moved[$path] = $to;
            }
        }

        $ids = [];
        foreach ($moved as $path => $to) {
            $ids["{$source}:{$path}"] = $to === null ? null : "{$source}:{$to}";
        }

        return $ids;
    }

    // Where a path is now, from the nearest change at or above it.
    public static function follow(array $moved, $path)
    {
        $parts = explode('.', $path);
        for ($depth = count($parts); $depth > 0; $depth--) {
            $prefix = implode('.', array_slice($parts, 0, $depth));
            if (!array_key_exists($prefix, $moved)) {
                continue;
            }

            if ($moved[$prefix] === null) {
                return null;
            }

            return implode('.', array_merge([$moved[$prefix]], array_slice($parts, $depth)));
        }

        return $path;
    }

    public static function pathWhere(array $blocks, callable $test, array $prefix = [])
    {
        foreach (array_values(self::named($blocks)) as $index => $block) {
            $path = array_merge($prefix, [$index]);
            if ($test($block)) {
                return $path;
            }

            $inner = self::pathWhere($block['innerBlocks'], $test, $path);
            if ($inner !== null) {
                return $inner;
            }
        }

        return null;
    }

    public static function commonPrefix(array $a, array $b)
    {
        $common = [];
        foreach (array_values($a) as $index => $part) {
            if (!isset($b[$index]) || (string) $b[$index] !== (string) $part) {
                break;
            }

            $common[] = $part;
        }

        return $common;
    }
}

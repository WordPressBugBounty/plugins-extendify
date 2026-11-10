<?php

/**
 * Change parts.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

use Extendify\AgentX\Edits\Style;
use Extendify\AgentX\Edits\Tree;

/**
 * Reads what one change did to a block, as the settings and words it changed, and puts one of them back.
 */
class ChangeParts
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    // The attributes each setting writes, so a change reads as the setting the agent knows by name.
    const SETTINGS = [
        'font_size' => [['fontSize'], ['style', 'typography', 'fontSize']],
        'text_color' => [
            ['textColor'],
            ['style', 'color', 'text'],
            ['customTextColor'],
            ['labelColor'],
            ['labelSublabelColor'],
        ],
        'background_color' => [
            ['backgroundColor'],
            ['style', 'color', 'background'],
            ['gradient'],
            ['style', 'color', 'gradient'],
            ['customBackgroundColor'],
        ],
        'link_color' => [['style', 'elements', 'link']],
        'heading_color' => [['style', 'elements', 'heading']],
        'button_color' => [['style', 'elements', 'button'], ['buttonBackgroundColor']],
        'font_family' => [['fontFamily'], ['style', 'typography', 'fontFamily']],
        'line_height' => [['style', 'typography', 'lineHeight']],
        'font_weight' => [['style', 'typography', 'fontWeight']],
        'font_style' => [['style', 'typography', 'fontStyle']],
        'letter_spacing' => [['style', 'typography', 'letterSpacing']],
        'text_transform' => [['style', 'typography', 'textTransform']],
        'text_decoration' => [['style', 'typography', 'textDecoration']],
        'text_align' => [['style', 'typography', 'textAlign'], ['textAlign']],
        'padding' => [['style', 'spacing', 'padding']],
        'margin' => [['style', 'spacing', 'margin']],
        'block_gap' => [['style', 'spacing', 'blockGap']],
        'border_color' => [['borderColor'], ['style', 'border', 'color'], ['fieldBorderColor']],
        'border_width' => [['style', 'border', 'width']],
        'border_style' => [['style', 'border', 'style']],
        'border_radius' => [['style', 'border', 'radius']],
        'shadow' => [['style', 'shadow']],
        'min_height' => [['style', 'dimensions', 'minHeight']],
        'heading_level' => [['level']],
        'justification' => [['layout', 'justifyContent']],
        'columns' => [['layout', 'columnCount']],
        'vertical_alignment' => [['verticalAlignment'], ['contentPosition']],
        'overlay' => [['dimRatio']],
        'width' => [['width']],
        'height' => [['height']],
        'icon_color' => [['iconColor'], ['iconColorValue']],
        'overlay_text_color' => [['overlayTextColor'], ['customOverlayTextColor']],
        'overlay_background_color' => [['overlayBackgroundColor'], ['customOverlayBackgroundColor']],
        'icon_size' => [['size']],
    ];
    // Their words sit in their opening markup, ahead of the blocks they hold.
    const OPENING = ['core/details' => 'summary', 'core/list-item' => 'li'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function of($before, $after, $whole)
    {
        if ($whole) {
            return [['node' => [], 'aspect' => 'structure']];
        }

        $old = \parse_blocks($before)[0] ?? null;
        $new = \parse_blocks($after)[0] ?? null;
        return $old && $new ? self::partsOf($old, $new, []) : [['node' => [], 'aspect' => 'structure']];
    }

    // Null when the part can't go back on the block as it is now; the block with it put back otherwise.
    public static function putBack(array $current, array $after, array $before, array $part)
    {
        $path = array_merge([0], $part['node']);
        $now = Tree::blockAt([$current], $path);
        $was = Tree::blockAt([$after], $path);
        $old = Tree::blockAt([$before], $path);
        if (!$now || !$was || !$old || $now['blockName'] !== $was['blockName']) {
            return null;
        }

        if ($part['aspect'] === 'text') {
            $text = self::textOf($now);
            if ($text === null || $text !== self::textOf($was) || self::textOf($old) === null) {
                return null;
            }

            $words = self::textOf($old);
            $opening = self::openingOf($now);
            if ($opening) {
                $content = $now['innerContent'];
                $content[0] = preg_replace_callback($opening, function ($match) use ($words) {
                    return $match[1] . $words . $match[3];
                }, $content[0], 1);
                $html = implode('', array_filter($content, 'is_string'));
                $block = array_merge($now, ['innerHTML' => $html, 'innerContent' => $content]);
                return Tree::setAt([$current], $path, $block)[0];
            }

            preg_match('#^(\s*<([a-z0-9-]+)\b[^>]*>)(.*)(</\2>\s*)$#is', $now['innerHTML'], $match);
            $html = $match[1] . $words . $match[4];
            $block = array_merge($now, ['innerHTML' => $html, 'innerContent' => [$html]]);
            return Tree::setAt([$current], $path, $block)[0];
        }

        $paths = $part['paths'] ?? null;
        if (!$paths || self::valuesAt($now['attrs'], $paths) !== self::valuesAt($was['attrs'], $paths)) {
            return null;
        }

        $attrs = $now['attrs'];
        foreach ($paths as $at) {
            $attrs = self::without($attrs, $at);
            $value = self::get($old['attrs'], $at);
            $attrs = $value === null ? $attrs : self::with($attrs, $at, $value);
        }

        if ($part['aspect'] === 'background_color') {
            $attrs = SectionLooks::withMarkOf($attrs, $old['attrs']);
        }

        return Tree::setAt([$current], $path, Style::reattributed($now, $attrs))[0];
    }

    // What a setting holds, read as the agent says it: a preset's slug or the value, empty for the theme's own.
    public static function shown(array $attrs, array $paths)
    {
        $values = array_filter(self::valuesAt($attrs, $paths), function ($value) {
            return $value !== null && $value !== '';
        });
        return implode(', ', array_map(function ($value) {
            return is_scalar($value) ? (string) $value : \wp_json_encode($value);
        }, $values));
    }

    // A block's own words with their formatting; null for a block holding others with no words of its own.
    public static function textOf(array $block)
    {
        $opening = self::openingOf($block);
        if ($opening) {
            return preg_match($opening, $block['innerContent'][0], $match) ? $match[2] : null;
        }

        if ($block['innerBlocks'] || count($block['innerContent']) !== 1) {
            return null;
        }

        return preg_match('#^\s*<([a-z0-9-]+)\b[^>]*>(.*)</\1>\s*$#is', $block['innerHTML'], $match)
            ? $match[2]
            : null;
    }

    // A summary is never a details block's outer element, even with no answer inside it.
    private static function openingOf(array $block)
    {
        $tag = self::OPENING[$block['blockName']] ?? null;
        if (!$tag || (!$block['innerBlocks'] && $tag !== 'summary') || !is_string($block['innerContent'][0] ?? null)) {
            return null;
        }

        return "#(<{$tag}\\b[^>]*>)(.*?)(</{$tag}>|$)#is";
    }

    private static function partsOf(array $old, array $new, array $node)
    {
        $kept = array_values(Tree::named($old['innerBlocks']));
        $made = array_values(Tree::named($new['innerBlocks']));
        if ($old['blockName'] !== $new['blockName'] || count($kept) !== count($made)) {
            return [['node' => $node, 'aspect' => 'structure']];
        }

        $parts = array_merge(self::settingsOf($old['attrs'], $new['attrs'], $node), self::wordsOf($old, $new, $node));
        foreach ($kept as $index => $inner) {
            if ($inner['blockName'] !== $made[$index]['blockName']) {
                $parts[] = ['node' => $node, 'aspect' => 'structure'];
                continue;
            }

            $parts = array_merge($parts, self::partsOf($inner, $made[$index], array_merge($node, [$index])));
        }

        return $parts;
    }

    private static function settingsOf(array $old, array $new, array $node)
    {
        // A kept look comes and goes with a background color, so it reads as that change.
        $old = SectionLooks::withoutMark($old);
        $new = SectionLooks::withoutMark($new);
        $was = self::leaves($old) + self::blanks($new);
        $now = self::leaves($new) + self::blanks($old);
        $changed = array_keys(array_diff_assoc($was, $now));
        $groups = [];
        foreach ($changed as $leaf) {
            $at = explode('.', $leaf);
            if ($at[0] === Tree::MARK) {
                continue;
            }

            $setting = self::settingOf($at);
            $groups[$setting ?: $at[0]] = $setting ? self::SETTINGS[$setting] : [[$at[0]]];
        }

        $parts = [];
        foreach ($groups as $aspect => $paths) {
            $parts[] = [
                'node' => $node,
                'aspect' => $aspect,
                'paths' => $paths,
                'before' => self::shown($old, $paths),
                'after' => self::shown($new, $paths),
            ];
        }

        return $parts;
    }

    private static function wordsOf(array $old, array $new, array $node)
    {
        $before = self::textOf($old);
        $after = self::textOf($new);
        if ($before === null || $after === null || $before === $after) {
            return [];
        }

        $words = [\wp_strip_all_tags($before), \wp_strip_all_tags($after)];
        $what = $words[0] !== $words[1] ? 'words' : (trim($words[0]) === '' ? 'markup' : 'formatting');
        return [[
            'node' => $node,
            'aspect' => 'text',
            'what' => $what,
            'before' => $before,
            'after' => $after,
        ]];
    }

    private static function settingOf(array $at)
    {
        foreach (self::SETTINGS as $setting => $paths) {
            foreach ($paths as $path) {
                if (array_slice($at, 0, count($path)) === $path) {
                    return $setting;
                }
            }
        }

        return null;
    }

    // Lists stay whole, since a padding's sides or a gradient read as one value.
    private static function leaves(array $values, $prefix = '')
    {
        $leaves = [];
        foreach ($values as $key => $value) {
            $at = $prefix === '' ? (string) $key : "{$prefix}.{$key}";
            $nested = is_array($value) && $value && array_keys($value) !== range(0, count($value) - 1);
            $leaves = array_merge($leaves, $nested ? self::leaves($value, $at) : [$at => \wp_json_encode($value)]);
        }

        return $leaves;
    }

    // A leaf only one side has still differs from the side without it.
    private static function blanks(array $values)
    {
        return array_fill_keys(array_keys(self::leaves($values)), 'null');
    }

    private static function valuesAt(array $attrs, array $paths)
    {
        return array_map(function ($path) use ($attrs) {
            return self::get($attrs, $path);
        }, $paths);
    }

    private static function get(array $values, array $path)
    {
        foreach ($path as $key) {
            if (!is_array($values) || !array_key_exists($key, $values)) {
                return null;
            }

            $values = $values[$key];
        }

        return $values;
    }

    private static function with(array $values, array $path, $value)
    {
        $key = array_shift($path);
        $inner = is_array($values[$key] ?? null) ? $values[$key] : [];
        $values[$key] = $path ? self::with($inner, $path, $value) : $value;
        return $values;
    }

    private static function without(array $values, array $path)
    {
        $key = array_shift($path);
        if (!array_key_exists($key, $values)) {
            return $values;
        }

        if (!$path) {
            unset($values[$key]);
            return $values;
        }

        $values[$key] = is_array($values[$key]) ? self::without($values[$key], $path) : $values[$key];
        return $values;
    }
}

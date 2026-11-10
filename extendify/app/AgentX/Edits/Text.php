<?php

/**
 * Change a block's text.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Replaces the words of a block that holds one piece of text.
 */
class Text extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'text';
    // The element holding each block's text.
    const TAGS = [
        'core/heading' => 'h[1-6]',
        'core/paragraph' => 'p',
        'core/button' => 'a|button',
        'core/list-item' => 'li',
        'core/details' => 'summary',
        'core/preformatted' => 'pre',
        'core/verse' => 'pre',
    ];
    // Blocks rendered from their attributes, with no saved markup to change.
    const LABELS = ['core/navigation-link' => 'label', 'core/navigation-submenu' => 'label'];
    // Its words sit in a span inside the toggle button.
    const SPANS = ['core/accordion-heading' => 'wp-block-accordion-heading__toggle-title'];
    // Their text keeps its own line breaks.
    const PRE = ['core/preformatted', 'core/verse'];
    const LONGEST = 5000;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $block = Tree::blockAt($blocks, $path);
        $given = $args['text'] ?? null;
        if (!is_string($given) || trim($given) === '' || strlen($given) > self::LONGEST) {
            return self::refuse('bad_args', 'Send the new text.');
        }

        $label = self::LABELS[$block['blockName']] ?? null;
        if ($label) {
            // The menu item is a link itself, so a link inside its label would nest one link in another.
            $words = \wp_kses(static::inner($given, $block), array_diff_key(static::allowed(), ['a' => true]));
            $refused = static::beyond((string) ($block['attrs'][$label] ?? ''), $words, $args);
            if ($refused) {
                return $refused;
            }

            $attrs = array_merge($block['attrs'], [$label => $words]);
            return self::landed($blocks, $path, array_merge($block, ['attrs' => $attrs]));
        }

        $span = self::SPANS[$block['blockName']] ?? null;
        if ($span) {
            $pattern = '#(<span class="' . $span . '"[^>]*>)(.*?)(</span>)#is';
            $opening = $block['innerContent'][0] ?? null;
            if (!is_string($opening) || !preg_match($pattern, $opening, $found)) {
                return self::refuse('no_text', 'This block holds no text of its own.');
            }

            $html = static::inner($given, $block);
            $refused = static::beyond($found[2], $html, $args);
            if ($refused) {
                return $refused;
            }

            $changed = self::withOpening($block, function ($opening) use ($pattern, $html) {
                return preg_replace_callback($pattern, function ($match) use ($html) {
                    return $match[1] . $html . $match[3];
                }, $opening, 1);
            });
            return self::landed($blocks, $path, $changed);
        }

        // Rewriting all of the code would let any line change, so code changes go line by line.
        if (in_array($block['blockName'], Code::BLOCKS, true)) {
            return self::refuse('is_code', 'This block holds code; change its lines with edit-code.');
        }

        $tags = self::TAGS[$block['blockName']] ?? null;
        if (!$tags || !self::hasMarkup($block)) {
            return self::refuse('no_text', 'This block holds no text of its own.');
        }

        // A list item's opening markup ends before the list nested in it, with no closing tag.
        $pattern = "#(<({$tags})\\b[^>]*>)(.*?)(</\\2>|$)#is";
        $opening = $block['innerContent'][0] ?? null;
        if (!is_string($opening) || !preg_match($pattern, $opening, $found)) {
            return self::refuse('no_text', 'This block holds no text of its own.');
        }

        $html = static::inner($given, $block);
        $refused = static::beyond($found[3], $html, $args);
        if ($refused) {
            return $refused;
        }

        $changed = self::withOpening($block, function ($opening) use ($pattern, $html) {
            return preg_replace_callback($pattern, function ($match) use ($html) {
                return $match[1] . $html . $match[4];
            }, $opening, 1);
        });
        return self::landed($blocks, $path, $changed);
    }

    // Plain words would drop the bold, italics and links in the text, so rich text is format-text's.
    protected static function beyond($old, $new, array $args)
    {
        return preg_match(Format::RICH, $old)
            ? self::refuse('rich_text', 'This text holds formatting; change it with format-text to keep it.')
            : null;
    }

    // Plain words, so nothing a model writes can add markup.
    protected static function inner($text, array $block)
    {
        $escaped = \esc_html($text);
        if (in_array($block['blockName'], self::PRE, true)) {
            return $escaped;
        }

        return str_replace(["\r\n", "\n"], '<br>', $escaped);
    }

    protected static function allowed()
    {
        return [];
    }

    private static function landed(array $blocks, array $path, array $block)
    {
        return ['blocks' => Tree::setAt($blocks, $path, $block), 'at' => $path, 'block' => $path];
    }
}

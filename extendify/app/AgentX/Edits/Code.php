<?php

/**
 * Change lines of code.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Replaces a range of lines in a code block and leaves every other line exactly as it was.
 */
class Code extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'text';
    const BLOCKS = ['core/code'];
    const LONGEST = 20000;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $block = Tree::blockAt($blocks, $path);
        if (!in_array($block['blockName'], self::BLOCKS, true)) {
            return self::refuse('no_code', 'This block holds no code.');
        }

        $opening = $block['innerContent'][0] ?? null;
        if (!is_string($opening) || !preg_match('#(<code\b[^>]*>)(.*?)(</code>)#is', $opening, $found)) {
            return self::refuse('no_code', 'This block holds no code.');
        }

        // Older code blocks broke lines with <br>; any other tag is formatting a line edit would lose.
        $raw = preg_replace('#<br\s*/?>#i', "\n", $found[2]);
        if (preg_match('#<[a-z]#i', $raw)) {
            return self::refuse('code_markup', 'This code holds formatting a line edit would lose.');
        }

        $lines = explode("\n", $raw);
        $from = (int) ($args['from'] ?? 0);
        $to = (int) ($args['to'] ?? -1);
        $new = self::linesOf($args['lines'] ?? null);
        // A count that differs means the lines were numbered from code that reads differently now.
        $counted = !isset($args['count']) || (int) $args['count'] === count($lines);
        $fits = $from >= 1 && $from <= count($lines) + 1 && $to >= $from - 1 && $to <= count($lines);
        if (!$fits || !$counted || $new === null) {
            return self::refuse('bad_lines', 'Those lines are not in the code.');
        }

        array_splice($lines, $from - 1, $to - $from + 1, array_map([self::class, 'encoded'], $new));
        // A lone URL on the code's first or last line stays inert only while a tag sits beside it.
        foreach ([$from - 2, $from - 1 + count($new)] as $at) {
            if (isset($lines[$at])) {
                $lines[$at] = self::unembedded($lines[$at]);
            }
        }
        $html = $found[1] . implode("\n", $lines) . $found[3];
        $changed = self::withOpening($block, function ($opening) use ($found, $html) {
            return str_replace($found[0], $html, $opening);
        });
        return ['blocks' => Tree::setAt($blocks, $path, $changed), 'at' => $path, 'block' => $path];
    }

    // An empty list removes the lines, and [''] writes one blank line.
    private static function linesOf($lines)
    {
        if (!is_array($lines)) {
            return null;
        }
        foreach ($lines as $line) {
            if (!is_string($line)) {
                return null;
            }
        }
        if (!$lines) {
            return [];
        }
        $text = str_replace(["\r\n", "\r"], "\n", implode("\n", $lines));
        return strlen($text) > self::LONGEST ? null : explode("\n", $text);
    }

    // As the editor writes code, so a shortcode or a URL alone on its line doesn't run when the page renders.
    private static function encoded($line)
    {
        return self::unembedded(str_replace(['&', '<', '['], ['&amp;', '&lt;', '&#91;'], $line));
    }

    private static function unembedded($line)
    {
        return preg_replace('#^(\s*https?:)//([^\s<>"]+\s*)$#', '$1&#47;&#47;$2', $line);
    }
}

<?php

/**
 * Change a block's text with its formatting.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Replaces a block's text with words that may hold bold, italics, links and highlights.
 */
class Format extends Text
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'format';
    // The inline formats the editor's toolbar makes.
    const INLINE = [
        'strong' => [],
        'em' => [],
        'b' => [],
        'i' => [],
        's' => [],
        'sub' => [],
        'sup' => [],
        'code' => [],
        'kbd' => [],
        'br' => [],
        // The editor's link control names the page a link points at with data-type and data-id.
        'a' => [
            'href' => true,
            'target' => true,
            'rel' => true,
            'data-type' => true,
            'data-id' => true,
            'class' => true,
            'id' => true,
        ],
        'mark' => ['style' => true, 'class' => true],
        // Underline has no tag of its own, so the editor writes it as a styled span.
        'span' => ['style' => true, 'class' => true],
    ];
    // Any tag but a line break is formatting inside the words.
    const RICH = '#<(?!br\b)[a-z]#i';
    // The rendered page curls quotes and dashes, so a model copying it back must still match the saved words.
    const TYPOGRAPHY = [
        "\u{2018}" => "'",
        "\u{2019}" => "'",
        "\u{201A}" => "'",
        "\u{201B}" => "'",
        "\u{201C}" => '"',
        "\u{201D}" => '"',
        "\u{201E}" => '"',
        "\u{201F}" => '"',
        "\u{2012}" => '-',
        "\u{2013}" => '-',
        "\u{2014}" => '-',
        "\u{2015}" => '-',
        "\u{2026}" => '...',
        "\u{00A0}" => ' ',
        "\u{2009}" => ' ',
        "\u{202F}" => ' ',
    ];
    const SAME_TAGS = ['b' => 'strong', 'i' => 'em'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    protected static function inner($text, array $block)
    {
        return self::sanitized($text);
    }

    // A fast edit says what it may change, so a rewrite that changes more is refused, not trusted.
    protected static function beyond($old, $new, array $args)
    {
        if (!self::keepable($old)) {
            return self::refuse('rich_markup', 'This text holds markup the agent cannot keep, like a footnote.');
        }

        $only = $args['only'] ?? '';
        if ($only === 'formatting' && self::words($old) !== self::words($new)) {
            return self::refuse('changed_words', 'The new text changes the words, not only their formatting.');
        }

        if ($only === 'words' && self::added(self::marks($old), self::marks($new))) {
            return self::refuse('changed_formatting', 'The new text adds formatting the old text did not have.');
        }

        return null;
    }

    /**
     * Link, when all this edit added was one, so the change list doesn't call it a change of the words.
     *
     * @param array      $before - The block before the edit.
     * @param array|null $after  - The block the edit left.
     * @return string
     */
    public static function reportFor(array $before, $after = null)
    {
        $old = is_array($after) ? ($before['innerContent'][0] ?? '') : '';
        $new = is_array($after) ? ($after['innerContent'][0] ?? '') : '';
        if (!is_string($old) || !is_string($new) || self::words($old) !== self::words($new)) {
            return self::REPORT;
        }

        $was = self::marks($old);
        $linked = false;
        foreach (self::marks($new) as $mark => $count) {
            if ($count <= ($was[$mark] ?? 0)) {
                continue;
            }

            if (strpos($mark, 'a|') !== 0) {
                return self::REPORT;
            }

            $linked = true;
        }

        return $linked ? Link::REPORT : self::REPORT;
    }

    private static function words($html)
    {
        $text = \wp_strip_all_tags(preg_replace('#<br\s*/?>#i', ' ', $html));
        $text = strtr(html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8'), self::TYPOGRAPHY);
        $text = preg_replace('/-{2,}/', '-', $text);
        return trim(preg_replace('/\s+/u', ' ', $text));
    }

    // Each formatting in the text, counted, with where a link goes and how a highlight or span looks.
    private static function marks($html)
    {
        $marks = [];
        $tags = new \WP_HTML_Tag_Processor($html);
        while ($tags->next_tag()) {
            $name = strtolower($tags->get_tag());
            if ($name === 'br' || !isset(self::INLINE[$name])) {
                continue;
            }

            $name = self::SAME_TAGS[$name] ?? $name;
            $classes = preg_split('/\s+/', (string) $tags->get_attribute('class'), -1, PREG_SPLIT_NO_EMPTY);
            sort($classes);
            $style = strtolower(preg_replace('/\s+/', '', (string) $tags->get_attribute('style')));
            $marks[] = $name === 'a'
                ? 'a|' . self::linkTo((string) $tags->get_attribute('href'))
                : $name . '|' . implode(' ', $classes) . '|' . rtrim($style, ';');
        }

        return array_count_values($marks);
    }

    // A phone or email link's address is the number or address it shows, so new words may change it.
    private static function linkTo($href)
    {
        return preg_match('/^(tel|mailto):/i', $href, $scheme) ? strtolower($scheme[0]) : $href;
    }

    private static function added(array $old, array $new)
    {
        foreach ($new as $mark => $count) {
            if ($count > ($old[$mark] ?? 0)) {
                return true;
            }
        }

        return false;
    }

    // The sanitizer keeps only the editor's inline formats, so anything else in the text would be lost.
    private static function keepable($html)
    {
        $tags = new \WP_HTML_Tag_Processor($html);
        while ($tags->next_tag()) {
            $allowed = self::INLINE[strtolower($tags->get_tag())] ?? null;
            if ($allowed === null) {
                return false;
            }

            foreach ($tags->get_attribute_names_with_prefix('') ?? [] as $attribute) {
                if (!isset($allowed[$attribute])) {
                    return false;
                }
            }
        }

        return true;
    }

    public static function sanitized($text)
    {
        \add_filter('safecss_filter_attr_allow_css', [self::class, 'allowColor'], 10, 2);
        $clean = \wp_kses($text, self::INLINE, \wp_allowed_protocols());
        \remove_filter('safecss_filter_attr_allow_css', [self::class, 'allowColor'], 10);
        // A block comment inside the text would close the block early when the page is next parsed.
        $clean = str_replace('<!--', '', preg_replace('/<!--.*?-->/s', '', $clean));
        return preg_replace_callback('#<a\b[^>]*>#i', [self::class, 'link'], $clean);
    }

    // Written as the editor writes a link, so a new tab always carries noreferrer and noopener.
    private static function link(array $match)
    {
        $tags = new \WP_HTML_Tag_Processor($match[0]);
        $tags->next_tag();
        $link = '<a';
        foreach (['href', 'data-type', 'data-id', 'class', 'id'] as $name) {
            $value = $tags->get_attribute($name);
            if (is_string($value)) {
                $link .= " {$name}=\"" . ($name === 'href' ? \esc_url($value) : \esc_attr($value)) . '"';
            }
        }

        $newTab = $tags->get_attribute('target') === '_blank';
        $rel = preg_split('/\s+/', strtolower((string) $tags->get_attribute('rel')), -1, PREG_SPLIT_NO_EMPTY);
        $rel = array_values(array_unique(array_merge(
            array_filter($rel, function ($token) {
                return preg_match('/^[a-z-]+$/', $token);
            }),
            $newTab ? ['noreferrer', 'noopener'] : []
        )));
        $link .= $newTab ? ' target="_blank"' : '';
        return $link . ($rel ? ' rel="' . \esc_attr(implode(' ', $rel)) . '"' : '') . '>';
    }

    // A highlight's colors are written as rgba(), which core's CSS filter drops, leaving the browser's yellow mark.
    public static function allowColor($allowed, $declaration)
    {
        $color = trim(Style::COLOR, '/^$i');
        return $allowed || (bool) preg_match("/^\\s*(background-color|color)\\s*:\\s*{$color}\\s*$/i", $declaration);
    }

    protected static function allowed()
    {
        return self::INLINE;
    }
}

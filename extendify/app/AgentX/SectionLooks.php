<?php

/**
 * The look a design gives a section's color, kept when the section takes another color.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * A design can draw more for a section's color than the color, like waves in it. A section taking another
 * color keeps that look, built at render from the design the site has then, so a design change follows.
 */
class SectionLooks
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    // The class naming the color whose look the section keeps; the editor keeps a block's classes.
    const MARK = '/^has-([a-z0-9-]+)-look$/';
    const HANDLE = 'section-looks';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The block's attributes with the look it keeps for a new background color, read before the color changes.
     *
     * @param array       $attrs The block's attributes.
     * @param string      $name  The block's name.
     * @param string|null $color The new background color, null to take it off.
     * @return array
     */
    public static function kept(array $attrs, $name, $color)
    {
        $classes = self::classesOf($attrs);
        $source = self::sourceOf($classes) ?? self::presetOf($attrs);
        $classes = self::unmarked($classes);
        if (
            is_string($source)
            && is_string($color)
            && $color !== ''
            && $color !== $source
            && self::rules($name, $classes, $source) !== ''
        ) {
            $classes[] = "has-{$source}-look";
        }

        return self::withClasses($attrs, $classes);
    }

    /**
     * The attributes without a kept look, so its class reads as part of the color it came with.
     *
     * @param array $attrs The block's attributes.
     * @return array
     */
    public static function withoutMark(array $attrs)
    {
        return self::withClasses($attrs, self::unmarked(self::classesOf($attrs)));
    }

    /**
     * The attributes with the kept look another version of the block had.
     *
     * @param array $attrs The block's attributes.
     * @param array $from  The other version's attributes.
     * @return array
     */
    public static function withMarkOf(array $attrs, array $from)
    {
        $classes = self::unmarked(self::classesOf($attrs));
        $source = self::sourceOf(self::classesOf($from));
        return self::withClasses($attrs, $source === null ? $classes : array_merge($classes, ["has-{$source}-look"]));
    }

    /**
     * Draws the look a section keeps, in its color, from the design the site has now.
     *
     * @param string $html  The rendered block.
     * @param array  $block The block as rendered.
     * @return string
     */
    public static function render($html, $block)
    {
        $classes = self::classesOf($block['attrs'] ?? []);
        $source = self::sourceOf($classes);
        $color = self::colorOf($block['attrs'] ?? []);
        if ($source === null || $color === null || $color === "var(--wp--preset--color--{$source})") {
            return $html;
        }

        $rules = self::rules($block['blockName'] ?? '', $classes, $source);
        $tags = new \WP_HTML_Tag_Processor($html);
        if ($rules === '' || !$tags->next_tag()) {
            return $html;
        }

        $class = \wp_unique_id('section-look-');
        $css = self::scoped(str_replace("var(--wp--preset--color--{$source})", $color, $rules), ".{$class}");
        // After the design's own variation styles, so the kept look wins over them as a later rule.
        $after = \wp_style_is('block-style-variation-styles', 'registered') ? ['block-style-variation-styles'] : [];
        if (!\wp_style_is(self::HANDLE, 'registered')) {
            \wp_register_style(self::HANDLE, false, $after);
        }

        \wp_add_inline_style(self::HANDLE, $css);
        \wp_enqueue_style(self::HANDLE);
        $tags->add_class($class);
        return $tags->get_updated_html();
    }

    // A design's rules for a section of the color, written as the section's own: `&::before { … }`.
    private static function rules($name, array $classes, $source)
    {
        $gate = '/\.has-' . preg_quote($source, '/') . '-background-color(?![\w-])/';
        $rules = '';
        foreach ($classes as $class) {
            if (strpos($class, 'is-style-') !== 0) {
                continue;
            }

            $css = \wp_get_global_styles(['blocks', $name, 'variations', substr($class, 9), 'css']);
            // WordPress splits a variation's CSS at each `&` the same way, one rule apiece.
            foreach (is_string($css) ? explode('&', $css) : [] as $part) {
                $brace = strpos($part, '{');
                $selector = $brace === false ? '' : rtrim(substr($part, 0, $brace));
                if (!preg_match('/^[^\s>+~]*' . substr($gate, 1, -1) . '/', $selector)) {
                    continue;
                }

                $rules .= '&' . rtrim(preg_replace($gate, '', $selector, 1)) . substr($part, $brace);
            }
        }

        return $rules;
    }

    // As WordPress scopes a variation's rules, at the same weight, so the later rule wins.
    private static function scoped($rules, $selector)
    {
        $css = '';
        foreach (explode('&', $rules) as $part) {
            $pieces = explode('{', str_replace('}', '', $part));
            if (count($pieces) !== 2) {
                continue;
            }

            list($nested, $body) = $pieces;
            $pseudo = preg_match('/([>+~\s]*::[a-zA-Z-]+)/', $nested, $match) ? $match[1] : '';
            $nested = $pseudo === '' ? $nested : str_replace($pseudo, '', $nested);
            $css .= ":root :where({$selector}{$nested}){$pseudo}{" . trim($body) . '}';
        }

        return $css;
    }

    private static function colorOf(array $attrs)
    {
        if (is_string($attrs['backgroundColor'] ?? null)) {
            return "var(--wp--preset--color--{$attrs['backgroundColor']})";
        }

        $own = $attrs['style']['color']['background'] ?? null;
        $own = is_string($own) ? trim(preg_replace('/\s*!important\s*$/i', '', $own)) : '';
        return $own !== '' && !preg_match('/[;{}<>]/', $own) ? $own : null;
    }

    // A design forcing its background gets the preset saved as a forced custom value.
    private static function presetOf(array $attrs)
    {
        if (is_string($attrs['backgroundColor'] ?? null)) {
            return $attrs['backgroundColor'];
        }

        $own = (string) ($attrs['style']['color']['background'] ?? '');
        return preg_match('/^var\(--wp--preset--color--([a-z0-9-]+)\)/', $own, $match) ? $match[1] : null;
    }

    private static function sourceOf(array $classes)
    {
        foreach ($classes as $class) {
            if (preg_match(self::MARK, $class, $match)) {
                return $match[1];
            }
        }

        return null;
    }

    private static function unmarked(array $classes)
    {
        return array_values(array_filter($classes, function ($class) {
            return !preg_match(self::MARK, $class);
        }));
    }

    private static function withClasses(array $attrs, array $classes)
    {
        if (!$classes) {
            unset($attrs['className']);
            return $attrs;
        }

        $attrs['className'] = implode(' ', $classes);
        return $attrs;
    }

    private static function classesOf(array $attrs)
    {
        return preg_split('/\s+/', (string) ($attrs['className'] ?? ''), -1, PREG_SPLIT_NO_EMPTY);
    }
}

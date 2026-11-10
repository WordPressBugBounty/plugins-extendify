<?php

/**
 * Puts the words beside a picture on it.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * The edit that sets a part's words on its picture: one cover, the picture behind, the words centered on a tint.
 */
class TextOnImage extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'cover';
    // Layout that only sets the words beside the picture, so they come out of it.
    const OPENED = ['core/columns', 'core/column'];
    // The editor's own image-to-cover tint, under which white words read.
    const DIM = 50;
    const CENTERED = ['core/heading', 'core/paragraph'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The blocks with the part holding a picture and words made one cover.
     *
     * @param array $blocks  The page's blocks.
     * @param array $path    The part, or the picture alone.
     * @param array $args    No args.
     * @param array $context The edit's context.
     * @return array|\WP_Error
     */
    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $named = Tree::blockAt($blocks, $path);
        $holder = $path;
        // The picture alone was named, so its words are the nearest ones around it.
        if (self::isPicture($named) && !self::words($named, $path, $path)) {
            $holder = self::wordsAround($blocks, $path);
            if ($holder === null) {
                return self::refuse('unsupported', 'No words sit beside this picture to put on it.');
            }
        }

        $part = Tree::blockAt($blocks, $holder);
        $pictures = self::picturesIn($part, $holder);
        if (count($pictures) !== 1) {
            return self::refuse(
                'unsupported',
                $pictures ? 'This part holds more than one picture.' : 'This part holds no picture.'
            );
        }

        $words = self::words($part, $holder, $pictures[0]);
        if (!$words) {
            return self::refuse('unsupported', 'This part holds no words to put on its picture.');
        }

        $words = array_map(function ($block) use ($context) {
            return self::onPicture($block, $context);
        }, $words);
        $holder = self::section($blocks, $holder);
        $replaced = Tree::blockAt($blocks, $holder);
        // A column only stands in columns, so the cover goes inside it.
        if ($replaced['blockName'] === 'core/column') {
            $cover = self::cover(Tree::blockAt($blocks, $pictures[0]), $replaced, $words, false);
            return [
                'blocks' => Tree::withChildren($blocks, $holder, [$cover]),
                'at' => $holder,
                'block' => array_merge($holder, [0]),
            ];
        }

        $parent = array_slice($holder, 0, -1);
        $children = Tree::children($blocks, $parent);
        $children[(int) end($holder)] = self::cover(Tree::blockAt($blocks, $pictures[0]), $replaced, $words, true);
        return [
            'blocks' => Tree::withChildren($blocks, $parent, $children),
            'at' => $parent,
            'block' => $holder,
        ];
    }

    private static function isPicture(array $block)
    {
        $attrs = $block['attrs'];
        switch ($block['blockName']) {
            case 'core/image':
                return self::pictureOf($block) !== null;
            case 'core/cover':
                return !empty($attrs['url']) && ($attrs['backgroundType'] ?? 'image') === 'image';
            case 'core/media-text':
                return ($attrs['mediaType'] ?? 'image') === 'image' && self::pictureOf($block) !== null;
        }

        return false;
    }

    // A cover keeps its picture in its attributes; an image, or media and text, in its markup.
    private static function pictureOf(array $block)
    {
        $attrs = $block['attrs'];
        if ($block['blockName'] === 'core/cover') {
            return [
                'url' => (string) $attrs['url'],
                'alt' => (string) ($attrs['alt'] ?? ''),
                'id' => $attrs['id'] ?? null,
                'focal' => $attrs['focalPoint'] ?? null,
            ];
        }

        $tags = new \WP_HTML_Tag_Processor((string) $block['innerHTML']);
        if (!$tags->next_tag('img') || !$tags->get_attribute('src')) {
            return null;
        }

        return [
            'url' => (string) $tags->get_attribute('src'),
            'alt' => (string) $tags->get_attribute('alt'),
            'id' => $attrs['id'] ?? $attrs['mediaId'] ?? null,
            'focal' => $attrs['focalPoint'] ?? null,
        ];
    }

    private static function picturesIn(array $block, array $at)
    {
        if (self::isPicture($block)) {
            return [$at];
        }

        $found = [];
        foreach (array_values(Tree::named($block['innerBlocks'])) as $index => $child) {
            $found = array_merge($found, self::picturesIn($child, array_merge($at, [$index])));
        }

        return $found;
    }

    // The blocks to put on the picture; layout and spacers stay behind.
    private static function words(array $block, array $at, array $picture)
    {
        $found = [];
        foreach (array_values(Tree::named($block['innerBlocks'])) as $index => $child) {
            $path = array_merge($at, [$index]);
            $isPicture = self::same($path, $picture);
            if ($child['blockName'] === 'core/spacer' || ($isPicture && $child['blockName'] === 'core/image')) {
                continue;
            }

            // A cover or media and text holds words of its own, which go on the picture too.
            $opened = $isPicture || self::opens($child) || self::within($picture, $path);
            $found = array_merge($found, $opened ? self::words($child, $path, $isPicture ? [] : $picture) : [$child]);
        }

        return $found;
    }

    // A card's background would hide the picture, so groups open; a plain row of blocks stays.
    private static function opens(array $block)
    {
        if (in_array($block['blockName'], self::OPENED, true)) {
            return true;
        }

        $attrs = $block['attrs'];
        $filled = !empty($attrs['backgroundColor']) || !empty($attrs['gradient'])
            || !empty($attrs['style']['color']['background']) || !empty($attrs['style']['color']['gradient']);
        $layout = $attrs['layout'] ?? [];
        $row = ($layout['type'] ?? '') === 'flex' && ($layout['orientation'] ?? 'horizontal') !== 'vertical';
        return $block['blockName'] === 'core/group'
            && ($filled || !$row || count(Tree::named($block['innerBlocks'])) < 2);
    }

    private static function wordsAround(array $blocks, array $picture)
    {
        for ($holder = array_slice($picture, 0, -1); $holder; $holder = array_slice($holder, 0, -1)) {
            if (self::words(Tree::blockAt($blocks, $holder), $holder, $picture)) {
                return $holder;
            }
        }

        return null;
    }

    // A part alone in its section takes the section's place, across the page.
    private static function section(array $blocks, array $holder)
    {
        while (count($holder) > 1) {
            $parent = array_slice($holder, 0, -1);
            $alone = count(Tree::children($blocks, $parent)) === 1;
            if (!$alone || Tree::blockAt($blocks, $parent)['blockName'] !== 'core/group') {
                break;
            }

            $holder = $parent;
        }

        return $holder;
    }

    // Centered, and in the cover's white rather than a color of their own.
    private static function onPicture(array $block, array $context)
    {
        $styles = [];
        if (in_array($block['blockName'], self::CENTERED, true)) {
            $styles['text_align'] = 'center';
            if (!empty($block['attrs']['textColor']) || !empty($block['attrs']['style']['color']['text'])) {
                $styles['text_color'] = null;
            }
        }

        if ($block['blockName'] === 'core/buttons') {
            $styles['justification'] = 'center';
        }

        if ($styles) {
            $styled = Style::apply([$block], [0], ['styles' => $styles], $context);
            if (!\is_wp_error($styled)) {
                $block = array_values(Tree::named($styled['blocks']))[0];
            }
        }

        foreach ($block['innerBlocks'] as $key => $inner) {
            if (!empty($inner['blockName'])) {
                $block['innerBlocks'][$key] = self::onPicture($inner, $context);
            }
        }

        return $block;
    }

    // Written as the cover's save writes it, so the editor reads it as valid.
    private static function cover(array $picture, array $replaced, array $words, $wide)
    {
        $from = self::pictureOf($picture);
        $attrs = ['url' => $from['url']];
        if (is_numeric($from['id'])) {
            $attrs['id'] = (int) $from['id'];
        }

        if ($from['alt'] !== '') {
            $attrs['alt'] = $from['alt'];
        }

        $attrs['dimRatio'] = self::DIM;
        $focal = is_array($from['focal']) && isset($from['focal']['x'], $from['focal']['y']) ? $from['focal'] : null;
        if ($focal) {
            $attrs['focalPoint'] = ['x' => (float) $focal['x'], 'y' => (float) $focal['y']];
        }

        $height = $picture['blockName'] === 'core/cover' ? ($picture['attrs']['minHeight'] ?? null) : null;
        // A share of its column's height measures nothing once the cover runs the page's width.
        if (is_numeric($height) && ($picture['attrs']['minHeightUnit'] ?? 'px') !== '%') {
            $attrs['minHeight'] = $height + 0;
            if (!empty($picture['attrs']['minHeightUnit'])) {
                $attrs['minHeightUnit'] = (string) $picture['attrs']['minHeightUnit'];
            }
        }

        if ($wide) {
            $attrs['align'] = 'full';
        }

        $style = [];
        // The section's room around its words stays, and the cover keeps only the margins it supports.
        if ($replaced['blockName'] === 'core/group') {
            $spacing = $replaced['attrs']['style']['spacing'] ?? [];
            if (!empty($spacing['padding'])) {
                $style['spacing']['padding'] = $spacing['padding'];
            }

            $margin = array_intersect_key((array) ($spacing['margin'] ?? []), ['top' => 1, 'bottom' => 1]);
            if ($margin) {
                $style['spacing']['margin'] = $margin;
            }
        }

        // Rounded corners read as a card, not a section across the page.
        if ($wide) {
            $style['border']['radius'] = '0px';
        }

        if ($style) {
            $attrs['style'] = $style;
        }

        $attrs['layout'] = ['type' => 'constrained'];
        $css = $style ? (string) (\wp_style_engine_get_styles($style)['css'] ?? '') : '';
        if (isset($attrs['minHeight'])) {
            $css = rtrim($css, ';') . ($css === '' ? '' : ';') . 'min-height:' . $attrs['minHeight']
                . ($attrs['minHeightUnit'] ?? 'px');
        }

        $position = $focal ? round($focal['x'] * 100) . '% ' . round($focal['y'] * 100) . '%' : null;
        $open = '<div class="' . ($wide ? 'wp-block-cover alignfull' : 'wp-block-cover') . '"'
            . ($css === '' ? '' : ' style="' . \esc_attr($css) . '"') . '>'
            . '<img class="wp-block-cover__image-background' . (isset($attrs['id']) ? ' wp-image-' . $attrs['id'] : '')
            . '" alt="' . \esc_attr($from['alt']) . '" src="' . \esc_attr($from['url']) . '"'
            . ($position ? ' style="object-position:' . $position . '"' : '')
            . ' data-object-fit="cover"'
            . ($position ? ' data-object-position="' . $position . '"' : '') . '/>'
            . '<span aria-hidden="true" class="wp-block-cover__background has-background-dim"></span>'
            . '<div class="wp-block-cover__inner-container">';
        $block = [
            'blockName' => 'core/cover',
            'attrs' => $attrs,
            'innerBlocks' => array_values($words),
            'innerHTML' => $open . '</div></div>',
            'innerContent' => array_merge([$open], array_fill(0, count($words), null), ['</div></div>']),
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
        return $of && self::same(array_slice($path, 0, count($of)), $of);
    }
}

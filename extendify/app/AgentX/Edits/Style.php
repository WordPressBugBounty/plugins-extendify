<?php

/**
 * Change a block's style.
 */

namespace Extendify\AgentX\Edits;

use Extendify\AgentX\Presets;
use Extendify\AgentX\SectionEdges;
use Extendify\AgentX\SectionLooks;
use Extendify\AgentX\Vibes;

defined('ABSPATH') || die('No direct access.');

/**
 * Sets a block's colors, type, spacing, border and the like, through the block supports it declares.
 */
class Style extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'style';
    // Each setting, the block support that turns it on, and the theme presets its value may name.
    const SETTINGS = [
        'text_color' => [['color', 'text'], 'color'],
        'background_color' => [['color', 'background'], 'color'],
        'gradient' => [['color', 'gradients'], 'gradient'],
        'link_color' => [['color', 'link'], 'color'],
        'heading_color' => [['color', 'heading'], 'color'],
        'button_color' => [['color', 'button'], 'color'],
        'font_size' => [['typography', 'fontSize'], 'font-size'],
        'font_family' => [['typography', '__experimentalFontFamily'], 'font-family'],
        'line_height' => [['typography', 'lineHeight'], null],
        'font_weight' => [['typography', '__experimentalFontWeight'], null],
        'font_style' => [['typography', '__experimentalFontStyle'], null],
        'letter_spacing' => [['typography', '__experimentalLetterSpacing'], null],
        'text_transform' => [['typography', '__experimentalTextTransform'], null],
        'text_decoration' => [['typography', '__experimentalTextDecoration'], null],
        'text_align' => [['typography', 'textAlign'], null],
        'padding' => [['spacing', 'padding'], 'spacing'],
        'margin' => [['spacing', 'margin'], 'spacing'],
        'block_gap' => [['spacing', 'blockGap'], 'spacing'],
        'border_color' => [['__experimentalBorder', 'color'], 'color'],
        'border_width' => [['__experimentalBorder', 'width'], null],
        'border_style' => [['__experimentalBorder', 'style'], null],
        'border_radius' => [['__experimentalBorder', 'radius'], null],
        'shadow' => [['shadow'], 'shadow'],
        'min_height' => [['dimensions', 'minHeight'], null],
        'heading_level' => [null, null],
        'justification' => [null, null],
        'columns' => [null, null],
        'height' => [null, null],
        'icon_color' => [null, null],
        'overlay_text_color' => [null, null],
        'overlay_background_color' => [null, null],
        'duotone' => [null, null],
        'icon_size' => [null, null],
        'vertical_alignment' => [null, null],
        'overlay' => [null, null],
        'width' => [null, null],
        'align' => [null, null],
        'block_style' => [null, null],
        'section_edges' => [null, null],
        'aspect_ratio' => [null, null],
        'overlay_color' => [null, null],
    ];
    const FILTERED = ['core/site-logo', 'core/image', 'core/cover'];
    // Where a block draws the supports it skips on its wrapper, found by class or by tag.
    const INNER = [
        'core/button' => ['class_name' => 'wp-block-button__link'],
        'core/image' => ['tag_name' => 'img'],
    ];
    const WORDS = [
        'font_style' => ['normal', 'italic'],
        'text_transform' => ['none', 'uppercase', 'lowercase', 'capitalize'],
        'text_decoration' => ['none', 'underline', 'line-through'],
        'text_align' => ['left', 'center', 'right', 'justify'],
        'border_style' => ['none', 'solid', 'dashed', 'dotted', 'double'],
        'font_weight' => ['100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold'],
        'justification' => ['left', 'center', 'right', 'space-between'],
        'icon_size' => ['small', 'normal', 'large', 'huge'],
        'vertical_alignment' => ['top', 'center', 'bottom'],
    ];
    const LENGTH = '/^(0|-?\d*\.?\d+(px|em|rem|%|vh|vw|vmin|vmax|svh|dvh|ch|ex)'
        . '|(clamp|calc|min|max)\([0-9a-z.%+\-*\/, ()]+\))$/i';
    const NUMBER = '/^\d*\.?\d+$/';
    const COLOR = '/^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla)\([0-9.%, \/deg]+\)|transparent|currentcolor)$/i';
    const GRADIENT = '/^(linear|radial)-gradient\([0-9a-z.%#, ()\/-]+\)$/i';
    const SIDES = ['top', 'right', 'bottom', 'left'];
    // Where each block keeps its vertical alignment, and the class its save writes for it.
    const VERTICAL = [
        'core/columns' => 'are-vertically-aligned-',
        'core/column' => 'is-vertically-aligned-',
        'core/media-text' => 'is-vertically-aligned-',
    ];
    const CORNERS = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    // The shapes the block editor offers an image.
    const RATIOS = ['1', '4/3', '3/4', '3/2', '2/3', '16/9', '9/16'];
    const SHAPED = ['core/image', 'core/cover', 'core/post-featured-image'];
    // The menu has no color supports; it draws these attributes itself as it renders.
    const MENU_COLORS = [
        'text_color' => ['textColor', 'customTextColor'],
        'background_color' => ['backgroundColor', 'customBackgroundColor'],
        // Overlay is the full-screen menu phones open.
        'overlay_text_color' => ['overlayTextColor', 'customOverlayTextColor'],
        'overlay_background_color' => ['overlayBackgroundColor', 'customOverlayBackgroundColor'],
    ];
    // WPForms keeps a form's colors in its own attributes, as real colors, since it works out shades from them.
    const FORM_COLORS = [
        'button_color' => ['buttonBackgroundColor'],
        'text_color' => ['labelColor', 'labelSublabelColor'],
        'background_color' => ['backgroundColor'],
        'border_color' => ['fieldBorderColor'],
    ];
    const FORM = 'wpforms/form-selector';
    // A menu link has no color support either; its color is the inline one WordPress's color format writes.
    const MENU_LINKS = ['core/navigation-link', 'core/navigation-submenu'];
    const INLINE_COLOR = '#^<mark\\b[^>]*\\bhas-inline-color\\b[^>]*>(.*)</mark>$#s';
    const SUPPORTS = [
        'wp_apply_colors_support',
        'wp_apply_typography_support',
        'wp_apply_spacing_support',
        'wp_apply_border_support',
        'wp_apply_shadow_support',
        'wp_apply_dimensions_support',
        'wp_apply_alignment_support',
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $block = Tree::blockAt($blocks, $path);
        $styles = $args['styles'] ?? null;
        $readable = is_array($args['readable'] ?? null) ? $args['readable'] : null;
        if (!is_array($styles) || (!$styles && !$readable)) {
            return self::refuse('bad_args', 'Send the settings to change.');
        }

        $type = \WP_Block_Type_Registry::get_instance()->get_registered($block['blockName']);
        if (!$type) {
            return self::refuse('unsupported', 'This block has no settings the agent can change.');
        }

        $attrs = $block['attrs'];
        foreach ($styles as $setting => $value) {
            $refused = self::refusal($type, $block, (string) $setting);
            if ($refused) {
                return $refused;
            }

            $attrs = self::set($attrs, (string) $setting, $value, $block['blockName']);
            if (\is_wp_error($attrs)) {
                return $attrs;
            }
        }

        if ($styles) {
            $changed = array_merge($block, ['attrs' => self::pruned($attrs)]);
            if (self::hasMarkup($block)) {
                $changed = self::restyled($type, $block, $changed);
            }

            $blocks = Tree::setAt($blocks, $path, $changed);
        }

        if ($readable) {
            $blocks = Readable::apply($blocks, $path, $readable);
        }

        return ['blocks' => $blocks, 'at' => $path, 'block' => $path];
    }

    /**
     * Extendable gives every custom logo its own dark two-color filter as it renders, so one the agent set
     * for a dark background is put back after it.
     *
     * @param array $parsed The block as the filters before this one left it.
     * @param array $source The block as saved.
     * @return array
     */
    public static function ownDuotone($parsed, $source)
    {
        $own = $source['attrs']['style']['color']['duotone'] ?? null;
        if (($parsed['blockName'] ?? '') !== 'core/site-logo' || !is_array($own)) {
            return $parsed;
        }

        $parsed['attrs']['style']['color']['duotone'] = $own;
        return $parsed;
    }

    /**
     * Extendable's CSS also forces its filter onto custom logo images, so the logo's own goes on the image itself.
     *
     * @param string $html  The rendered logo.
     * @param array  $block The block as rendered.
     * @return string
     */
    public static function ownDuotoneOnImage($html, $block)
    {
        $own = $block['attrs']['style']['color']['duotone'] ?? null;
        if (!is_array($own) || !preg_match('/\bwp-duotone-[a-z0-9-]+/', (string) $html, $match)) {
            return $html;
        }

        $tags = new \WP_HTML_Tag_Processor($html);
        if (!$tags->next_tag('img')) {
            return $html;
        }

        $tags->set_attribute('style', "filter:url(#{$match[0]})");
        return $tags->get_updated_html();
    }

    // Putting back a change's attributes needs the markup the editor would save for them.
    public static function reattributed(array $block, array $attrs)
    {
        $type = \WP_Block_Type_Registry::get_instance()->get_registered($block['blockName']);
        $changed = array_merge($block, ['attrs' => self::pruned($attrs)]);
        return $type && self::hasMarkup($block) ? self::restyled($type, $block, $changed) : $changed;
    }

    private static function refusal(\WP_Block_Type $type, array $block, $setting)
    {
        if (!array_key_exists($setting, self::SETTINGS)) {
            return self::refuse('unsupported', "No setting is named {$setting}.");
        }

        if ($setting === 'text_color' && in_array($block['blockName'], self::MENU_LINKS, true)) {
            return null;
        }

        if ($block['blockName'] === 'core/navigation' && isset(self::MENU_COLORS[$setting])) {
            return null;
        }

        if ($block['blockName'] === self::FORM) {
            return isset(self::FORM_COLORS[$setting])
                ? null
                : self::refuse('unsupported', 'A form changes only its colors here.');
        }

        if (in_array($setting, ['overlay_text_color', 'overlay_background_color'], true)) {
            return self::refuse('unsupported', 'Only a menu opens full-screen on phones.');
        }

        if ($setting === 'heading_level') {
            return $block['blockName'] === 'core/heading'
                ? null
                : self::refuse('unsupported', 'Only a heading has a level.');
        }

        if ($setting === 'columns') {
            return (($block['attrs']['layout']['type'] ?? null) === 'grid')
                ? null
                : self::refuse('unsupported', 'Only a grid has a number of columns.');
        }

        if (in_array($setting, ['icon_color', 'icon_size'], true)) {
            return $block['blockName'] === 'core/social-links'
                ? null
                : self::refuse('unsupported', 'Only a row of social icons has icons to change.');
        }

        if ($setting === 'duotone') {
            return in_array($block['blockName'], self::FILTERED, true)
                ? null
                : self::refuse('unsupported', 'Only a picture or a logo takes a two-color filter.');
        }

        if ($setting === 'vertical_alignment') {
            return isset(self::VERTICAL[$block['blockName']]) || $block['blockName'] === 'core/cover'
                ? null
                : self::refuse('unsupported', 'This block has no vertical alignment.');
        }

        if ($setting === 'width') {
            return in_array($block['blockName'], ['core/image', 'core/column', 'core/site-logo', 'core/button'], true)
                ? null
                : self::refuse('unsupported', 'This block has no width of its own.');
        }

        if ($setting === 'align') {
            return self::alignments($type) === []
                ? self::refuse('unsupported', 'This block has no alignment of its own.')
                : null;
        }

        if ($setting === 'block_style') {
            return $block['blockName'] === 'core/button'
                ? null
                : self::refuse('unsupported', 'Only a button switches between filled and outlined.');
        }

        if ($setting === 'section_edges') {
            return $block['blockName'] === 'core/group'
                ? null
                : self::refuse('unsupported', 'Only a section has edges its style draws.');
        }

        if ($setting === 'aspect_ratio') {
            return in_array($block['blockName'], self::SHAPED, true)
                ? null
                : self::refuse('unsupported', 'Only an image, a cover or a featured image has a shape of its own.');
        }

        if ($setting === 'overlay_color') {
            return $block['blockName'] === 'core/cover'
                ? null
                : self::refuse('unsupported', 'Only a cover has an overlay color.');
        }

        if ($setting === 'overlay') {
            return in_array($block['blockName'], ['core/cover', 'core/post-featured-image'], true)
                ? null
                : self::refuse('unsupported', 'Only a cover or a featured image has an overlay.');
        }

        if ($setting === 'height') {
            return $block['blockName'] === 'core/spacer'
                ? null
                : self::refuse('unsupported', 'Only a spacer has a height of its own.');
        }

        if ($setting === 'justification') {
            return self::row($type) === null
                ? self::refuse('unsupported', 'Only a row of blocks lines them up.')
                : null;
        }

        list($feature) = self::SETTINGS[$setting];
        if (!self::supports($type, $feature) && !self::alignsByAttribute($type, $setting)) {
            return self::refuse('unsupported', "This block has no {$setting} setting.");
        }

        $skipped = \wp_should_skip_block_supports_serialization($type, $feature[0], $feature[1] ?? null);
        if ($skipped && self::hasMarkup($block) && !isset(self::INNER[$block['blockName']])) {
            return self::refuse('unsupported', "This block draws its {$setting} in a way the agent can't change.");
        }

        return null;
    }

    private static function supports(\WP_Block_Type $type, array $feature)
    {
        $group = $type->supports[$feature[0]] ?? false;
        if (!isset($feature[1])) {
            return !empty($group);
        }

        if ($group === true) {
            return in_array($feature[1], ['text', 'background'], true);
        }

        if (!is_array($group)) {
            return false;
        }

        // Text and background colors are on unless a block turns them off.
        $default = $feature[0] === 'color' && in_array($feature[1], ['text', 'background'], true);
        $on = $group[$feature[1]] ?? $default;
        return !empty($on);
    }

    // A row the editor lets the user justify: its layout's default type, which layout rendering reads at draw time.
    private static function row(\WP_Block_Type $type)
    {
        $layout = $type->supports['layout'] ?? $type->supports['__experimentalLayout'] ?? null;
        if (!is_array($layout) || ($layout['default']['type'] ?? null) !== 'flex') {
            return null;
        }

        $locked = ($layout['allowJustification'] ?? true) === false || ($layout['allowEditing'] ?? true) === false;
        return $locked ? null : 'flex';
    }

    // A block says which alignments it takes: true for every one, or the list it allows.
    // A cover, group, columns or media-text goes full width this way, as an image does.
    private static function alignments(\WP_Block_Type $type)
    {
        $align = $type->supports['align'] ?? false;
        if ($align === true) {
            return ['left', 'right', 'center', 'wide', 'full'];
        }

        return is_array($align) ? array_values($align) : [];
    }

    // set() is handed the block's name, so the value's own check reads the type again.
    private static function alignmentsOf($name)
    {
        $type = \WP_Block_Type_Registry::get_instance()->get_registered($name);
        return $type ? self::alignments($type) : [];
    }

    // Before the typography support, headings and paragraphs aligned through an attribute of their own.
    private static function alignsByAttribute(\WP_Block_Type $type, $setting)
    {
        return $setting === 'text_align' && self::alignAttribute($type) !== null;
    }

    private static function alignAttribute(\WP_Block_Type $type)
    {
        if (self::supports($type, ['typography', 'textAlign'])) {
            return null;
        }

        foreach (['textAlign', 'align'] as $name) {
            if (isset($type->attributes[$name]) && in_array($type->name, ['core/heading', 'core/paragraph'], true)) {
                return $name;
            }
        }

        return null;
    }

    private static function set(array $attrs, $setting, $value, $name)
    {
        if ($setting === 'text_color' && in_array($name, self::MENU_LINKS, true)) {
            return self::linkColor($attrs, $value);
        }

        if ($name === 'core/navigation' && isset(self::MENU_COLORS[$setting])) {
            return self::menuColor($attrs, $value, $setting);
        }

        if ($name === self::FORM) {
            return self::formColor($attrs, $value, $setting);
        }

        $clear = $value === null || $value === '';
        switch ($setting) {
            case 'text_color':
                return self::colorOf($attrs, $value, 'textColor', ['color', 'text']);
            case 'background_color':
                $attrs = SectionLooks::kept($attrs, $name, $clear ? null : $value);
                $attrs = self::without($attrs, ['gradient'], ['color', 'gradient']);
                $attrs = self::colorOf($attrs, $value, 'backgroundColor', ['color', 'background']);
                return \is_wp_error($attrs) ? $attrs : self::forced($attrs, $name);
            case 'border_color':
                return self::colorOf($attrs, $value, 'borderColor', ['border', 'color']);
            case 'gradient':
                $attrs = self::without($attrs, ['backgroundColor'], ['color', 'background']);
                $path = ['color', 'gradient'];
                return self::presetOrCustom($attrs, $value, 'gradient', $path, 'gradient', self::GRADIENT);
            case 'link_color':
                return self::elementColor($attrs, $value, ['elements', 'link', 'color', 'text'], $setting);
            case 'heading_color':
                return self::elementColor($attrs, $value, ['elements', 'heading', 'color', 'text'], $setting);
            case 'button_color':
                return self::elementColor($attrs, $value, ['elements', 'button', 'color', 'background'], $setting);
            case 'font_size':
                $path = ['typography', 'fontSize'];
                return self::presetOrCustom($attrs, $value, 'fontSize', $path, 'font-size', self::LENGTH);
            case 'font_family':
                if ($clear) {
                    return self::without($attrs, ['fontFamily'], ['typography', 'fontFamily']);
                }

                return self::presetSlug($value, 'font-family') === null
                    ? self::badValue($setting)
                    : array_merge(self::without($attrs, [], ['typography', 'fontFamily']), ['fontFamily' => $value]);
            case 'line_height':
                $unitless = is_string($value) && preg_match(self::NUMBER, $value);
                $pattern = $unitless ? self::NUMBER : self::LENGTH;
                return self::plain($attrs, $value, ['typography', 'lineHeight'], $pattern, $setting);
            case 'letter_spacing':
                return self::plain($attrs, $value, ['typography', 'letterSpacing'], self::LENGTH, $setting);
            case 'min_height':
                return self::plain($attrs, $value, ['dimensions', 'minHeight'], self::LENGTH, $setting);
            case 'border_width':
                return self::plain($attrs, $value, ['border', 'width'], self::LENGTH, $setting);
            case 'font_weight':
            case 'font_style':
            case 'text_transform':
            case 'text_decoration':
            case 'border_style':
                $key = [
                    'font_weight' => ['typography', 'fontWeight'],
                    'font_style' => ['typography', 'fontStyle'],
                    'text_transform' => ['typography', 'textTransform'],
                    'text_decoration' => ['typography', 'textDecoration'],
                    'border_style' => ['border', 'style'],
                ][$setting];
                return self::word($attrs, $value, $key, $setting);
            case 'text_align':
                $type = \WP_Block_Type_Registry::get_instance()->get_registered($name);
                $own = self::alignAttribute($type);
                if ($own === null) {
                    return self::word($attrs, $value, ['typography', 'textAlign'], $setting);
                }

                if ($clear) {
                    return self::without($attrs, [$own], []);
                }

                return in_array($value, self::WORDS['text_align'], true)
                    ? array_merge($attrs, [$own => $value])
                    : self::badValue($setting);
            case 'padding':
            case 'margin':
            case 'block_gap':
                $key = ['padding' => 'padding', 'margin' => 'margin', 'block_gap' => 'blockGap'][$setting];
                return self::spacing($attrs, $value, $key, $setting);
            case 'border_radius':
                return self::radius($attrs, $value);
            case 'shadow':
                if ($clear) {
                    return self::without($attrs, [], ['shadow']);
                }

                $ref = self::presetRef($value, 'shadow');
                return $ref === null ? self::badValue($setting) : self::with($attrs, ['shadow'], $ref);
            case 'vertical_alignment':
                if ($name === 'core/cover') {
                    $across = explode(' ', $attrs['contentPosition'] ?? 'center center')[1] ?? 'center';
                    $attrs = self::without($attrs, ['contentPosition'], []);
                    if ($clear) {
                        return $attrs;
                    }

                    if (!in_array($value, self::WORDS['vertical_alignment'], true)) {
                        return self::badValue($setting);
                    }

                    $position = "{$value} {$across}";
                    return $position === 'center center'
                        ? $attrs
                        : array_merge($attrs, ['contentPosition' => $position]);
                }

                if ($clear) {
                    return self::without($attrs, ['verticalAlignment'], []);
                }

                return in_array($value, self::WORDS['vertical_alignment'], true)
                    ? array_merge($attrs, ['verticalAlignment' => $value])
                    : self::badValue($setting);
            case 'width':
                if ($name === 'core/button') {
                    return self::buttonWidth($attrs, $clear ? null : $value, $setting);
                }

                if ($clear) {
                    return self::without($attrs, ['width'], []);
                }

                if ($name === 'core/site-logo') {
                    $pixels = preg_match('/^(\d+)(px)?$/', (string) $value, $match) ? (int) $match[1] : 0;
                    return $pixels > 0 && $pixels <= 2000
                        ? array_merge($attrs, ['width' => $pixels])
                        : self::badValue($setting);
                }

                return preg_match(self::LENGTH, (string) $value) && self::safe($value)
                    ? array_merge($attrs, ['width' => (string) $value])
                    : self::badValue($setting);
            case 'align':
                if ($clear || $value === 'none') {
                    return self::without($attrs, ['align'], []);
                }

                if (!in_array($value, self::alignmentsOf($name), true)) {
                    return self::badValue($setting);
                }

                // WordPress sizes a wide or full block by its row; a width of its own keeps it narrower.
                if (in_array($value, ['wide', 'full'], true)) {
                    return array_merge(self::without($attrs, ['width', 'height'], []), ['align' => $value]);
                }

                // Left, right and center float the block in its column, which its own width still sizes.
                return array_merge($attrs, ['align' => $value]);
            case 'block_style':
                return self::buttonStyle($attrs, $value);
            case 'section_edges':
                return self::sectionEdges($attrs, $value);
            case 'aspect_ratio':
                if (!$clear && !in_array($value, self::RATIOS, true)) {
                    return self::badValue($setting);
                }

                // A cover keeps its own height under a shape, so taking the shape off brings that height back.
                if ($name === 'core/cover') {
                    return $clear
                        ? self::without($attrs, [], ['dimensions', 'aspectRatio'])
                        : self::with($attrs, ['dimensions', 'aspectRatio'], $value);
                }

                // A featured image fits its picture to the shape by default, so only an image takes the fit off.
                if ($clear) {
                    $fit = $name === 'core/image' ? ['scale'] : [];
                    return self::without($attrs, array_merge(['aspectRatio'], $fit), []);
                }

                // A set height would hold the picture to its old shape, and without a fit it stretches to the new one.
                $attrs = self::without($attrs, ['height'], []);
                return $name === 'core/image'
                    ? array_merge($attrs, ['aspectRatio' => $value, 'scale' => $attrs['scale'] ?? 'cover'])
                    : array_merge($attrs, ['aspectRatio' => $value]);
            case 'overlay_color':
                $attrs = self::without($attrs, ['overlayColor', 'customOverlayColor'], []);
                if ($clear) {
                    return $attrs;
                }

                // Set by hand, the editor stops working one out from the next image.
                $attrs['isUserOverlayColor'] = true;
                if (self::presetSlug($value, 'color') !== null) {
                    return array_merge($attrs, ['overlayColor' => (string) $value]);
                }

                return preg_match(self::COLOR, (string) $value) && self::safe($value)
                    ? array_merge($attrs, ['customOverlayColor' => (string) $value])
                    : self::badValue($setting);
            case 'overlay':
                if ($clear) {
                    return self::without($attrs, ['dimRatio'], []);
                }

                $ratio = is_numeric($value) ? (int) $value : -1;
                return $ratio < 0 || $ratio > 100
                    ? self::badValue($setting)
                    : array_merge($attrs, ['dimRatio' => $ratio]);
            case 'duotone':
                $attrs = self::without($attrs, [], ['color', 'duotone']);
                if ($clear) {
                    // Removed, the block would show the filter the site's styles give every block of its kind.
                    // For a path the styles lack, wp_get_global_styles returns all of them, not null.
                    $inherited = \wp_get_global_styles([], ['block_name' => $name])['filter']['duotone'] ?? null;
                    return $inherited ? self::with($attrs, ['color', 'duotone'], 'unset') : $attrs;
                }

                $slug = self::presetSlug($value, 'duotone');
                if ($slug !== null) {
                    return self::with($attrs, ['color', 'duotone'], "var:preset|duotone|{$slug}");
                }

                $pair = is_array($value) ? array_values($value) : [];
                $valid = count($pair) === 2 && count(array_filter($pair, function ($color) {
                    return is_string($color) && preg_match('/^#[0-9a-f]{3,8}$/i', $color);
                })) === 2;
                return $valid ? self::with($attrs, ['color', 'duotone'], $pair) : self::badValue($setting);
            case 'icon_color':
                $attrs = self::without($attrs, ['iconColor', 'customIconColor', 'iconColorValue'], []);
                if ($clear) {
                    return $attrs;
                }

                $slug = self::presetSlug($value, 'color');
                $tint = Presets::isTint($value) ? "var(--wp--custom--color--{$value})" : null;
                // A design style that forces the icons' color hides this inline one unless it is !important too.
                $forced = self::forcesIcons($attrs, $name) ? ' !important' : '';
                if ($slug !== null || $tint !== null) {
                    // Each icon writes this inline; a variable follows the site's active colors, a hex wouldn't.
                    return array_merge($attrs, array_filter([
                        'iconColor' => $slug,
                        'iconColorValue' => ($tint ?? "var(--wp--preset--color--{$slug})") . $forced,
                    ]));
                }

                return preg_match(self::COLOR, (string) $value) && self::safe($value)
                    ? array_merge($attrs, [
                        'customIconColor' => (string) $value,
                        'iconColorValue' => $value . $forced,
                    ])
                    : self::badValue($setting);
            case 'icon_size':
                if ($clear) {
                    return self::without($attrs, ['size'], []);
                }

                return in_array($value, self::WORDS['icon_size'], true)
                    ? array_merge($attrs, ['size' => "has-{$value}-icon-size"])
                    : self::badValue($setting);
            case 'height':
                if ($value === null || $value === '') {
                    return self::without($attrs, ['height'], []);
                }

                $height = self::presetRef($value, 'spacing')
                    ?? (preg_match(self::LENGTH, (string) $value) && self::safe($value) ? (string) $value : null);
                return $height === null ? self::badValue($setting) : array_merge($attrs, ['height' => $height]);
            case 'justification':
                $type = \WP_Block_Type_Registry::get_instance()->get_registered($name);
                $layout = $attrs['layout'] ?? [];
                if ($value === null || $value === '') {
                    unset($layout['justifyContent']);
                    return $layout ? array_merge($attrs, ['layout' => $layout]) : self::without($attrs, ['layout'], []);
                }

                if (!in_array($value, self::WORDS['justification'], true)) {
                    return self::badValue($setting);
                }

                $layout['type'] = $layout['type'] ?? self::row($type);
                $layout['justifyContent'] = $value;
                return array_merge($attrs, ['layout' => $layout]);
            case 'columns':
                $layout = $attrs['layout'] ?? [];
                if ($value === null || $value === '') {
                    unset($layout['columnCount']);
                    return array_merge($attrs, ['layout' => $layout]);
                }

                $count = (int) $value;
                if ($count < 1 || $count > 6) {
                    return self::badValue($setting);
                }

                $layout = self::fitted($layout, $count);
                $layout['columnCount'] = $count;
                return array_merge($attrs, ['layout' => $layout]);
            case 'heading_level':
                $level = (int) $value;
                if ($level < 1 || $level > 6) {
                    return self::badValue($setting);
                }

                return $level === 2 ? self::without($attrs, ['level'], []) : array_merge($attrs, ['level' => $level]);
        }

        return self::badValue($setting);
    }

    // A color for the links, headings or buttons inside the block, drawn by the elements support when it renders.
    private static function elementColor(array $attrs, $value, array $path, $setting)
    {
        if ($value === null || $value === '') {
            return self::without($attrs, [], $path);
        }

        $color = self::presetRef($value, 'color') ?? (preg_match(self::COLOR, (string) $value) ? $value : null);
        return $color === null ? self::badValue($setting) : self::with($attrs, $path, $color);
    }

    private static function linkColor(array $attrs, $value)
    {
        $label = preg_replace(self::INLINE_COLOR, '$1', (string) ($attrs['label'] ?? ''));
        if ($value === null || $value === '') {
            return array_merge($attrs, ['label' => $label]);
        }

        $slug = self::presetSlug($value, 'color');
        if ($slug !== null) {
            // The link renders its label through kses, whose CSS filter drops rgba(); transparent survives it.
            $mark = '<mark style="background-color:transparent" class="has-inline-color has-' . $slug . '-color">';
            return array_merge($attrs, ['label' => $mark . $label . '</mark>']);
        }

        $color = Presets::isTint($value) ? "var(--wp--custom--color--{$value})" : (string) $value;
        if (!Presets::isTint($value) && (!preg_match(self::COLOR, $color) || !self::safe($color))) {
            return self::badValue('text_color');
        }

        $mark = '<mark style="background-color:transparent;color:' . $color . '" class="has-inline-color">';
        return array_merge($attrs, ['label' => $mark . $label . '</mark>']);
    }

    private static function formColor(array $attrs, $value, $setting)
    {
        $keys = self::FORM_COLORS[$setting];
        $attrs = self::without($attrs, $keys, []);
        if ($value === null || $value === '') {
            return $attrs;
        }

        $color = self::realColor($value);
        if ($color === null) {
            return self::badValue($setting);
        }

        // WPForms scopes a form's colors by the id its editor gives each block; without one it warns on the page.
        $id = ['clientId' => $attrs['clientId'] ?? \wp_generate_uuid4()];
        return array_merge($attrs, array_fill_keys($keys, $color), $id);
    }

    // A theme color or tint as the color it stands for, for a block that reads colors, not the theme's variables.
    private static function realColor($value)
    {
        foreach (Presets::current()['colors'] as $preset) {
            if ($preset['slug'] === $value) {
                $value = $preset['value'];
                break;
            }
        }

        return is_string($value) && preg_match(self::COLOR, $value) && self::safe($value) ? $value : null;
    }

    private static function menuColor(array $attrs, $value, $setting)
    {
        list($presetKey, $customKey) = self::MENU_COLORS[$setting];
        $attrs = self::without($attrs, [$presetKey, $customKey], []);
        if ($value === null || $value === '') {
            return $attrs;
        }

        $slug = self::presetSlug($value, 'color');
        if ($slug !== null) {
            return array_merge($attrs, [$presetKey => $slug]);
        }

        if (Presets::isTint($value)) {
            return array_merge($attrs, [$customKey => "var(--wp--custom--color--{$value})"]);
        }

        return preg_match(self::COLOR, (string) $value) && self::safe($value)
            ? array_merge($attrs, [$customKey => (string) $value])
            : self::badValue($setting);
    }

    private static function colorOf(array $attrs, $value, $presetKey, array $customPath)
    {
        if (!Presets::isTint($value)) {
            return self::presetOrCustom($attrs, $value, $presetKey, $customPath, 'color', self::COLOR);
        }

        $attrs = self::without($attrs, [$presetKey], $customPath);
        return self::with($attrs, $customPath, "var(--wp--custom--color--{$value})");
    }

    // A design style that sets its own background with !important hides the block's, so the block's wins the same way.
    private static function forced(array $attrs, $name)
    {
        $slug = $attrs['backgroundColor'] ?? null;
        $own = $attrs['style']['color']['background'] ?? null;
        $color = is_string($slug) ? "var(--wp--preset--color--{$slug})" : $own;
        if (!is_string($color) || $color === '' || !self::forcesBackground($attrs, $name)) {
            return $attrs;
        }

        $attrs = self::without($attrs, ['backgroundColor'], ['color', 'background']);
        return self::with($attrs, ['color', 'background'], "{$color} !important");
    }

    private static function forcesBackground(array $attrs, $name)
    {
        return self::styleForces($attrs, $name, function ($css) {
            return self::forcesOwn($css, 'background-color');
        });
    }

    private static function forcesIcons(array $attrs, $name)
    {
        return self::styleForces($attrs, $name, function ($css) {
            return (bool) preg_match('/&\s*\.wp-social-link\s*\{[^}]*(^|;|\s)color\s*:[^;}]*!important/i', $css);
        });
    }

    private static function styleForces(array $attrs, $name, callable $test)
    {
        foreach (preg_split('/\s+/', (string) ($attrs['className'] ?? ''), -1, PREG_SPLIT_NO_EMPTY) as $class) {
            if (strpos($class, 'is-style-') !== 0) {
                continue;
            }

            $css = \wp_get_global_styles(['blocks', $name, 'variations', substr($class, 9), 'css']);
            if (is_string($css) && $test($css)) {
                return true;
            }
        }

        return false;
    }

    // A rule on the block itself, like `&` or `&:nth-child(2n + 1)`, not on a block inside it.
    private static function forcesOwn($css, $property)
    {
        preg_match_all('/([^{}]+)\{([^{}]*)\}/', $css, $rules, PREG_SET_ORDER);
        foreach ($rules as $rule) {
            $selector = trim($rule[1]);
            do {
                $selector = preg_replace('/\([^()]*\)/', '', $selector, -1, $count);
            } while ($count);

            $declares = '/(^|;)\s*' . preg_quote($property, '/') . '\s*:[^;]*!important/i';
            if (preg_match('/^&[^\s>+~,]*$/', $selector) && preg_match($declares, $rule[2])) {
                return true;
            }
        }

        return false;
    }

    // A preset is a slug in its own attribute; a custom value sits in style, and each clears the other.
    private static function presetOrCustom(array $attrs, $value, $presetKey, array $customPath, $kind, $pattern)
    {
        $attrs = self::without($attrs, [$presetKey], $customPath);
        if ($value === null || $value === '') {
            return $attrs;
        }

        if (self::presetSlug($value, $kind) !== null) {
            return array_merge($attrs, [$presetKey => (string) $value]);
        }

        return preg_match($pattern, (string) $value) && self::safe($value)
            ? self::with($attrs, $customPath, (string) $value)
            : self::badValue($presetKey);
    }

    private static function plain(array $attrs, $value, array $path, $pattern, $setting)
    {
        if ($value === null || $value === '') {
            return self::without($attrs, [], $path);
        }

        return preg_match($pattern, (string) $value) && self::safe($value)
            ? self::with($attrs, $path, (string) $value)
            : self::badValue($setting);
    }

    private static function word(array $attrs, $value, array $path, $setting)
    {
        if ($value === null || $value === '') {
            return self::without($attrs, [], $path);
        }

        return in_array((string) $value, self::WORDS[$setting], true)
            ? self::with($attrs, $path, (string) $value)
            : self::badValue($setting);
    }

    // One value sets every side; an object sets only the sides it names.
    private static function spacing(array $attrs, $value, $key, $setting)
    {
        $path = ['spacing', $key];
        if ($value === null || $value === '') {
            return self::without($attrs, [], $path);
        }

        if ($key === 'blockGap') {
            $gap = self::spacingValue($value);
            return $gap === null ? self::badValue($setting) : self::with($attrs, $path, $gap);
        }

        $sides = is_array($value) ? $value : array_fill_keys(self::SIDES, $value);
        $current = $attrs['style']['spacing'][$key] ?? [];
        $current = is_array($current) ? $current : [];
        foreach ($sides as $side => $one) {
            if (!in_array($side, self::SIDES, true)) {
                return self::badValue($setting);
            }

            if ($one === null || $one === '') {
                unset($current[$side]);
                continue;
            }

            $resolved = self::spacingValue($one);
            if ($resolved === null) {
                return self::badValue($setting);
            }

            $current[$side] = $resolved;
        }

        return $current ? self::with($attrs, $path, $current) : self::without($attrs, [], $path);
    }

    private static function spacingValue($value)
    {
        $ref = self::presetRef($value, 'spacing');
        if ($ref !== null) {
            return $ref;
        }

        return is_string($value) && preg_match(self::LENGTH, $value) && self::safe($value) ? $value : null;
    }

    private static function radius(array $attrs, $value)
    {
        $path = ['border', 'radius'];
        if ($value === null || $value === '') {
            return self::without($attrs, [], $path);
        }

        if (!is_array($value)) {
            return preg_match(self::LENGTH, (string) $value)
                ? self::with($attrs, $path, (string) $value)
                : self::badValue('border_radius');
        }

        foreach ($value as $corner => $one) {
            if (!in_array($corner, self::CORNERS, true) || !preg_match(self::LENGTH, (string) $one)) {
                return self::badValue('border_radius');
            }
        }

        return self::with($attrs, $path, $value);
    }

    // A class SectionEdges reads, so the rest of the section's style stays.
    private static function sectionEdges(array $attrs, $value)
    {
        if (!in_array($value, ['on', 'off'], true)) {
            return self::badValue('section_edges');
        }

        $classes = array_values(array_diff(
            preg_split('/\s+/', (string) ($attrs['className'] ?? ''), -1, PREG_SPLIT_NO_EMPTY),
            [SectionEdges::OFF]
        ));
        if ($value === 'off') {
            $classes[] = SectionEdges::OFF;
        }

        if (!$classes) {
            return self::without($attrs, ['className'], []);
        }

        return array_merge($attrs, ['className' => implode(' ', $classes)]);
    }

    // Filled is the vibe's own button when one is set, else WordPress's default; a size class stays.
    private static function buttonStyle(array $attrs, $value)
    {
        if (!in_array($value, ['fill', 'outline'], true)) {
            return self::badValue('block_style');
        }

        $looks = '/^is-style-(fill|outline|ext-preset--button--.+|ext-(secondary|ghost|soft|link|destructive))$/';
        $classes = array_values(array_filter(
            preg_split('/\s+/', (string) ($attrs['className'] ?? ''), -1, PREG_SPLIT_NO_EMPTY),
            function ($class) use ($looks) {
                return !preg_match($looks, $class);
            }
        ));
        $preset = 'ext-preset--button--' . Vibes::PATTERN_VIBE . '--button-1';
        if ($value === 'outline') {
            $classes[] = 'is-style-outline';
        } elseif (\WP_Block_Styles_Registry::get_instance()->is_registered('core/button', $preset)) {
            $classes[] = 'is-style-' . $preset;
        }

        if (!$classes) {
            return self::without($attrs, ['className'], []);
        }

        return array_merge($attrs, ['className' => implode(' ', $classes)]);
    }

    // WordPress 7.1 sizes a button by its dimensions setting; before, by width classes saved in its markup.
    private static function buttonWidth(array $attrs, $value, $setting)
    {
        $attrs = self::without($attrs, ['width'], ['dimensions', 'width']);
        $value = is_string($value) || is_numeric($value) ? trim((string) $value) : '';
        if ($value === '' || in_array(strtolower($value), ['auto', 'none'], true)) {
            return $attrs;
        }

        $type = \WP_Block_Type_Registry::get_instance()->get_registered('core/button');
        if (!empty($type->supports['dimensions']['width'])) {
            return self::plain($attrs, $value, ['dimensions', 'width'], self::LENGTH, $setting);
        }

        $percent = (int) round((float) $value / 25) * 25;
        return substr($value, -1) === '%' && $percent >= 25 && $percent <= 100
            ? array_merge($attrs, ['width' => $percent])
            : self::badValue($setting);
    }

    // WordPress keeps grid items at least the minimum width, so a raised count alone fits no more.
    private static function fitted(array $layout, $count)
    {
        $was = (int) ($layout['columnCount'] ?? 0);
        $minimum = (string) ($layout['minimumColumnWidth'] ?? '');
        if ($was < 1 || $count <= $was || !preg_match('/^(\d*\.?\d+)(px|rem|em)$/', $minimum, $match)) {
            return $layout;
        }

        $narrower = round((float) $match[1] * $was / $count, 2);
        return array_merge($layout, ['minimumColumnWidth' => $narrower . $match[2]]);
    }

    private static function badValue($setting)
    {
        return self::refuse('bad_value', "That value doesn't fit {$setting}.");
    }

    private static function safe($value)
    {
        return \safecss_filter_attr('color:' . $value) !== '';
    }

    private static function presetRef($value, $kind)
    {
        $slug = self::presetSlug($value, $kind);
        return $slug === null ? null : "var:preset|{$kind}|{$slug}";
    }

    // The theme's own presets, so a slug the site lacks never reaches the markup.
    private static function presetSlug($value, $kind)
    {
        if (!is_string($value) || $value === '') {
            return null;
        }

        $paths = [
            'color' => ['color', 'palette'],
            'gradient' => ['color', 'gradients'],
            'font-size' => ['typography', 'fontSizes'],
            'font-family' => ['typography', 'fontFamilies'],
            'spacing' => ['spacing', 'spacingSizes'],
            'shadow' => ['shadow', 'presets'],
            'duotone' => ['color', 'duotone'],
        ];
        $presets = \wp_get_global_settings($paths[$kind]);
        // The block editor shows none of core's filters while the theme turns them off.
        if ($kind === 'duotone' && is_array($presets) && !\wp_get_global_settings(['color', 'defaultDuotone'])) {
            unset($presets['default']);
        }

        $slugs = self::slugsIn($presets);
        return in_array($value, $slugs, true) ? $value : null;
    }

    private static function slugsIn($presets)
    {
        if (!is_array($presets)) {
            return [];
        }

        if (isset($presets['slug'])) {
            return [(string) $presets['slug']];
        }

        $slugs = [];
        foreach ($presets as $preset) {
            $slugs = array_merge($slugs, self::slugsIn($preset));
        }

        return $slugs;
    }

    private static function with(array $attrs, array $path, $value)
    {
        $style = $attrs['style'] ?? [];
        $target = &$style;
        foreach ($path as $key) {
            if (!isset($target[$key]) || !is_array($target[$key])) {
                $target[$key] = [];
            }

            $target = &$target[$key];
        }

        $target = $value;
        unset($target);
        return array_merge($attrs, ['style' => $style]);
    }

    private static function without(array $attrs, array $keys, array $stylePath)
    {
        foreach ($keys as $key) {
            unset($attrs[$key]);
        }

        if (!$stylePath || !isset($attrs['style'])) {
            return $attrs;
        }

        $style = $attrs['style'];
        $target = &$style;
        $last = array_pop($stylePath);
        foreach ($stylePath as $key) {
            if (!isset($target[$key]) || !is_array($target[$key])) {
                unset($target);
                return $attrs;
            }

            $target = &$target[$key];
        }

        unset($target[$last]);
        unset($target);
        return array_merge($attrs, ['style' => $style]);
    }

    // The editor drops empty objects from a block's attributes.
    private static function pruned(array $attrs)
    {
        if (isset($attrs['style'])) {
            $style = self::prunedArray($attrs['style']);
            if ($style) {
                $attrs['style'] = $style;
            } else {
                unset($attrs['style']);
            }
        }

        return $attrs;
    }

    private static function prunedArray(array $values)
    {
        foreach ($values as $key => $value) {
            if (is_array($value)) {
                $value = self::prunedArray($value);
                if (!$value) {
                    unset($values[$key]);
                    continue;
                }

                $values[$key] = $value;
            }
        }

        return $values;
    }

    // Saved markup must match what the editor's save would write, or it marks the block invalid.
    private static function restyled(\WP_Block_Type $type, array $before, array $after)
    {
        $wrapperBefore = self::output($type, $before['attrs'], false);
        $wrapperAfter = self::output($type, $after['attrs'], false);
        $wrappers = [$wrapperBefore, $wrapperAfter];
        $changed = self::withOpening($after, function ($opening) use ($type, $before, $after, $wrappers) {
            list($wrapperBefore, $wrapperAfter) = $wrappers;
            $tags = new \WP_HTML_Tag_Processor($opening);
            if (!$tags->next_tag()) {
                return $opening;
            }

            self::swap($tags, $wrapperBefore, $wrapperAfter);
            self::classNames($tags, $before, $after);
            if ($before['blockName'] === 'core/image') {
                self::resized($tags, $before, $after);
            }
            self::quirks($tags, $before, $after, 'wrapper');
            self::spacerHeight($tags, $before, $after);
            if ($before['blockName'] === 'core/column') {
                self::widthRule($tags, $before, $after, 'flex-basis');
            }

            if ($before['blockName'] === 'core/cover') {
                self::overlaid($tags, $before, $after);
            }

            $inner = self::INNER[$before['blockName']] ?? null;
            if ($inner && $tags->next_tag($inner)) {
                $fullBefore = self::output($type, $before['attrs'], true);
                $fullAfter = self::output($type, $after['attrs'], true);
                self::swap($tags, self::minus($fullBefore, $wrapperBefore), self::minus($fullAfter, $wrapperAfter));
                self::quirks($tags, $before, $after, 'inner');
                if ($before['blockName'] === 'core/image') {
                    self::widthRule($tags, $before, $after, 'width');
                    self::shaped($tags, $before, $after);
                }
            }

            return $tags->get_updated_html();
        });
        return self::leveled($before, $changed);
    }

    // The editor writes a block's own classes, like its style, on its wrapper.
    private static function classNames(\WP_HTML_Tag_Processor $tags, array $before, array $after)
    {
        $was = preg_split('/\s+/', (string) ($before['attrs']['className'] ?? ''), -1, PREG_SPLIT_NO_EMPTY);
        $now = preg_split('/\s+/', (string) ($after['attrs']['className'] ?? ''), -1, PREG_SPLIT_NO_EMPTY);
        foreach (array_diff($was, $now) as $class) {
            $tags->remove_class($class);
        }

        foreach (array_diff($now, $was) as $class) {
            $tags->add_class($class);
        }
    }

    private static function output(\WP_Block_Type $type, array $attrs, $unskipped)
    {
        if ($unskipped) {
            $type = clone $type;
            $type->supports = self::unskipped($type->supports, $type->name);
        }

        $attrs = $type->prepare_attributes_for_render($attrs);
        $classes = [];
        $styles = [];
        foreach (self::SUPPORTS as $apply) {
            if (!function_exists($apply)) {
                continue;
            }

            $made = $apply($type, $attrs);
            $classes = array_merge($classes, preg_split('/\s+/', $made['class'] ?? '', -1, PREG_SPLIT_NO_EMPTY));
            $styles = array_merge($styles, self::parsedStyle($made['style'] ?? ''));
        }

        // Fluid type is worked out when the page renders; saved markup keeps the size as set.
        $custom = $attrs['style']['typography']['fontSize'] ?? null;
        if (isset($styles['font-size']) && is_string($custom) && empty($attrs['fontSize'])) {
            $styles['font-size'] = $custom;
        }

        return ['classes' => array_values(array_unique($classes)), 'styles' => $styles];
    }

    private static function unskipped(array $supports, $name)
    {
        foreach ($supports as $key => $value) {
            // A button's width is drawn on its wrapper as the page renders, never on its link.
            if ($name === 'core/button' && $key === 'dimensions') {
                continue;
            }

            if (is_array($value)) {
                unset($value['__experimentalSkipSerialization'], $value['skipSerialization']);
                $supports[$key] = $value;
            }
        }

        return $supports;
    }

    private static function minus(array $all, array $part)
    {
        return [
            'classes' => array_values(array_diff($all['classes'], $part['classes'])),
            'styles' => array_diff_key($all['styles'], $part['styles']),
        ];
    }

    private static function swap(\WP_HTML_Tag_Processor $tags, array $was, array $now)
    {
        foreach (array_diff($was['classes'], $now['classes']) as $class) {
            $tags->remove_class($class);
        }

        foreach (array_diff($now['classes'], $was['classes']) as $class) {
            $tags->add_class($class);
        }

        $style = self::parsedStyle((string) $tags->get_attribute('style'));
        $style = array_merge(array_diff_key($style, $was['styles']), $now['styles']);
        if ($style) {
            $tags->set_attribute('style', self::styleString($style));
        } else {
            $tags->remove_attribute('style');
        }
    }

    // Classes core's save writes by hand rather than through a block support.
    private static function quirks(\WP_HTML_Tag_Processor $tags, array $before, array $after, $element)
    {
        $toggles = [];
        if ($element === 'wrapper') {
            $toggles['has-link-color'] = function ($attrs) {
                return !empty($attrs['style']['elements']['link']['color']['text']);
            };
            $type = \WP_Block_Type_Registry::get_instance()->get_registered($before['blockName']);
            $own = $type ? self::alignAttribute($type) : null;
            if ($own !== null) {
                foreach (self::WORDS['text_align'] as $align) {
                    $toggles["has-text-align-{$align}"] = function ($attrs) use ($own, $align) {
                        return ($attrs[$own] ?? null) === $align;
                    };
                }
            }

            $vertical = self::VERTICAL[$before['blockName']] ?? null;
            if ($vertical !== null) {
                foreach (self::WORDS['vertical_alignment'] as $align) {
                    $toggles["{$vertical}{$align}"] = function ($attrs) use ($align) {
                        return ($attrs['verticalAlignment'] ?? null) === $align;
                    };
                }
            }

            if ($before['blockName'] === 'core/cover') {
                $toggles['has-aspect-ratio'] = function ($attrs) {
                    return !empty($attrs['style']['dimensions']['aspectRatio']);
                };
                $toggles['has-custom-content-position'] = function ($attrs) {
                    return ($attrs['contentPosition'] ?? 'center center') !== 'center center';
                };
                foreach (['top', 'center', 'bottom'] as $down) {
                    foreach (['left', 'center', 'right'] as $across) {
                        $toggles["is-position-{$down}-{$across}"] = function ($attrs) use ($down, $across) {
                            $position = $attrs['contentPosition'] ?? 'center center';
                            return $position !== 'center center' && $position === "{$down} {$across}";
                        };
                    }
                }
            }

            if ($before['blockName'] === 'core/social-links') {
                $toggles['has-icon-color'] = function ($attrs) {
                    return !empty($attrs['iconColorValue']);
                };
                foreach (self::WORDS['icon_size'] as $size) {
                    $toggles["has-{$size}-icon-size"] = function ($attrs) use ($size) {
                        return ($attrs['size'] ?? null) === "has-{$size}-icon-size";
                    };
                }
            }

            if ($before['blockName'] === 'core/image') {
                $toggles['is-resized'] = function ($attrs) {
                    return !empty($attrs['width']) || !empty($attrs['height']);
                };
                $toggles['has-custom-border'] = function ($attrs) {
                    return !empty($attrs['borderColor']) || !empty($attrs['style']['border']);
                };
            }
        }

        if ($element === 'wrapper' && $before['blockName'] === 'core/button') {
            $toggles['has-custom-width'] = function ($attrs) {
                return !empty($attrs['width']);
            };
            foreach ([25, 50, 75, 100] as $share) {
                $toggles["wp-block-button__width-{$share}"] = function ($attrs) use ($share) {
                    return (int) ($attrs['width'] ?? 0) === $share;
                };
            }
        }

        if ($element === 'inner' && $before['blockName'] === 'core/button') {
            $toggles['has-custom-font-size'] = function ($attrs) {
                return !empty($attrs['fontSize']) || !empty($attrs['style']['typography']['fontSize']);
            };
        }

        foreach ($toggles as $class => $on) {
            $was = $on($before['attrs']);
            $now = $on($after['attrs']);
            if ($was && !$now) {
                $tags->remove_class($class);
            }

            if ($now && !$was) {
                $tags->add_class($class);
            }
        }
    }

    // A column's save writes its width as its flex-basis, an image's on the picture itself.
    private static function widthRule(\WP_HTML_Tag_Processor $tags, array $before, array $after, $property)
    {
        $now = $after['attrs']['width'] ?? null;
        if (($before['attrs']['width'] ?? null) === $now) {
            return;
        }

        $style = self::parsedStyle((string) $tags->get_attribute('style'));
        if ($now === null) {
            unset($style[$property]);
        } else {
            $style[$property] = (string) $now;
        }

        if ($style) {
            $tags->set_attribute('style', self::styleString($style));
        } else {
            $tags->remove_attribute('style');
        }
    }

    // An image's save writes its shape on the img ahead of its size, so the editor reads it as its own.
    private static function shaped(\WP_HTML_Tag_Processor $tags, array $before, array $after)
    {
        $shape = function (array $attrs) {
            return [$attrs['aspectRatio'] ?? null, $attrs['scale'] ?? null, $attrs['height'] ?? null];
        };
        if ($shape($before['attrs']) === $shape($after['attrs'])) {
            return;
        }

        $attrs = $after['attrs'];
        $focal = $attrs['focalPoint'] ?? null;
        $style = array_diff_key(
            self::parsedStyle((string) $tags->get_attribute('style')),
            array_flip(['aspect-ratio', 'object-fit', 'object-position', 'width', 'height'])
        );
        // The save places a fitted image by its focal point, or the editor reads the block as changed.
        $position = !empty($attrs['scale']) && is_array($focal)
            ? round(100 * (float) ($focal['x'] ?? 0.5)) . '% ' . round(100 * (float) ($focal['y'] ?? 0.5)) . '%'
            : null;
        $style += array_filter([
            'aspect-ratio' => $attrs['aspectRatio'] ?? null,
            'object-fit' => $attrs['scale'] ?? null,
            'object-position' => $position,
            'width' => $attrs['width'] ?? null,
            'height' => $attrs['height'] ?? null,
        ]);
        if ($style) {
            $tags->set_attribute('style', self::styleString($style));
        } else {
            $tags->remove_attribute('style');
        }
    }

    // An image's save marks it resized while it has a width or a height.
    private static function resized(\WP_HTML_Tag_Processor $tags, array $before, array $after)
    {
        $sized = function (array $attrs) {
            return !empty($attrs['width']) || !empty($attrs['height']);
        };
        if ($sized($before['attrs']) === $sized($after['attrs'])) {
            return;
        }

        if ($sized($after['attrs'])) {
            $tags->add_class('is-resized');
        } else {
            $tags->remove_class('is-resized');
        }
    }

    // The overlay's darkness and color sit on its own layer, written as the cover's save writes them.
    private static function overlaid(\WP_HTML_Tag_Processor $tags, array $before, array $after)
    {
        $was = $before['attrs']['dimRatio'] ?? 100;
        $now = $after['attrs']['dimRatio'] ?? 100;
        $color = function (array $attrs) {
            return [$attrs['overlayColor'] ?? null, $attrs['customOverlayColor'] ?? null];
        };
        $recolored = $color($before['attrs']) !== $color($after['attrs']);
        $layer = ['tag_name' => 'span', 'class_name' => 'wp-block-cover__background'];
        if (($was === $now && !$recolored) || !$tags->next_tag($layer)) {
            return;
        }

        if ($was !== $now) {
            foreach (range(0, 100, 10) as $step) {
                $tags->remove_class("has-background-dim-{$step}");
            }

            if ((int) $now !== 50) {
                $tags->add_class('has-background-dim-' . (10 * (int) round($now / 10)));
            }

            $tags->add_class('has-background-dim');
        }

        if (!$recolored) {
            return;
        }

        list($slug) = $color($before['attrs']);
        if ($slug) {
            $tags->remove_class(\_wp_to_kebab_case("has-{$slug}-background-color"));
        }

        list($slug, $custom) = $color($after['attrs']);
        if ($slug) {
            $tags->add_class(\_wp_to_kebab_case("has-{$slug}-background-color"));
        }

        $style = self::parsedStyle((string) $tags->get_attribute('style'));
        unset($style['background-color']);
        if (!$slug && $custom) {
            $style['background-color'] = $custom;
        }

        if ($style) {
            $tags->set_attribute('style', self::styleString($style));
        } else {
            $tags->remove_attribute('style');
        }
    }

    // A spacer's save writes its height inline, so the markup must carry the new one or the editor marks it invalid.
    private static function spacerHeight(\WP_HTML_Tag_Processor $tags, array $before, array $after)
    {
        if ($before['blockName'] !== 'core/spacer') {
            return;
        }

        $now = $after['attrs']['height'] ?? '100px';
        if (($before['attrs']['height'] ?? '100px') === $now) {
            return;
        }

        $css = preg_replace('/^var:preset\|spacing\|(.+)$/', 'var(--wp--preset--spacing--$1)', $now);
        $style = (string) $tags->get_attribute('style');
        $rule = '/(^|;)\s*height\s*:[^;]*/i';
        $style = preg_match($rule, $style)
            ? preg_replace($rule, '${1}height:' . $css, $style, 1)
            : rtrim("height:{$css};{$style}", ';');
        $tags->set_attribute('style', $style);
    }

    // A heading's level is its tag.
    private static function leveled(array $before, array $after)
    {
        if ($before['blockName'] !== 'core/heading') {
            return $after;
        }

        $was = (int) ($before['attrs']['level'] ?? 2);
        $now = (int) ($after['attrs']['level'] ?? 2);
        if ($was === $now) {
            return $after;
        }

        return self::withOpening($after, function ($opening) use ($was, $now) {
            return preg_replace(["#<h{$was}\\b#i", "#</h{$was}>#i"], ["<h{$now}", "</h{$now}>"], $opening);
        });
    }

    private static function parsedStyle($style)
    {
        $parsed = [];
        foreach (explode(';', $style) as $declaration) {
            $parts = explode(':', $declaration, 2);
            if (count($parts) === 2 && trim($parts[0]) !== '') {
                $parsed[strtolower(trim($parts[0]))] = trim($parts[1]);
            }
        }

        return $parsed;
    }

    private static function styleString(array $style)
    {
        $declarations = [];
        foreach ($style as $property => $value) {
            $declarations[] = "{$property}:{$value}";
        }

        return implode(';', $declarations);
    }
}

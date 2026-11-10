<?php

/**
 * Add a block.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Adds a paragraph, heading, button, list, image, gallery, separator, spacer, menu link
 * or form next to or inside a block.
 */
class Add extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'add';
    const POSITIONS = ['before', 'after', 'start', 'end'];
    // Blocks whose inner blocks may be anything.
    const HOLDERS = ['core/group', 'core/column', 'core/cover', 'core/media-text', 'core/quote', 'core/buttons'];
    // Parents that hold only one kind of block the agent doesn't add.
    const CLOSED = [
        'core/list',
        'core/columns',
        'core/navigation',
        'core/navigation-submenu',
        'core/social-links',
        'core/gallery',
    ];
    const MENUS = ['core/navigation', 'core/navigation-submenu'];
    const SPACER = '/^\d{1,4}(px|em|rem|vh)$/';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    // Without this a map reads as "Added a Custom HTML" in the list of changes.
    public static function reportFor(array $before, $after = null)
    {
        $map = is_array($after) && $after['blockName'] === 'core/html' && Maps::drawn($after['innerHTML']);
        return $map ? 'add-map' : self::REPORT;
    }

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $anchor = Tree::blockAt($blocks, $path);
        $position = (string) ($args['position'] ?? 'after');
        if (!in_array($position, self::POSITIONS, true)) {
            return self::refuse('bad_args', 'Say where the new block goes.');
        }

        $made = self::made($args['new'] ?? null);
        if (\is_wp_error($made)) {
            return $made;
        }

        $link = $made['blockName'] === 'core/navigation-link';
        $holds = in_array($anchor['blockName'], $link ? self::MENUS : self::HOLDERS, true);
        $inside = in_array($position, ['start', 'end'], true);
        // A column takes a first block even when wrapping left it empty.
        $column = $anchor['blockName'] === 'core/column';
        if ($inside && (!$holds || (!$column && !Tree::named($anchor['innerBlocks'])))) {
            return self::refuse('wrong_place', 'A new block can only go inside a section or column that holds blocks.');
        }

        $parent = $inside ? $path : array_slice($path, 0, -1);
        $holder = $parent ? Tree::blockAt($blocks, $parent)['blockName'] : '';
        $children = Tree::children($blocks, $parent);
        $index = $inside
            ? ($position === 'start' ? 0 : count($children))
            : (int) end($path) + ($position === 'after' ? 1 : 0);
        // A menu's own post holds its links at the top, with no navigation block around them.
        $menu = in_array($holder, self::MENUS, true) || ($holder === '' && self::isMenu($context['source'] ?? ''));
        if ($link !== $menu) {
            $why = $link ? 'A menu link goes only in a menu.' : 'Only a menu link goes in a menu.';
            return self::refuse('wrong_place', $why);
        }

        $button = $made['blockName'] === 'core/button';
        if (!$menu && (in_array($holder, self::CLOSED, true) || ($holder === 'core/buttons' && !$button))) {
            return self::refuse('wrong_place', 'That kind of block can\'t go there.');
        }

        // A button stands in a button group.
        $wrapped = $button && $holder !== 'core/buttons';
        if ($wrapped) {
            $made = self::parsed(
                "<!-- wp:buttons -->\n<div class=\"wp-block-buttons\">"
                    . \serialize_block($made)
                    . "</div>\n<!-- /wp:buttons -->"
            );
        }

        array_splice($children, $index, 0, [$made]);
        $page = $link ? (int) ($made['attrs']['id'] ?? 0) : 0;
        return [
            'blocks' => Tree::withChildren($blocks, $parent, $children),
            'at' => $parent,
            'block' => array_merge($parent, [$index], $wrapped ? [0] : []),
            // WordPress leaves a link to an unpublished page out of the menu until the page is published.
        ] + ($page && \get_post_status($page) !== 'publish' ? ['note' => 'unpublished'] : []);
    }

    private static $pageStatuses = ['publish', 'draft', 'pending', 'future', 'private'];

    /**
     * The page a request names, which rarely matches a title character for character.
     */
    private static function pageTitled($title)
    {
        $exact = \get_posts([
            'post_type' => 'page',
            'title' => $title,
            'post_status' => self::$pageStatuses,
            'numberposts' => 1,
        ]);
        if ($exact) {
            return $exact[0];
        }

        $wanted = self::plainTitle($title);
        if ($wanted === '') {
            return null;
        }
        $pages = \get_posts([
            'post_type' => 'page',
            'post_status' => self::$pageStatuses,
            'numberposts' => 200,
            'orderby' => 'title',
            'order' => 'ASC',
        ]);
        $plain = [];
        foreach ($pages as $page) {
            $plain[$page->ID] = self::plainTitle($page->post_title);
            if ($plain[$page->ID] === $wanted) {
                return $page;
            }
        }

        // "my blog posts" names the Blog page, so the shortest matching title wins.
        $found = null;
        foreach ($pages as $page) {
            $name = $plain[$page->ID];
            if ($name === '' || !self::holdsWords($wanted, $name)) {
                continue;
            }
            if ($found === null || strlen($name) < strlen($plain[$found->ID])) {
                $found = $page;
            }
        }

        return $found;
    }

    /**
     * Whole words only, or "shop" would name the Workshop page.
     */
    private static function holdsWords($one, $two)
    {
        $padded = [" {$one} ", " {$two} "];

        return strpos($padded[0], $padded[1]) !== false
            || strpos($padded[1], $padded[0]) !== false;
    }

    /**
     * Case, accents and punctuation are not what the words were meant to name.
     */
    private static function plainTitle($title)
    {
        $plain = strtolower(\remove_accents(\wp_strip_all_tags((string) $title)));
        $plain = preg_replace('/&(?:amp|#038);|&/', ' and ', $plain);
        $plain = preg_replace('/[^a-z0-9]+/', ' ', (string) $plain);

        return trim((string) $plain);
    }

    private static function isMenu($source)
    {
        return preg_match('/^post:(\d+)$/', (string) $source, $match) === 1
            && \get_post_type((int) $match[1]) === 'wp_navigation';
    }

    private static function menuLink(array $new, $label)
    {
        $label = \sanitize_text_field(\wp_strip_all_tags($label));
        $title = isset($new['page']) && is_string($new['page']) ? trim($new['page']) : '';
        if ($title !== '') {
            $page = self::pageTitled($title);
            if (!$page) {
                return self::refuse('no_page', 'The site has no page with that title.');
            }

            $attrs = [
                'label' => $label !== '' ? $label : $page->post_title,
                'type' => 'page',
                'id' => $page->ID,
                'url' => \get_permalink($page),
                'kind' => 'post-type',
            ];
        } else {
            $url = isset($new['url']) && is_string($new['url']) ? \esc_url_raw($new['url'], Link::PROTOCOLS) : '';
            if ($url === '' || $label === '') {
                return self::refuse('bad_args', 'Send the link\'s words and the page or address it goes to.');
            }

            $attrs = ['label' => $label, 'url' => $url, 'kind' => 'custom'];
        }

        return self::parsed(\serialize_block([
            'blockName' => 'core/navigation-link',
            'attrs' => $attrs,
            'innerBlocks' => [],
            'innerHTML' => '',
            'innerContent' => [],
        ]));
    }

    /**
     * A map, drawn only from the address Maps builds out of what the user gave.
     *
     * @param array $new The new block, with its embed code, link or place.
     * @return array|\WP_Error
     */
    private static function mapOf(array $new)
    {
        $src = Maps::srcOf($new);
        return \is_wp_error($src) ? $src : Maps::blockOf($src, $new['height'] ?? null);
    }

    private static function made($new)
    {
        $type = is_array($new) ? (string) ($new['type'] ?? '') : '';
        $text = is_array($new) && isset($new['text']) && is_string($new['text']) ? Format::sanitized($new['text']) : '';
        $wordy = in_array($type, ['core/paragraph', 'core/heading', 'core/button'], true);
        if ($wordy && trim(\wp_strip_all_tags($text)) === '') {
            return self::refuse('bad_args', 'Send the new block\'s text.');
        }

        switch ($type) {
            case 'core/paragraph':
                return self::parsed("<!-- wp:paragraph -->\n<p>{$text}</p>\n<!-- /wp:paragraph -->");
            case 'core/heading':
                $level = (int) ($new['level'] ?? 2);
                if ($level < 1 || $level > 6) {
                    return self::refuse('bad_args', 'A heading level is 1 to 6.');
                }

                $attrs = $level === 2 ? '' : ' {"level":' . $level . '}';
                $class = self::classOf('core/heading');
                return self::parsed(
                    "<!-- wp:heading{$attrs} -->\n<h{$level}{$class}>{$text}</h{$level}>\n<!-- /wp:heading -->"
                );
            case 'core/button':
                $url = isset($new['url']) && is_string($new['url']) ? \esc_url($new['url'], Link::PROTOCOLS) : '';
                $href = $url === '' ? '' : ' href="' . $url . '"';
                return self::parsed(
                    "<!-- wp:button -->\n<div class=\"wp-block-button\">"
                        . "<a class=\"wp-block-button__link wp-element-button\"{$href}>{$text}</a>"
                        . "</div>\n<!-- /wp:button -->"
                );
            case 'core/navigation-link':
                return self::menuLink($new, (string) ($new['text'] ?? ''));
            case 'core/list':
                return self::listOf($new['items'] ?? null);
            case 'core/image':
                return self::imageOf($new['image'] ?? null);
            case 'core/gallery':
                return self::galleryOf($new['images'] ?? null);
            case 'core/separator':
                return self::parsed(
                    "<!-- wp:separator -->\n<hr class=\"wp-block-separator has-alpha-channel-opacity\"/>"
                        . "\n<!-- /wp:separator -->"
                );
            case 'wpforms/form-selector':
                return self::formOf($new['form'] ?? null);
            case 'core/html':
                return self::mapOf($new);
            case 'core/spacer':
                $given = $new['height'] ?? null;
                $height = is_string($given) && preg_match(self::SPACER, $given) ? $given : '100px';
                $attrs = $height === '100px' ? '' : ' {"height":"' . $height . '"}';
                return self::parsed(
                    "<!-- wp:spacer{$attrs} -->\n<div style=\"height:{$height}\" aria-hidden=\"true\""
                        . " class=\"wp-block-spacer\"></div>\n<!-- /wp:spacer -->"
                );
        }

        return self::refuse(
            'bad_args',
            'A new block is a paragraph, heading, button, list, image, gallery, divider,'
                . ' spacer, menu link, form or map.'
        );
    }

    private static function formOf($id)
    {
        $form = is_numeric($id) ? \get_post((int) $id) : null;
        $published = $form && $form->post_type === 'wpforms' && $form->post_status === 'publish';
        if (!\function_exists('wpforms') || !$published) {
            return self::refuse('no_form', 'The site has no form with that id.');
        }

        return self::parsed('<!-- wp:wpforms/form-selector {"formId":"' . $form->ID . '"} /-->');
    }

    private static function listOf($items)
    {
        $items = is_array($items) ? array_values(array_filter(array_map(function ($item) {
            return is_string($item) ? Format::sanitized($item) : '';
        }, $items), function ($item) {
            return trim(\wp_strip_all_tags($item)) !== '';
        })) : [];
        if (!$items) {
            return self::refuse('bad_args', 'Send the list\'s items.');
        }

        $class = self::classOf('core/list');
        $lis = array_map(function ($item) {
            return "<!-- wp:list-item -->\n<li>{$item}</li>\n<!-- /wp:list-item -->";
        }, $items);
        return self::parsed("<!-- wp:list -->\n<ul{$class}>" . implode("\n\n", $lis) . "</ul>\n<!-- /wp:list -->");
    }

    // A gallery holds image blocks of its own, one per photo.
    private static function galleryOf($images)
    {
        $pictures = [];
        foreach (is_array($images) ? $images : [] as $image) {
            $markup = self::imageMarkup($image);
            if (is_string($markup)) {
                $pictures[] = $markup;
            }
        }

        if (!$pictures) {
            return self::refuse('not_an_image', 'Pick the photos from the media library.');
        }

        return self::parsed(
            '<!-- wp:gallery {"linkTo":"none"} -->' . "\n"
                . '<figure class="wp-block-gallery has-nested-images columns-default is-cropped">'
                . implode('', $pictures)
                . '</figure>' . "\n" . '<!-- /wp:gallery -->'
        );
    }

    private static function imageMarkup($image)
    {
        $id = is_array($image) ? (int) ($image['id'] ?? 0) : 0;
        if (!$id || !\wp_attachment_is_image($id)) {
            return self::refuse('not_an_image', 'Pick an image from the media library.');
        }

        $url = \wp_get_attachment_image_url($id, 'large') ?: \wp_get_attachment_url($id);
        $given = $image['alt'] ?? null;
        $alt = is_string($given) ? $given : (string) \get_post_meta($id, '_wp_attachment_image_alt', true);
        return '<!-- wp:image {"id":' . $id . ',"sizeSlug":"large","linkDestination":"none"} -->' . "\n"
            . '<figure class="wp-block-image size-large"><img src="' . \esc_url($url) . '" alt="' . \esc_attr($alt)
            . '" class="wp-image-' . $id . '"/></figure>' . "\n" . '<!-- /wp:image -->';
    }

    private static function imageOf($image)
    {
        $markup = self::imageMarkup($image);
        return is_string($markup) ? self::parsed($markup) : $markup;
    }

    // The class every block gets from its name, which older WordPress left off some blocks.
    private static function classOf($name)
    {
        $type = \WP_Block_Type_Registry::get_instance()->get_registered($name);
        $on = $type && \block_has_support($type, 'className', true);
        return $on ? ' class="' . \wp_get_block_default_classname($name) . '"' : '';
    }

    private static function parsed($markup)
    {
        return array_values(Tree::named(\parse_blocks($markup)))[0];
    }
}

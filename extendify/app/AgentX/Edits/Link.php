<?php

/**
 * Change a link.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Sets where a button, image, menu item or link in a block's text goes, and whether it opens a new tab.
 */
class Link extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'link';
    const PROTOCOLS = ['http', 'https', 'mailto', 'tel'];
    // Links in a block's own text, as the editor's link format writes them.
    const IN_TEXT = ['core/heading', 'core/paragraph', 'core/list-item'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $block = Tree::blockAt($blocks, $path);
        $url = array_key_exists('url', $args) ? self::url($args['url']) : false;
        if ($url === null) {
            return self::refuse('bad_url', 'That address is not a web, email or phone link.');
        }

        $newTab = isset($args['newTab']) ? (bool) $args['newTab'] : null;
        if ($url === false && $newTab === null) {
            return self::refuse('bad_args', 'Send the new address, or whether the link opens in a new tab.');
        }

        $name = $block['blockName'];
        if ($name === 'core/button') {
            $changed = self::button($block, $url, $newTab);
        } elseif ($name === 'core/image') {
            $changed = self::image($block, $url, $newTab);
        } elseif (in_array($name, ['core/navigation-link', 'core/navigation-submenu', 'core/social-link'], true)) {
            $changed = self::menuItem($block, $url, $newTab);
        } elseif (in_array($name, self::IN_TEXT, true)) {
            $changed = self::inText($block, $url, $newTab, $args['link'] ?? null);
        } else {
            $changed = self::refuse('no_link', 'This block has no link to change.');
        }

        if (\is_wp_error($changed)) {
            return $changed;
        }

        return ['blocks' => Tree::setAt($blocks, $path, $changed), 'at' => $path, 'block' => $path];
    }

    // False when the args leave the address as it is; null when it isn't one a link may hold.
    private static function url($url)
    {
        if (!is_string($url)) {
            return null;
        }

        $url = trim($url);
        if ($url === '') {
            return '';
        }

        if (preg_match('#^/(?!/)#', $url)) {
            return \esc_url_raw(self::onSite($url)) ?: null;
        }

        if (strpos($url, '#') === 0) {
            return \esc_url_raw($url) === '' ? null : $url;
        }

        $clean = \esc_url_raw($url, self::PROTOCOLS);
        return $clean === '' ? null : $clean;
    }

    // "/menu" alone would leave a site in a subfolder, so a path becomes the page's full address.
    private static function onSite($path)
    {
        $home = \untrailingslashit((string) \wp_parse_url(\home_url('/'), PHP_URL_PATH));
        $inside = $home !== '' && ($path === $home || strpos($path, $home . '/') === 0);
        return \home_url($inside ? (substr($path, strlen($home)) ?: '/') : $path);
    }

    private static function button(array $block, $url, $newTab)
    {
        if (!self::hasMarkup($block)) {
            return self::refuse('no_link', 'This button has no link to change.');
        }

        $found = false;
        $changed = self::withOpening($block, function ($opening) use ($url, $newTab, &$found) {
            $tags = new \WP_HTML_Tag_Processor($opening);
            if (!$tags->next_tag(['class_name' => 'wp-block-button__link']) || $tags->get_tag() !== 'A') {
                return $opening;
            }

            $found = true;
            self::linked($tags, $url, $newTab);
            return $tags->get_updated_html();
        });
        return $found ? $changed : self::refuse('no_link', 'This button has no link to change.');
    }

    private static function image(array $block, $url, $newTab)
    {
        $attrs = $block['attrs'];
        $opening = $block['innerContent'][0] ?? '';
        $linked = (bool) preg_match('#<a\b[^>]*>\s*<img\b#i', $opening);
        if ($url === '') {
            unset($attrs['linkDestination'], $attrs['linkTarget'], $attrs['rel'], $attrs['href']);
            $html = preg_replace('#<a\b[^>]*>\s*(<img\b[^>]*>)\s*</a>#i', '$1', $opening);
            return self::content(array_merge($block, ['attrs' => $attrs]), $html);
        }

        if ($url === false && !$linked) {
            return self::refuse('no_link', 'This image has no link to change.');
        }

        $html = $linked ? $opening : preg_replace('#(<img\b[^>]*>)#i', '<a href="">$1</a>', $opening, 1);
        $tags = new \WP_HTML_Tag_Processor($html);
        $tags->next_tag('a');
        self::linked($tags, $url, $newTab);
        if ($url !== false) {
            $attrs['linkDestination'] = 'custom';
        }

        return self::content(array_merge($block, ['attrs' => $attrs]), $tags->get_updated_html());
    }

    private static function menuItem(array $block, $url, $newTab)
    {
        $attrs = $block['attrs'];
        if ($url !== false) {
            // A typed address no longer points at a page, so it stops following the page's link.
            unset($attrs['id'], $attrs['type']);
            $attrs['url'] = $url;
            if ($block['blockName'] !== 'core/social-link') {
                $attrs['kind'] = 'custom';
            }
        }

        if ($newTab !== null && $block['blockName'] !== 'core/social-link') {
            $attrs['opensInNewTab'] = $newTab;
        }

        return array_merge($block, ['attrs' => $attrs]);
    }

    // The link named by its address or its words; with no name, the block's only link.
    private static function inText(array $block, $url, $newTab, $which)
    {
        $opening = $block['innerContent'][0] ?? '';
        preg_match_all('#<a\b[^>]*>(.*?)</a>#is', $opening, $links, PREG_OFFSET_CAPTURE);
        $pick = null;
        foreach ($links[0] as $index => $link) {
            $tags = new \WP_HTML_Tag_Processor($link[0]);
            $tags->next_tag('a');
            $words = trim(\wp_strip_all_tags($links[1][$index][0]));
            $matches = !is_string($which) || $which === ''
                || $which === $tags->get_attribute('href') || strcasecmp($which, $words) === 0;
            if ($matches) {
                if ($pick !== null) {
                    return self::refuse('which_link', 'This block has more than one link; say which.');
                }

                $pick = $index;
            }
        }

        if ($pick === null) {
            return self::addLink($block, $opening, $url, $newTab, $which);
        }

        list($whole, $offset) = $links[0][$pick];
        $tags = new \WP_HTML_Tag_Processor($whole);
        $tags->next_tag('a');
        if ($url === '') {
            $replacement = $links[1][$pick][0];
        } else {
            self::linked($tags, $url, $newTab);
            $replacement = $tags->get_updated_html();
        }

        return self::content($block, substr_replace($opening, $replacement, $offset, strlen($whole)));
    }

    private static function addLink(array $block, $opening, $url, $newTab, $which)
    {
        $tag = Text::TAGS[$block['blockName']] ?? null;
        if ($url === '' || $url === false || !$tag) {
            return self::refuse('no_link', 'This block has no such link.');
        }

        if (!preg_match("#(<({$tag})\\b[^>]*>)(.*?)(</\\2>|$)#is", $opening, $found, PREG_OFFSET_CAPTURE)) {
            return self::refuse('no_link', 'This block has no such link.');
        }

        list($words, $at) = $found[3];
        if (trim(\wp_strip_all_tags($words)) === '') {
            return self::refuse('no_link', 'This block has no words to link.');
        }

        $named = is_string($which) ? trim($which) : '';
        $offset = $named === '' ? false : self::plainly($words, $named);
        if ($offset !== false) {
            $at += $offset;
            $words = substr($words, $offset, strlen($named));
        }

        $anchor = self::anchor($words, $url, $newTab);
        return self::content($block, substr_replace($opening, $anchor, $at, strlen($words)));
    }

    // Words found inside a tag are an attribute's, and a link wrapped there would break the markup.
    private static function plainly($html, $words)
    {
        $at = stripos($html, $words);
        if ($at === false) {
            return false;
        }

        $before = substr($html, 0, $at);
        return strrpos($before, '<') > strrpos($before, '>') ? false : $at;
    }

    private static function anchor($words, $url, $newTab)
    {
        $tags = new \WP_HTML_Tag_Processor('<a>' . $words . '</a>');
        $tags->next_tag('a');
        self::linked($tags, $url, $newTab);
        return $tags->get_updated_html();
    }

    private static function linked(\WP_HTML_Tag_Processor $tags, $url, $newTab)
    {
        if ($url !== false) {
            $tags->set_attribute('href', $url);
        }

        if ($newTab === true) {
            $tags->set_attribute('target', '_blank');
            $tags->set_attribute('rel', 'noreferrer noopener');
        }

        if ($newTab === false) {
            $tags->remove_attribute('target');
            $rel = preg_split('/\s+/', (string) $tags->get_attribute('rel'), -1, PREG_SPLIT_NO_EMPTY);
            $rest = array_diff($rel, ['noreferrer', 'noopener']);
            if ($rest) {
                $tags->set_attribute('rel', implode(' ', $rest));
            } else {
                $tags->remove_attribute('rel');
            }
        }
    }

    private static function content(array $block, $opening)
    {
        return self::withOpening($block, function () use ($opening) {
            return $opening;
        });
    }
}

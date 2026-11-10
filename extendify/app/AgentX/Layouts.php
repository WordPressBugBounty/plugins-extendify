<?php

/**
 * Layouts.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

use Extendify\Constants;
use Extendify\Shared\Services\SiteImages;

/**
 * The front page heroes the agent offers, served by Extendify, filled with the site's own words and images.
 */
class Layouts
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const PARAM = 'extendify-layout';
    const CACHE = 'extendify_agentx_layouts';
    const HERO = 'ext-hero-section';
    const MOST_IMAGES = 6;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * Each served hero's id, but the one the front page shows now.
     *
     * @return array
     */
    public static function all()
    {
        $live = self::current();
        $all = [];
        foreach (array_keys(self::pool()) as $name) {
            if ($name !== $live) {
                $all[] = ['id' => "layout:{$name}"];
            }
        }

        return $all;
    }

    /**
     * The served hero an id names.
     *
     * @param string $id A served hero's id starts with layout:.
     * @return array|null Its block markup and the catalog image urls in it.
     */
    public static function find($id)
    {
        if (!is_string($id) || strpos($id, 'layout:') !== 0) {
            return null;
        }

        return self::pool()[substr($id, strlen('layout:'))] ?? null;
    }

    /**
     * The pattern name of the hero the front page shows now.
     *
     * @return string|null
     */
    public static function current()
    {
        $front = self::front();
        return $front ? self::nameIn(\parse_blocks(BlockIds::live("post:{$front}") ?? '')) : null;
    }

    /**
     * The static front page's id, or zero when the front page lists posts.
     *
     * @return int
     */
    public static function front()
    {
        return \get_option('show_on_front') === 'page' ? (int) \get_option('page_on_front') : 0;
    }

    /**
     * Whether the user can try layouts: a front page they can edit, with a hero of its own.
     *
     * @return bool
     */
    public static function available()
    {
        $front = self::front();
        // Keeps the layout card from users who can't edit the front page; Save would refuse them.
        return $front
            && \current_user_can('edit_post', $front)
            && self::heroIn(\parse_blocks(BlockIds::content("post:{$front}") ?? '')) !== null;
    }

    /**
     * Where the hero sits among the named top-level blocks, counted as block ids count.
     *
     * @param array $blocks Parsed blocks.
     * @return int|null
     */
    public static function heroIn(array $blocks)
    {
        foreach (array_values(self::named($blocks)) as $index => $block) {
            if (in_array(self::HERO, self::classesOf($block), true)) {
                return $index;
            }
        }

        return null;
    }

    /**
     * The pattern name the hero carries in its class, as patterns.extendify.com names it.
     *
     * @param array $blocks Parsed blocks.
     * @return string|null
     */
    public static function nameIn(array $blocks)
    {
        $index = self::heroIn($blocks);
        $classes = $index === null ? [] : self::classesOf(array_values(self::named($blocks))[$index]);
        foreach ($classes as $class) {
            $name = strpos($class, self::HERO . '--') === 0
                ? explode('--', substr($class, strlen(self::HERO . '--')))[0]
                : '';
            // Full-screen heroes add --full-screen alone or --<name>--full-screen, in any order.
            if ($name !== '' && $name !== 'full-screen') {
                return $name;
            }
        }

        return null;
    }

    /**
     * The served hero with the site's heading, paragraph, button and images in place of the catalog's.
     *
     * @param array $layout A served hero from find().
     * @param array $hero   The hero block the site shows now.
     * @return string Block markup.
     */
    public static function fill(array $layout, array $hero)
    {
        $blocks = self::flat([$hero]);
        $code = $layout['code'];
        $title = self::innerOf($blocks, 'core/heading', 'h1');
        if ($title !== null) {
            $code = self::between('/(<!-- wp:heading[^>]*-->[\s\S]*?<h1\b[^>]*>)[\s\S]*?(<\/h1>)/', $code, $title);
        }

        $text = self::innerOf($blocks, 'core/paragraph', 'p');
        // Catalog paragraphs describe the slot, not the site.
        $code = $text === null || trim($text) === ''
            ? preg_replace('/<!-- wp:paragraph[\s\S]*?<!-- \/wp:paragraph -->/', '', $code, 1)
            : self::between('/(<!-- wp:paragraph[^>]*-->[\s\S]*?<p\b[^>]*>)[\s\S]*?(<\/p>)/', $code, $text);
        $label = self::innerOf($blocks, 'core/button', 'a');
        if ($label !== null) {
            $code = self::between('/(<!-- wp:button[^>]*-->[\s\S]*?<a\b[^>]*>)[\s\S]*?(<\/a>)/', $code, $label);
        }

        $link = self::linkOf($blocks);
        if ($link !== '') {
            $code = self::between('/(<!-- wp:button[\s\S]*?<a\b[^>]*\shref=")[^"]*(")/', $code, \esc_url($link));
        }

        $images = self::imagesFor($hero);
        if (!$images) {
            return $code;
        }

        $start = (int) ($layout['start'] ?? 0);
        foreach (array_values(array_filter((array) ($layout['urls'] ?? []), 'is_string')) as $at => $url) {
            $code = str_replace($url, $images[($start + $at) % count($images)], $code);
        }

        return $code;
    }

    private static function pool()
    {
        // The catalog is served in the site's language.
        $key = self::CACHE . '_' . \get_locale();
        $heroes = \get_transient($key);
        if (!is_array($heroes)) {
            $brief = function ($args) {
                $args['timeout'] = 5;
                return $args;
            };
            \add_filter('http_request_args', $brief, 101);
            try {
                $response = \wp_remote_post(Constants::PATTERNS_HOST . '/api/heros', [
                    'headers' => ['Content-Type' => 'application/json'],
                    'body' => \wp_json_encode([
                        'wpVersion' => \get_bloginfo('version'),
                        'wpLanguage' => \get_locale(),
                        'featured' => true,
                        'count' => 100,
                        // The curated heroes are served only for this source.
                        'source' => 'change-site-design-workflow',
                    ]),
                ]);
            } finally {
                \remove_filter('http_request_args', $brief, 101);
            }

            $heroes = \wp_remote_retrieve_response_code($response) === 200
                ? json_decode(\wp_remote_retrieve_body($response), true)
                : null;
            // A failed fetch offers only the site's own hero, and asks again soon.
            \set_transient(
                $key,
                is_array($heroes) ? $heroes : [],
                is_array($heroes) ? DAY_IN_SECONDS : 10 * MINUTE_IN_SECONDS
            );
        }

        $pool = [];
        $slots = 0;
        foreach (is_array($heroes) ? $heroes : [] as $hero) {
            $code = is_string($hero['code'] ?? null) ? $hero['code'] : '';
            $blocks = self::named(\parse_blocks($code));
            // A pick swaps one block and finds it again by its class name.
            $name = count($blocks) === 1 ? self::nameIn($blocks) : null;
            if ($name) {
                $urls = is_array($hero['urls'] ?? null) ? $hero['urls'] : [];
                // Each starts past the photos the ones before it took, or every option shows the same one.
                $pool[$name] = ['code' => $code, 'urls' => $urls, 'start' => $slots];
                $slots += count($urls);
            }
        }

        return $pool;
    }

    private static function between($pattern, $code, $inner)
    {
        // A callback, so a $ or \ in the site's words is never read as a backreference.
        return preg_replace_callback($pattern, function ($match) use ($inner) {
            return $match[1] . $inner . $match[2];
        }, $code, 1);
    }

    private static function innerOf(array $blocks, $type, $tag)
    {
        foreach ($blocks as $block) {
            $found = $block['blockName'] === $type
                && preg_match("#<{$tag}\\b[^>]*>(.*?)</{$tag}>#is", $block['innerHTML'], $match);
            if ($found) {
                return $match[1];
            }
        }

        return null;
    }

    private static function linkOf(array $blocks)
    {
        foreach ($blocks as $block) {
            if ($block['blockName'] !== 'core/button') {
                continue;
            }

            $tags = new \WP_HTML_Tag_Processor($block['innerHTML']);
            $href = $tags->next_tag('a') ? $tags->get_attribute('href') : null;
            return is_string($href) ? $href : '';
        }

        return '';
    }

    private static function imagesOf(array $hero)
    {
        return self::photosIn(\serialize_block($hero));
    }

    private static function photosIn($html)
    {
        $images = [];
        $tags = new \WP_HTML_Tag_Processor((string) $html);
        while ($tags->next_tag('img')) {
            $src = $tags->get_attribute('src');
            if (!is_string($src) || preg_match('/\.svg\b|^data:image\/svg/i', $src)) {
                continue;
            }

            $images[] = self::bare($src);
        }

        return array_values(array_filter($images));
    }

    private static function bare($url)
    {
        return \esc_url_raw(preg_replace('/[?#].*$/s', '', (string) $url));
    }

    // An imported photo is its upload on the page and its source in the saved photos.
    private static function sourceOf($url)
    {
        if (strpos($url, 'unsplash.com') !== false) {
            return $url;
        }

        $attachment = \attachment_url_to_postid($url);
        $source = $attachment ? \get_post_meta($attachment, '_extendify_source_url', true) : '';
        return is_string($source) && $source !== '' ? self::bare($source) : $url;
    }

    // With only the hero's own photos, a hero with one would show it in every slot of every option.
    private static function imagesFor(array $hero)
    {
        $own = self::imagesOf($hero);
        $front = self::front();
        $shown = $front
            ? array_map([self::class, 'sourceOf'], self::photosIn(BlockIds::live("post:{$front}") ?? ''))
            : [];
        $saved = array_map([self::class, 'bare'], SiteImages::urls(\get_option('extendify_site_images', [])));
        // As the live agent's design picker takes them: photos the page doesn't show yet, then the hero's own.
        $fresh = array_values(array_filter($saved, function ($url) use ($own, $shown) {
            return $url !== '' && !in_array($url, $own, true) && !in_array($url, $shown, true);
        }));
        $room = max(0, self::MOST_IMAGES - count($own));
        return array_values(array_unique(array_merge(array_slice($fresh, 0, $room), $own)));
    }

    private static function flat(array $blocks)
    {
        $flat = [];
        foreach (self::named($blocks) as $block) {
            $flat = array_merge($flat, [$block], self::flat($block['innerBlocks']));
        }

        return $flat;
    }

    private static function classesOf(array $block)
    {
        $class = $block['attrs']['className'] ?? '';
        return is_string($class) ? preg_split('/\s+/', $class, -1, PREG_SPLIT_NO_EMPTY) : [];
    }

    private static function named(array $blocks)
    {
        return array_filter($blocks, function ($block) {
            return !empty($block['blockName']);
        });
    }
}

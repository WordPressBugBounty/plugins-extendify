<?php

/**
 * Where words show on the site.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Finds the pages, posts, synced patterns and template parts that show some words, for the agent to answer from.
 */
class FoundText
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const MOST = 20;

    public static function where($text)
    {
        $digits = self::digits($text);
        // A phone number shows in several formats, so only its digits tell where it is.
        $byDigits = strlen($digits) >= 7 && strlen($digits) * 2 >= strlen(preg_replace('/\s+/', '', $text));
        $needle = $byDigits ? $digits : self::words($text);
        if (strlen($needle) < 2) {
            return [];
        }

        $found = [];
        foreach (self::shownSources() as $source) {
            // A space at each tag, or words in neighbouring blocks would run together.
            $shown = \wp_strip_all_tags(str_replace('<', ' <', BlockIds::content($source) ?? ''));
            $haystack = $byDigits ? self::digits($shown) : self::words($shown);
            if (strpos($haystack, $needle) === false) {
                continue;
            }

            $found[] = self::placeOf($source, function ($text) use ($byDigits, $needle) {
                $haystack = $byDigits ? self::digits($text) : self::words($text);
                return strpos($haystack, $needle) !== false;
            });
            if (count($found) >= self::MOST) {
                break;
            }
        }

        return $found;
    }

    // A user asking about "my phone number" may not know it, and the profile may not either.
    public static function phones()
    {
        $saved = self::digits(BusinessInfo::saved()['phone'] ?? '');
        $numbers = [];
        foreach (self::shownSources() as $source) {
            foreach (PhoneNumbers::shownIn($source) as $shown) {
                $digits = self::digits($shown);
                $key = self::sameNumberIn($digits, array_keys($numbers)) ?? $digits;
                if (!isset($numbers[$key])) {
                    $numbers[$key] = [
                        'number' => $shown,
                        // The number saved at launch is the one the site shows as its own, sample or not.
                        'saved' => $saved !== '' && self::sameNumberIn($digits, [$saved]) !== null,
                        'places' => [],
                    ];
                }

                $numbers[$key]['places'][] = self::placeOf($source, function ($text) use ($digits) {
                    return strpos(self::digits($text), $digits) !== false;
                });
            }
        }

        return array_slice(array_values($numbers), 0, self::MOST);
    }

    // "1 (206) 555-0100" and "206-555-0100" are one number with and without its country code.
    private static function sameNumberIn($digits, array $known)
    {
        foreach ($known as $other) {
            $other = (string) $other;
            $short = strlen($digits) < strlen($other) ? $digits : $other;
            $long = $short === $digits ? $other : $digits;
            if (strlen($short) >= 7 && substr($long, -strlen($short)) === $short) {
                return $other;
            }
        }

        return null;
    }

    // "Where on the page?" is answered by the section, so each one holding the words is named.
    private static function sectionsWith($source, callable $holds)
    {
        $named = [];
        foreach (\parse_blocks(BlockIds::content($source) ?? '') as $block) {
            if (empty($block['blockName'])) {
                continue;
            }

            $text = \wp_strip_all_tags(str_replace('<', ' <', \serialize_block($block)));
            if ($holds($text)) {
                $named[] = self::sectionName($block);
            }
        }

        return array_values(array_unique(array_filter($named)));
    }

    // A pattern's own name when it has one, else its first heading.
    private static function sectionName(array $block)
    {
        $name = $block['attrs']['metadata']['name'] ?? '';
        if (is_string($name) && trim($name) !== '') {
            return trim($name);
        }

        if ($block['blockName'] === 'core/heading') {
            return trim(\wp_strip_all_tags($block['innerHTML'] ?? ''));
        }

        foreach ($block['innerBlocks'] ?? [] as $inner) {
            $found = self::sectionName($inner);
            if ($found !== '') {
                return $found;
            }
        }

        return '';
    }

    // A theme ships footer and header variants no template uses, which visitors never see.
    public static function shownSources()
    {
        $used = [];
        foreach (\get_block_templates([], 'wp_template') as $template) {
            foreach (\parse_blocks($template->content ?? '') as $block) {
                $used = array_merge($used, self::partSlugsIn($block));
            }
        }

        return array_values(array_filter(Draft::allSources(), function ($source) use ($used) {
            if (strpos($source, 'part:') !== 0) {
                return true;
            }

            $slug = substr($source, (int) strrpos($source, '/') + 1);
            return in_array($slug, $used, true);
        }));
    }

    private static function partSlugsIn(array $block)
    {
        $slugs = $block['blockName'] === 'core/template-part' && !empty($block['attrs']['slug'])
            ? [$block['attrs']['slug']]
            : [];
        foreach ($block['innerBlocks'] ?? [] as $inner) {
            $slugs = array_merge($slugs, self::partSlugsIn($inner));
        }

        return $slugs;
    }

    private static function digits($text)
    {
        return preg_replace('/\D+/', '', (string) $text);
    }

    private static function words($text)
    {
        return trim(preg_replace('/\s+/', ' ', strtolower(\html_entity_decode((string) $text, ENT_QUOTES))));
    }

    private static function placeOf($source, callable $holds)
    {
        list($kind, $id) = array_pad(explode(':', $source, 2), 2, '');
        if ($kind === 'post') {
            $post = \get_post((int) $id);
            $sections = self::sectionsWith($source, $holds);
            return [
                'title' => \get_the_title($post),
                'kind' => $post->post_type === 'wp_block' ? 'synced pattern' : $post->post_type,
                'status' => $post->post_status,
                'url' => $post->post_type === 'wp_block' ? '' : (string) \get_permalink($post),
            ] + ($sections ? ['in' => $sections] : []);
        }

        $template = \get_block_template($id, $kind === 'part' ? 'wp_template_part' : 'wp_template');
        $area = $template && !empty($template->area) && $template->area !== 'uncategorized' ? $template->area : '';
        return [
            'title' => $template ? $template->title : $id,
            // A header or footer shows on every page that uses it.
            'kind' => $kind === 'part' ? trim($area . ' template part') : 'template',
            'status' => 'publish',
            'url' => '',
        ];
    }
}

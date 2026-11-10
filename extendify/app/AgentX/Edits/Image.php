<?php

/**
 * Replace an image.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Swaps the picture an image, cover or media and text block shows for one in the media library.
 */
class Image extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'image';
    const METHODS = ['core/image' => 'image', 'core/cover' => 'cover', 'core/media-text' => 'mediaText'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $block = Tree::blockAt($blocks, $path);
        if (!isset(self::METHODS[$block['blockName']]) || !self::hasMarkup($block)) {
            return self::refuse('no_image', 'This block shows no picture to replace.');
        }

        $image = self::imageOf($args['image'] ?? null, $block);
        if (\is_wp_error($image)) {
            return $image;
        }

        $changed = self::{self::METHODS[$block['blockName']]}($block, $image);
        if (\is_wp_error($changed)) {
            return $changed;
        }

        return ['blocks' => Tree::setAt($blocks, $path, $changed), 'at' => $path, 'block' => $path];
    }

    // Only an image already in the media library, so a model can't point the page at any address.
    private static function imageOf($image, array $block)
    {
        $id = is_array($image) ? (int) ($image['id'] ?? 0) : 0;
        if (!$id || !\wp_attachment_is_image($id)) {
            return self::refuse('not_an_image', 'Pick an image from the media library.');
        }

        $size = $block['attrs']['sizeSlug'] ?? $block['attrs']['mediaSizeSlug'] ?? 'full';
        $url = \wp_get_attachment_image_url($id, $size) ?: \wp_get_attachment_url($id);
        $given = is_array($image) && isset($image['alt']) && is_string($image['alt']) ? $image['alt'] : null;
        $alt = $given ?? (string) \get_post_meta($id, '_wp_attachment_image_alt', true);
        return ['id' => $id, 'url' => $url, 'alt' => \sanitize_text_field($alt)];
    }

    private static function image(array $block, array $image)
    {
        $attrs = array_merge($block['attrs'], ['id' => $image['id']]);
        $toMedia = ($attrs['linkDestination'] ?? '') === 'media';
        $changed = self::withOpening($block, function ($opening) use ($image, $toMedia) {
            $tags = new \WP_HTML_Tag_Processor($opening);
            // A link to the media file follows the new picture.
            if ($toMedia && $tags->next_tag('a')) {
                $tags->set_attribute('href', \wp_get_attachment_url($image['id']));
            }

            if (!$tags->next_tag('img')) {
                return $opening;
            }

            self::pictured($tags, $image);
            return $tags->get_updated_html();
        });
        return array_merge($changed, ['attrs' => $attrs]);
    }

    private static function cover(array $block, array $image)
    {
        $attrs = $block['attrs'];
        if (($attrs['backgroundType'] ?? 'image') !== 'image' || !empty($attrs['useFeaturedImage'])) {
            return self::refuse('not_an_image', 'This cover shows a video or the featured image.');
        }

        $attrs = array_merge($attrs, ['id' => $image['id'], 'url' => $image['url']]);
        $changed = self::withOpening($block, function ($opening) use ($image) {
            $tags = new \WP_HTML_Tag_Processor($opening);
            if ($tags->next_tag(['tag_name' => 'img', 'class_name' => 'wp-block-cover__image-background'])) {
                self::pictured($tags, $image);
                return $tags->get_updated_html();
            }

            // A fixed or repeated background is drawn as a CSS background on a div.
            $tags = new \WP_HTML_Tag_Processor($opening);
            if ($tags->next_tag(['class_name' => 'wp-block-cover__image-background'])) {
                $style = (string) $tags->get_attribute('style');
                $url = 'url(' . \esc_url($image['url']) . ')';
                $tags->set_attribute('style', preg_replace('#url\([^)]*\)#', $url, $style));
                return $tags->get_updated_html();
            }

            return $opening;
        });
        return array_merge($changed, ['attrs' => $attrs]);
    }

    private static function mediaText(array $block, array $image)
    {
        if (($block['attrs']['mediaType'] ?? 'image') !== 'image') {
            return self::refuse('not_an_image', 'This block shows a video.');
        }

        $attrs = array_merge($block['attrs'], ['mediaId' => $image['id']]);
        $changed = self::withOpening($block, function ($opening) use ($image) {
            $tags = new \WP_HTML_Tag_Processor($opening);
            if (!$tags->next_tag(['class_name' => 'wp-block-media-text__media']) || !$tags->next_tag('img')) {
                return $opening;
            }

            self::pictured($tags, $image);
            return $tags->get_updated_html();
        });
        return array_merge($changed, ['attrs' => $attrs]);
    }

    private static function pictured(\WP_HTML_Tag_Processor $tags, array $image)
    {
        $tags->set_attribute('src', $image['url']);
        $tags->set_attribute('alt', $image['alt']);
        foreach (preg_split('/\s+/', (string) $tags->get_attribute('class'), -1, PREG_SPLIT_NO_EMPTY) as $class) {
            if (preg_match('/^wp-image-\d+$/', $class)) {
                $tags->remove_class($class);
            }
        }

        $tags->add_class('wp-image-' . $image['id']);
    }
}

<?php

/**
 * Describe a picture.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Changes the description an image, cover or media and text block's picture has for screen readers, its alt text,
 * on the page itself: a picture brought in with the site has no media library entry to keep it.
 */
class Alt extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'alt';
    // The picture's tag in each block's markup; a cover also keeps its alt text as an attribute.
    const PICTURES = [
        'core/image' => ['tag_name' => 'img'],
        'core/cover' => ['class_name' => 'wp-block-cover__image-background'],
        'core/media-text' => ['tag_name' => 'img'],
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $block = Tree::blockAt($blocks, $path);
        $picture = self::PICTURES[$block['blockName']] ?? null;
        if (!$picture || !self::hasMarkup($block)) {
            return self::refuse('no_image', 'This block shows no picture to describe.');
        }

        $alt = \sanitize_text_field((string) ($args['alt'] ?? ''));
        $found = false;
        $changed = self::withOpening($block, function ($opening) use ($picture, $alt, &$found) {
            $tags = new \WP_HTML_Tag_Processor($opening);
            if (!$tags->next_tag($picture)) {
                return $opening;
            }

            $found = true;
            // A fixed cover draws its picture as a background, described by its label.
            $tags->set_attribute($tags->get_tag() === 'IMG' ? 'alt' : 'aria-label', $alt);
            return $tags->get_updated_html();
        });
        if (!$found) {
            return self::refuse('no_image', 'This block shows no picture to describe.');
        }

        if ($block['blockName'] === 'core/cover') {
            $changed['attrs'] = array_merge($changed['attrs'], ['alt' => $alt]);
        }

        return ['blocks' => Tree::setAt($blocks, $path, $changed), 'at' => $path, 'block' => $path];
    }
}

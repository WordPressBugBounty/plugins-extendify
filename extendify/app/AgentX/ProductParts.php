<?php

/**
 * A product page's own parts, and excerpts.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Marks what Quick Edit can change where WordPress or WooCommerce renders it outside the page's block ids,
 * or shows it changed: a product page's own parts, and an excerpt shown whole.
 */
class ProductParts
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ATTRIBUTE = 'data-extendify-product-part';
    const PRODUCT = 'data-product-id';
    const EXCERPT = 'data-extendify-excerpt';
    // All of an excerpt the card cuts short or makes up from the post, which editing starts from.
    const FULL = 'data-extendify-excerpt-full';
    // The block showing each part of the product Quick Edit can change.
    const PARTS = [
        'core/post-title' => 'name',
        'woocommerce/product-price' => 'price',
        'woocommerce/product-image-gallery' => 'photo',
        'core/post-excerpt' => 'summary',
    ];
    const DESCRIPTION = 'single-product/tabs/description.php';
    // WooCommerce's save strips these from a description, so the page's copy of one can't be saved back.
    const STRIPPED = '/<(iframe|script|form|input|textarea|select|button|object|embed|video|audio|style)\b/i';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function mark()
    {
        \add_filter('render_block', [self::class, 'marked'], PHP_INT_MAX, 3);
        // The description prints from WooCommerce's tab template, not from a block of its own.
        \add_action('woocommerce_before_template_part', [self::class, 'openDescription']);
        \add_action('woocommerce_after_template_part', [self::class, 'closeDescription']);
    }

    public static function marked($html, $block, $instance = null)
    {
        $name = $block['blockName'] ?? '';
        $shown = (int) ($instance->context['postId'] ?? 0);
        $product = self::product();
        if (!is_string($html)) {
            return $html;
        }

        if ($name === 'core/post-excerpt' && !$product) {
            return self::excerpt($html, $block, $shown ?: (int) \get_the_ID());
        }

        $part = self::PARTS[$name] ?? null;
        // A related product's card on the page shows its own name and price.
        if (!$part || !$product || ($shown && $shown !== $product)) {
            return $html;
        }

        $attributes = [self::ATTRIBUTE => $part, self::PRODUCT => (string) $product];
        if ($part === 'summary') {
            $raw = trim((string) \get_post_field('post_excerpt', $product));
            if ($raw === '' || !self::plain($raw)) {
                return $html;
            }

            $attributes += self::whole($raw, $block) ? [] : [self::FULL => $raw];
        }

        return self::tagged($html, $attributes);
    }

    public static function openDescription($template)
    {
        $product = self::product();
        if ($template !== self::DESCRIPTION || !$product || (int) \get_the_ID() !== $product) {
            return;
        }

        if (self::savable((string) \get_post_field('post_content', $product))) {
            // After the content's own filters, so what's marked is what the page shows of it.
            \add_filter('the_content', [self::class, 'describedContent'], 13);
        }
    }

    public static function closeDescription($template)
    {
        if ($template === self::DESCRIPTION) {
            \remove_filter('the_content', [self::class, 'describedContent'], 13);
        }
    }

    public static function describedContent($content)
    {
        \remove_filter('the_content', [self::class, 'describedContent'], 13);
        return sprintf(
            '<div %s="description" %s="%d">%s</div>',
            \esc_attr(self::ATTRIBUTE),
            \esc_attr(self::PRODUCT),
            (int) self::product(),
            $content
        );
    }

    // The block strips an excerpt's tags and line breaks, which its words saved back would lose.
    private static function plain($raw)
    {
        return $raw === \wp_strip_all_tags($raw) && !preg_match('/[\r\n]/', $raw);
    }

    private static function whole($raw, array $block)
    {
        return $raw !== '' && \wp_trim_words($raw, self::lengthOf($block), '') === preg_replace('/[\t ]+/', ' ', $raw);
    }

    private static function lengthOf(array $block)
    {
        return (int) ($block['attrs']['excerptLength'] ?? 55);
    }

    // The page shows the description rendered, which saved back would freeze blocks, shortcodes and embeds.
    private static function savable($raw)
    {
        return trim($raw) !== ''
            && !\has_blocks($raw)
            && !preg_match('/' . \get_shortcode_regex() . '/', $raw)
            && !preg_match('#^\h*https?://[^\s<>"]+\h*$#im', $raw)
            && !preg_match(self::STRIPPED, $raw);
    }

    private static function excerpt($html, array $block, $post)
    {
        $type = (string) \get_post_type($post);
        if (!$post || !in_array($type, ['post', 'page'], true) || !\post_type_supports($type, 'excerpt')) {
            return $html;
        }

        $raw = trim((string) \get_post_field('post_excerpt', $post));
        // Blocks marks on excerpts this user can't change, so Quick Edit offers no edit WordPress would refuse.
        if (!\current_user_can('edit_post', $post) || !self::plain($raw)) {
            return $html;
        }

        if (self::whole($raw, $block)) {
            return self::tagged($html, [self::EXCERPT => (string) $post]);
        }

        // With none of its own, the card shows the post's first words, which then become its excerpt.
        $full = $raw !== '' ? $raw : \wp_trim_words(
            \excerpt_remove_blocks(\strip_shortcodes((string) \get_post_field('post_content', $post))),
            self::lengthOf($block),
            ''
        );
        return $full === '' ? $html : self::tagged($html, [self::EXCERPT => (string) $post, self::FULL => $full]);
    }

    private static function tagged($html, array $attributes)
    {
        $tags = new \WP_HTML_Tag_Processor($html);
        if (!$tags->next_tag() || $tags->get_attribute(key($attributes)) !== null) {
            return $html;
        }

        foreach ($attributes as $name => $value) {
            $tags->set_attribute($name, $value);
        }

        return $tags->get_updated_html();
    }

    // The product whose own page this is, when this user may change it.
    private static function product()
    {
        if (!function_exists('is_product') || !\is_product()) {
            return 0;
        }

        $product = (int) \get_queried_object_id();
        // Blocks marks for users who can't edit the product, whose saves WooCommerce refuses.
        return \current_user_can('edit_post', $product) ? $product : 0;
    }
}

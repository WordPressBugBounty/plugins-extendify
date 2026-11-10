<?php

/**
 * Block ids.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Names each block the site frame renders by where it is stored, and finds it again.
 */
class BlockIds
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ATTRIBUTE = 'data-extendify-block';
    const TYPE_ATTRIBUTE = 'data-extendify-block-type';
    // A hidden title draws nothing, so the logo beside it says whether it shows.
    const TITLE_ATTRIBUTE = 'data-extendify-title';
    // Outside attrs, so no render callback or serialized markup sees them.
    const ID = 'extendifyBlockId';
    const LIST_TOKEN = 'extendifyList';
    const TITLE = 'extendifyTitle';
    const TEMPLATE = 0;
    // Their first tag belongs to their first child.
    const UNWRAPPED = ['core/block', 'core/pattern', 'core/null'];
    // Their first tag is only part of what they show, like SimplyBook's demo notice above its calendar.
    const WRAPPED = ['simplybook/widget'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    private static $lists = [];
    private static $tokens = 0;

    public static function stamp()
    {
        self::$lists = [];
        \add_filter('template_include', [self::class, 'listTemplate'], PHP_INT_MAX);
        \add_filter('render_block_data', [self::class, 'enter'], PHP_INT_MIN, 3);
        \add_filter('render_block', [self::class, 'leave'], PHP_INT_MAX, 2);
        \add_filter('block_core_navigation_render_inner_blocks', [self::class, 'navigation'], PHP_INT_MAX);
    }

    public static function find($id)
    {
        $split = strrpos((string) $id, ':');
        $path = $split === false ? '' : substr($id, $split + 1);
        if (!preg_match('/^\d+(\.\d+)*$/', $path)) {
            return null;
        }

        $blocks = self::blocks(substr($id, 0, $split));
        foreach (explode('.', $path) as $index) {
            $block = $blocks[$index] ?? null;
            if (!$block) {
                return null;
            }

            $blocks = self::children($block);
        }

        return $block;
    }

    public static function listTemplate($template)
    {
        global $_wp_current_template_id;
        if ($_wp_current_template_id) {
            self::$lists[self::TEMPLATE] = self::sourceList('template:' . $_wp_current_template_id);
        }

        return $template;
    }

    public static function enter($block, $original = null, $parent = null)
    {
        $token = self::rootList($parent);
        if ($token !== null && !empty($block['blockName'])) {
            $block = self::take($token, $block);
        }

        $list = self::listInside($block);
        if ($list !== null) {
            $block[self::LIST_TOKEN] = ++self::$tokens;
            self::$lists[self::$tokens] = $list;
        }

        $logo = ($block['blockName'] ?? '') === 'core/site-logo';
        if ($logo && $parent instanceof \WP_Block && Edits\LogoTitle::supported()) {
            $title = Edits\LogoTitle::stateIn($parent->parsed_block['innerBlocks'] ?? []);
            $block = $title === null ? $block : $block + [self::TITLE => $title];
        }

        return $block;
    }

    public static function leave($content, $block)
    {
        if (isset($block[self::LIST_TOKEN])) {
            unset(self::$lists[$block[self::LIST_TOKEN]]);
        }

        $id = $block[self::ID] ?? null;
        if ($id === null || in_array($block['blockName'], self::UNWRAPPED, true)) {
            return $content;
        }

        if (in_array($block['blockName'], self::WRAPPED, true)) {
            $content = '<div>' . $content . '</div>';
        }

        $tags = new \WP_HTML_Tag_Processor($content);
        if (!$tags->next_tag() || $tags->get_attribute(self::ATTRIBUTE) !== null) {
            return $content;
        }

        $tags->set_attribute(self::ATTRIBUTE, $id);
        $tags->set_attribute(self::TYPE_ATTRIBUTE, $block['blockName']);
        if (isset($block[self::TITLE])) {
            $tags->set_attribute(self::TITLE_ATTRIBUTE, $block[self::TITLE]);
        }

        $readable = Edits\Readable::forFrame($block);
        if ($readable !== null) {
            $tags->set_attribute('data-extendify-readable', \wp_json_encode($readable));
        }

        return $tags->get_updated_html();
    }

    // Core renders a menu's own blocks without render_block_data.
    public static function navigation($items)
    {
        $ref = self::menuOf(\WP_Block_Supports::$block_to_render);
        if (!$ref || !$items instanceof \WP_Block_List) {
            return $items;
        }

        $source = 'post:' . (int) $ref;
        $twins = self::blocks($source);
        foreach ($items as $index => $item) {
            $labeled = isset($twins[$index])
                ? self::label($item->parsed_block, $twins[$index], "{$source}:{$index}")
                : null;
            if ($labeled === null) {
                return $items;
            }

            $item->parsed_block = $labeled;
            // 6.8 added this; before it, a submenu's links get no ids.
            if (method_exists($item, 'refresh_parsed_block_dependents')) {
                $item->refresh_parsed_block_dependents();
            }
        }

        return $items;
    }

    public static function menuOf($navigation)
    {
        $attrs = $navigation['attrs'] ?? [];
        // Core still reads the attribute's old name, and it wins.
        $ref = $attrs['navigationMenuId'] ?? $attrs['ref'] ?? null;
        // Links stored inside the block come labeled by the source holding it.
        if ($ref || !empty($navigation['innerBlocks'])) {
            return $ref;
        }

        // A block with no menu of its own shows the newest menu.
        $fallback = \WP_Navigation_Fallback::get_fallback();
        return $fallback instanceof \WP_Post ? $fallback->ID : null;
    }

    // Each list renders inside the callback of the block that holds it.
    private static function rootList($parent)
    {
        global $wp_current_filter;
        $running = \WP_Block_Supports::$block_to_render;
        $token = $running === null ? self::TEMPLATE : ($running[self::LIST_TOKEN] ?? null);
        // A synced pattern renders its list as its own inner blocks.
        $holder = $parent ? ($parent->parsed_block[self::LIST_TOKEN] ?? null) : $token;
        if ($token === null || $holder !== $token || !isset(self::$lists[$token])) {
            return null;
        }

        // Blocks a filter renders from inside another block come from somewhere else.
        foreach (array_slice($wp_current_filter, 0, -1) as $hook) {
            if (strpos($hook, 'render_block') === 0 || $hook === 'pre_render_block') {
                return null;
            }
        }

        return $token;
    }

    private static function take($token, array $block)
    {
        $list = &self::$lists[$token];
        if ($list['lost']) {
            return $block;
        }

        $twin = $list['blocks'][$list['next']] ?? null;
        $labeled = $twin ? self::label($block, $twin, $list['prefix'] . $list['next']) : null;
        if ($labeled === null) {
            // Once one item differs, no later position can be trusted.
            $list['lost'] = true;
            return $block;
        }

        $list['next']++;
        return $labeled;
    }

    // A block changed on its way to render gets no id rather than a wrong one.
    private static function label(array $block, array $twin, $id)
    {
        $sameHtml = $block['innerHTML'] === $twin['innerHTML'] || self::mayChange($twin['innerHTML']);
        if (!$sameHtml || $block['blockName'] !== $twin['blockName'] || $block['attrs'] !== $twin['attrs']) {
            return null;
        }

        $twins = self::named($twin['innerBlocks']);
        $index = 0;
        foreach ($block['innerBlocks'] as $key => $inner) {
            $labeled = isset($twins[$index]) ? self::label($inner, $twins[$index], "{$id}.{$index}") : null;
            if ($labeled === null) {
                return null;
            }

            $block['innerBlocks'][$key] = $labeled;
            $index++;
        }

        if ($index !== count($twins)) {
            return null;
        }

        $block[self::ID] = $id;
        return $block;
    }

    // Core expands shortcodes and embeds lone links in some sources before parsing them.
    private static function mayChange($html)
    {
        $lines = \wp_replace_in_html_tags($html, ["\n" => '<!-- wp-line-break -->']);
        return strpos($html, '[') !== false
            || preg_match('|^\s*https?://[^\s<>"]+\s*$|im', $lines)
            || preg_match('|<p(?: [^>]*)?>\s*https?://[^\s<>"]+\s*</p>|i', $html);
    }

    private static function listInside(array $block)
    {
        $attrs = $block['attrs'] ?? [];
        switch ($block['blockName'] ?? '') {
            case 'core/template-part':
                $theme = $attrs['theme'] ?? \get_stylesheet();
                // Core renders only the active theme's parts.
                return isset($attrs['slug']) && $theme === \get_stylesheet()
                    ? self::sourceList("part:{$theme}//{$attrs['slug']}")
                    : null;
            case 'core/post-content':
                if (!\get_the_ID()) {
                    return null;
                }

                // Core prints the global post, whatever the block's context names.
                $list = self::sourceList('post:' . \get_the_ID());
                $list['next'] = self::pageStart($list['blocks']);
                return $list;
            case 'core/block':
                return empty($attrs['ref']) ? null : self::sourceList('post:' . (int) $attrs['ref']);
            case 'core/pattern':
                return isset($block[self::ID]) ? self::newList($block[self::ID] . '.', self::children($block)) : null;
        }

        return null;
    }

    // Core prints one page of a post split by nextpage blocks.
    private static function pageStart(array $blocks)
    {
        $starts = [0];
        foreach ($blocks as $index => $block) {
            if ($block['blockName'] === 'core/nextpage') {
                $starts[] = $index + 1;
            }
        }

        // A nextpage that opens the post starts no page of its own.
        if (count($starts) > 1 && $starts[1] === 1) {
            array_shift($starts);
        }

        $page = max(1, (int) ($GLOBALS['page'] ?? 1));
        return $starts[min($page, count($starts)) - 1];
    }

    private static function sourceList($source)
    {
        return self::newList("{$source}:", self::blocks($source));
    }

    private static function newList($prefix, array $blocks)
    {
        return ['prefix' => $prefix, 'blocks' => $blocks, 'next' => 0, 'lost' => false];
    }

    // Each source as core renders it, so the render and find() walk one tree.
    public static function content($source, $hooks = 'insert_hooked_blocks')
    {
        return self::read($source, Draft::content($source), $hooks);
    }

    public static function live($source, $hooks = 'insert_hooked_blocks')
    {
        return self::read($source, null, $hooks);
    }

    private static function read($source, $drafted, $hooks)
    {
        $parts = explode(':', $source, 2);
        $key = $parts[1] ?? '';
        if (in_array($parts[0], ['template', 'part'], true)) {
            $template = $drafted === null
                ? \get_block_template($key, $parts[0] === 'part' ? 'wp_template_part' : 'wp_template')
                : null;
            return $template ? $template->content : $drafted;
        }

        // get_post(0) returns the global post.
        $post = $parts[0] === 'post' && preg_match('/^[1-9]\d*$/', $key) ? \get_post((int) $key) : null;
        if (!$post) {
            return null;
        }

        // Core adds hooked blocks to every post it renders blocks from.
        return function_exists('apply_block_hooks_to_content_from_post_object')
            ? \apply_block_hooks_to_content_from_post_object($drafted ?? $post->post_content, $post, $hooks)
            : $drafted ?? $post->post_content;
    }

    private static function blocks($source)
    {
        return self::named(\parse_blocks(self::content($source) ?? ''));
    }

    // A theme pattern has no stored copy, so its blocks belong to the source holding it.
    private static function children(array $block)
    {
        if ($block['blockName'] !== 'core/pattern') {
            return self::named($block['innerBlocks']);
        }

        $pattern = \WP_Block_Patterns_Registry::get_instance()->get_registered($block['attrs']['slug'] ?? '');
        return $pattern ? self::named(\parse_blocks($pattern['content'])) : [];
    }

    private static function named(array $blocks)
    {
        return array_values(array_filter($blocks, function ($block) {
            return !empty($block['blockName']);
        }));
    }
}

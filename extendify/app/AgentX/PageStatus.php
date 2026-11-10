<?php

/**
 * Whether one page or post is live.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Publishes, unpublishes or trashes one page or post through WordPress's own REST routes.
 */
class PageStatus
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const STATUSES = ['publish', 'draft', 'trash'];

    /**
     * Every public post type, so a product, event or course publishes like a page.
     *
     * @return array
     */
    public static function types()
    {
        // An attachment takes its status from its parent, so it is never published on its own.
        return \array_values(\array_diff(\get_post_types(['public' => true], 'names'), ['attachment']));
    }

    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const PREVIEW_PARAM = 'extendify-page-preview';

    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const MOST_TRASHED = 10;

    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const MOST_LINKS = 10;

    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const SPECIAL = [
        'woocommerce_shop_page_id' => 'WooCommerce shop',
        'woocommerce_cart_page_id' => 'WooCommerce cart',
        'woocommerce_checkout_page_id' => 'WooCommerce checkout',
        'woocommerce_myaccount_page_id' => 'WooCommerce account',
        'wp_page_for_privacy_policy' => 'privacy policy',
    ];

    /**
     * The page or post at an address, as the card asks the user to confirm it.
     *
     * @param string $url - Its address, as the agent read it from the site.
     * @return array|\WP_Error
     */
    public static function target($url)
    {
        $post = self::post($url);
        if (\is_wp_error($post)) {
            return $post;
        }

        return [
            'id' => $post->ID,
            'title' => self::title($post->ID),
            'type' => $post->post_type,
            'status' => $post->post_status,
            'label' => self::label($post->post_status),
            'role' => self::role($post->ID),
        ];
    }

    /**
     * Changes the status of the page or post at an address, and says what it was and is now.
     *
     * @param string $url    - Its address, as the agent read it from the site.
     * @param string $status - publish, draft or trash.
     * @return array|\WP_Error
     */
    public static function change($url, $status)
    {
        if (!in_array($status, self::STATUSES, true)) {
            return self::refused(sprintf('%s is not a status the agent can set.', $status));
        }

        $post = self::post($url);
        if (\is_wp_error($post)) {
            return $post;
        }

        // The draft would lose its unsaved edits and report them as an outside change.
        if ($status === 'trash' && Draft::content('post:' . $post->ID) !== null) {
            return self::refused(sprintf(
                '%s has unsaved changes. Save or discard them first.',
                self::title($post->ID)
            ));
        }

        $before = $post->post_status;
        if ($before !== $status) {
            // Core's route refuses users who can't edit, publish or delete this post.
            $response = \rest_do_request(self::request($post, $status));
            if ($response->is_error()) {
                return self::explained($response->as_error(), $post);
            }
        }

        $after = \get_post_status($post->ID);
        // Another plugin can block the change, so never report one that didn't happen.
        if ($after !== $status) {
            return self::refused(sprintf('%s is still %s.', self::title($post->ID), self::label($after)));
        }

        // Core moves the reading settings off a trashed page; an unpublished one would leave visitors nothing.
        if ($after === 'draft') {
            self::letGo($post->ID);
        }

        if ($before !== $after && $after !== 'trash' && in_array('publish', [$before, $after], true)) {
            Draft::recordLive(LiveSaves::item('status', $before, $after, $post->ID));
        }

        $changed = [
            'id' => $post->ID,
            'before' => $before,
            'after' => $after,
            'title' => self::title($post->ID),
            'url' => $after === 'trash' ? '' : \get_permalink($post->ID),
            'labels' => ['before' => self::label($before), 'after' => self::label($after)],
        ];

        // The chat offers to add a published page to the menu only when no menu links it.
        if ($after === 'publish' && $post->post_type === 'page') {
            $changed['inMenu'] = (bool) self::menusLinking($post->ID);
        }

        return $changed;
    }

    /**
     * The pages and posts in the trash the user could restore, newest first.
     *
     * @return array
     */
    public static function trashed()
    {
        $posts = \get_posts([
            'post_type' => self::types(),
            'post_status' => 'trash',
            'numberposts' => self::MOST_TRASHED * 2,
            'meta_key' => '_wp_trash_meta_time',
            'orderby' => 'meta_value_num',
            'order' => 'DESC',
        ]);
        // Hides trashed posts the user can't restore, since restoring takes the right to delete.
        $restorable = array_filter($posts, function ($post) {
            return \current_user_can('delete_post', $post->ID);
        });

        return array_values(array_map(function ($post) {
            return ['id' => $post->ID, 'title' => self::title($post->ID), 'type' => $post->post_type];
        }, array_slice($restorable, 0, self::MOST_TRASHED)));
    }

    /**
     * Takes a page or post out of the trash with the status it had, and says what it is now.
     *
     * @param int $id - The trashed page or post.
     * @return array|\WP_Error
     */
    public static function restore($id)
    {
        $post = \get_post((int) $id);
        if (!$post || !in_array($post->post_type, self::types(), true) || $post->post_status !== 'trash') {
            return self::refused('That page or post is not in the trash.');
        }

        // Blocks restoring a post the user has no right to delete, as core's trash screen does.
        if (!\current_user_can('delete_post', $post->ID)) {
            return self::refused(sprintf('You can\'t restore %s.', self::title($post->ID)));
        }

        // WordPress restores a post as a draft unless asked for the status it had.
        \add_filter('wp_untrash_post_status', 'wp_untrash_post_set_previous_status', 10, 3);
        $untrashed = \wp_untrash_post($post->ID);
        \remove_filter('wp_untrash_post_status', 'wp_untrash_post_set_previous_status', 10);
        $after = \get_post_status($post->ID);
        if (!$untrashed || $after === 'trash') {
            return self::refused(sprintf('%s is still in the trash.', self::title($post->ID)));
        }

        return [
            'id' => $post->ID,
            'before' => 'trash',
            'after' => $after,
            'title' => self::title($post->ID),
            'url' => $after === 'publish' ? \get_permalink($post->ID) : \get_preview_post_link($post->ID),
            'labels' => ['before' => self::label('trash'), 'after' => self::label($after)],
        ];
    }

    private static function post($url)
    {
        // get_post(0) falls back to the global post, which named the homepage for a draft's address.
        $id = self::find($url);
        $post = $id ? \get_post($id) : null;
        if (!$post || !in_array($post->post_type, self::types(), true)) {
            return self::refused(sprintf('%s is not one of the site\'s pages or posts.', $url));
        }

        return $post;
    }

    /**
     * Sets a page or post's status, as Undo puts a publish back, with core's own checks.
     *
     * @param int    $id     - The page or post.
     * @param string $status - publish or draft.
     * @return true|\WP_Error
     */
    public static function setStatus($id, $status)
    {
        $post = \get_post($id);
        $known = $post && in_array($post->post_type, self::types(), true);
        if (!$known || !in_array($status, ['publish', 'draft'], true)) {
            return self::refused('That page or post is gone.');
        }

        $response = \rest_do_request(self::request($post, $status));
        if ($response->is_error()) {
            return self::explained($response->as_error(), $post);
        }

        if ($status === 'draft') {
            self::letGo($post->ID);
        }

        $now = \get_post_status($post->ID);
        if ($now !== $status) {
            return self::refused(sprintf('%s is still %s.', self::title($post->ID), self::label($now)));
        }

        return true;
    }

    // With the trash off, core's error asks for a force flag the agent never sends.
    private static function explained($error, $post)
    {
        if ($error->get_error_code() !== 'rest_trash_not_supported') {
            return $error;
        }

        return self::refused(sprintf(
            'This site has the trash turned off, so %s can\'t be deleted here.',
            self::title($post->ID)
        ));
    }

    private static function request($post, $status)
    {
        if ($status === 'trash') {
            return new \WP_REST_Request('DELETE', \rest_get_route_for_post($post));
        }

        $request = new \WP_REST_Request('POST', \rest_get_route_for_post($post));
        $request->set_param('status', $status);
        // A future-dated post stays scheduled unless its date moves to now.
        if ($status === 'publish' && strtotime($post->post_date_gmt) > time()) {
            $request->set_param('date_gmt', gmdate('Y-m-d\TH:i:s'));
        }

        return $request;
    }

    /**
     * The page or post an address points at, the posts page's pretty address included.
     *
     * @param string $url - An address on the site.
     * @return int
     */
    public static function find($url)
    {
        $query = [];
        \parse_str((string) \wp_parse_url($url, PHP_URL_QUERY), $query);
        foreach (['page_id', 'p'] as $key) {
            if (!empty($query[$key]) && is_numeric($query[$key])) {
                return (int) $query[$key];
            }
        }

        $id = \url_to_postid($url);
        if ($id) {
            return $id;
        }

        // url_to_postid can't resolve the posts page's pretty address.
        $posts = (int) \get_option('page_for_posts');
        $bare = \untrailingslashit((string) strtok($url, '?#'));
        return $posts && $bare === \untrailingslashit(\get_permalink($posts)) ? $posts : 0;
    }

    private static function role($id)
    {
        // WordPress ignores both options while the homepage shows the latest posts.
        if (\get_option('show_on_front') !== 'page') {
            return '';
        }

        if ((int) \get_option('page_on_front') === $id) {
            return 'homepage';
        }

        return (int) \get_option('page_for_posts') === $id ? 'posts' : '';
    }

    private static function letGo($id)
    {
        $role = self::role($id);
        if ($role === 'homepage') {
            \update_option('show_on_front', 'posts');
            \update_option('page_on_front', 0);
        }

        if ($role === 'posts') {
            \update_option('page_for_posts', 0);
        }
    }

    /**
     * What deleting each page or post would touch, for the agent to ask about first.
     *
     * @param array $ids - The pages or posts it may delete.
     * @return array
     */
    public static function facts(array $ids)
    {
        $posts = array_filter(array_map('get_post', array_map('intval', $ids)), function ($post) {
            return $post && in_array($post->post_type, self::types(), true);
        });

        // wp_check_post_lock lives in wp-admin, which a REST request doesn't load.
        if (!function_exists('wp_check_post_lock')) {
            require_once ABSPATH . 'wp-admin/includes/post.php';
        }

        return array_values(array_map(function ($post) {
            $locked = \wp_check_post_lock($post->ID);
            $editor = $locked ? \get_userdata($locked) : null;
            return [
                'id' => $post->ID,
                'title' => self::title($post->ID),
                'type' => $post->post_type,
                'status' => $post->post_status,
                'url' => \get_permalink($post->ID),
                'role' => self::role($post->ID),
                'special' => self::special($post->ID),
                'menus' => self::menusLinking($post->ID),
                'linkedFrom' => array_slice($linking = self::linkingPages($post->ID), 0, self::MOST_LINKS),
                'linkedMore' => count($linking) > self::MOST_LINKS,
                'children' => count(\get_children(['post_parent' => $post->ID, 'post_type' => $post->post_type])),
                'unsaved' => Draft::content('post:' . $post->ID) !== null,
                'editing' => $editor ? $editor->display_name : '',
                'canDelete' => \current_user_can('delete_post', $post->ID),
                // Core's own check, which a plugin can turn off per post type.
                // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- core's filter
                'trash' => (bool) \apply_filters("rest_{$post->post_type}_trashable", EMPTY_TRASH_DAYS > 0, $post),
                'menusEditable' => self::menusEditable($post->ID),
            ];
        }, $posts));
    }

    /**
     * Whether a delete may take the post's links out of its menus, which delete() otherwise refuses.
     *
     * @param int $id - The page or post.
     * @return bool
     */
    private static function menusEditable($id)
    {
        // Mirrors delete(), which blocks a user who can't edit menus from having them rewritten.
        if (!\current_user_can('edit_theme_options')) {
            return false;
        }

        foreach (self::navigationsLinking($id) as $navigation) {
            if (Draft::content('post:' . $navigation->ID) !== null) {
                return false;
            }
        }

        return true;
    }

    /**
     * Trashes a page or post, first taking its links out of every menu when asked.
     *
     * @param int  $id    - The page or post.
     * @param bool $menus - Whether its menu links go too.
     * @return array|\WP_Error
     */
    public static function delete($id, $menus = false)
    {
        $post = \get_post((int) $id);
        if (!$post || !in_array($post->post_type, self::types(), true)) {
            return self::refused('That is not one of the site\'s pages or posts.');
        }

        // Blocks a user who can't delete the post from trashing it or rewriting the menus that link it.
        if (!\current_user_can('delete_post', $post->ID)) {
            return self::refused(sprintf('You can\'t delete %s.', self::title($post->ID)));
        }

        if ($menus) {
            // Blocks a user who can't edit the site's menus from having the agent rewrite them.
            if (!\current_user_can('edit_theme_options')) {
                return self::refused('You can\'t change the site\'s menus.');
            }

            foreach (self::navigationsLinking($post->ID) as $navigation) {
                // The draft holds a copy of this menu, so rewriting it here would leave the draft stuck.
                if (Draft::content('post:' . $navigation->ID) !== null) {
                    return self::refused(sprintf(
                        '%s has unsaved changes. Save or discard them first.',
                        self::title($navigation->ID)
                    ));
                }
            }
        }

        // The trashed page's address changes, so its links are matched by the one it had.
        $url = self::linkUrl($post->ID);
        $changed = self::change(\get_permalink($post->ID), 'trash');
        if (\is_wp_error($changed)) {
            return $changed;
        }

        return $changed + ['menus' => $menus ? self::removeFromMenus($post->ID, $url) : 0];
    }

    private static function special($id)
    {
        foreach (self::SPECIAL as $option => $name) {
            if ((int) \get_option($option) === $id) {
                return $name;
            }
        }

        return '';
    }

    private static function linksTo(array $block, $id, $url)
    {
        if (!in_array($block['blockName'], ['core/navigation-link', 'core/navigation-submenu'], true)) {
            return false;
        }

        $attrs = $block['attrs'];
        // A category or tag link keeps a term id, which can share the page's number.
        $post = ($attrs['kind'] ?? '') === 'post-type' || in_array($attrs['type'] ?? '', self::types(), true);
        $byUrl = $url !== null && isset($attrs['url']) && \untrailingslashit($attrs['url']) === $url;
        return ($post && (int) ($attrs['id'] ?? 0) === $id) || $byUrl;
    }

    // A link to the home address still works once the homepage page is gone.
    private static function linkUrl($id)
    {
        return self::role($id) === 'homepage' ? null : \untrailingslashit(\get_permalink($id));
    }

    private static function navigationsLinking($id)
    {
        $url = self::linkUrl($id);
        return array_filter(self::navigations(), function ($navigation) use ($id, $url) {
            return self::holdsLink(\parse_blocks($navigation->post_content), $id, $url);
        });
    }

    private static function holdsLink(array $blocks, $id, $url)
    {
        foreach ($blocks as $block) {
            if (self::linksTo($block, $id, $url) || self::holdsLink($block['innerBlocks'], $id, $url)) {
                return true;
            }
        }

        return false;
    }

    private static function navigations()
    {
        return \get_posts(['post_type' => 'wp_navigation', 'post_status' => 'publish', 'numberposts' => -1]);
    }

    private static function menuItems($id)
    {
        return \get_posts([
            'post_type' => 'nav_menu_item',
            'numberposts' => -1,
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- one page's menu items
            'meta_query' => [
                ['key' => '_menu_item_object_id', 'value' => $id],
                ['key' => '_menu_item_type', 'value' => 'post_type'],
            ],
        ]);
    }

    private static function menusLinking($id)
    {
        $names = array_map(function ($navigation) {
            return self::title($navigation->ID);
        }, array_values(self::navigationsLinking($id)));

        foreach (self::menuItems($id) as $item) {
            foreach (\wp_get_object_terms($item->ID, 'nav_menu', ['fields' => 'names']) as $name) {
                $names[] = $name;
            }
        }

        return array_values(array_unique($names));
    }

    private static function withoutLinks(array $blocks, $id, $url, &$removed)
    {
        $kept = [];
        foreach ($blocks as $block) {
            $inner = self::withoutLinksInside($block, $id, $url, $removed);
            if (!self::linksTo($block, $id, $url)) {
                $kept[] = $inner;
                continue;
            }

            $removed++;
            // Core hides a submenu whose page is gone, items and all, so its items move up.
            if ($block['blockName'] === 'core/navigation-submenu') {
                $kept = array_merge($kept, $inner['innerBlocks']);
            }
        }

        return $kept;
    }

    private static function withoutLinksInside(array $block, $id, $url, &$removed)
    {
        $children = [];
        $content = [];
        $index = 0;
        foreach ($block['innerContent'] as $chunk) {
            if ($chunk !== null) {
                $content[] = $chunk;
                continue;
            }

            foreach (self::withoutLinks([$block['innerBlocks'][$index++]], $id, $url, $removed) as $child) {
                $children[] = $child;
                $content[] = null;
            }
        }

        return array_merge($block, ['innerBlocks' => $children, 'innerContent' => $content]);
    }

    private static function removeFromMenus($id, $url)
    {
        $removed = 0;
        foreach (self::navigations() as $navigation) {
            $before = $removed;
            $blocks = self::withoutLinks(\parse_blocks($navigation->post_content), $id, $url, $removed);
            if ($removed > $before) {
                // wp_update_post unslashes, which would turn the \u0026 serialize_blocks writes into u0026.
                \wp_update_post(\wp_slash(['ID' => $navigation->ID, 'post_content' => \serialize_blocks($blocks)]));
            }
        }

        foreach (self::menuItems($id) as $item) {
            \wp_delete_post($item->ID, true);
            $removed++;
        }

        return $removed;
    }

    private static function linkingPages($id)
    {
        $path = \wp_make_link_relative(\get_permalink($id));
        // Every address starts with the homepage's, so nothing could tell its links apart.
        if (\untrailingslashit($path) === '') {
            return [];
        }

        global $wpdb;
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- a content search core has no API for
        $found = $wpdb->get_col($wpdb->prepare(
            "SELECT ID FROM {$wpdb->posts} WHERE post_status = 'publish'"
                . " AND post_type IN ('page', 'post', 'wp_template_part', 'wp_block')"
                . ' AND ID != %d AND post_content LIKE %s LIMIT %d',
            $id,
            '%' . $wpdb->esc_like($path) . '%',
            self::MOST_LINKS + 1
        ));
        return array_map(function ($found) {
            return self::title((int) $found);
        }, $found);
    }

    private static function title($id)
    {
        return html_entity_decode(\get_the_title($id), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    private static function label($status)
    {
        $object = \get_post_status_object($status);
        return $object ? $object->label : $status;
    }

    private static function refused($message)
    {
        return new \WP_Error('extendify_agentx_page_status', $message, ['status' => 400]);
    }
}

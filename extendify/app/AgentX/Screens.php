<?php

/**
 * The pages of the site and the screens of its dashboard the agent can open for someone.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

class Screens
{
    private static $option = 'extendify_agentx_screens';

    private static $mostPages = 50;
    private static $mostScreens = 150;

    // The agent changes menus, page content and the site's look itself, so it never sends anyone here.
    private static $leftOut = [
        'themes.php',
        'site-editor.php',
        'customize.php',
        'nav-menus.php',
        'widgets.php',
        'theme-editor.php',
        'theme-install.php',
        'plugin-editor.php',
    ];

    // WordPress builds its menu only on dashboard pages, so each visit keeps a copy for the front end.
    public static function remember()
    {
        global $menu, $submenu;
        // A lower role's shorter menu would replace the admin's saved list.
        if (!\current_user_can('manage_options') || !is_array($menu)) {
            return;
        }

        $screens = self::fromMenu($menu, is_array($submenu) ? $submenu : []);
        if ($screens && \get_option(self::$option) !== $screens) {
            \update_option(self::$option, $screens, false);
        }
    }

    public static function all()
    {
        $kept = \get_option(self::$option);
        return array_merge(self::pages(), is_array($kept) && $kept ? $kept : self::fallback());
    }

    private static function pages()
    {
        $pages = \get_pages([
            'post_status' => 'publish',
            'number' => self::$mostPages,
            'sort_column' => 'menu_order,post_title',
        ]);
        return array_values(array_filter(array_map(function ($page) {
            $title = self::plain(\get_the_title($page));
            return $title === '' ? null : ['title' => $title, 'url' => \get_permalink($page)];
        }, $pages ?: [])));
    }

    private static function fromMenu(array $menu, array $submenu)
    {
        $screens = [];
        foreach ($menu as $item) {
            $slug = (string) ($item[2] ?? '');
            $section = self::titleOf($item[0] ?? '');
            if ($slug === '' || $section === '' || self::leftOut($slug)) {
                continue;
            }

            $items = $submenu[$slug] ?? [];
            if (!$items) {
                $url = self::urlOf($slug, 'admin.php');
                if ($url) {
                    $screens[] = ['title' => $section, 'url' => $url];
                }
                continue;
            }

            foreach ($items as $sub) {
                $subSlug = (string) ($sub[2] ?? '');
                $title = self::titleOf($sub[0] ?? '');
                $url = self::urlOf($subSlug, $slug);
                if ($title === '' || !$url || self::leftOut($subSlug)) {
                    continue;
                }
                $screens[] = ['title' => $title, 'url' => $url, 'section' => $section];
            }
        }

        return array_slice($screens, 0, self::$mostScreens);
    }

    // Until someone opens the dashboard, its menu was never built, so these stand in.
    private static function fallback()
    {
        $screens = [];
        foreach (\get_post_types(['show_ui' => true, 'show_in_menu' => true], 'objects') as $type) {
            if (strpos($type->name, 'wp_') === 0 || $type->name === 'attachment') {
                continue;
            }
            $list = $type->name === 'post' ? 'edit.php' : 'edit.php?post_type=' . $type->name;
            $new = $type->name === 'post' ? 'post-new.php' : 'post-new.php?post_type=' . $type->name;
            $section = self::plain($type->labels->name);
            $screens[] = ['title' => $section, 'url' => \admin_url($list), 'section' => $section];
            $screens[] = [
                'title' => self::plain($type->labels->add_new_item),
                'url' => \admin_url($new),
                'section' => $section,
            ];
        }

        $core = [
            // translators: Name of the WordPress dashboard page that lists every image and file on the site.
            'upload.php' => __('Media Library', 'extendify-local'),
            // translators: Name of the WordPress dashboard page that lists the comments visitors left.
            'edit-comments.php' => __('Comments', 'extendify-local'),
            // translators: Name of the WordPress dashboard page that lists the site's plugins.
            'plugins.php' => __('Plugins', 'extendify-local'),
            // translators: Name of the WordPress dashboard page that lists the people who can sign in to the site.
            'users.php' => __('Users', 'extendify-local'),
            // translators: Name of the WordPress dashboard page for adding a person who can sign in to the site.
            'user-new.php' => __('Add New User', 'extendify-local'),
            // translators: Name of the WordPress dashboard page with the site's general settings.
            'options-general.php' => __('General Settings', 'extendify-local'),
            // translators: Name of the WordPress dashboard page with the settings for comments.
            'options-discussion.php' => __('Discussion Settings', 'extendify-local'),
            // translators: Name of the WordPress dashboard page with the settings for page and post addresses.
            'options-permalink.php' => __('Permalink Settings', 'extendify-local'),
        ];
        foreach ($core as $path => $title) {
            $screens[] = ['title' => $title, 'url' => \admin_url($path)];
        }

        return $screens;
    }

    private static function leftOut($slug)
    {
        $file = strtok($slug, '?');
        return in_array($file, self::$leftOut, true) || strpos($slug, 'post_type=wp_') !== false;
    }

    // Waiting counts, like updates or comments to approve, follow the name in their own spans.
    private static function titleOf($html)
    {
        return self::plain((string) preg_replace('/<span.*$/s', '', (string) $html));
    }

    private static function plain($text)
    {
        return trim(html_entity_decode(\wp_strip_all_tags((string) $text), ENT_QUOTES, 'UTF-8'));
    }

    private static function urlOf($slug, $parent)
    {
        if ($slug === '' || strpos($slug, '://') !== false) {
            return '';
        }
        if (strpos($slug, '.php') !== false) {
            return \admin_url($slug);
        }
        $base = strpos($parent, '.php') !== false ? $parent : 'admin.php';
        return \admin_url($base . '?page=' . $slug);
    }
}

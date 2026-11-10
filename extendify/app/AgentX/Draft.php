<?php

/**
 * Draft.
 */

namespace Extendify\AgentX;

use Extendify\AgentX\Edits\Duplicate;
use Extendify\AgentX\Edits\Move;
use Extendify\AgentX\Edits\Ops;
use Extendify\AgentX\Edits\Remove;
use Extendify\AgentX\Edits\Style;
use Extendify\AgentX\Edits\Tree;
use Extendify\Notifications\Availability;

defined('ABSPATH') || die('No direct access.');

/**
 * Holds a user's unsaved changes and their versions, and renders the site frame from them.
 */
class Draft
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const PARAM = 'extendify-draft';
    const AT_PARAM = 'extendify-draft-at';
    const COOKIE = 'extendify_agentx_draft';
    const CACHE_GROUP = 'extendify_agentx_drafts';
    // Marked, so blocks hooked into a source are not added again when it renders.
    const HOOKS = 'insert_hooked_blocks_and_set_ignored_hooked_blocks_metadata';
    const KEEP = 50;
    const MOST_PAIRS = 8;
    const PAIR_LENGTH = 200;
    const LIVE_STYLES = [
        'variation' => '',
        'colors' => '',
        'fonts' => '',
        'vibe' => '',
        'animation' => '',
        'palette' => '',
        'settings' => '',
        'base' => null,
    ];
    const LAYERS = [
        'colors' => ColorSchemes::class,
        'fonts' => FontPairs::class,
        'vibe' => Vibes::class,
        'animation' => Animations::class,
    ];
    // The picks the frame lays over the saved styles.
    const PICKED_LAYERS = ['variation', 'colors', 'fonts', 'vibe', 'palette', 'settings'];
    // A request's words, kept to name its changes in the agent's list.
    const ASKED_LENGTH = 160;
    const WRITES = [
        'editBlock',
        'chooseVariation',
        'chooseStyle',
        'choosePalette',
        'chooseThemeSetting',
        'chooseLayout',
        'chooseLook',
        'replaceText',
        'undo',
        'drop',
        'redo',
        'restore',
        'revert',
        'discard',
        'save',
        'resolve',
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function table()
    {
        return $GLOBALS['wpdb']->prefix . 'extendify_agentx_drafts';
    }

    public static function install()
    {
        if (self::exists()) {
            return;
        }

        $wpdb = $GLOBALS['wpdb'];
        $wpdb->query(
            'CREATE TABLE ' . self::table() . ' (user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,'
                . ' data LONGTEXT NOT NULL, updated_at DATETIME NOT NULL) ' . $wpdb->get_charset_collate()
        );
    }

    public static function get()
    {
        $userId = \get_current_user_id();
        \wp_cache_add_non_persistent_groups([self::CACHE_GROUP]);
        $draft = \wp_cache_get($userId, self::CACHE_GROUP, false, $found);
        if ($found) {
            return $draft;
        }

        $wpdb = $GLOBALS['wpdb'];
        $row = $userId && self::exists()
            ? $wpdb->get_var($wpdb->prepare('SELECT data FROM ' . self::table() . ' WHERE user_id = %d', $userId))
            : null;
        $saved = json_decode($row ?: '[]', true) ?: [];
        $draft = array_merge([
            'version' => 0,
            'sources' => [],
            'variation' => '',
            'colors' => '',
            'fonts' => '',
            'vibe' => '',
            'animation' => '',
            'palette' => '',
            'settings' => '',
            'stylesBase' => null,
            'stylesLive' => null,
            'stylesSaved' => self::LIVE_STYLES,
            'snapshots' => [],
            'versions' => [],
            'current' => 0,
            'next' => 1,
            'titles' => [],
            'named' => [],
        ], $saved);
        $draft['stylesSaved'] = self::normalStyles($draft['stylesSaved']);
        \wp_cache_set($userId, $draft, self::CACHE_GROUP);
        return $draft;
    }

    public static function content($source)
    {
        return self::get()['sources'][$source]['content'] ?? null;
    }

    public static function state()
    {
        $draft = self::get();
        $user = \get_current_user_id();
        return [
            'version' => $draft['version'],
            'variation' => $draft['variation'],
            'colors' => $draft['colors'],
            'fonts' => $draft['fonts'],
            'vibe' => $draft['vibe'],
            'animation' => $draft['animation'],
            'liveAnimation' => Animations::current(),
            'layout' => self::layoutOf($draft),
            'unsaved' => $draft['sources'] || $draft['titles'] || self::stylesOf($draft) !== self::LIVE_STYLES,
            'current' => $draft['current'] ? $draft['versions'][$draft['current'] - 1]['id'] : 0,
            'versions' => array_map(function ($entry, $index) use ($draft, $user) {
                return [
                    'id' => $entry['id'],
                    'at' => $entry['at'],
                    'by' => $entry['by'],
                    'mine' => $entry['user'] === $user,
                    'kind' => $entry['kind'],
                    'changed' => $entry['changed'],
                    'request' => $entry['request'] ?? null,
                    'variation' => $entry['styles']['after']['variation'] ?? null,
                    'colors' => $entry['styles']['after']['colors'] ?? null,
                    'fonts' => $entry['styles']['after']['fonts'] ?? null,
                    'vibe' => $entry['styles']['after']['vibe'] ?? null,
                    'animation' => $entry['styles']['after']['animation'] ?? null,
                    'layout' => $entry['layout'] ?? null,
                    'name' => $entry['name'] ?? null,
                    'styled' => $entry['styled'] ?? [],
                    'restores' => $entry['restores'] ?? null,
                    'reverts' => $entry['reverts'] ?? null,
                    'revertsAll' => !empty($entry['revertsAll']),
                    'undone' => $index >= $draft['current'],
                    'saved' => !empty($entry['saved']),
                    'dropped' => $entry['dropped'] ?? null,
                    'live' => isset($entry['live']) ? array_map(function ($item) {
                        return array_merge($item, LiveSaves::named($item));
                    }, $entry['live']) : null,
                ];
            }, $draft['versions'], array_keys($draft['versions'])),
            'locks' => self::locks($draft),
            'clashes' => array_values(array_map(function ($source) use ($draft) {
                $live = $draft['sources'][$source]['clash'];
                return ['source' => $source, 'title' => self::title($source), 'live' => $live];
            }, array_keys(array_filter($draft['sources'], function ($held) {
                return isset($held['clash']);
            })))),
        ];
    }

    // The only way to change the draft, so no write skips the drift check.
    public static function changes(array $ids)
    {
        $draft = self::get();
        $applied = array_slice($draft['versions'], 0, $draft['current']);
        $newest = $applied ? end($applied)['id'] : null;
        $picked = array_filter($applied, function ($entry) use ($ids) {
            return in_array((int) $entry['id'], $ids, true) && empty($entry['dropped']);
        });
        return array_values(array_map(function ($entry) use ($draft, $newest) {
            return [
                'id' => $entry['id'],
                'kind' => $entry['kind'],
                'newest' => $entry['id'] === $newest,
                'saved' => !empty($entry['saved']),
                'parts' => array_values(array_map(function ($part) {
                    return array_diff_key($part, ['node' => true, 'paths' => true, 'swap' => true]);
                }, self::partsOf($draft, $entry))),
            ];
        }, $picked));
    }

    // The chat request a write belongs to, set for the write's own run only.
    private static $request = null;

    // Set while Undo puts a live save back, so the put isn't recorded as a new change.
    private static $stepping = false;

    private static $settingMoved = false;

    /**
     * Adds a change saved live, like a new logo, to the history, so Undo can put it back.
     *
     * @param array|null $item - A change from LiveSaves::item().
     * @return void
     */
    public static function recordLive($item)
    {
        if (self::$stepping || !$item || $item['before'] === $item['after']) {
            return;
        }

        self::put(self::record(self::get(), ['kind' => 'live', 'live' => [$item]]));
    }

    /**
     * Records a logo or icon the chat saved itself, once the site shows it.
     *
     * @param string $key    - logo or icon.
     * @param int    $before - The image before.
     * @param int    $after  - The image saved.
     * @return array|\WP_Error
     */
    public static function live($key, $before, $after)
    {
        $item = isset(LiveSaves::IMAGES[$key]) ? LiveSaves::item($key, $before, $after) : null;
        if (!$item || LiveSaves::read($item) !== $item['after']) {
            return new \WP_Error('not_live', 'The site does not show that change.', ['status' => 400]);
        }

        self::recordLive($item);
        return self::state();
    }

    public static function run($shown, $write = '', array $args = [], $request = null)
    {
        if ($write && !in_array($write, self::WRITES, true)) {
            return new \WP_Error('no_write', 'No draft write has this name.', ['status' => 400]);
        }

        self::$request = self::requestOf($request);
        try {
            return self::runWrite($shown, $write, $args);
        } finally {
            self::$request = null;
        }
    }

    // An undo takes back all one request did to a part, a card pick after its reply too.
    private static function requestOf($request)
    {
        $id = is_array($request) ? \sanitize_key((string) ($request['id'] ?? '')) : '';
        if ($id === '') {
            return null;
        }

        $asked = \sanitize_text_field((string) ($request['asked'] ?? ''));
        return ['id' => $id, 'asked' => mb_substr($asked, 0, self::ASKED_LENGTH)];
    }

    private static function runWrite($shown, $write, array $args)
    {
        self::$settingMoved = false;
        $before = self::state();
        $drifted = self::catchUp();
        $behind = is_array($shown)
            && [(int) ($shown['version'] ?? 0), (int) ($shown['current'] ?? 0)]
                !== [$before['version'], $before['current']];
        $stuck = $write && $write !== 'resolve' && self::state()['clashes'];
        // A replay leaves the tab behind too, so its write would act on unseen content.
        $refused = $stuck || ($write && $write !== 'resolve' && ($behind || $drifted));
        $result = $write && !$refused ? call_user_func_array([self::class, $write], $args) : [];
        $state = self::state();
        $drift = $write === 'resolve' ? null : self::report($before, $behind);
        if ($drift) {
            $state['drift'] = $drift;
        }

        if ($stuck) {
            return new \WP_Error(
                'stuck',
                'A page with unsaved changes was changed outside the agent. Resolve the changes first.',
                ['status' => 409, 'draft' => $state]
            );
        }

        if ($refused) {
            return new \WP_Error(
                $behind ? 'stale' : 'drifted',
                $behind
                    ? 'The draft changed in another tab. This tab now shows its newest version.'
                    : 'The site changed outside the agent. This now shows the newest version, so try again.',
                ['status' => 409, 'draft' => $state]
            );
        }

        if (\is_wp_error($result)) {
            return $result;
        }

        $notifications = self::$settingMoved ? ['notifications' => Availability::now()] : [];
        return array_merge($state, $result, ['business' => BusinessInfo::current()], $notifications);
    }

    // A page changed elsewhere waits for the user to resolve it; a page that's gone drops its edits.
    private static function catchUp()
    {
        $draft = self::get();
        $before = $draft;
        $drifted = [];
        foreach (array_keys($draft['sources']) as $source) {
            if (self::gone($source)) {
                $draft = self::replay($draft, $source)[0];
                $drifted[] = $source;
                continue;
            }

            $live = self::liveHash($source);
            $held = $draft['sources'][$source];
            unset($draft['sources'][$source]['clash']);
            if ($live !== ($held['overwrite'] ?? $held['live'])) {
                $draft['sources'][$source]['clash'] = $live;
            }
        }

        if ($draft !== $before) {
            self::put($draft);
        }

        return $drifted;
    }

    private static function replay(array $draft, $source)
    {
        $changes = $draft['sources'][$source]['changes'];
        unset($draft['sources'][$source]);
        list($draft, $lost) = self::play($draft, $changes);
        $draft['version'] = self::nextVersion($draft['version']);
        return [$draft, $lost];
    }

    // Overwrite lets Save write over the outside edits; delete drops the user's edits that don't land.
    private static function resolve($how, array $seen)
    {
        if (!in_array($how, ['merge', 'overwrite', 'delete'], true)) {
            return new \WP_Error('no_choice', 'Choose merge, overwrite or delete.', ['status' => 400]);
        }

        $draft = self::get();
        $clashes = array_filter(array_map(function ($held) {
            return $held['clash'] ?? null;
        }, $draft['sources']));
        // Otherwise Save could erase an outside edit the user was never shown.
        if ($how !== 'merge' && array_diff_assoc($clashes, $seen)) {
            return new \WP_Error(
                'changed',
                'A page changed again outside the agent. Resolve the changes again.',
                ['status' => 409, 'draft' => self::state()]
            );
        }

        $failed = [];
        $reported = [];
        foreach (array_keys($clashes) as $source) {
            if ($how === 'overwrite') {
                $draft['sources'][$source]['overwrite'] = $clashes[$source];
                unset($draft['sources'][$source]['clash']);
                continue;
            }

            list($replayed, $lost) = self::replay($draft, $source);
            if ($how === 'merge' && $lost) {
                // One reply's edits on two changed pages are one version, listed once.
                $fresh = array_filter($lost, function ($failure) use ($reported) {
                    return $failure['version'] === null || !in_array($failure['version'], $reported, true);
                });
                $reported = array_merge($reported, array_column($lost, 'version'));
                $failed = array_merge($failed, self::failures($replayed, $source, $fresh));
                continue;
            }

            $draft = $replayed;
        }

        self::put($draft);
        return ['changed' => [], 'failed' => $failed];
    }

    private static function failures(array $draft, $source, array $lost)
    {
        return array_map(function ($failure) use ($draft, $source) {
            $index = array_search($failure['version'], array_column($draft['versions'], 'id'), true);
            $entry = $index === false ? null : $draft['versions'][$index];
            return [
                'source' => $source,
                'title' => self::title($source),
                'reason' => $entry['dropped'] ?? $failure['reason'],
                'changed' => $entry['changed'] ?? [],
            ];
        }, $lost);
    }

    /**
     * Who has a post open in the editor now, if anyone.
     *
     * @param int $post A post's id.
     * @return array|null The editor's name, and whether it's the current user in another tab.
     */
    public static function presence($post)
    {
        // Blocks users who can't edit the post from learning who is editing it.
        if (!\current_user_can('edit_post', $post)) {
            return null;
        }

        $user = self::lockOf($post);
        return $user ? ['name' => $user->display_name, 'mine' => $user->ID === \get_current_user_id()] : null;
    }

    private static function lockOf($post)
    {
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- core's own filter
        $window = \apply_filters('wp_check_post_lock_window', 150);
        $lock = explode(':', (string) \get_post_meta($post, '_edit_lock', true));
        $user = isset($lock[1]) ? \get_userdata((int) $lock[1]) : false;
        return $user && (int) $lock[0] > time() - $window ? $user : null;
    }

    private static function report(array $before, $behind)
    {
        $was = array_column($before['versions'], 'dropped', 'id');
        $dropped = array_values(array_filter(self::get()['versions'], function ($entry) use ($was) {
            return !empty($entry['dropped']) && empty($was[$entry['id']]);
        }));
        $failed = array_column($dropped, 'droppedFrom');
        $sources = array_filter(array_unique($failed), function ($source) {
            return !self::gone($source);
        });
        if (!$behind && !$sources && !$dropped) {
            return null;
        }

        return [
            'tab' => $behind,
            'sources' => array_values(array_map(function ($source) {
                return self::changedBy($source);
            }, $sources)),
            'dropped' => array_column($dropped, 'id'),
        ];
    }

    // A synced pattern's change shows wherever it's used, so the user confirms it first.
    private static function unconfirmedShare($source, array $change)
    {
        $parts = explode(':', $source, 2);
        $ref = $parts[0] === 'post' ? (int) $parts[1] : 0;
        if (!empty($change['confirmed']) || !$ref || \get_post_type($ref) !== 'wp_block') {
            return null;
        }

        return new \WP_Error(
            'synced_pattern',
            'This block is in a synced pattern, so the change shows everywhere the pattern is used.',
            ['status' => 409, 'pattern' => ['title' => \get_the_title($ref), 'uses' => self::usesOf($ref)]]
        );
    }

    // Counts saved posts and templates; a theme's own template files aren't in the database.
    private static function usesOf($ref)
    {
        global $wpdb;
        $marker = '<!-- wp:block {"ref":' . (int) $ref;
        return (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type NOT IN ('revision', 'wp_block')"
                . " AND post_status NOT IN ('trash', 'auto-draft', 'inherit')"
                . ' AND (post_content LIKE %s OR post_content LIKE %s)',
            '%' . $wpdb->esc_like($marker . '}') . '%',
            '%' . $wpdb->esc_like($marker . ',') . '%'
        ));
    }

    // Ids are positions, so the edit answers with every id it moved, for the steps still to run.
    private static function editBlock($id, array $change)
    {
        if (($change['op'] ?? '') === 'rename') {
            return self::renamePost($change);
        }

        if (($change['op'] ?? '') === 'replace-image' && ($change['type'] ?? '') === 'core/post-featured-image') {
            return self::featurePost($change);
        }

        $op = Ops::of((string) ($change['op'] ?? ''));
        if (!$op) {
            return new \WP_Error('bad_ops', 'No edit has this name.', ['status' => 400]);
        }

        // A whole synced pattern is moved, removed or copied through its reference on the page.
        $page = (string) ($change['page'] ?? '');
        $whole = preg_match('/^post:\d+:\d+$/', $id) === 1 && $page !== '';
        if ($whole && in_array($op, [Move::class, Remove::class, Duplicate::class], true)) {
            $reference = Move::referenceIn(\parse_blocks(BlockIds::content($page, self::HOOKS) ?? ''), $id);
            if ($reference !== null) {
                $id = $page . ':' . implode('.', $reference);
                $change['type'] = 'core/block';
            }
        }

        $found = self::blockAt($id, true);
        if (\is_wp_error($found)) {
            return $found;
        }

        list($source, $stored, $blocks, $path, $scope, $pattern, $was) = $found;
        $block = Tree::blockAt($blocks, $path);
        // A block added or removed since the user picked this one moves its id onto another block.
        if ((string) ($change['type'] ?? '') !== $block['blockName']) {
            return new \WP_Error('moved', 'The block at this id is not the one named.', ['status' => 409]);
        }

        $shared = self::unconfirmedShare($source, $change);
        if ($shared) {
            return $shared;
        }

        if ($op::KEEPS_CONTENT && in_array($block['blockName'], ['core/post-content', 'core/template-part'], true)) {
            return new \WP_Error('holds_content', 'This block shows content stored elsewhere.', ['status' => 400]);
        }

        $named = $op === Style::class ? SavedColors::named($change['names'] ?? null) : [];
        $undraft = null;
        $unpick = null;
        if ($op === Style::class) {
            $draft = self::get();
            // A two-color filter is picked from the color scheme the frame shows, which may be one only tried.
            if (array_key_exists('duotone', (array) ($change['styles'] ?? []))) {
                $unpick = StyleLayers::picked(array_intersect_key($draft, array_flip(self::PICKED_LAYERS)));
            }
            // A new color joins the draft's palette first, so the block takes it by slug like any palette color.
            if ($named) {
                $slugged = SavedColors::slugged($draft['named'] + $named);
                $draft['named'] = array_slice($slugged, -SavedColors::MOST, null, true);
                self::put($draft);
            }

            if ($draft['named']) {
                $change['styles'] = SavedColors::bySlug((array) ($change['styles'] ?? []), $draft['named']);
                foreach ((array) ($change['readable']['changes'] ?? []) as $index => $fix) {
                    $styles = SavedColors::bySlug((array) ($fix['styles'] ?? []), $draft['named']);
                    $change['readable']['changes'][$index]['styles'] = $styles;
                }

                $undraft = StyleLayers::drafted($draft['named']);
            }
        }

        try {
            $result = $op::apply($blocks, $path, $change, ['source' => $source]);
            if (\is_wp_error($result)) {
                return $result;
            }

            $after = Tree::unmark($result['blocks']);
            if (\serialize_blocks($after) === \serialize_blocks(Tree::unmark($blocks))) {
                return ['changed' => [], 'ids' => [], 'block' => $id];
            }

            $landed = $result['block'] === null ? null : "{$source}:" . implode('.', $result['block']);
            $now = $landed === null ? null : Tree::blockAt($after, $result['block']);
            $made = $landed === null || !$op::NAMES_MADE ? $block : $now;
            $at = Tree::commonPrefix($scope, $result['at']);
            $written = self::writeBlocks($source, $stored, $after, $at, $change['turn'] ?? '', [[
                'block' => $landed,
                'before' => $id,
                'pattern' => $pattern ? "{$source}:" . implode('.', $pattern) : null,
                'type' => $made['blockName'],
                // In the user's language, for the list of unsaved changes.
                'name' => \WP_Block_Type_Registry::get_instance()->get_registered($made['blockName'])->title ?? null,
                'op' => $op::reportFor($block, $landed === null ? null : $made),
                'source' => $source,
                'title' => self::title($source),
                // Typed by the user in the page itself, so the list of changes doesn't credit the agent.
            ] + (empty($change['direct']) ? [] : ['direct' => true])
                + self::settingsOf($change)
                + self::wordsOf($op, $block, $now)]);
            // Read by the chat's map preview.
            $map = $now && $now['blockName'] === 'core/html' ? Edits\Maps::drawn($now['innerHTML']) : null;
            return $written
                + ['ids' => Tree::moved($was, Tree::marks($result['blocks']), $source), 'block' => $landed]
                + (isset($result['note']) ? ['note' => $result['note']] : [])
                + ($named ? ['presets' => Presets::current()] : [])
                + ($map ? ['map' => $map['src']] : []);
        } finally {
            if ($undraft) {
                $undraft();
            }

            if ($unpick) {
                $unpick();
            }
        }
    }

    // A post's title lives on the post, not in the page that lists it, so it is drafted on its own.
    private static function renamePost(array $change)
    {
        $post = \url_to_postid((string) ($change['url'] ?? ''));
        $title = trim(\sanitize_text_field((string) ($change['title'] ?? '')));
        if (!$post || $title === '') {
            return new \WP_Error('not_found', 'No post has this link.', ['status' => 404]);
        }

        // Blocks users who can't edit the post from renaming it through the draft.
        if (!\current_user_can('edit_post', $post)) {
            return new \WP_Error('forbidden', 'This post can\'t be renamed by you.', ['status' => 403]);
        }

        $source = "post:{$post}";
        $draft = self::get();
        $before = $draft['titles'][$source] ?? null;
        $live = (string) \get_post_field('post_title', $post);
        if ($title === ($before ?? $live)) {
            return ['changed' => [], 'ids' => [], 'block' => null];
        }

        if (empty($change['confirmed'])) {
            return new \WP_Error(
                'renames_post',
                'This renames the post everywhere it shows.',
                ['status' => 409, 'post' => ['title' => $before ?? $live, 'type' => \get_post_type($post)]]
            );
        }

        $report = [[
            'block' => null,
            'before' => null,
            'type' => 'core/post-title',
            'name' => $title,
            'op' => 'title',
            'source' => $source,
            'title' => $live,
            'url' => \get_permalink($post),
        ]];
        $draft['titles'][$source] = $title;
        $draft['version'] = self::nextVersion($draft['version']);
        self::put(self::record($draft, [
            'kind' => 'block',
            'turn' => \sanitize_key((string) ($change['turn'] ?? '')),
            'titles' => [['source' => $source, 'before' => $before, 'after' => $title]],
            'changed' => $report,
        ]));
        return ['changed' => $report, 'ids' => [], 'block' => null];
    }

    // A featured image lives on the post, not in the template showing it, so it saves live like the logo.
    private static function featurePost(array $change)
    {
        $post = (int) ($change['post'] ?? 0);
        $image = (int) ($change['image']['id'] ?? 0);
        if (!$post || !\get_post($post) || !\wp_attachment_is_image($image)) {
            return new \WP_Error('not_found', 'No post or image has this id.', ['status' => 404]);
        }

        // Blocks users who can't edit the post from changing its featured image through the agent.
        if (!\current_user_can('edit_post', $post)) {
            return new \WP_Error('forbidden', 'You can\'t change this post\'s featured image.', ['status' => 403]);
        }

        $before = (int) \get_post_thumbnail_id($post);
        if ($before === $image) {
            return ['changed' => [], 'ids' => [], 'block' => null];
        }

        \set_post_thumbnail($post, $image);
        self::recordLive(LiveSaves::item('featured', $before, $image, $post));
        $type = 'core/post-featured-image';
        return ['changed' => [[
            'block' => null,
            'before' => null,
            'type' => $type,
            'name' => \WP_Block_Type_Registry::get_instance()->get_registered($type)->title ?? null,
            'op' => Edits\Image::REPORT,
            'source' => "post:{$post}",
            'title' => self::title("post:{$post}"),
        ]], 'ids' => [], 'block' => null];
    }

    // The frame shows a drafted title wherever the post's title shows, like a list of posts.
    public static function postTitle($title, $id = 0)
    {
        return self::get()['titles']['post:' . (int) $id] ?? $title;
    }

    // A business detail changed "everywhere": every page, part and synced pattern holding it, as one change.
    private static function replaceText(array $pairs, $id = '', $turn = '', array $keep = [])
    {
        $pairs = self::pairsOf($pairs);
        $keep = BusinessInfo::kept($keep);
        if (!$pairs && !$keep) {
            return new \WP_Error('no_text', 'Send text to replace.', ['status' => 400]);
        }

        // A detail the site is learning shows nowhere yet, so there is only the detail itself to save.
        if (!$pairs) {
            BusinessInfo::replace([], $keep);
            return ['changed' => [], 'profile' => false];
        }

        // One turn, so a single Undo takes back every page at once.
        $turn = \sanitize_key((string) $turn) ?: \wp_generate_uuid4();
        if ($id !== '') {
            $found = self::blockAt($id);
            if (\is_wp_error($found)) {
                return $found;
            }

            list($source, $stored, $blocks, $path, $scope) = $found;
            $keys = Tree::keysOf($blocks, $path);
            $report = [];
            $replaced = self::replacedIn(Tree::at($blocks, $keys), $pairs, $source, $path, $report);
            $whole = Tree::replaceAt($blocks, $keys, $replaced);
            $changed = $report
                ? self::writeBlocks($source, $stored, $whole, $scope, $turn, $report)['changed']
                : [];
            return ['changed' => $changed, 'profile' => false];
        }

        $changed = [];
        $business = BusinessInfo::saved();
        foreach (self::sourcesHolding($pairs) as $source) {
            $stored = \parse_blocks(BlockIds::content($source, self::HOOKS) ?? '');
            $report = [];
            $blocks = self::replacedAll($stored, $pairs, $source, [], $report);
            if ($report) {
                $written = self::writeBlocks($source, $stored, $blocks, [], $turn, $report);
                $changed = array_merge($changed, $written['changed']);
            }
        }

        $profile = self::replaceInProfile($pairs);
        BusinessInfo::replace($pairs, $keep);
        if ($changed) {
            self::put(self::withBusiness(self::get(), $turn, $business));
        }

        // A different number elsewhere, like one beside the menu, is asked about rather than changed unseen.
        $others = isset($keep['phone']) ? PhoneNumbers::others(FoundText::shownSources(), $keep['phone']) : [];
        return ['changed' => $changed, 'profile' => $profile] + ($others ? ['others' => $others] : []);
    }

    // The option is live, so the version keeps both sides for undo to put back.
    private static function withBusiness(array $draft, $turn, array $before)
    {
        $index = $draft['current'] - 1;
        $entry = $draft['versions'][$index] ?? null;
        if (!$entry || ($entry['turn'] ?? '') !== $turn) {
            return $draft;
        }

        $before = $entry['business']['before'] ?? $before;
        $after = BusinessInfo::saved();
        $draft['versions'][$index]['business'] = $before === $after ? null : ['before' => $before, 'after' => $after];
        return $draft;
    }

    private static function stepBusiness(array $entries, $forward)
    {
        foreach ($entries as $entry) {
            if (!empty($entry['business'])) {
                BusinessInfo::put($entry['business'][$forward ? 'after' : 'before']);
            }
        }
    }

    private static function pairsOf(array $pairs)
    {
        $valid = [];
        foreach (array_slice($pairs, 0, self::MOST_PAIRS) as $pair) {
            $from = is_array($pair) ? (string) ($pair['from'] ?? '') : '';
            $to = is_array($pair) ? \sanitize_text_field((string) ($pair['to'] ?? '')) : '';
            if (trim($from) !== '' && strlen($from) <= self::PAIR_LENGTH && strlen($to) <= self::PAIR_LENGTH) {
                $valid[] = ['from' => $from, 'to' => $to];
            }
        }

        return $valid;
    }

    private static function sourcesHolding(array $pairs)
    {
        return array_values(array_filter(self::allSources(), function ($source) use ($pairs) {
            $content = BlockIds::content($source) ?? '';
            foreach ($pairs as $pair) {
                if (strpos($content, $pair['from']) !== false || strpos($content, \esc_html($pair['from'])) !== false) {
                    return true;
                }
            }

            return false;
        }));
    }

    public static function allSources()
    {
        $posts = \get_posts([
            'post_type' => ['page', 'post', 'wp_block'],
            'post_status' => ['publish', 'draft', 'private', 'future'],
            'numberposts' => 500,
            'fields' => 'ids',
        ]);
        $sources = array_map(function ($post) {
            return "post:{$post}";
        }, $posts);
        foreach (['wp_template_part' => 'part', 'wp_template' => 'template'] as $type => $prefix) {
            foreach (\get_block_templates([], $type) as $template) {
                $sources[] = "{$prefix}:{$template->id}";
            }
        }

        return $sources;
    }

    // A theme pattern has no stored copy to change, and a synced pattern is its own source.
    private static function replacedAll(array $blocks, array $pairs, $source, array $path, array &$report)
    {
        $named = 0;
        foreach ($blocks as $index => $block) {
            if (empty($block['blockName'])) {
                continue;
            }

            $at = array_merge($path, [(string) $named++]);
            if (in_array($block['blockName'], ['core/pattern', 'core/block'], true)) {
                continue;
            }

            $blocks[$index] = self::replacedIn($block, $pairs, $source, $at, $report);
        }

        return $blocks;
    }

    private static function replacedIn(array $block, array $pairs, $source, array $path, array &$report)
    {
        $html = function ($text) use ($pairs) {
            foreach ($pairs as $pair) {
                $text = str_replace([$pair['from'], \esc_html($pair['from'])], \esc_html($pair['to']), $text);
            }

            return $text;
        };
        $plain = function ($value) use ($pairs, &$plain) {
            if (is_array($value)) {
                return array_map($plain, $value);
            }

            return is_string($value)
                ? str_replace(array_column($pairs, 'from'), array_column($pairs, 'to'), $value)
                : $value;
        };
        $new = array_merge($block, [
            'innerHTML' => $html($block['innerHTML']),
            'innerContent' => array_map(function ($chunk) use ($html) {
                return is_string($chunk) ? $html($chunk) : $chunk;
            }, $block['innerContent']),
            'attrs' => $plain($block['attrs']),
        ]);
        if ($new['innerHTML'] !== $block['innerHTML'] || $new['attrs'] !== $block['attrs']) {
            $report[] = [
                'block' => "{$source}:" . implode('.', $path),
                'before' => "{$source}:" . implode('.', $path),
                'pattern' => null,
                'type' => $block['blockName'],
                'name' => \WP_Block_Type_Registry::get_instance()->get_registered($block['blockName'])->title ?? null,
                'op' => 'text',
                'source' => $source,
                'title' => self::title($source),
            ];
        }

        $new['innerBlocks'] = self::replacedAll($block['innerBlocks'], $pairs, $source, $path, $report);
        return $new;
    }

    private static function replaceInProfile(array $pairs)
    {
        $about = (string) (Profile::current()['about'] ?? '');
        $replaced = str_replace(array_column($pairs, 'from'), array_column($pairs, 'to'), $about);
        return $replaced !== $about && !\is_wp_error(Profile::save(['about' => $replaced]));
    }

    // What a style edit set, so the agent's list can say "text color" rather than only the block.
    private static function settingsOf(array $change)
    {
        if (is_array($change['styles'] ?? null)) {
            return ['settings' => array_map('strval', array_keys($change['styles']))];
        }

        // A whole look copied names no setting of its own.
        return ($change['op'] ?? '') === 'copy-style'
            ? ['settings' => array_values(array_map('strval', (array) ($change['only'] ?? ['look'])))]
            : [];
    }

    // The closing line names what the words were, which the block as it is now no longer shows.
    private static function wordsOf($op, array $before, $after)
    {
        $same = $after && $after['blockName'] === $before['blockName'];
        if (!$same || !in_array($op::REPORT, ['text', 'format'], true)) {
            return [];
        }

        $words = array_map(function ($block) {
            $text = $block['attrs']['label'] ?? ChangeParts::textOf($block);
            return is_string($text) ? trim(\wp_strip_all_tags($text)) : null;
        }, [$before, $after]);
        return $words[0] !== null && $words[1] !== null && $words[0] !== $words[1]
            ? ['words' => ['before' => $words[0], 'after' => $words[1]]]
            : [];
    }

    private static function blockAt($id, $marked = false)
    {
        $split = strrpos($id, ':');
        $source = $split === false ? '' : substr($id, 0, $split);
        $path = $split === false ? '' : substr($id, $split + 1);
        $content = preg_match('/^\d+(\.\d+)*$/', $path) ? BlockIds::content($source, self::HOOKS) : null;
        $stored = \parse_blocks($content ?? '');
        $start = $marked ? Tree::mark($stored) : $stored;
        list($blocks, $path, $scope, $pattern) = self::inlinePatterns($start, explode('.', $path));
        if (Tree::keysOf($blocks, $path) === null) {
            return new \WP_Error('not_found', 'No block has this id.', ['status' => 404]);
        }

        $was = array_keys(Tree::marks($start) + Tree::marks($blocks));
        return [$source, $stored, $blocks, $path, $scope, $pattern, $was];
    }

    // One request's writes are one version, so a single Undo takes them all back.
    private static function joins(array $draft, $turn)
    {
        $last = $draft['versions'][$draft['current'] - 1] ?? null;
        return $turn !== ''
            && $last
            && $draft['current'] === count($draft['versions'])
            && ($last['turn'] ?? '') === $turn
            && empty($last['saved'])
            && empty($last['dropped']);
    }

    private static function writeBlocks($source, array $stored, array $blocks, array $scope, $turn, array $report)
    {
        $draft = self::get();
        $turn = \sanitize_key((string) $turn);
        $last = $draft['versions'][$draft['current'] - 1] ?? null;
        $joins = self::joins($draft, $turn);
        $swap = [
            'source' => $source,
            'block' => implode('.', $scope),
            'version' => $joins ? $last['id'] : $draft['next'],
        ] + self::swapOf($stored, $blocks, $scope);
        $draft = self::write($draft, $source, \serialize_blocks($blocks), [$swap]);
        if (!$joins) {
            $entry = ['kind' => 'block', 'turn' => $turn, 'blocks' => [$swap], 'changed' => $report];
            self::put(self::record($draft, $entry));
            return ['changed' => $report];
        }

        $index = $draft['current'] - 1;
        $draft['versions'][$index]['blocks'][] = $swap;
        $draft['versions'][$index]['changed'] = array_merge($last['changed'], $report);
        $draft['versions'][$index]['at'] = time();
        self::put($draft);
        return ['changed' => $report];
    }

    private static function chooseVariation($slug)
    {
        return self::chooseStyles('variation', $slug, '');
    }

    // Empty keeps what the site has now.
    private static function chooseStyle($layer, $id)
    {
        $found = isset(self::LAYERS[$layer]) && $id !== '' ? call_user_func([self::LAYERS[$layer], 'find'], $id) : null;
        if (!isset(self::LAYERS[$layer]) || ($id !== '' && !$found)) {
            return new \WP_Error('not_found', 'No option has this id.', ['status' => 404]);
        }

        return self::chooseStyles($layer, $id, $found['title'] ?? '');
    }

    // "Update it so it shows everywhere": one palette color takes a new value wherever the site uses it.
    private static function choosePalette($slug, $hex, $name, $turn = '')
    {
        $hex = \sanitize_hex_color($hex);
        if ($slug === '' || !$hex || !PaletteColors::has($slug)) {
            $why = 'No palette color has this slug, or the color is not a hex.';
            return new \WP_Error('not_found', $why, ['status' => 404]);
        }

        $draft = self::get();
        $layer = PaletteColors::with($draft['palette'], $slug, $hex);
        $layers = array_merge(self::stylesOf($draft), ['palette' => '']);
        $before = StyleLayers::compose(self::baseStyles($draft), $layers);
        $ink = PaletteColors::buttonInk($before, $layer);
        $text = PaletteColors::textInk($before, $layer);
        $chosen = self::chooseStyles('palette', $layer, $name, $turn);
        if (\is_wp_error($chosen)) {
            return $chosen;
        }

        return $chosen + array_filter(['ink' => $ink, 'text' => $text]);
    }

    /**
     * The global styles the site frame shows: the draft's layers over the styles they started from.
     *
     * @return array
     */
    public static function shownStyles()
    {
        $draft = self::get();
        return StyleLayers::compose(self::baseStyles($draft), self::stylesOf($draft));
    }

    // The global styles the draft's layers go over: the live ones, or those from when the draft first changed them.
    private static function baseStyles(array $draft)
    {
        return $draft['stylesBase'] === null
            ? json_decode(self::liveStyles(), true) ?: []
            : $draft['snapshots'][$draft['stylesBase']];
    }

    // The name labels the version, since a served palette's list can change after it's chosen.
    private static function chooseStyles($layer, $pick, $name, $turn = '')
    {
        $draft = self::get();
        $turn = \sanitize_key((string) $turn);
        $before = self::stylesOf($draft);
        // A palette change goes over every scheme, so a scheme picked after it would show only in part.
        $after = array_merge($before, [$layer => $pick], $layer === 'colors' ? ['palette' => ''] : []);
        if ($after === $before) {
            return ['changed' => []];
        }

        $joins = self::joins($draft, $turn);
        $draft = self::setStyles($draft, $after);
        if ($joins) {
            $index = $draft['current'] - 1;
            $entry = $draft['versions'][$index];
            $draft['versions'][$index]['styles'] = [
                'before' => $entry['styles']['before'] ?? $before,
                'after' => $after,
            ];
            $draft['versions'][$index]['styled'] = array_merge(
                $entry['styled'] ?? [],
                [['layer' => $layer, 'name' => $name]]
            );
            $draft['versions'][$index]['at'] = time();
            self::put($draft);
        } else {
            self::put(self::record($draft, [
                'kind' => $layer,
                'name' => $name,
                'styles' => ['before' => $before, 'after' => $after],
            ] + ($turn === '' ? [] : ['turn' => $turn])));
        }

        self::stampPicked([$layer => $pick]);
        return ['changed' => []];
    }

    private static function chooseThemeSetting($setting, $value, $turn = '')
    {
        $css = $setting === ThemeSettings::CSS;
        // Blocks users without edit_css from adding CSS, which WordPress also strips when they save.
        if ($css && !\current_user_can('edit_css')) {
            $why = 'Only someone who may edit CSS can change the look this way.';
            return new \WP_Error('no_css', $why, ['status' => 403]);
        }

        $taken = ThemeSettings::valueOf($setting, $value);
        if ($taken === null && $css) {
            $why = 'That CSS holds something other than rules for the site.';
            return new \WP_Error('bad_value', $why, ['status' => 400]);
        }

        if ($taken === null) {
            $why = 'No theme setting has this name, or the value is not one it takes.';
            return new \WP_Error('not_found', $why, ['status' => 404]);
        }

        $draft = self::get();
        $layer = ThemeSettings::with($draft['settings'], $setting, $taken);
        return self::chooseStyles('settings', $layer, $setting, $turn);
    }

    // Empty puts back the hero the front page has now.
    private static function chooseLayout($id)
    {
        $draft = self::withLayout(self::get(), $id);
        if (\is_wp_error($draft)) {
            return $draft;
        }

        if ($draft === self::get()) {
            return ['changed' => []];
        }

        self::put($draft);
        return ['changed' => $draft['versions'][$draft['current'] - 1]['changed']];
    }

    // One version, so a single undo puts back the hero and every style together.
    private static function chooseLook($layout, $variation, $vibe)
    {
        if (($variation !== '' && !StyleVariations::find($variation)) || ($vibe !== '' && !Vibes::find($vibe))) {
            return new \WP_Error('not_found', 'No look has these styles.', ['status' => 404]);
        }

        $before = self::get();
        $draft = self::withLayout($before, $layout);
        if (\is_wp_error($draft)) {
            return $draft;
        }

        $styles = self::stylesOf($before);
        $styles = ['before' => $styles, 'after' => array_merge($styles, [
            'variation' => $variation,
            'colors' => '',
            'fonts' => '',
            'vibe' => $vibe,
        ])];
        $styled = $styles['after'] !== $styles['before'];
        if ($draft === $before && !$styled) {
            return ['changed' => []];
        }

        if ($draft === $before) {
            $draft = self::record($draft, ['kind' => 'look', 'layout' => $layout]);
        }

        $at = $draft['current'] - 1;
        $draft['versions'][$at]['kind'] = 'look';
        $draft['versions'][$at]['styles'] = $styled ? $styles : null;
        self::put($styled ? self::setStyles($draft, $styles['after']) : $draft);
        self::stampPicked(['variation' => $variation, 'vibe' => $vibe]);
        return ['changed' => $draft['versions'][$at]['changed']];
    }

    private static function stampPicked(array $picks)
    {
        foreach (array_keys(array_filter($picks)) as $layer) {
            // A variation sets both colors and fonts.
            array_map([Refreshes::class, 'stamp'], $layer === 'variation' ? ['colors', 'fonts'] : [$layer]);
        }
    }

    private static function undo($live = '')
    {
        $draft = self::get();
        $entry = $draft['versions'][$draft['current'] - 1] ?? null;
        if (!$entry) {
            return ['changed' => []];
        }

        $clash = self::liveClash([$entry], false, $live);
        if ($clash) {
            return $clash;
        }

        $put = self::stepLive([$entry], false, $live);
        $draft = self::liveShown(self::step($draft, $entry, false), $put);
        self::stepBusiness([$entry], false);
        $draft['current']--;
        self::put($draft);
        $dropped = !empty($draft['versions'][$draft['current']]['dropped']);
        return ['changed' => $dropped ? [] : self::undone($entry['changed'])];
    }

    /**
     * Takes back a change the page never showed and forgets it.
     *
     * @param int $count The block writes it made, the newest in the newest version.
     * @return array|\WP_Error
     */
    private static function drop($count = 0)
    {
        $draft = self::get();
        $index = $draft['current'] - 1;
        $entry = $draft['versions'][$index] ?? null;
        $count = (int) $count;
        // Joined onto a request's earlier writes, so only its own go back.
        $joined = $entry && (
            $count < count($entry['blocks'])
            || $entry['styles']
            || !empty($entry['titles'])
            || !empty($entry['business'])
        );
        if ($count > 0 && $joined) {
            $draft = self::step($draft, ['blocks' => array_slice($entry['blocks'], -$count), 'styles' => null], false);
            $draft['versions'][$index]['blocks'] = array_slice($entry['blocks'], 0, -$count);
            $draft['versions'][$index]['changed'] = array_slice($entry['changed'], 0, -$count);
            self::put($draft);
            return ['changed' => self::undone(array_slice($entry['changed'], -$count))];
        }

        $result = self::undo();
        if (\is_wp_error($result) || !$result['changed']) {
            return $result;
        }

        // Leaving it undone would keep a row in the history and let Redo bring it back.
        $draft = self::get();
        array_splice($draft['versions'], $draft['current'], 1);
        self::put($draft);
        return $result;
    }

    private static function redo($live = '')
    {
        $draft = self::get();
        $entry = $draft['versions'][$draft['current']] ?? null;
        if (!$entry) {
            return ['changed' => []];
        }

        $clash = self::liveClash([$entry], true, $live);
        if ($clash) {
            return $clash;
        }

        $put = self::stepLive([$entry], true, $live);
        $draft = self::liveShown(self::step($draft, $entry, true), $put);
        self::stepBusiness([$entry], true);
        $draft['current']++;
        self::put($draft);
        return ['changed' => empty($draft['versions'][$draft['current'] - 1]['dropped']) ? $entry['changed'] : []];
    }

    // Zero restores the site as it was before the first version; a discard keeps what saved live.
    private static function restore($id, $live = '', $keepLive = false)
    {
        $draft = self::get();
        $index = $id ? array_search($id, array_column($draft['versions'], 'id'), true) : -1;
        if ($index === false) {
            return new \WP_Error('not_found', 'No version has this id.', ['status' => 404]);
        }

        $applied = $index + 1;
        if ($applied === $draft['current']) {
            return ['changed' => []];
        }

        $forward = $applied > $draft['current'];
        $crossed = $forward
            ? array_slice($draft['versions'], $draft['current'], $applied - $draft['current'])
            : array_slice($draft['versions'], $applied, $draft['current'] - $applied);
        $clash = $keepLive ? null : self::liveClash($crossed, $forward, $live);
        if ($clash) {
            return $clash;
        }

        $changed = [];
        // An undone version comes back as a redo, so nothing after it is dropped.
        if ($forward) {
            foreach (array_slice($draft['versions'], $draft['current'], $applied - $draft['current']) as $entry) {
                $draft = self::liveShown($draft, self::stepLive([$entry], true, $live));
                $draft = self::step($draft, $entry, true);
                self::stepBusiness([$entry], true);
                $changed = array_merge($changed, $entry['changed']);
            }

            $draft['current'] = $applied;
            self::put($draft);
            return ['changed' => $changed];
        }

        $restored = $draft;
        $swaps = [];
        $titles = [];
        $putBack = [];
        $business = ['before' => BusinessInfo::saved()];
        foreach (array_reverse(array_slice($draft['versions'], $applied, $draft['current'] - $applied)) as $entry) {
            if (!$keepLive) {
                $putBack = array_merge($putBack, self::stepLive([$entry], false, $live));
            }

            $restored = self::step($restored, $entry, false);
            self::stepBusiness([$entry], false);
            $swaps = array_merge($swaps, self::reversed($entry['blocks']));
            foreach (array_reverse($entry['titles'] ?? []) as $renamed) {
                $titles[] = [
                    'source' => $renamed['source'],
                    'before' => $renamed['after'],
                    'after' => $renamed['before'],
                ];
            }

            $changed = array_merge($changed, self::undone($entry['changed']));
        }

        $restored = self::liveShown($restored, $putBack);
        $styles = ['before' => self::stylesOf($draft), 'after' => self::stylesOf($restored)];
        $business['after'] = BusinessInfo::saved();
        self::put(self::record($restored, [
            'kind' => 'restore',
            'restores' => $id,
            'blocks' => $swaps,
            'titles' => $titles,
            'styles' => $styles['before'] === $styles['after'] ? null : $styles,
            'business' => $business['before'] === $business['after'] ? null : $business,
            'changed' => $changed,
        ] + ($putBack ? ['live' => $putBack] : [])));
        return ['changed' => $changed];
    }

    // A live save changed elsewhere since waits on the user: put ours back anyway, or skip it.
    private static function liveClash(array $entries, $forward, $live)
    {
        if (in_array($live, ['force', 'skip'], true)) {
            return null;
        }

        $changed = [];
        foreach ($entries as $entry) {
            foreach ($entry['live'] ?? [] as $item) {
                if (LiveSaves::read($item) !== $item[$forward ? 'before' : 'after']) {
                    $changed[] = LiveSaves::named($item);
                }
            }
        }

        return $changed
            ? new \WP_Error('live_changed', 'Changed outside the agent since.', ['status' => 409, 'live' => $changed])
            : null;
    }

    // A live value put back shows on every page, so cached pages of this version are stale.
    private static function liveShown(array $draft, array $put)
    {
        if ($put) {
            $draft['version'] = self::nextVersion($draft['version']);
        }

        return $draft;
    }

    // Returns what it put, so undoing the restore that ran it puts those values back.
    private static function stepLive(array $entries, $forward, $live)
    {
        $put = [];
        self::$stepping = true;
        try {
            foreach ($entries as $entry) {
                foreach ($forward ? $entry['live'] ?? [] : array_reverse($entry['live'] ?? []) as $item) {
                    $from = $item[$forward ? 'before' : 'after'];
                    $to = $item[$forward ? 'after' : 'before'];
                    $now = LiveSaves::read($item);
                    if ($now === $to || ($now !== $from && $live === 'skip')) {
                        continue;
                    }

                    if (!\is_wp_error(LiveSaves::put($item, $to))) {
                        $put[] = array_merge($item, ['before' => $now, 'after' => $to]);
                        self::$settingMoved = self::$settingMoved || isset(LiveSaves::SETTINGS[$item['key']]);
                    }
                }
            }
        } finally {
            self::$stepping = false;
        }

        return $put;
    }

    // Back to the last Save, with no redo of what it discards.
    // A forward change that puts back the parts of an earlier one, leaving every change since.
    private static function revert($id, array $keys)
    {
        $draft = self::get();
        $entry = null;
        foreach (array_slice($draft['versions'], 0, $draft['current']) as $applied) {
            $entry = $applied['id'] === $id && empty($applied['dropped']) ? $applied : $entry;
        }

        if (!$entry) {
            return new \WP_Error('not_found', 'No change has this id.', ['status' => 404]);
        }

        $parts = array_column(self::partsOf($draft, $entry), null, 'key');
        $picked = array_intersect_key($parts, array_flip($keys));
        if (!$picked) {
            return new \WP_Error('bad_keys', 'Name the parts of the change to put back.', ['status' => 400]);
        }

        $put = array_filter($picked, function ($part) {
            return $part['revertible'];
        });
        $styles = $put && isset(reset($put)['layer']);
        $live = $put && isset(reset($put)['live']);
        $result = $live
            ? self::revertLive($entry, $put)
            : ($styles ? self::revertStyles($put) : ($put ? self::revertBlocks($entry, $parts, $put) : null));
        if (!$result) {
            $whole = !array_filter($picked, function ($part) {
                return ($part['reason'] ?? '') !== 'whole';
            });
            return $whole
                ? new \WP_Error('whole_change', 'This change goes back only with Undo or Changes.', ['status' => 409])
                : new \WP_Error('changed_since', 'That part changed since, so it stays as it is.', ['status' => 409]);
        }

        $draft = self::get();
        $draft['versions'][$draft['current'] - 1]['kind'] = 'revert';
        $draft['versions'][$draft['current'] - 1]['reverts'] = $id;
        $draft['versions'][$draft['current'] - 1]['revertsAll'] = count($put) === count($parts);
        self::put($draft);
        return $result + ['kept' => array_keys(array_diff_key($picked, $put))];
    }

    private static function revertLive(array $entry, array $put)
    {
        $keys = array_column($put, 'live');
        $items = array_values(array_filter($entry['live'], function ($item) use ($keys) {
            return in_array($item['key'], $keys, true);
        }));
        $back = self::stepLive([['live' => $items]], false, 'force');
        if (!$back) {
            return null;
        }

        self::put(self::liveShown(self::record(self::get(), ['kind' => 'revert', 'live' => $back]), $back));
        return ['changed' => []];
    }

    private static function revertStyles(array $put)
    {
        $draft = self::get();
        $before = self::stylesOf($draft);
        $after = $before;
        foreach ($put as $part) {
            $after[$part['layer']] = $part['before'];
        }

        self::put(self::record(self::setStyles($draft, $after), [
            'kind' => 'revert',
            'styles' => ['before' => $before, 'after' => $after],
        ]));
        return ['changed' => []];
    }

    private static function revertBlocks(array $entry, array $parts, array $put)
    {
        $turn = 'revert-' . $entry['id'] . '-' . \wp_generate_password(6, false);
        $changed = [];
        foreach (array_unique(array_column($put, 'swap')) as $index) {
            $swap = $entry['blocks'][$index];
            $found = self::currentOf(self::get(), $swap);
            $after = $found ? self::putBack($swap, $found, $parts, $put, $index) : null;
            if (!$after) {
                continue;
            }

            $whole = $swap['block'] === '';
            $path = $whole ? [] : explode('.', $swap['block']);
            $type = $whole ? '' : Tree::blockAt($after, $path)['blockName'];
            $id = $whole ? null : "{$swap['source']}:{$swap['block']}";
            $written = self::writeBlocks($swap['source'], $found[0], $after, $path, $turn, [[
                'block' => $id,
                'before' => $id,
                'pattern' => null,
                'type' => $type,
                'name' => self::typeTitle($type),
                'op' => 'revert',
                'source' => $swap['source'],
                'title' => self::title($swap['source']),
            ]]);
            $changed = array_merge($changed, $written['changed']);
        }

        return $changed ? ['changed' => $changed] : null;
    }

    // Unchanged since, every part goes back as it was; otherwise each part goes back on its own, or stays.
    private static function putBack(array $swap, array $found, array $parts, array $put, $index)
    {
        list($blocks, $keys, $current) = $found;
        $whole = $swap['block'] === '';
        $mine = array_filter($parts, function ($part) use ($index) {
            return $part['swap'] === $index;
        });
        $exact = ($whole ? \serialize_blocks($blocks) : \serialize_block($current)) === $swap['after'];
        if ($exact && !array_diff_key($mine, $put)) {
            $before = \parse_blocks($swap['before']);
            return $whole ? $before : Tree::replaceAt($blocks, $keys, $before[0]);
        }

        $old = \parse_blocks($swap['before'])[0] ?? null;
        $new = \parse_blocks($swap['after'])[0] ?? null;
        if ($whole || !$old || !$new) {
            return null;
        }

        $block = $current;
        foreach (array_intersect_key($put, $mine) as $part) {
            $block = ChangeParts::putBack($block, $new, $old, $part) ?: $block;
        }

        return \serialize_block($block) === \serialize_block($current) ? null : Tree::replaceAt($blocks, $keys, $block);
    }

    // A picture has no words, so its alt text names it.
    private static function textOf(array $block)
    {
        $words = trim(\wp_strip_all_tags(\serialize_block($block)));
        $alt = preg_match('/\salt="([^"]+)"/', $block['innerHTML'], $match) ? \html_entity_decode($match[1]) : '';
        return \wp_html_excerpt($words !== '' ? $words : $alt, 80, '…');
    }

    private static function typeTitle($type)
    {
        return \WP_Block_Type_Registry::get_instance()->get_registered($type)->title ?? null;
    }

    // The block a change wrote, where it stands now; null once it's gone or another block took its place.
    private static function currentOf(array $draft, array $swap)
    {
        if (self::gone($swap['source'])) {
            return null;
        }

        $content = $draft['sources'][$swap['source']]['content'] ?? BlockIds::live($swap['source'], self::HOOKS);
        $blocks = \parse_blocks($content ?? '');
        if ($swap['block'] === '') {
            return [$blocks, [], null];
        }

        $keys = Tree::keysOf($blocks, explode('.', $swap['block']));
        $current = $keys === null ? null : Tree::at($blocks, $keys);
        $made = \parse_blocks($swap['after'])[0] ?? null;
        return $current && $made && $current['blockName'] === $made['blockName'] ? [$blocks, $keys, $current] : null;
    }

    private static function partsOf(array $draft, array $entry)
    {
        if (in_array($entry['kind'], ['layout', 'look', 'restore'], true)) {
            return [['key' => 'all', 'what' => $entry['kind'], 'revertible' => false, 'reason' => 'whole']];
        }

        // A live value goes back on its own while the site still shows the one this change set.
        if (!empty($entry['live'])) {
            return array_map(function ($item) {
                $revertible = LiveSaves::read($item) === $item['after'];
                return [
                    'key' => "live:{$item['key']}",
                    'what' => 'setting',
                    'aspect' => $item['key'],
                    'live' => $item['key'],
                    'before' => LiveSaves::words($item, 'before'),
                    'after' => LiveSaves::words($item, 'after'),
                    'revertible' => $revertible,
                ] + ($revertible ? [] : ['reason' => 'changed']);
            }, $entry['live']);
        }

        // A renamed post goes back with Undo, as one whole change.
        if (!empty($entry['titles'])) {
            return array_map(function ($renamed) {
                return [
                    'key' => "title:{$renamed['source']}",
                    'what' => 'title',
                    'before' => (string) ($renamed['before'] ?? ''),
                    'after' => $renamed['after'],
                    'revertible' => false,
                    'reason' => 'whole',
                ];
            }, $entry['titles']);
        }

        if (!$entry['blocks']) {
            $now = self::stylesOf($draft);
            $parts = [];
            foreach (array_keys(array_diff_key(self::LIVE_STYLES, ['base' => true])) as $layer) {
                $before = (string) ($entry['styles']['before'][$layer] ?? '');
                $after = (string) ($entry['styles']['after'][$layer] ?? '');
                if ($before !== $after) {
                    $parts[] = [
                        'key' => "styles:{$layer}",
                        'what' => 'design',
                        'layer' => $layer,
                        'before' => $before,
                        'after' => $after,
                        'revertible' => (string) ($now[$layer] ?? '') === $after,
                    ];
                    $parts[count($parts) - 1] += $parts[count($parts) - 1]['revertible'] ? [] : ['reason' => 'changed'];
                }
            }

            return $parts;
        }

        $parts = [];
        foreach ($entry['blocks'] as $index => $swap) {
            $found = self::currentOf($draft, $swap);
            $whole = $swap['block'] === '';
            $old = $whole ? null : (\parse_blocks($swap['before'])[0] ?? null);
            $new = $whole ? null : (\parse_blocks($swap['after'])[0] ?? null);
            $exact = $found && ($whole ? \serialize_blocks($found[0]) : \serialize_block($found[2])) === $swap['after'];
            foreach (ChangeParts::of($swap['before'], $swap['after'], $whole) as $part) {
                $at = array_merge([0], $part['node']);
                $shown = ($new ? Tree::blockAt([$new], $at) : null) ?: ($old ? Tree::blockAt([$old], $at) : null);
                $back = $found && !$whole && $old && $new && $part['aspect'] !== 'structure'
                    ? ChangeParts::putBack($found[2], $new, $old, $part)
                    : null;
                $parts[] = array_merge($part, [
                    'key' => $index . ':' . implode('.', $part['node']) . ':' . $part['aspect'],
                    'swap' => $index,
                    'what' => $part['what'] ?? ($part['aspect'] === 'structure' ? 'structure' : 'setting'),
                    'block' => [
                        'type' => $shown['blockName'] ?? null,
                        'name' => $shown ? self::typeTitle($shown['blockName']) : null,
                        'page' => self::title($swap['source']),
                        'text' => $shown ? self::textOf($shown) : '',
                    ],
                    'revertible' => $exact || $back !== null,
                ], $exact || $back !== null ? [] : ['reason' => $found ? 'changed' : 'gone']);
            }
        }

        return $parts;
    }

    private static function discard()
    {
        $before = self::get();
        $saved = self::savedId($before);
        $savedAt = $saved ? array_search($saved, array_column($before['versions'], 'id'), true) + 1 : 0;
        // A live save is already on the site, so it stays in the history to undo there.
        $lives = array_values(array_filter(
            array_slice($before['versions'], $savedAt, $before['current'] - $savedAt),
            function ($entry) {
                return $entry['kind'] === 'live';
            }
        ));
        $result = self::restore($saved, '', true);
        if (\is_wp_error($result)) {
            return $result;
        }

        $draft = self::get();
        // Pages the restore left held, like one over an outside edit, reset to live.
        $resets = array_map(function ($source) use ($draft) {
            return [
                'source' => $source,
                'block' => '',
                'version' => null,
                'before' => \serialize_blocks(\parse_blocks($draft['sources'][$source]['content'])),
                'after' => \serialize_blocks(\parse_blocks(BlockIds::live($source, self::HOOKS) ?? '')),
            ];
        }, array_keys($draft['sources']));
        $draft['sources'] = array_map(function ($held) {
            return isset($held['overwrite'])
                ? array_diff_key(array_merge($held, ['live' => $held['overwrite']]), ['overwrite' => true])
                : $held;
        }, $draft['sources']);
        $draft = self::setStyles(self::play($draft, $resets)[0], self::LIVE_STYLES);
        $kept = $saved ? array_search($saved, array_column($draft['versions'], 'id'), true) + 1 : 0;
        $draft['versions'] = array_merge(array_slice($draft['versions'], 0, $kept), $lives);
        $draft['current'] = count($draft['versions']);
        $draft['titles'] = [];
        self::put(self::pruneSnapshots($draft));
        return $result;
    }

    private static function save()
    {
        $draft = self::get();
        $saved = [];
        $refused = [];
        $contents = [];
        foreach ($draft['sources'] as $source => $held) {
            $title = self::title($source);
            // The draft holds whole copies, so saving over a newer edit would erase it.
            $result = self::liveHash($source) === ($held['overwrite'] ?? $held['live'])
                ? self::store($source, $held['content'])
                : new \WP_Error('changed');
            if (\is_wp_error($result)) {
                $refused[] = ['source' => $source, 'title' => $title, 'reason' => $result->get_error_code()];
                continue;
            }

            unset($draft['sources'][$source]);
            $saved[] = ['source' => $source, 'title' => $title];
            $contents[] = $held['content'];
        }

        foreach ($draft['titles'] as $source => $title) {
            $post = (int) substr($source, strlen('post:'));
            // Blocks users who can't edit the post from renaming it on Save.
            $result = \current_user_can('edit_post', $post)
                ? \wp_update_post(['ID' => $post, 'post_title' => $title], true)
                : new \WP_Error('forbidden');
            if (\is_wp_error($result)) {
                $refused[] = ['source' => $source, 'title' => $title, 'reason' => $result->get_error_code()];
                continue;
            }

            unset($draft['titles'][$source]);
            $saved[] = ['source' => $source, 'title' => $title];
        }

        $styles = self::stylesOf($draft);
        if ($styles !== self::LIVE_STYLES) {
            $live = self::liveStyles();
            $base = self::baseStyles($draft);
            // The animation is a theme setting, so global styles are written only when a layer of them changed.
            $restyled = array_merge($styles, ['animation' => '']) !== self::LIVE_STYLES;
            // Only a snapshot would put old styles back over an edit made since the last Save.
            $result = $restyled && $draft['stylesBase'] !== null && md5($live) !== $draft['stylesLive']
                ? new \WP_Error('changed')
                : ($restyled ? self::storeStyles(StyleLayers::compose($base, $styles)) : true);
            if (\is_wp_error($result)) {
                $refused[] = ['source' => 'styles', 'reason' => $result->get_error_code()];
            } else {
                $replaced = Animations::store($draft['animation']);
                $draft = self::snapshotStyles($draft, json_decode($live, true) ?: [], $replaced, $restyled);
                $saved[] = ['source' => 'styles'];
            }
        }

        $live = md5(self::liveStyles());
        $kept = SavedColors::keep($draft['named'], implode("\n", $contents));
        if ($kept) {
            $draft['named'] = array_diff_key($draft['named'], array_flip($kept));
            // Adding to the palette isn't a change made outside the agent.
            if ($draft['stylesLive'] === $live) {
                $draft['stylesLive'] = md5(self::liveStyles());
            }
        }

        // Every source not refused now matches live: applied versions are in it, undone ones aren't.
        $refusedSources = array_column($refused, 'source');
        foreach ($draft['versions'] as $index => $entry) {
            if (!array_intersect(self::sourcesOf($entry), $refusedSources)) {
                $draft['versions'][$index]['saved'] = $index < $draft['current'];
            }
        }

        if ($saved) {
            $draft['version'] = self::nextVersion($draft['version']);
        }

        self::put($draft);
        return ['saved' => $saved, 'refused' => $refused] + ($kept ? ['presets' => Presets::current()] : []);
    }

    /**
     * Renders the frame from the draft as it was right after a version, without changing the draft.
     *
     * @param int $id A version's id; zero is before the first version.
     * @return void
     */
    public static function showAt($id)
    {
        $draft = self::get();
        $index = $id ? array_search($id, array_column($draft['versions'], 'id'), true) : -1;
        $saved = $id === self::savedId($draft);
        if ($index === false && !$saved) {
            return;
        }

        // Pruning drops old versions, so the saved row renders live.
        $state = $saved
            ? self::setStyles(array_merge($draft, ['sources' => []]), self::LIVE_STYLES)
            : self::stateAt($draft, $index + 1);
        // Only this request reads it; nothing is stored.
        \wp_cache_set(\get_current_user_id(), $state, self::CACHE_GROUP);
    }

    /**
     * Renders the frame from the draft with another hero on the front page, without changing the draft.
     *
     * @param string $id A layout's id; empty is the hero the front page has now.
     * @return void
     */
    public static function showLayout($id)
    {
        $draft = self::withLayout(self::get(), $id);
        if (!\is_wp_error($draft)) {
            \wp_cache_set(\get_current_user_id(), $draft, self::CACHE_GROUP);
        }
    }

    private static function withLayout(array $draft, $id)
    {
        $source = 'post:' . Layouts::front();
        $stored = \parse_blocks(BlockIds::content($source, self::HOOKS) ?? '');
        $hero = self::heroOf($stored);
        $layout = $id === '' || !$hero ? null : Layouts::find($id);
        $live = self::heroOf(\parse_blocks(BlockIds::live($source, self::HOOKS) ?? ''));
        // An earlier pick may have dropped the site's paragraph, so text comes from the saved hero.
        $block = $id === ''
            ? $live
            : ($layout ? self::heroOf(\parse_blocks(Layouts::fill($layout, $live ?? $hero))) : null);
        if (!$hero || !$block) {
            return new \WP_Error('not_found', 'No layout has this id.', ['status' => 404]);
        }

        if (\serialize_block($block) === \serialize_block($hero)) {
            return $draft;
        }

        $index = Layouts::heroIn($stored);
        $blocks = Tree::replaceAt($stored, Tree::keysOf($stored, [$index]), $block);
        $swap = ['source' => $source, 'block' => (string) $index, 'version' => $draft['next']]
            + self::swapOf($stored, $blocks, [$index]);
        return self::record(self::write($draft, $source, \serialize_blocks($blocks), [$swap]), [
            'kind' => 'layout',
            'layout' => $id,
            'blocks' => [$swap],
            'changed' => [[
                'block' => "{$source}:{$index}",
                'before' => "{$source}:{$index}",
                'pattern' => null,
                'type' => $hero['blockName'],
                'name' => \WP_Block_Type_Registry::get_instance()->get_registered($hero['blockName'])->title ?? null,
                'op' => 'layout',
                'source' => $source,
                'title' => self::title($source),
            ]],
        ]);
    }

    // Read from the drafted hero, so undo, restore and Save keep it right.
    private static function layoutOf(array $draft)
    {
        $content = $draft['sources']['post:' . Layouts::front()]['content'] ?? null;
        $name = $content === null ? null : Layouts::nameIn(\parse_blocks($content));
        return $name && $name !== Layouts::current() ? "layout:{$name}" : '';
    }

    private static function heroOf(array $blocks)
    {
        $index = Layouts::heroIn($blocks);
        return $index === null ? null : Tree::at($blocks, Tree::keysOf($blocks, [$index]));
    }

    private static function savedId(array $draft)
    {
        $saved = 0;
        foreach ($draft['versions'] as $entry) {
            $saved = empty($entry['saved']) ? $saved : $entry['id'];
        }

        return $saved;
    }

    public static function show()
    {
        $draft = self::get();
        if ($draft['stylesBase'] !== null) {
            $base = $draft['snapshots'][$draft['stylesBase']];
            // Ahead of the variation preview, which merges onto these.
            \add_filter('wp_theme_json_data_user', function () use ($base) {
                return new \WP_Theme_JSON_Data($base, 'custom');
            }, 9);
            \wp_clean_theme_json_cache();
        }

        if ($draft['titles']) {
            \add_filter('the_title', [self::class, 'postTitle'], 10, 2);
        }

        if (!$draft['sources']) {
            return;
        }

        // The page's own query ran before the site frame was chosen.
        $query = $GLOBALS['wp_query'];
        $query->posts = self::posts($query->posts);
        $query->post = $query->posts[0] ?? $query->post;
        \add_filter('the_posts', [self::class, 'posts']);
        \add_filter('get_block_file_template', [self::class, 'fileTemplate'], 10, 3);
        \add_filter('get_block_templates', [self::class, 'fileTemplates']);
        \add_filter('block_core_navigation_render_inner_blocks', [self::class, 'menu']);
        $synced = \WP_Block_Type_Registry::get_instance()->get_registered('core/block');
        if (!$synced) {
            return;
        }

        // Core reads a synced pattern with get_post(), which no filter reaches.
        $render = $synced->render_callback;
        $synced->render_callback = function ($attributes, $content, $block) use ($render) {
            return self::syncedPattern((int) ($attributes['ref'] ?? 0), $block)
                ?? $render($attributes, $content, $block);
        };
    }

    public static function posts($posts)
    {
        return array_map(function ($post) {
            $content = $post instanceof \WP_Post ? self::content(self::sourceOf($post)) : null;
            if ($content === null) {
                return $post;
            }

            // A copy, so the draft never reaches the post cache that visitors read.
            $drafted = clone $post;
            $drafted->post_content = $content;
            return $drafted;
        }, $posts);
    }

    public static function fileTemplate($template, $id, $type)
    {
        $content = $template ? self::content(($type === 'wp_template' ? 'template:' : 'part:') . $id) : null;
        if ($content === null) {
            return $template;
        }

        // Core keeps registered templates in a shared registry.
        $drafted = clone $template;
        $drafted->content = $content;
        return $drafted;
    }

    public static function fileTemplates($templates)
    {
        return array_map(function ($template) {
            return self::fileTemplate($template, $template->id, $template->type);
        }, $templates);
    }

    // Core reads a menu's links with get_post(), which no filter reaches.
    public static function menu($links)
    {
        $navigation = \WP_Block_Supports::$block_to_render;
        $source = 'post:' . (int) BlockIds::menuOf($navigation);
        if (self::content($source) === null) {
            return $links;
        }

        $type = \WP_Block_Type_Registry::get_instance()->get_registered('core/navigation');
        return new \WP_Block_List(
            array_values(Tree::named(\parse_blocks(BlockIds::content($source)))),
            $type->prepare_attributes_for_render($navigation['attrs'])
        );
    }

    private static function syncedPattern($ref, \WP_Block $block)
    {
        static $rendering = [];
        $post = isset($rendering[$ref]) || self::content("post:{$ref}") === null ? null : \get_post($ref);
        // Core shows none of these, so the draft must not either.
        if (!$post || $post->post_type !== 'wp_block' || $post->post_status !== 'publish' || $post->post_password) {
            return null;
        }

        global $wp_embed;
        $rendering[$ref] = true;
        $content = $wp_embed->autoembed($wp_embed->run_shortcode(BlockIds::content("post:{$ref}")));
        $block->parsed_block['innerBlocks'] = \parse_blocks($content);
        $block->parsed_block['innerContent'] = array_fill(0, count($block->parsed_block['innerBlocks']), null);
        $block->refresh_context_dependents();
        $html = $block->render(['dynamic' => false]);
        unset($rendering[$ref]);
        return $html;
    }

    private static function sourceOf(\WP_Post $post)
    {
        $kinds = ['wp_template' => 'template', 'wp_template_part' => 'part'];
        if (!isset($kinds[$post->post_type])) {
            return 'post:' . $post->ID;
        }

        // Another theme's template with the same slug must not take this draft.
        return \has_term(\get_stylesheet(), 'wp_theme', $post)
            ? "{$kinds[$post->post_type]}:" . \get_stylesheet() . "//{$post->post_name}"
            : '';
    }

    // An undo answers with each block's id from before the change.
    private static function undone(array $changed)
    {
        return array_map(function ($item) {
            return array_merge($item, ['block' => $item['before'] ?? $item['block'], 'before' => $item['block']]);
        }, $changed);
    }

    // The Site Editor writes a theme pattern's own blocks into the source in its place.
    private static function inlinePatterns(array $blocks, array $path)
    {
        $scope = null;
        $holder = null;
        $depth = 1;
        while ($depth < count($path)) {
            $keys = Tree::keysOf($blocks, array_slice($path, 0, $depth));
            $block = $keys === null ? [] : Tree::at($blocks, $keys);
            $pattern = ($block['blockName'] ?? '') === 'core/pattern'
                ? \WP_Block_Patterns_Registry::get_instance()->get_registered($block['attrs']['slug'] ?? '')
                : null;
            if (!$pattern) {
                $depth++;
                continue;
            }

            // A version must hold the pattern block and the blocks that replace it.
            $scope = $scope ?? array_slice($path, 0, $depth - 1);
            $holder = $holder ?? array_slice($path, 0, $depth);
            $inner = self::patternBlocks($pattern);
            // The site frame gave the pattern's blocks ids inside the pattern block's own.
            $was = $block['attrs'][Tree::MARK] ?? null;
            $markup = \serialize_blocks($was === null ? $inner : Tree::mark($inner, (string) $was));
            $inline = ['blockName' => null, 'attrs' => [], 'innerContent' => [$markup]];
            // A parent holds one slot per inner block, so the parser rebuilds them.
            $blocks = \parse_blocks(\serialize_blocks(Tree::replaceAt($blocks, $keys, $inline)));
            // The pattern's nth block now sits n places past where it stood.
            array_splice($path, $depth - 1, 2, [$path[$depth - 1] + $path[$depth]]);
        }

        return [$blocks, $path, $scope ?? $path, $holder];
    }

    // As the Site Editor does, a one-block pattern leaves its name on that block.
    private static function patternBlocks(array $pattern)
    {
        $blocks = \parse_blocks($pattern['content']);
        $roots = array_keys(Tree::named($blocks));
        if (count($roots) !== 1 || empty($pattern['categories'])) {
            return $blocks;
        }

        $metadata = $blocks[$roots[0]]['attrs']['metadata'] ?? [];
        $blocks[$roots[0]]['attrs']['metadata'] = array_merge($metadata, [
            'categories' => $pattern['categories'],
            'patternName' => $pattern['name'],
            'name' => empty($metadata['name']) ? $pattern['title'] : $metadata['name'],
        ]);
        return $blocks;
    }

    private static function swapOf(array $before, array $after, array $path)
    {
        if (!$path) {
            return ['before' => \serialize_blocks($before), 'after' => \serialize_blocks($after)];
        }

        return [
            'before' => \serialize_block(Tree::at($before, Tree::keysOf($before, $path))),
            'after' => \serialize_block(Tree::at($after, Tree::keysOf($after, $path))),
        ];
    }

    private static function reversed(array $swaps)
    {
        return array_reverse(array_map(function ($swap) {
            return array_merge($swap, ['before' => $swap['after'], 'after' => $swap['before']]);
        }, $swaps));
    }

    private static function stateAt(array $draft, $applied)
    {
        $forward = $applied > $draft['current'];
        $entries = $forward
            ? array_slice($draft['versions'], $draft['current'], $applied - $draft['current'])
            : array_reverse(array_slice($draft['versions'], $applied, $draft['current'] - $applied));
        foreach ($entries as $entry) {
            $draft = self::step($draft, $entry, $forward);
        }

        $draft['current'] = $applied;
        return $draft;
    }

    private static function step(array $draft, array $entry, $forward)
    {
        $draft = self::play($draft, $forward ? $entry['blocks'] : self::reversed($entry['blocks']))[0];
        foreach ($entry['titles'] ?? [] as $renamed) {
            $title = $renamed[$forward ? 'after' : 'before'];
            unset($draft['titles'][$renamed['source']]);
            $draft['titles'] += $title === null ? [] : [$renamed['source'] => $title];
            $draft['version'] = self::nextVersion($draft['version']);
        }

        return $entry['styles'] ? self::setStyles($draft, $entry['styles'][$forward ? 'after' : 'before']) : $draft;
    }

    // The live block wins, since it is saved and newer.
    private static function play(array $draft, array $swaps)
    {
        $lost = [];
        foreach ($swaps as $swap) {
            $index = array_search($swap['version'] ?? null, array_column($draft['versions'], 'id'), true);
            // It never landed, so its block may be someone else's now.
            if ($index !== false && !empty($draft['versions'][$index]['dropped'])) {
                continue;
            }

            $next = self::swap($draft, $swap);
            if (!\is_wp_error($next)) {
                $draft = $next;
                continue;
            }

            // Undone versions drop quietly; applied, saved or pruned ones are edits the user would lose.
            if ($index === false || $index < $draft['current'] || !empty($draft['versions'][$index]['saved'])) {
                $lost[] = [
                    'version' => $index === false ? null : $draft['versions'][$index]['id'],
                    'reason' => $index === false ? 'old' : $next->get_error_code(),
                ];
            }

            if ($index !== false) {
                $code = $next->get_error_code();
                $draft['versions'][$index]['dropped'] = $code !== 'gone' && self::builtOnDropped($draft, $swap)
                    ? 'built'
                    : $code;
                $draft['versions'][$index]['droppedFrom'] = $swap['source'];
                $draft = self::takeBack($draft, $draft['versions'][$index]['blocks']);
            }
        }

        return [$draft, $lost];
    }

    // A version drops whole, or its landed edits would stay where Undo skips them and Save writes them.
    private static function takeBack(array $draft, array $swaps)
    {
        foreach (self::reversed($swaps) as $swap) {
            $next = self::swap($draft, $swap);
            $draft = \is_wp_error($next) ? $draft : $next;
        }

        return $draft;
    }

    private static function builtOnDropped(array $draft, array $swap)
    {
        foreach ($draft['versions'] as $entry) {
            foreach (empty($entry['dropped']) ? [] : $entry['blocks'] as $earlier) {
                $made = $earlier['after'];
                $overlap = strpos($made, $swap['before']) !== false || strpos($swap['before'], $made) !== false;
                if ($earlier['source'] === $swap['source'] && $overlap) {
                    return true;
                }
            }
        }

        return false;
    }

    private static function swap(array $draft, array $swap)
    {
        $source = $swap['source'];
        if (self::gone($source)) {
            return new \WP_Error('gone');
        }

        $blocks = \parse_blocks($draft['sources'][$source]['content'] ?? BlockIds::live($source, self::HOOKS) ?? '');
        $path = self::locate($blocks, $swap);
        if (\is_wp_error($path)) {
            return $path;
        }

        $keys = Tree::keysOf($blocks, $path);
        $content = $path
            ? \serialize_blocks(Tree::replaceAt($blocks, $keys, \parse_blocks($swap['after'])[0]))
            : $swap['after'];
        return self::write($draft, $source, $content, [array_merge($swap, ['block' => implode('.', $path)])]);
    }

    private static function locate(array $blocks, array $swap)
    {
        $path = $swap['block'] === '' ? [] : explode('.', $swap['block']);
        $keys = Tree::keysOf($blocks, $path);
        $found = $keys === null
            ? null
            : ($path ? \serialize_block(Tree::at($blocks, $keys)) : \serialize_blocks($blocks));
        if ($found === $swap['before']) {
            return $path;
        }

        $matches = $path ? self::pathsOf($blocks, $swap['before']) : [];
        if (count($matches) === 1) {
            return $matches[0];
        }

        return new \WP_Error($matches ? 'unsure' : 'changed');
    }

    private static function pathsOf(array $blocks, $markup, array $at = [])
    {
        $paths = [];
        foreach (array_values(Tree::named($blocks)) as $index => $block) {
            $path = array_merge($at, [$index]);
            $paths = array_merge(
                $paths,
                \serialize_block($block) === $markup ? [$path] : [],
                self::pathsOf($block['innerBlocks'], $markup, $path)
            );
        }

        return $paths;
    }

    private static function gone($source)
    {
        $parts = explode(':', $source, 2);
        if ($parts[0] !== 'post') {
            return BlockIds::live($source) === null;
        }

        $status = \get_post_status((int) $parts[1]);
        return !$status || $status === 'trash';
    }

    // A theme file keeps no history, so only a theme update changes it.
    private static function changedBy($source)
    {
        $parts = explode(':', $source, 2);
        $template = $parts[0] === 'post'
            ? null
            : \get_block_template($parts[1], $parts[0] === 'part' ? 'wp_template_part' : 'wp_template');
        $post = $parts[0] === 'post'
            ? \get_post((int) $parts[1])
            : ($template && $template->wp_id ? \get_post($template->wp_id) : null);
        $entry = ['source' => $source, 'title' => self::title($source)];
        if (!$post) {
            return $entry + ['theme' => true, 'by' => null, 'mine' => false, 'at' => null];
        }

        // Empty when revisions are off, which leaves only when.
        $revisions = array_filter(\wp_get_post_revisions($post, ['posts_per_page' => 5]), function ($revision) {
            return !\wp_is_post_autosave($revision);
        });
        $revision = reset($revisions) ?: null;
        $by = $revision ? (int) $revision->post_author : 0;
        return $entry + [
            'theme' => false,
            'by' => $by ? \get_the_author_meta('display_name', $by) : null,
            'mine' => $by === \get_current_user_id(),
            'at' => strtotime(($revision ? $revision->post_date_gmt : $post->post_modified_gmt) . ' UTC'),
        ];
    }

    // Someone with a drafted page open in the editor may save over it soon.
    private static function locks(array $draft)
    {
        $locks = [];
        foreach (array_keys($draft['sources']) as $source) {
            $parts = explode(':', $source, 2);
            $user = $parts[0] === 'post' ? self::lockOf((int) $parts[1]) : null;
            if (!$user) {
                continue;
            }

            $locks[] = [
                'source' => $source,
                'title' => self::title($source),
                'by' => $user->display_name,
                'mine' => $user->ID === \get_current_user_id(),
            ];
        }

        return $locks;
    }

    private static function write(array $draft, $source, $content, array $swaps)
    {
        $held = $draft['sources'][$source] ?? ['live' => self::liveHash($source), 'changes' => []];
        unset($draft['sources'][$source]);
        if (md5($content) !== $held['live']) {
            $draft['sources'][$source] = array_merge($held, [
                'content' => $content,
                'changes' => array_reduce($swaps, [self::class, 'logged'], $held['changes']),
            ]);
        }

        $draft['version'] = self::nextVersion($draft['version']);
        return $draft;
    }

    // An undo or restore logs a swap's reverse; dropping the pair keeps only edits still in the copy.
    private static function logged(array $changes, array $swap)
    {
        for ($at = count($changes) - 1; $at >= 0; $at--) {
            $earlier = $changes[$at];
            $reverses = ($earlier['version'] ?? null) === ($swap['version'] ?? null)
                && $earlier['before'] === $swap['after']
                && $earlier['after'] === $swap['before'];
            if ($reverses) {
                array_splice($changes, $at, 1);
                return $changes;
            }
        }

        $changes[] = $swap;
        return $changes;
    }

    private static function liveHash($source)
    {
        return md5(\serialize_blocks(\parse_blocks(BlockIds::live($source, self::HOOKS) ?? '')));
    }

    // A new version drops the undone ones, as in any editor.
    private static function record(array $draft, array $entry)
    {
        $versions = array_slice($draft['versions'], 0, $draft['current']);
        $versions[] = array_merge([
            'id' => $draft['next'],
            'at' => time(),
            'user' => \get_current_user_id(),
            'by' => 'demo',
            'blocks' => [],
            'styles' => null,
            'changed' => [],
        ], self::$request ? ['request' => self::$request] : [], $entry);
        $draft['versions'] = array_slice($versions, -self::KEEP);
        $draft['current'] = count($draft['versions']);
        $draft['next']++;
        return self::pruneSnapshots($draft);
    }

    private static function sourcesOf(array $entry)
    {
        return array_merge(
            array_column($entry['blocks'], 'source'),
            array_column($entry['titles'] ?? [], 'source'),
            $entry['styles'] ? ['styles'] : []
        );
    }

    private static function stylesOf(array $draft)
    {
        return [
            'variation' => $draft['variation'],
            'colors' => $draft['colors'],
            'fonts' => $draft['fonts'],
            'vibe' => $draft['vibe'],
            'animation' => $draft['animation'],
            'palette' => $draft['palette'],
            'settings' => $draft['settings'],
            'base' => $draft['stylesBase'],
        ];
    }

    // Versions from before the colors layer lack it, and arrays compare in key order.
    private static function normalStyles(array $styles)
    {
        return array_merge(self::LIVE_STYLES, array_intersect_key($styles, self::LIVE_STYLES));
    }

    private static function setStyles(array $draft, array $styles)
    {
        $styles = self::normalStyles($styles);
        // Matching what the last Save wrote is the live styles again.
        $styles = $styles === $draft['stylesSaved'] ? self::LIVE_STYLES : $styles;
        // Frame URLs name the picks but not the base or the palette's changes.
        if (
            $styles['base'] !== $draft['stylesBase']
            || $styles['palette'] !== $draft['palette']
            || $styles['settings'] !== $draft['settings']
        ) {
            $draft['version'] = self::nextVersion($draft['version']);
        }

        $draft['variation'] = $styles['variation'];
        $draft['colors'] = $styles['colors'];
        $draft['fonts'] = $styles['fonts'];
        $draft['vibe'] = $styles['vibe'];
        $draft['animation'] = $styles['animation'];
        $draft['palette'] = $styles['palette'];
        $draft['settings'] = $styles['settings'];
        $draft['stylesBase'] = $styles['base'];
        return $draft;
    }

    // Undoing past this Save must show the styles it replaced, which live no longer has.
    private static function snapshotStyles(array $draft, array $replaced, $animation, $restyled)
    {
        // A Save that wrote only the animation left global styles as they were, so there's nothing to snapshot.
        $id = $restyled ? 's' . $draft['next'] : null;
        // An animation left empty meant the saved one, which this Save replaced.
        $rebase = function (array $styles) use ($id, $animation) {
            $styles = self::normalStyles($styles);
            $styles['base'] = $styles['base'] ?? $id;
            if ($animation !== null && $styles['animation'] === '') {
                $styles['animation'] = $animation;
            }

            return $styles;
        };
        $draft['versions'] = array_map(function ($entry) use ($rebase) {
            return $entry['styles'] ? array_merge($entry, ['styles' => array_map($rebase, $entry['styles'])]) : $entry;
        }, $draft['versions']);
        if ($id !== null) {
            $draft['snapshots'][$id] = $replaced;
            $draft['stylesLive'] = md5(self::liveStyles());
            $draft['next']++;
        }

        $draft['stylesSaved'] = $rebase(self::stylesOf($draft));
        $draft['variation'] = '';
        $draft['colors'] = '';
        $draft['fonts'] = '';
        $draft['vibe'] = '';
        $draft['animation'] = '';
        $draft['palette'] = '';
        $draft['stylesBase'] = null;
        return self::pruneSnapshots($draft);
    }

    private static function pruneSnapshots(array $draft)
    {
        $used = [$draft['stylesBase'], $draft['stylesSaved']['base']];
        foreach ($draft['versions'] as $entry) {
            $used[] = $entry['styles']['before']['base'] ?? null;
            $used[] = $entry['styles']['after']['base'] ?? null;
        }

        $draft['snapshots'] = array_intersect_key($draft['snapshots'], array_flip(array_filter($used)));
        return $draft;
    }

    private static function liveStyles()
    {
        $id = \WP_Theme_JSON_Resolver::get_user_global_styles_post_id();
        $post = $id ? \get_post($id) : null;
        return $post ? $post->post_content : '';
    }

    // Through REST, as the Site Editor saves, so hooked blocks and new templates match.
    private static function store($source, $content)
    {
        $parts = explode(':', $source, 2);
        $type = $parts[0] === 'post'
            ? \get_post_type((int) $parts[1])
            : ($parts[0] === 'part' ? 'wp_template_part' : 'wp_template');
        $route = $type ? \rest_get_route_for_post_type_items($type) : '';
        return $route ? self::post("{$route}/{$parts[1]}", ['content' => $content]) : new \WP_Error('not_saved');
    }

    private static function storeStyles(array $styles)
    {
        $id = \WP_Theme_JSON_Resolver::get_user_global_styles_post_id();
        return self::post(\rest_get_route_for_post_type_items('wp_global_styles') . "/{$id}", [
            'settings' => $styles['settings'] ?? [],
            'styles' => $styles['styles'] ?? [],
        ]);
    }

    private static function post($route, array $params)
    {
        $request = new \WP_REST_Request('POST', $route);
        foreach ($params as $name => $value) {
            $request->set_param($name, $value);
        }

        $response = \rest_do_request($request);
        return $response->is_error() ? $response->as_error() : $response;
    }

    // Frame cache keys hold the version, so it must never repeat.
    private static function nextVersion($version)
    {
        return max($version + 1, (int) floor(microtime(true) * 1000));
    }

    private static function title($source)
    {
        $parts = explode(':', $source, 2);
        if ($parts[0] === 'post') {
            return \get_the_title((int) $parts[1]);
        }

        $template = \get_block_template($parts[1], $parts[0] === 'part' ? 'wp_template_part' : 'wp_template');
        return $template ? $template->title : $parts[1];
    }

    private static function put(array $draft)
    {
        self::install();
        $GLOBALS['wpdb']->replace(self::table(), [
            'user_id' => \get_current_user_id(),
            'data' => \wp_json_encode($draft),
            'updated_at' => gmdate('Y-m-d H:i:s'),
        ]);
        \wp_cache_set(\get_current_user_id(), $draft, self::CACHE_GROUP);
    }

    private static function exists()
    {
        $wpdb = $GLOBALS['wpdb'];
        return (bool) $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', self::table()));
    }
}

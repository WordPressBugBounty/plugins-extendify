<?php

/**
 * Conversation.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Keeps each user's chat with the agent, so it outlives the page.
 */
class Conversation
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const CACHE_GROUP = 'extendify_agentx_conversations';
    const KEEP = 200;
    const EMPTY = ['id' => null, 'messages' => []];
    // A chat this long untouched opens empty, under the welcome-back guide.
    const QUIET = 86400;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function table()
    {
        return $GLOBALS['wpdb']->prefix . 'extendify_agentx_messages';
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
        return array_intersect_key(self::saved(), self::EMPTY);
    }

    /**
     * The chat the agent opens with: none once the saved one has gone quiet.
     *
     * @return array
     */
    public static function served()
    {
        return self::quiet() ? self::EMPTY : self::settled(self::saved());
    }

    /**
     * A run a reload cut off would never finish, so the chat stops at its request with a note.
     *
     * @return array
     */
    private static function settled(array $saved)
    {
        $messages = $saved['messages'];
        $last = end($messages);
        // A last message with no reply was cut off before its run saved anything.
        $running = $saved['running'] ?? ($last && $last->role === 'user' ? (object) ['from' => $last->id] : null);
        $at = $running ? array_search($running->from, array_column($messages, 'id'), true) : false;
        if ($at === false) {
            return ['id' => $saved['id'], 'messages' => $messages];
        }

        $note = (object) [
            'id' => 'interrupted-' . $running->from,
            'role' => 'assistant',
            'parts' => [(object) ['type' => 'data-interrupted', 'data' => $running]],
        ];
        return ['id' => $saved['id'], 'messages' => array_merge(array_slice($messages, 0, $at + 1), [$note])];
    }

    /**
     * Whether the saved chat was last touched a day ago, or before the user last signed in.
     *
     * @return bool
     */
    public static function quiet()
    {
        $userId = \get_current_user_id();
        if (!$userId || !self::exists() || !self::get()['messages']) {
            return false;
        }

        $wpdb = $GLOBALS['wpdb'];
        $updated = $wpdb->get_var(
            $wpdb->prepare('SELECT updated_at FROM ' . self::table() . ' WHERE user_id = %d', $userId)
        );
        // Insights stamps each sign-in in UTC, as the table stamps each save.
        $login = (string) \get_user_meta($userId, 'extendify_last_login', true);
        $since = max(time() - self::QUIET, $login ? (int) strtotime($login . ' UTC') : 0);
        return $updated && strtotime($updated . ' UTC') < $since;
    }

    public static function save($body)
    {
        $userId = \get_current_user_id();
        // Without a user, every visitor's chat would land in one shared row.
        if (!$userId) {
            return new \WP_Error('no_user', 'Sign in to save the chat.', ['status' => 401]);
        }

        $sent = json_decode((string) $body);
        if (!self::wellFormed($sent)) {
            return new \WP_Error('bad_conversation', 'Malformed conversation.', ['status' => 400]);
        }

        $conversation = $sent->messages
            ? [
                'id' => $sent->id ?? null,
                'messages' => array_slice($sent->messages, -self::KEEP),
                'running' => $sent->running ?? null,
            ]
            : self::EMPTY + ['running' => null];
        self::install();
        $GLOBALS['wpdb']->replace(self::table(), [
            'user_id' => $userId,
            'data' => \wp_json_encode($conversation),
            'updated_at' => gmdate('Y-m-d H:i:s'),
        ]);
        \wp_cache_set($userId, $conversation, self::CACHE_GROUP);
        return $conversation;
    }

    private static function wellFormed($sent)
    {
        if (!is_object($sent) || !isset($sent->messages) || !is_array($sent->messages)) {
            return false;
        }

        if (isset($sent->id) && !is_string($sent->id)) {
            return false;
        }

        // A run still going at the save names the message it started from.
        if (isset($sent->running) && !is_string($sent->running->from ?? null)) {
            return false;
        }

        foreach ($sent->messages as $message) {
            if (
                !is_object($message) || !is_string($message->id ?? null)
                || !in_array($message->role ?? null, ['user', 'assistant'], true)
                || !is_array($message->parts ?? null)
            ) {
                return false;
            }
        }

        return true;
    }

    /**
     * Decoded as objects, since arrays would turn a tool's empty input {} into [].
     *
     * @return array
     */
    private static function saved()
    {
        $userId = \get_current_user_id();
        \wp_cache_add_non_persistent_groups([self::CACHE_GROUP]);
        $saved = \wp_cache_get($userId, self::CACHE_GROUP, false, $found);
        if ($found) {
            return $saved;
        }

        $wpdb = $GLOBALS['wpdb'];
        $row = $userId && self::exists()
            ? $wpdb->get_var($wpdb->prepare('SELECT data FROM ' . self::table() . ' WHERE user_id = %d', $userId))
            : null;
        $data = $row ? json_decode($row) : null;
        $saved = [
            'id' => $data->id ?? null,
            'messages' => $data->messages ?? [],
            'running' => $data->running ?? null,
        ];
        \wp_cache_set($userId, $saved, self::CACHE_GROUP);
        return $saved;
    }

    private static function exists()
    {
        $wpdb = $GLOBALS['wpdb'];
        return (bool) $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', self::table()));
    }
}

<?php

/**
 * The user's sessions with the agent.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Counts sessions the way Welcome back reads a return: a sign-in, or a day away.
 */
class Sessions
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const META = 'extendify_agentx_session';
    // Every admin page load asks, so a recent enough visit isn't written again.
    const SEEN_EVERY = 3600;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The session this load belongs to, and whether this load began it.
     *
     * @return array
     */
    public static function current()
    {
        $userId = \get_current_user_id();
        if (!$userId) {
            return ['number' => 1, 'started' => false];
        }

        $now = time();
        $saved = \get_user_meta($userId, self::META, true);
        $saved = is_array($saved) ? $saved : [];
        // Insights stamps each sign-in in UTC.
        $login = (string) \get_user_meta($userId, 'extendify_last_login', true);
        $signedIn = $login ? (int) strtotime($login . ' UTC') : 0;
        $started = (int) ($saved['started'] ?? 0);
        $seen = (int) ($saved['seen'] ?? 0);

        if (empty($saved['number']) || $signedIn > $started || $now - $seen > Conversation::QUIET) {
            $number = (int) ($saved['number'] ?? 0) + 1;
            \update_user_meta($userId, self::META, ['number' => $number, 'started' => $now, 'seen' => $now]);
            return ['number' => $number, 'started' => true];
        }

        if ($now - $seen > self::SEEN_EVERY) {
            \update_user_meta($userId, self::META, array_merge($saved, ['seen' => $now]));
        }

        return ['number' => (int) $saved['number'], 'started' => false];
    }
}

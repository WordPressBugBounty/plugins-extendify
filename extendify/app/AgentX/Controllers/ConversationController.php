<?php

/**
 * Conversation controller.
 */

namespace Extendify\AgentX\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\AgentX\Conversation;

/**
 * Saves the user's chat with the agent.
 */
class ConversationController
{
    public static function save(\WP_REST_Request $request)
    {
        $saved = Conversation::save($request->get_body());
        // Nothing reads the chat back, and echoing it doubles a save's transfer.
        return \is_wp_error($saved) ? $saved : new \WP_REST_Response(['saved' => true]);
    }
}

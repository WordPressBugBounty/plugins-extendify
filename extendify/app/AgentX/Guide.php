<?php

/**
 * The Site Guide's progress.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Records which of the guide's steps the site has done.
 */
class Guide
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OPTION = 'extendify_agentx_guide';
    const STEPS = ['build', 'look', 'design', 'logo', 'icon', 'title', 'domain'];
    // Set when the user presses the last step's button, which ends the guide whatever else is done.
    const FINISHED = 'finished';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The steps done so far.
     *
     * @return array
     */
    public static function current()
    {
        $steps = self::saved();
        // The agent opens only on a built site.
        $steps['build'] = 'done';
        return ['steps' => $steps];
    }

    /**
     * Records a step as done.
     *
     * @param string $step - One of STEPS.
     * @param bool $finishes - The step was the guide's last.
     * @return array|\WP_Error
     */
    public static function markDone($step, $finishes = false)
    {
        if (!in_array($step, self::STEPS, true)) {
            return new \WP_Error('extendify_agentx_guide', 'The guide has no such step.', ['status' => 400]);
        }

        $done = $finishes ? [$step => 'done', self::FINISHED => 'done'] : [$step => 'done'];
        \update_option(self::OPTION, array_merge(self::saved(), $done), false);
        return self::current();
    }

    private static function saved()
    {
        $saved = \get_option(self::OPTION, []);
        $kept = array_flip(array_merge(self::STEPS, [self::FINISHED]));
        return is_array($saved) ? array_intersect_key($saved, $kept) : [];
    }
}

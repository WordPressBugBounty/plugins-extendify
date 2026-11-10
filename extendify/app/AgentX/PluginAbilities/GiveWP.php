<?php

/**
 * GiveWP's fundraising campaigns.
 */

namespace Extendify\AgentX\PluginAbilities;

defined('ABSPATH') || die('No direct access.');

use Give\Campaigns\Models\Campaign;
use Give\Campaigns\ValueObjects\CampaignGoalType;

/**
 * Lists and changes campaigns through the plugin's own campaign model.
 */
class GiveWP extends Plugin
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const GOALS = ['amount', 'donations', 'donors'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function active()
    {
        return class_exists(Campaign::class);
    }

    public static function category()
    {
        return [
            'givewp',
            'GiveWP',
            'The site\'s fundraising campaigns: their names, goals, end dates, descriptions and colors.',
        ];
    }

    public static function abilities()
    {
        return [
            'give-list-campaigns' => self::ability(
                // translators: Name of a GiveWP action the AI Agent can run. List is a verb; campaigns raise money.
                \__('List campaigns', 'extendify-local'),
                'Lists the fundraising campaigns with their ids, goals, how much each has raised, and end dates.',
                [],
                [],
                'read',
                [self::class, 'listCampaigns'],
                self::can('edit_give_forms')
            ),
            'give-update-campaign' => self::ability(
                // translators: Name of a GiveWP action the AI Agent can run. A campaign raises donations.
                \__('Change a campaign', 'extendify-local'),
                'Changes a campaign\'s name, short description, goal, end date or colors. Only what is given changes.',
                [
                    'campaign_id' => ['type' => 'integer', 'description' => 'The campaign\'s id.'],
                    'title' => ['type' => 'string', 'description' => 'The campaign\'s name.'],
                    'short_description' => [
                        'type' => 'string',
                        'description' => 'A sentence or two on what the money is for.',
                    ],
                    'goal' => [
                        'type' => 'integer',
                        'minimum' => 1,
                        'description' => 'The goal: an amount of money in whole units, '
                            . 'or a number of donations or donors.',
                    ],
                    'goal_type' => [
                        'type' => 'string',
                        'enum' => self::GOALS,
                        'description' => 'What the goal counts.',
                    ],
                    'end_date' => [
                        'type' => 'string',
                        'description' => 'The last day, as YYYY-MM-DD, or an empty string for no end.',
                    ],
                    'primary_color' => [
                        'type' => 'string',
                        'description' => 'The main color, like the donate button\'s, as a hex color.',
                    ],
                    'secondary_color' => [
                        'type' => 'string',
                        'description' => 'The second color, like the goal bar\'s, as a hex color.',
                    ],
                ],
                ['campaign_id'],
                'update',
                [self::class, 'updateCampaign'],
                self::can('edit_give_forms')
            ),
        ];
    }

    public static function listCampaigns()
    {
        return ['campaigns' => array_map([self::class, 'shape'], Campaign::query()->limit(50)->getAll() ?: [])];
    }

    public static function updateCampaign($input)
    {
        $campaign = Campaign::find((int) $input['campaign_id']);
        if (!$campaign) {
            return self::missing('campaign');
        }

        $fields = ['title' => 'title', 'short_description' => 'shortDescription', 'goal' => 'goal'];
        foreach ($fields as $key => $property) {
            if (isset($input[$key])) {
                $campaign->$property = $input[$key];
            }
        }

        if (isset($input['goal_type'])) {
            $campaign->goalType = new CampaignGoalType($input['goal_type']);
        }

        foreach (['primary_color' => 'primaryColor', 'secondary_color' => 'secondaryColor'] as $key => $property) {
            if (!isset($input[$key])) {
                continue;
            }

            $color = \sanitize_hex_color($input[$key]);
            if (!$color) {
                return new \WP_Error('bad_color', 'A color must be a hex color like #1e7a46.', ['status' => 400]);
            }

            $campaign->$property = $color;
        }

        if (isset($input['end_date'])) {
            $end = $input['end_date'] === ''
                ? null
                : \DateTime::createFromFormat('!Y-m-d', $input['end_date'], \wp_timezone());
            if ($input['end_date'] !== '' && !$end) {
                return new \WP_Error('bad_date', 'The end date must be YYYY-MM-DD.', ['status' => 400]);
            }

            $campaign->endDate = $end ? $end->setTime(23, 59, 59) : null;
        }

        $campaign->save();
        return self::shape($campaign);
    }

    private static function shape(Campaign $campaign)
    {
        $stats = $campaign->getGoalStats();
        return [
            'id' => $campaign->id,
            'title' => $campaign->title,
            'short_description' => $campaign->shortDescription,
            'goal' => $campaign->goal,
            'goal_type' => $campaign->goalType->getValue(),
            'raised' => $stats['actualFormatted'] ?? '',
            'status' => $campaign->status->getValue(),
            'end_date' => $campaign->endDate ? $campaign->endDate->format('Y-m-d') : '',
            'primary_color' => $campaign->primaryColor,
            'secondary_color' => $campaign->secondaryColor,
        ];
    }
}

<?php

/**
 * The Events Calendar's events.
 */

namespace Extendify\AgentX\PluginAbilities;

defined('ABSPATH') || die('No direct access.');

/**
 * Lists, adds and changes events through the plugin's own event API.
 */
class EventsCalendar extends Plugin
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const TIME = 'Y-m-d H:i';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function active()
    {
        return class_exists('Tribe__Events__Main') && function_exists('tribe_create_event');
    }

    public static function category()
    {
        return [
            'the-events-calendar',
            'The Events Calendar',
            'The events on the site\'s calendar: their names, dates and times, venues and prices.',
        ];
    }

    public static function abilities()
    {
        $event = [
            'title' => ['type' => 'string', 'description' => 'The event\'s name.'],
            'start' => [
                'type' => 'string',
                'description' => 'When it starts, in the site\'s time zone, as YYYY-MM-DD HH:MM (24-hour), '
                    . 'or YYYY-MM-DD for an all-day event.',
            ],
            'end' => [
                'type' => 'string',
                'description' => 'When it ends, in the same format. Left out, an hour after the start, '
                    . 'or the same day for an all-day event.',
            ],
            'all_day' => ['type' => 'boolean', 'description' => 'Whether it runs all day, with no times.'],
            'description' => ['type' => 'string', 'description' => 'What the event is about, as plain text.'],
            'venue' => ['type' => 'string', 'description' => 'Where it happens: the venue\'s name.'],
            'cost' => ['type' => 'string', 'description' => 'What it costs, like 10 or Free.'],
        ];
        return [
            'tec-list-events' => self::ability(
                // translators: Name of an Events Calendar action the AI Agent can run. List is a verb.
                \__('List events', 'extendify-local'),
                'Lists the calendar\'s events, soonest first, with their ids, dates, venues and prices.',
                [
                    'search' => ['type' => 'string', 'description' => 'Words in the event\'s name or description.'],
                    'past' => [
                        'type' => 'boolean',
                        'default' => false,
                        'description' => 'Include events that have ended.',
                    ],
                ],
                [],
                'read',
                [self::class, 'listEvents'],
                self::can('edit_posts')
            ),
            'tec-create-event' => self::ability(
                // translators: Name of an Events Calendar action the AI Agent can run. Events are dated.
                \__('Add an event', 'extendify-local'),
                'Adds a published event to the calendar.',
                $event,
                ['title', 'start'],
                'create',
                [self::class, 'createEvent'],
                self::can('publish_posts')
            ),
            'tec-update-event' => self::ability(
                // translators: Name of an Events Calendar action the AI Agent can run. Events are dated.
                \__('Change an event', 'extendify-local'),
                'Changes an event\'s name, dates and times, description, venue or price. Only what is given changes.',
                ['event_id' => ['type' => 'integer', 'description' => 'The event\'s id.']] + $event,
                ['event_id'],
                'update',
                [self::class, 'updateEvent'],
                self::can('edit_posts')
            ),
        ];
    }

    public static function listEvents($input = [])
    {
        $args = [
            'posts_per_page' => 30,
            'eventDisplay' => empty($input['past']) ? 'list' : 'custom',
            'post_status' => 'publish',
        ];
        if (!empty($input['search'])) {
            $args['s'] = $input['search'];
        }

        return ['events' => array_map([self::class, 'shape'], \tribe_get_events($args))];
    }

    public static function createEvent($input)
    {
        $args = self::eventArgs($input, []);
        if (\is_wp_error($args)) {
            return $args;
        }

        $id = \tribe_create_event(['post_status' => 'publish'] + $args);
        return $id ? self::shape(\get_post($id)) : new \WP_Error('not_saved', 'The event could not be added.');
    }

    public static function updateEvent($input)
    {
        $post = \get_post((int) $input['event_id']);
        if (!$post || $post->post_type !== \Tribe__Events__Main::POSTTYPE) {
            return self::missing('event');
        }

        // Blocks changing an event this user may not edit, like another author's.
        if (!\current_user_can('edit_post', $post->ID)) {
            return new \WP_Error('forbidden', 'You can\'t change that event.', ['status' => 403]);
        }

        $args = self::eventArgs($input, self::shape($post));
        if (\is_wp_error($args)) {
            return $args;
        }

        return \tribe_update_event($post->ID, $args)
            ? self::shape(\get_post($post->ID))
            : new \WP_Error('not_saved', 'The event could not be changed.');
    }

    private static function eventArgs(array $input, array $now)
    {
        $allDay = (bool) ($input['all_day'] ?? $now['all_day'] ?? false);
        $start = self::time($input['start'] ?? $now['start'] ?? '');
        if (!$start) {
            $needs = 'The start needs a date as YYYY-MM-DD, with a time as HH:MM unless the event is all day.';
            return new \WP_Error('bad_start', $needs, ['status' => 400]);
        }

        $end = self::time($input['end'] ?? '') ?: (isset($input['start']) ? null : self::time($now['end'] ?? ''));
        $end = $end ?: ($allDay ? clone $start : (clone $start)->modify('+1 hour'));
        if ($end < $start) {
            return new \WP_Error('bad_end', 'The event ends before it starts.', ['status' => 400]);
        }

        // The plugin reads dates in the site's own date picker format.
        $date = \Tribe__Date_Utils::datepicker_formats(\tribe_get_option('datepickerFormat'));
        $args = [
            'EventAllDay' => $allDay ? 'yes' : 'no',
            'EventStartDate' => $start->format($date),
            'EventStartHour' => $start->format('H'),
            'EventStartMinute' => $start->format('i'),
            'EventEndDate' => $end->format($date),
            'EventEndHour' => $end->format('H'),
            'EventEndMinute' => $end->format('i'),
            'EventCost' => $input['cost'] ?? $now['cost'] ?? '',
        ];
        foreach (['title' => 'post_title', 'description' => 'post_content'] as $key => $field) {
            if (isset($input[$key])) {
                $args[$field] = $input[$key];
            }
        }

        $venue = $input['venue'] ?? null;
        if ($venue !== null) {
            $found = \get_posts([
                'post_type' => 'tribe_venue',
                'title' => $venue,
                'numberposts' => 1,
                'fields' => 'ids',
            ]);
            $args['Venue'] = $found ? ['VenueID' => $found[0]] : ['Venue' => $venue];
        }

        return $args;
    }

    private static function time($value)
    {
        foreach ([self::TIME, 'Y-m-d'] as $format) {
            $time = \DateTime::createFromFormat("!{$format}", trim((string) $value), \wp_timezone());
            if ($time) {
                return $time;
            }
        }

        return null;
    }

    private static function shape($post)
    {
        return [
            'id' => $post->ID,
            'title' => \get_the_title($post),
            'start' => \tribe_get_start_date($post, true, self::TIME),
            'end' => \tribe_get_end_date($post, true, self::TIME),
            'all_day' => \tribe_event_is_all_day($post),
            'venue' => \tribe_get_venue($post->ID) ?: '',
            'cost' => \tribe_get_cost($post->ID) ?: '',
            'url' => \get_permalink($post),
        ];
    }
}

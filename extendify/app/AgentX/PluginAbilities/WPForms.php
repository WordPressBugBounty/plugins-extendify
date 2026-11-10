<?php

/**
 * WPForms' notification email, and moving or removing a form's fields.
 */

namespace Extendify\AgentX\PluginAbilities;

defined('ABSPATH') || die('No direct access.');

/**
 * What WPForms' own abilities leave out, saved through its own form handler.
 */
class WPForms extends Plugin
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    // WPForms' own AI write setting (WPForms > Tools > AI MCP).
    const WRITES = 'ai-mcp-write-enabled';
    const TAG = '/\{field(?:_value|_html)?_id="(\d+)/';
    const EMAIL_PARTS = [
        'email' => 'who it goes to',
        'carboncopy' => 'its CC',
        'replyto' => 'its reply-to address',
        'sender_name' => 'its sender name',
        'sender_address' => 'its sender address',
        'subject' => 'its subject',
        'message' => 'its message',
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function active()
    {
        return function_exists('wpforms');
    }

    // WPForms' own category, so this joins its abilities rather than a plugin of its own.
    public static function category()
    {
        return [
            'wpforms-forms',
            'WPForms',
            'The site\'s forms, their fields and settings, and where they send their emails.',
        ];
    }

    public static function abilities()
    {
        $form = ['type' => 'integer', 'description' => 'The form\'s id.'];
        return [
            'wpforms-update-notification' => self::ability(
                // translators: Name of a WPForms action the AI Agent can run. Sets where a form emails entries.
                \__('Change where a form sends its emails', 'extendify-local'),
                'Sets the address a form emails each time someone fills it in, and turns that email on. '
                    . 'Takes one address, or several separated by commas.',
                [
                    'form_id' => $form,
                    'email' => [
                        'type' => 'string',
                        'description' => 'One email address, or several separated by commas.',
                    ],
                ],
                ['form_id', 'email'],
                'update',
                [self::class, 'updateNotification'],
                [self::class, 'canEdit']
            ),
            'wpforms-move-field' => self::ability(
                // translators: Name of a WPForms action the AI Agent can run. A field is one question on a form.
                \__('Move a form field', 'extendify-local'),
                'Moves one field of a form above or below another of its fields, or to the start or end of the form. '
                    . 'Answers with the fields in their new order.',
                [
                    'form_id' => $form,
                    'field_id' => ['type' => 'integer', 'description' => 'The id of the field to move.'],
                    'position' => [
                        'type' => 'string',
                        'enum' => ['above', 'below', 'first', 'last'],
                        'description' => 'Above or below the field next_to names, or first or last in the form.',
                    ],
                    'next_to' => [
                        'type' => 'integer',
                        'description' => 'The id of the field it goes above or below.',
                    ],
                ],
                ['form_id', 'field_id', 'position'],
                'update',
                [self::class, 'moveField'],
                [self::class, 'canEdit']
            ),
            'wpforms-remove-field' => self::ability(
                // translators: Name of a WPForms action the AI Agent can run. A field is one question on a form.
                \__('Remove a form field', 'extendify-local'),
                'Removes one field from a form. A field the form\'s email uses stays, and the refusal says where. '
                    . 'Answers with the fields left, in order.',
                [
                    'form_id' => $form,
                    'field_id' => ['type' => 'integer', 'description' => 'The id of the field to remove.'],
                ],
                ['form_id', 'field_id'],
                'delete',
                [self::class, 'removeField'],
                [self::class, 'canEdit']
            ),
        ];
    }

    // Blocks outside AI clients the owner keeps WPForms' AI writes off for, and users who can't edit the form.
    public static function canEdit($input)
    {
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WPForms' own filter
        if (!\apply_filters('wpforms_integrations_abilities_allow_write', (bool) \wpforms_setting(self::WRITES))) {
            return new \WP_Error('wpforms_writes_disabled', 'Form write abilities are disabled.', ['status' => 403]);
        }

        $id = (int) ($input['form_id'] ?? 0);
        return $id > 0 && \wpforms_current_user_can('edit_form_single', $id);
    }

    public static function updateNotification($input)
    {
        $data = self::form($input);
        if (\is_wp_error($data)) {
            return $data;
        }

        $emails = array_values(array_filter(array_map('trim', explode(',', (string) $input['email'])), 'is_email'));
        if (!$emails) {
            return new \WP_Error('invalid_email', 'That is not an email address.', ['status' => 400]);
        }

        $data['settings']['notification_enable'] = '1';
        $data['settings']['notifications'][1] = array_merge(
            (array) ($data['settings']['notifications'][1] ?? []),
            ['email' => implode(',', $emails)]
        );
        $saved = self::save($data);
        return \is_wp_error($saved) ? $saved : ['form_id' => $data['id'], 'email' => implode(', ', $emails)];
    }

    public static function moveField($input)
    {
        $data = self::form($input);
        if (\is_wp_error($data)) {
            return $data;
        }

        $fields = (array) ($data['fields'] ?? []);
        $id = (int) $input['field_id'];
        $position = (string) ($input['position'] ?? 'last');
        $beside = in_array($position, ['above', 'below'], true);
        $next = $beside ? (int) ($input['next_to'] ?? 0) : 0;
        if ($beside && !$next) {
            return new \WP_Error('invalid_input', 'Above or below needs next_to, a field.', ['status' => 400]);
        }

        foreach (array_filter([$id, $next]) as $named) {
            if (!isset($fields[$named])) {
                return self::noField($fields);
            }

            if (self::inLayout($fields, $named)) {
                return self::layoutError();
            }
        }

        if ($next === $id) {
            return ['form_id' => $data['id'], 'fields' => self::listed($fields)];
        }

        $keys = array_values(array_diff(array_keys($fields), [$id]));
        $at = [
            'first' => 0,
            'last' => count($keys),
            'above' => array_search($next, $keys, true),
            'below' => array_search($next, $keys, true) + 1,
        ][$position] ?? count($keys);
        array_splice($keys, $at, 0, [$id]);
        $order = [];
        foreach ($keys as $key) {
            $order[$key] = $fields[$key];
        }

        $data['fields'] = $order;
        $saved = self::save($data);
        return \is_wp_error($saved) ? $saved : ['form_id' => $data['id'], 'fields' => self::listed($order)];
    }

    public static function removeField($input)
    {
        $data = self::form($input);
        if (\is_wp_error($data)) {
            return $data;
        }

        $fields = (array) ($data['fields'] ?? []);
        $id = (int) $input['field_id'];
        if (!isset($fields[$id])) {
            return self::noField($fields);
        }

        if (self::inLayout($fields, $id) || !empty($fields[$id]['columns'])) {
            return self::layoutError();
        }

        $used = self::emailUses($data, $id);
        if ($used) {
            return new \WP_Error(
                'field_in_use',
                sprintf(
                    'This field stays: the form\'s email "%s" uses it in %s. '
                        . 'Change that in the WPForms form builder, under Settings > Notifications, first.',
                    $used[0],
                    $used[1]
                ),
                ['status' => 409]
            );
        }

        $label = (string) ($fields[$id]['label'] ?? '');
        unset($fields[$id]);
        $data['fields'] = $fields;
        $saved = self::save($data);
        return \is_wp_error($saved)
            ? $saved
            : ['form_id' => $data['id'], 'removed' => $label, 'fields' => self::listed($fields)];
    }

    // An id from before a field went, or a guessed one; the agent says this to the user as it is.
    private static function noField(array $fields)
    {
        $labels = array_map(function ($field) {
            return '"' . $field['label'] . '"';
        }, self::listed($fields));
        $last = array_pop($labels);
        $has = $labels ? implode(', ', $labels) . ' and ' . $last : ($last ?? 'no fields');
        return new \WP_Error('not_found', "The form has no such field; it has {$has}.", ['status' => 404]);
    }

    private static function form($input)
    {
        $forms = \wpforms()->obj('form');
        $id = (int) $input['form_id'];
        $data = $forms ? $forms->get($id, ['content_only' => true]) : null;
        return is_array($data) && $data ? ['id' => $id] + $data : self::missing('form');
    }

    private static function save(array $data)
    {
        if (!\wpforms()->obj('form')->update($data['id'], $data)) {
            return new \WP_Error('not_saved', 'WPForms did not save the form.', ['status' => 500]);
        }

        return true;
    }

    // Pro's layout and repeater fields hold others by id, which only the form builder can rearrange.
    private static function inLayout(array $fields, $id)
    {
        foreach ($fields as $field) {
            foreach ((array) ($field['columns'] ?? []) as $column) {
                if (in_array($id, array_map('intval', (array) ($column['fields'] ?? [])), true)) {
                    return true;
                }
            }
        }

        return false;
    }

    private static function layoutError()
    {
        return new \WP_Error(
            'in_layout',
            'That field sits in a layout or repeater field, or holds others; '
                . 'the WPForms form builder can rearrange it.',
            ['status' => 409]
        );
    }

    // An email that lost its field could go to no one or reply to no one.
    private static function emailUses(array $data, $id)
    {
        foreach ((array) ($data['settings']['notifications'] ?? []) as $notification) {
            foreach (self::EMAIL_PARTS as $key => $part) {
                preg_match_all(self::TAG, (string) ($notification[$key] ?? ''), $tags);
                if (in_array((string) $id, $tags[1], true)) {
                    return [(string) ($notification['notification_name'] ?? ''), $part];
                }
            }
        }

        return null;
    }

    private static function listed(array $fields)
    {
        return array_values(array_map(function ($field) {
            return ['id' => (int) ($field['id'] ?? 0), 'label' => (string) ($field['label'] ?? '')];
        }, $fields));
    }
}

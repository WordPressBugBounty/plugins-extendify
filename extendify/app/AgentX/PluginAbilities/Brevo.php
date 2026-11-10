<?php

/**
 * Brevo's newsletter signup forms.
 */

namespace Extendify\AgentX\PluginAbilities;

defined('ABSPATH') || die('No direct access.');

/**
 * Lists and changes the words on signup forms, which the plugin keeps as HTML in a table of its own.
 */
class Brevo extends Plugin
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    // Each field's label carries the field's name in its class, as sib-email-area.
    const LABEL = '#(<label\b[^>]*\bclass="sib-([A-Za-z0-9_-]+)-area"[^>]*>)(.*?)(</label>)#s';
    const MESSAGES = ['success_message' => 'successMsg', 'error_message' => 'errorMsg'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    // Brevo shows its forms, and makes their table, only once an account is connected.
    public static function active()
    {
        return class_exists('SIB_Forms') && class_exists('SIB_Manager') && \SIB_Manager::is_api_key_set();
    }

    public static function category()
    {
        return [
            'brevo',
            'Brevo',
            'The site\'s newsletter signup forms: their field labels, button words and messages.',
        ];
    }

    public static function abilities()
    {
        return [
            'brevo-list-forms' => self::ability(
                // translators: Name of a Brevo action the AI Agent can run. List is a verb; forms collect emails.
                \__('List signup forms', 'extendify-local'),
                'Lists the newsletter signup forms with their ids, field labels, button words and messages.',
                [],
                [],
                'read',
                [self::class, 'listForms'],
                self::can('manage_options')
            ),
            'brevo-update-form' => self::ability(
                // translators: Name of a Brevo action the AI Agent can run. A signup form collects emails.
                \__('Change a signup form', 'extendify-local'),
                'Changes a signup form\'s name, field labels, button words or messages. Only what is given changes.',
                [
                    'form_id' => ['type' => 'integer', 'description' => 'The form\'s id.'],
                    'title' => ['type' => 'string', 'description' => 'The form\'s name, seen only in the admin.'],
                    'button' => ['type' => 'string', 'description' => 'The words on its button.'],
                    'labels' => [
                        'type' => 'object',
                        'additionalProperties' => ['type' => 'string'],
                        'description' => 'New labels keyed by the field\'s name from the form\'s fields, '
                            . 'like {"email": "Your email"}.',
                    ],
                    'success_message' => ['type' => 'string', 'description' => 'What it says once someone signs up.'],
                    'error_message' => ['type' => 'string', 'description' => 'What it says when signing up fails.'],
                ],
                ['form_id'],
                'update',
                [self::class, 'updateForm'],
                self::can('manage_options')
            ),
        ];
    }

    public static function listForms()
    {
        global $wpdb;
        $table = $wpdb->prefix . \SIB_Forms::TABLE_NAME;
        $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY id", ARRAY_A); // phpcs:ignore WordPress.DB
        return ['forms' => array_map([self::class, 'shape'], $rows ?: [])];
    }

    public static function updateForm($input)
    {
        global $wpdb;
        $table = $wpdb->prefix . \SIB_Forms::TABLE_NAME;
        // phpcs:ignore WordPress.DB
        $query = $wpdb->prepare("SELECT * FROM {$table} WHERE id = %d", (int) $input['form_id']);
        $row = $wpdb->get_row($query, ARRAY_A); // phpcs:ignore WordPress.DB
        if (!$row) {
            return self::missing('signup form');
        }

        $html = $row['html'];
        if (isset($input['button'])) {
            $tags = new \WP_HTML_Tag_Processor($html);
            while ($tags->next_tag('input')) {
                if ($tags->get_attribute('type') === 'submit') {
                    $tags->set_attribute('value', $input['button']);
                }
            }

            $html = $tags->get_updated_html();
        }

        $labels = (array) ($input['labels'] ?? []);
        $html = preg_replace_callback(self::LABEL, function ($match) use ($labels) {
            return isset($labels[$match[2]]) ? $match[1] . \esc_html($labels[$match[2]]) . $match[4] : $match[0];
        }, $html);

        $changes = ['html' => $html];
        if (isset($input['title'])) {
            $changes['title'] = \sanitize_text_field($input['title']);
        }

        foreach (self::MESSAGES as $key => $column) {
            if (isset($input[$key])) {
                $changes[$column] = \sanitize_text_field($input[$key]);
            }
        }

        $wpdb->update($table, $changes, ['id' => $row['id']]); // phpcs:ignore WordPress.DB
        return self::shape(array_merge($row, $changes));
    }

    private static function shape(array $row)
    {
        preg_match_all(self::LABEL, $row['html'], $labels, PREG_SET_ORDER);
        $button = '';
        $tags = new \WP_HTML_Tag_Processor($row['html']);
        while ($tags->next_tag('input')) {
            if ($tags->get_attribute('type') === 'submit') {
                $button = (string) $tags->get_attribute('value');
            }
        }

        return [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'fields' => array_map(function ($label) {
                return ['name' => $label[2], 'label' => trim(\wp_strip_all_tags($label[3]))];
            }, $labels),
            'button' => $button,
            'success_message' => $row['successMsg'],
            'error_message' => $row['errorMsg'],
        ];
    }
}

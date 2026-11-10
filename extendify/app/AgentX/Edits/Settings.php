<?php

/**
 * Change a plugin block's own settings.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Sets the words and switches a plugin block keeps as its own attributes, like a signup form's button label.
 */
class Settings extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'attributes';
    // Each block's settings the agent may set, by type; the backend lists the same ones for the model.
    const BLOCKS = [
        'smaily/newsletter-block' => [
            'emailInputLabel' => 'string',
            'nameInputLabel' => 'string',
            'showNameField' => 'boolean',
            'subscribeButtonLabel' => 'string',
            'successMessage' => 'string',
            'errorMessage' => 'string',
        ],
        // The views its calendar draws; its list is a block of its own.
        'sugar-calendar/block' => [
            'display' => ['month', 'week', 'day'],
            'accentColor' => 'color',
            'showSearch' => 'boolean',
            'showFilters' => 'boolean',
        ],
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $block = Tree::blockAt($blocks, $path);
        $allowed = self::BLOCKS[$block['blockName']] ?? null;
        if (!$allowed) {
            return self::refuse('no_settings', 'This block has no settings the agent can change.');
        }

        $settings = $args['settings'] ?? null;
        if (!is_array($settings) || !$settings) {
            return self::refuse('bad_args', 'Send the settings to change.');
        }

        $attrs = $block['attrs'];
        foreach ($settings as $name => $value) {
            $type = $allowed[$name] ?? null;
            if ($type === null) {
                return self::refuse('no_settings', "This block has no setting named {$name}.");
            }

            if (!self::fits($type, $value)) {
                $kind = is_array($type) ? 'one of ' . implode(', ', $type) : "a {$type}";
                return self::refuse('bad_args', "{$name} takes {$kind}.");
            }

            $attrs[$name] = $type === 'string' ? \sanitize_text_field($value) : $value;
        }

        $block['attrs'] = $attrs;
        return ['blocks' => Tree::setAt($blocks, $path, $block), 'at' => $path, 'block' => $path];
    }

    private static function fits($type, $value)
    {
        if (is_array($type)) {
            return in_array($value, $type, true);
        }

        if ($type === 'boolean') {
            return is_bool($value);
        }

        // A plugin writes its color straight into CSS, so only a plain hex color goes in.
        if ($type === 'color') {
            return is_string($value) && preg_match('/^#[0-9a-f]{6}$/i', $value) === 1;
        }

        return is_string($value);
    }
}

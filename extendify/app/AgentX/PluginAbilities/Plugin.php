<?php

/**
 * What every plugin's abilities share.
 */

namespace Extendify\AgentX\PluginAbilities;

defined('ABSPATH') || die('No direct access.');

/**
 * Builds an ability's definition in the shape the Abilities API takes.
 */
abstract class Plugin
{
    abstract public static function active();

    abstract public static function category();

    abstract public static function abilities();

    /**
     * @param string $kind read, create, update or delete; the agent asks before anything but a read.
     */
    protected static function ability(
        $label,
        $description,
        array $input,
        array $required,
        $kind,
        callable $execute,
        callable $permission
    ) {
        // A read with no inputs is run with none, which an object schema would refuse.
        $schema = $input ? [
            'input_schema' => [
                'type' => 'object',
                'properties' => $input,
                'additionalProperties' => false,
            ] + ($required ? ['required' => $required] : []),
        ] : [];
        return $schema + [
            'label' => $label,
            'description' => $description,
            'execute_callback' => $execute,
            'permission_callback' => $permission,
            'meta' => [
                'show_in_rest' => true,
                'annotations' => [
                    'readonly' => $kind === 'read',
                    // Destructive and idempotent is core's DELETE, which the agent asks about on its red card.
                    'destructive' => $kind === 'delete',
                    'idempotent' => $kind !== 'create',
                ],
            ],
        ];
    }

    // Blocks the ability for users without the capability the plugin itself asks for this data.
    protected static function can($capability)
    {
        return function () use ($capability) {
            return \current_user_can($capability);
        };
    }

    protected static function missing($what)
    {
        return new \WP_Error('not_found', "No {$what} has that id.", ['status' => 404]);
    }
}

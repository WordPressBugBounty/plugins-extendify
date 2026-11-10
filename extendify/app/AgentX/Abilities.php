<?php

/**
 * Other plugins' abilities.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

use Extendify\PartnerData;

/**
 * Lists the abilities the partner lets the agent run.
 */
class Abilities
{
    /**
     * The allowlisted abilities shown in REST, grouped by their category.
     *
     * @return array
     */
    public static function discover()
    {
        if (!function_exists('wp_get_abilities')) {
            return [];
        }

        $allowlist = PartnerData::setting('agentAbilitiesAllowlist');
        // Ours exist only for a plugin the site has, and the partner allows the plugin by installing it.
        $allowlist = array_merge(is_array($allowlist) ? $allowlist : [], [PluginAbilities::PREFIX]);
        $grouped = [];
        // No permission check: core's run route checks each one against its real input.
        foreach (\wp_get_abilities() as $ability) {
            $namespace = explode('/', $ability->get_name())[0];
            if (!$ability->get_meta_item('show_in_rest') || !in_array($namespace, $allowlist, true)) {
                continue;
            }

            $grouped[$ability->get_category()][] = self::shape($ability);
        }

        $categories = [];
        foreach ($grouped as $slug => $abilities) {
            $category = \wp_get_ability_category($slug);
            $categories[] = [
                'category' => $slug,
                'label' => AbilityLabels::of($category ? $category->get_label() : $slug),
                'description' => $category ? $category->get_description() : '',
                'abilities' => $abilities,
            ];
        }

        return $categories;
    }

    private static function shape($ability)
    {
        $schema = $ability->get_input_schema();
        if ($schema && function_exists('wp_prepare_json_schema_for_client')) {
            $schema = \wp_prepare_json_schema_for_client($schema);
        }

        $annotations = (array) $ability->get_meta_item('annotations');
        $flag = function ($key) use ($annotations) {
            return isset($annotations[$key]) ? (bool) $annotations[$key] : null;
        };
        return [
            'name' => $ability->get_name(),
            'label' => AbilityLabels::of($ability->get_label()),
            'description' => $ability->get_description(),
            'inputSchema' => $schema ?: null,
            'annotations' => [
                'readonly' => $flag('readonly'),
                'destructive' => $flag('destructive'),
                'idempotent' => $flag('idempotent'),
            ],
        ];
    }
}

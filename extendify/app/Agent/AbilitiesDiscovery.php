<?php

/**
 * Discovers WordPress Abilities registered on the site for the Agent.
 */

namespace Extendify\Agent;

use Extendify\PartnerData;

defined('ABSPATH') || die('No direct access.');

/**
 * Reads the Abilities API (WP 6.9+) and shapes the survivors for the Agent,
 * grouped by category so the backend can route to a category before a tool.
 */
class AbilitiesDiscovery
{
    /**
     * Discover the abilities registered on this install.
     *
     * @return array
     */
    public static function discover()
    {
        if (!function_exists('wp_get_abilities')) {
            return [];
        }

        return self::shape(
            wp_get_abilities(),
            wp_get_ability_categories(),
            PartnerData::setting('agentAbilitiesAllowlist')
        );
    }

    /**
     * Keep only REST-exposed abilities, then group their descriptors under the
     * categories that hold at least one.
     *
     * No permission filtering here: an ability's permission_callback often turns
     * on the specific input (e.g. edit_post for a given post id) which discovery
     * doesn't have, so the /run endpoint enforces permission at call time.
     *
     * @param array $abilities WP_Ability objects from wp_get_abilities().
     * @param array $categories WP_Ability_Category objects from wp_get_ability_categories().
     * @param array|null $allowlist Namespace prefixes to keep; null keeps every namespace.
     * @return array
     */
    public static function shape(array $abilities, array $categories = [], $allowlist = null)
    {
        $allowed = array_filter($abilities, function ($ability) use ($allowlist) {
            if (!$ability->get_meta_item('show_in_rest')) {
                return false;
            }

            if ($allowlist === null) {
                return true;
            }

            return in_array(explode('/', $ability->get_name())[0], $allowlist, true);
        });

        $byCategory = [];
        foreach ($allowed as $ability) {
            $meta = $ability->get_meta();
            $name = $ability->get_name();
            $byCategory[$ability->get_category()][] = [
                'name' => $name,
                'label' => $ability->get_label(),
                'description' => $ability->get_description(),
                'inputSchema' => $ability->get_input_schema(),
                'annotations' => $meta['annotations'] ?? null,
                'runHref' => \rest_url('wp-abilities/v1/abilities/' . $name . '/run'),
            ];
        }

        $categoryMeta = [];
        foreach ($categories as $category) {
            $categoryMeta[$category->get_slug()] = [
                'label' => $category->get_label(),
                'description' => $category->get_description(),
            ];
        }

        $result = [];
        foreach ($byCategory as $slug => $abilitiesInCategory) {
            $result[] = [
                'slug' => $slug,
                'label' => $categoryMeta[$slug]['label'] ?? $slug,
                'description' => $categoryMeta[$slug]['description'] ?? '',
                'abilities' => $abilitiesInCategory,
            ];
        }

        return $result;
    }
}

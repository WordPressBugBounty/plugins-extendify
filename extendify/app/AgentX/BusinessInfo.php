<?php

/**
 * The business's contact details.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Contact details saved at launch; a replace made everywhere changes them.
 */
class BusinessInfo
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OPTION = 'extendify_business_info';
    const FIELDS = ['phone', 'email', 'address', 'hours'];
    const LENGTH = 200;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The details the agent may write as the business's own, so no launch placeholder.
     *
     * @return array
     */
    public static function current()
    {
        $saved = self::saved();
        return array_diff_key(self::valid($saved), array_flip($saved['sample'] ?? []));
    }

    /**
     * The option as stored, samples included, for a draft version to put back.
     *
     * @return array
     */
    public static function saved()
    {
        $saved = \get_option(self::OPTION, []);
        if (!is_array($saved)) {
            return [];
        }

        $sample = array_values(array_intersect((array) ($saved['sample'] ?? []), self::FIELDS));
        return self::valid($saved) + ($sample ? ['sample' => $sample] : []);
    }

    /**
     * Writes the option as saved() returned it.
     *
     * @param array $saved - The details, with their samples.
     * @return void
     */
    public static function put(array $saved)
    {
        if ($saved !== self::saved()) {
            \update_option(self::OPTION, $saved, false);
        }
    }

    /**
     * Swaps old text for new in each saved detail.
     *
     * @param array $pairs - Each with the text to find and what replaces it.
     * @param array $keep - Details the change names, kept when none is saved or the saved one is a sample.
     * @return array
     */
    public static function replace(array $pairs, array $keep = [])
    {
        $saved = self::saved();
        $info = self::valid($saved);
        $sample = $saved['sample'] ?? [];
        $replaced = array_map(function ($value) use ($pairs) {
            return str_replace(array_column($pairs, 'from'), array_column($pairs, 'to'), $value);
        }, $info);
        $kept = array_diff_key(self::valid($keep), array_diff_key($info, array_flip($sample)));
        $replaced = self::valid(array_merge($replaced, $kept));
        $sample = array_values(array_diff($sample, array_keys(array_diff_assoc($replaced, $info))));
        self::put($replaced + ($sample ? ['sample' => $sample] : []));
        return self::current();
    }

    /**
     * The details of a keep that may be written, so a save with nothing to replace can be told from an empty one.
     *
     * @param array $keep - Details by field.
     * @return array
     */
    public static function kept(array $keep)
    {
        return self::valid($keep);
    }

    private static function valid(array $info)
    {
        return array_filter(array_intersect_key($info, array_flip(self::FIELDS)), function ($value) {
            return is_string($value) && trim($value) !== '' && mb_strlen($value) <= self::LENGTH;
        });
    }
}

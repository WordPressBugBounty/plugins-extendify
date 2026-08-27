<?php

namespace Extendify\Notifications;

defined('ABSPATH') || die('No direct access.');

use Extendify\PartnerData;

/**
 * The site conditions a notification can ask to be gated on, each mapped to the
 * predicate that answers it. A notification without a trigger is unconditional.
 */
class Triggers
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const PREDICATES = [
        'trial-domain' => 'onTrialDomain',
    ];

    public static function passes($trigger)
    {
        if ($trigger === null || $trigger === '') {
            return true;
        }

        if (!is_string($trigger) || !isset(self::PREDICATES[$trigger])) {
            return false;
        }

        return call_user_func([self::class, self::PREDICATES[$trigger]]);
    }

    // Substring match, mirroring the domain-suggestion matcher in src/Assist/lib/domains.js.
    private static function onTrialDomain()
    {
        $host = strtolower((string) \wp_parse_url(\home_url(), PHP_URL_HOST));
        $sites = (array) PartnerData::setting('trialDomains');

        foreach (array_filter($sites, 'is_string') as $site) {
            $site = strtolower(trim($site));
            if ($site !== '' && str_contains($host, $site)) {
                return true;
            }
        }

        return false;
    }
}

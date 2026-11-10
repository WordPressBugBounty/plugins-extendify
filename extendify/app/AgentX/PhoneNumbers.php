<?php

/**
 * Phone numbers a site-wide change of one number left behind.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Finds the other phone-shaped words on the site, for the agent to check and offer.
 */
class PhoneNumbers
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const MOST = 6;
    const AROUND = 40;
    const SHAPE = '/\+?\(?\d[\d\s().-]{5,}\d/';
    // Dates, year ranges and opening hours share a phone's digits and dashes.
    const NOT_PHONES = [
        '/^\d{4}\s*[-–]\s*\d{4}$/',
        '/^\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}$/',
        '/(^|\D)\d{1,2}[.:]\d{2}(\D|$)/',
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    // Only digits tell numbers apart, since one number shows in several formats.
    public static function others(array $sources, $kept)
    {
        $keptDigits = self::digits((string) $kept);
        $found = [];
        foreach ($sources as $source) {
            // A break at each tag, or a zip code and the phone in the next paragraph read as one number.
            $html = str_replace('<', ' | <', BlockIds::content($source) ?? '');
            $text = trim(preg_replace('/\s+/', ' ', \wp_strip_all_tags($html)));
            if (!preg_match_all(self::SHAPE, $text, $matches, PREG_OFFSET_CAPTURE)) {
                continue;
            }

            foreach ($matches[0] as $match) {
                list($shown, $at) = $match;
                $shown = trim($shown);
                $digits = self::digits($shown);
                $length = strlen($digits);
                $seen = $digits === $keptDigits || isset($found[$digits]);
                if ($length < 7 || $length > 15 || $seen || self::notPhone($shown)) {
                    continue;
                }

                $found[$digits] = [
                    'text' => $shown,
                    'where' => self::titleOf($source),
                    'around' => trim(substr($text, max(0, $at - self::AROUND), strlen($shown) + 2 * self::AROUND)),
                ];
                if (count($found) >= self::MOST) {
                    break 2;
                }
            }
        }

        return array_values($found);
    }

    // The numbers one source shows, once each, since one number shows in several formats.
    public static function shownIn($source)
    {
        $html = str_replace('<', ' | <', BlockIds::content($source) ?? '');
        $text = trim(preg_replace('/\s+/', ' ', \wp_strip_all_tags($html)));
        if (!preg_match_all(self::SHAPE, $text, $matches)) {
            return [];
        }

        $found = [];
        foreach ($matches[0] as $shown) {
            $shown = trim($shown);
            $digits = self::digits($shown);
            $length = strlen($digits);
            if ($length < 7 || $length > 15 || isset($found[$digits]) || self::notPhone($shown)) {
                continue;
            }

            $found[$digits] = $shown;
        }

        return array_values($found);
    }

    private static function digits($text)
    {
        return preg_replace('/\D/', '', $text);
    }

    private static function notPhone($shown)
    {
        foreach (self::NOT_PHONES as $pattern) {
            if (preg_match($pattern, $shown)) {
                return true;
            }
        }

        return false;
    }

    private static function titleOf($source)
    {
        $parts = explode(':', $source, 2);
        if ($parts[0] === 'post') {
            return \get_the_title((int) ($parts[1] ?? 0));
        }

        $template = \get_block_template($parts[1] ?? '', $parts[0] === 'part' ? 'wp_template_part' : 'wp_template');
        return $template ? $template->title : '';
    }
}

<?php

/**
 * The site profile the agent writes to.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Reads and saves the site's name, tagline, About and tone, which the user can see and change.
 */
class Profile
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OPTION = 'extendify_agentx_profile';
    const TONES = ['professional', 'friendly', 'inspirational', 'informative', 'persuasive'];
    const NAME_LENGTH = 100;
    const ABOUT_LENGTH = 500;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The About and tone, and when they were saved.
     *
     * @return array
     */
    public static function current()
    {
        $profile = \get_option(self::OPTION);
        if (is_array($profile)) {
            return $profile;
        }

        // Seeded once, so an About the user empties never comes back from onboarding.
        $launched = \get_option('extendify_site_profile', []);
        $launched = is_array($launched) ? $launched : [];
        $profile = [
            'about' => self::cutAtSentence(\sanitize_textarea_field((string) ($launched['description'] ?? ''))),
            'tone' => self::firstTone((array) ($launched['tone'] ?? [])),
            'updatedAt' => time(),
        ];
        \add_option(self::OPTION, $profile, '', false);
        return $profile;
    }

    /**
     * Saves the name and tagline as WordPress's own settings, and the About and tone as the agent's.
     *
     * @param array $values - The name, tagline, about and tone; one left out keeps what it is.
     * @return array|\WP_Error
     */
    public static function save(array $values)
    {
        $profile = self::current();
        $values = array_merge([
            'name' => self::setting('blogname'),
            'tagline' => self::setting('blogdescription'),
            'about' => $profile['about'] ?? '',
            'tone' => $profile['tone'] ?? '',
        ], array_intersect_key($values, array_flip(['name', 'tagline', 'about', 'tone'])));
        foreach ($values as $field => $value) {
            if (!is_string($value)) {
                $message = sprintf('The %s needs some text.', $field);
                return new \WP_Error('extendify_agentx_profile', $message, ['status' => 400]);
            }
        }

        \update_option('blogname', self::cut(\sanitize_text_field($values['name']), self::NAME_LENGTH));
        \update_option('blogdescription', self::cut(\sanitize_text_field($values['tagline']), self::NAME_LENGTH));
        $saved = [
            'about' => self::cut(\sanitize_textarea_field($values['about']), self::ABOUT_LENGTH),
            'tone' => in_array($values['tone'], self::TONES, true) ? $values['tone'] : '',
            'updatedAt' => time(),
        ];
        \update_option(self::OPTION, $saved, false);

        return array_merge(
            ['name' => self::setting('blogname'), 'tagline' => self::setting('blogdescription')],
            $saved
        );
    }

    private static function setting($option)
    {
        return \wp_specialchars_decode((string) \get_option($option), ENT_QUOTES);
    }

    private static function cut($text, $length)
    {
        return trim(mb_substr($text, 0, $length));
    }

    private static function cutAtSentence($text)
    {
        $text = trim($text);
        if (mb_strlen($text) <= self::ABOUT_LENGTH) {
            return $text;
        }

        $cut = mb_substr($text, 0, self::ABOUT_LENGTH);
        if (preg_match('/^.*[.!?。！？]/us', $cut, $sentences)) {
            return $sentences[0];
        }

        return preg_match('/^(.*)\s/us', $cut, $words) ? rtrim($words[1]) : $cut;
    }

    private static function firstTone(array $tones)
    {
        foreach ($tones as $tone) {
            $tone = is_string($tone) ? strtolower($tone) : '';
            if (in_array($tone, self::TONES, true)) {
                return $tone;
            }
        }

        return '';
    }
}

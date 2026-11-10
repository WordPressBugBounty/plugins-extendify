<?php

/**
 * The site settings the agent can change.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

use Extendify\PartnerData;
use Extendify\SiteVisibility;

/**
 * Reads and saves the settings the agent can change, each checked before it is written.
 */
class Settings
{
    // No site address or admin email: either can break the site or lock its owner out.
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OPTIONS = [
        'title' => 'blogname',
        'description' => 'blogdescription',
        'timezone' => 'timezone_string',
        'date_format' => 'date_format',
        'time_format' => 'time_format',
        'start_of_week' => 'start_of_week',
        'language' => 'WPLANG',
        'posts_per_page' => 'posts_per_page',
        'default_comment_status' => 'default_comment_status',
    ];

    /**
     * What each setting is now, as the agent reads and writes it.
     *
     * @return array
     */
    public static function current()
    {
        $names = array_merge(array_keys(self::OPTIONS), ['homepage']);
        if (self::offersVisibility()) {
            $names[] = 'visibility';
        }

        if (self::offersIndexing()) {
            $names[] = 'indexing';
        }

        $names[] = 'canvas';

        return array_combine($names, array_map([self::class, 'read'], $names));
    }

    /**
     * Coming Soon is the partner's feature, but a hidden site must always be able to go live.
     *
     * @return boolean
     */
    public static function offersVisibility()
    {
        return (bool) PartnerData::setting('useComingSoon') || !SiteVisibility::isPublished();
    }

    /**
     * The search engine block is the partner's feature, but a blocked site must always be able to lift it.
     *
     * @return boolean
     */
    public static function offersIndexing()
    {
        return (bool) PartnerData::setting('useSearchEngineBlock') || SiteVisibility::searchEnginesBlocked();
    }

    /**
     * Saves a setting and says what it was and is now.
     *
     * @param string $setting - The setting's name, as current() lists it.
     * @param mixed  $value   - Its new value.
     * @return array|\WP_Error
     */
    public static function update($setting, $value)
    {
        if (!in_array($setting, array_keys(self::current()), true)) {
            return self::refused(sprintf('The agent cannot change the %s setting.', $setting));
        }

        $before = self::read($setting);
        $label = self::label($setting, $before);
        $written = self::write($setting, $value);
        if (\is_wp_error($written)) {
            return $written;
        }

        $after = self::read($setting);
        $key = array_search($setting, LiveSaves::SETTINGS, true);
        if ($key !== false && $before !== $after) {
            Draft::recordLive(LiveSaves::item($key, $before, $after));
        }

        return [
            'before' => $before,
            'after' => $after,
            'labels' => ['before' => $label, 'after' => self::label($setting, $after)],
            // A hidden site published without the partner's Coming Soon can't be hidden again.
            'offered' => array_key_exists($setting, self::current()),
        ];
    }

    private static function read($setting)
    {
        switch ($setting) {
            case 'title':
            case 'description':
                // WordPress stores these escaped, so an ampersand would come back as &amp;.
                return \wp_specialchars_decode(\get_option(self::OPTIONS[$setting]), ENT_QUOTES);
            case 'timezone':
                return self::timezone();
            case 'start_of_week':
            case 'posts_per_page':
                return (int) \get_option(self::OPTIONS[$setting]);
            case 'language':
                return \get_option('WPLANG') ?: 'en_US';
            case 'homepage':
                $page = (int) \get_option('page_on_front');
                // get_permalink gives the front page the bare home address, which names no page.
                return \get_option('show_on_front') === 'page' && $page ? \_get_page_link($page) : 'posts';
            case 'visibility':
                return SiteVisibility::isPublished() ? 'published' : 'unpublished';
            case 'indexing':
                return SiteVisibility::searchEnginesBlocked() ? 'disabled' : 'enabled';
            case 'canvas':
                return SiteCanvas::current();
            default:
                return \get_option(self::OPTIONS[$setting]);
        }
    }

    // WordPress keeps the old value and still reports success when it rejects one.
    // phpcs:ignore Generic.Metrics.CyclomaticComplexity.TooHigh
    private static function write($setting, $value)
    {
        switch ($setting) {
            case 'title':
            case 'description':
            case 'date_format':
            case 'time_format':
                $format = in_array($setting, ['date_format', 'time_format'], true);
                if (!is_string($value) || ($format && trim($value) === '')) {
                    return self::refused(sprintf('The %s needs some text.', $setting));
                }

                return self::save(self::OPTIONS[$setting], $value);
            case 'timezone':
                return self::writeTimezone((string) $value);
            case 'start_of_week':
                if (!is_numeric($value) || (int) $value < 0 || (int) $value > 6) {
                    return self::refused('The first day of the week is a number from 0 (Sunday) to 6 (Saturday).');
                }

                return self::save('start_of_week', (int) $value);
            case 'posts_per_page':
                if (!is_numeric($value) || (int) $value < 1) {
                    return self::refused('A blog page lists at least one post.');
                }

                return self::save('posts_per_page', (int) $value);
            case 'default_comment_status':
                if (!in_array($value, ['open', 'closed'], true)) {
                    return self::refused('Comments are either open or closed.');
                }

                return self::save('default_comment_status', $value);
            case 'language':
                return self::writeLanguage((string) $value);
            case 'homepage':
                return self::writeHomepage((string) $value);
            case 'visibility':
                if ($value === 'published') {
                    SiteVisibility::markPublished();
                    return true;
                }

                if ($value === 'unpublished') {
                    SiteVisibility::markUnpublished();
                    return true;
                }

                return self::refused('The site is either published or unpublished.');
            case 'indexing':
                if ($value === 'enabled') {
                    SiteVisibility::allowIndexing();
                    return true;
                }

                if ($value === 'disabled') {
                    SiteVisibility::blockIndexing();
                    return true;
                }

                return self::refused('Search engine indexing is either enabled or disabled.');
            case 'canvas':
                return SiteCanvas::store($value === '' ? null : $value)
                    ? true
                    : self::refused('The site can show falling snow over it, or nothing.');
        }

        return self::refused(sprintf('The agent cannot change the %s setting.', $setting));
    }

    private static function save($option, $value)
    {
        \update_option($option, $value);
        return true;
    }

    private static function timezone()
    {
        $zone = \get_option('timezone_string');
        if ($zone) {
            return $zone;
        }

        $offset = (float) \get_option('gmt_offset');
        return $offset ? sprintf('UTC%+g', $offset) : 'UTC';
    }

    private static function writeTimezone($zone)
    {
        // A site on a fixed offset reads back as UTC+2, so restoring it must work.
        if (preg_match('/^UTC([+-]\d{1,2}(\.\d+)?)$/', $zone, $match)) {
            $offset = (float) $match[1];
            // Settings > General offers only these: whole, half and quarter hours from -12 to +14.
            if ($offset < -12 || $offset > 14 || fmod(abs($offset) * 4, 1) !== 0.0) {
                return self::refused(sprintf('%s is not a time zone. Use a name like Europe/Paris.', $zone));
            }

            \update_option('timezone_string', '');
            \update_option('gmt_offset', $offset);
            return true;
        }

        if (!in_array($zone, \timezone_identifiers_list(\DateTimeZone::ALL_WITH_BC), true)) {
            return self::refused(sprintf('%s is not a time zone. Use a name like Europe/Paris.', $zone));
        }

        return self::save('timezone_string', $zone);
    }

    private static function writeLanguage($locale)
    {
        if ($locale === 'en_US' || $locale === '') {
            return self::save('WPLANG', '');
        }

        if (!in_array($locale, \get_available_languages(), true)) {
            // Blocks users or hosts not allowed to install language files.
            if (!\current_user_can('install_languages')) {
                return self::refused(sprintf('This site cannot install the %s language.', $locale));
            }

            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/translation-install.php';
            if (!\wp_download_language_pack($locale)) {
                return self::refused(sprintf('The %s language could not be installed.', $locale));
            }
        }

        return self::save('WPLANG', $locale);
    }

    private static function writeHomepage($page)
    {
        if ($page === 'posts') {
            return self::save('show_on_front', 'posts');
        }

        $id = PageStatus::find($page);
        if (!$id || \get_post_type($id) !== 'page' || \get_post_status($id) !== 'publish') {
            return self::refused(sprintf('%s is not one of the site\'s published pages.', $page));
        }

        // Settings > Reading warns against one page as both, so this means the latest posts.
        if ($id === (int) \get_option('page_for_posts')) {
            return self::save('show_on_front', 'posts');
        }

        \update_option('page_on_front', $id);
        return self::save('show_on_front', 'page');
    }

    // phpcs:ignore Generic.Metrics.CyclomaticComplexity.TooHigh
    /**
     * A setting's value in the words the site shows for it.
     *
     * @param string $setting - The setting's name, as current() lists it.
     * @param mixed  $value   - A value it held or holds.
     * @return string
     */
    public static function label($setting, $value)
    {
        switch ($setting) {
            case 'timezone':
                return str_replace('_', ' ', $value);
            case 'date_format':
            case 'time_format':
                return \wp_date($value);
            case 'start_of_week':
                global $wp_locale;
                return $wp_locale->get_weekday($value);
            case 'language':
                return self::languageName($value);
            case 'default_comment_status':
                return $value === 'open'
                    // translators: A site setting is turned on. Shown in the AI Agent's chat.
                    ? \__('On', 'extendify-local')
                    // translators: A site setting is turned off. Shown in the AI Agent's chat.
                    : \__('Off', 'extendify-local');
            case 'indexing':
                return $value === 'enabled' ? \__('On', 'extendify-local') : \__('Off', 'extendify-local');
            case 'canvas':
                return $value === 'snow'
                    // translators: A setting's value in the AI Agent's chat: snow falls over the whole website.
                    ? \__('Falling snow', 'extendify-local')
                    : \__('Off', 'extendify-local');
            case 'homepage':
                return $value === 'posts'
                    // translators: The site's homepage lists its latest blog posts. Shown in the AI Agent's chat.
                    ? \__('Latest posts', 'extendify-local')
                    : html_entity_decode(\get_the_title(\url_to_postid($value)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
            case 'visibility':
                return $value === 'published'
                    // translators: The whole site is visible to visitors. Shown in the AI Agent's chat.
                    ? \__('Published', 'extendify-local')
                    // translators: Visitors see a Coming Soon page instead of the site. Shown in the AI Agent's chat.
                    : \__('Coming soon', 'extendify-local');
            default:
                return (string) $value;
        }
    }

    private static function languageName($locale)
    {
        if ($locale === 'en_US') {
            return 'English (United States)';
        }

        require_once ABSPATH . 'wp-admin/includes/translation-install.php';
        $translations = \wp_get_available_translations();
        return $translations[$locale]['native_name'] ?? $locale;
    }

    private static function refused($message)
    {
        return new \WP_Error('extendify_agentx_setting', $message, ['status' => 400]);
    }
}

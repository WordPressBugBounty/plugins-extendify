<?php

/**
 * The address a map on the page is drawn from.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Builds Google's keyless embed address from embed code, a link to a map or a place in words.
 *
 * Only an address built here reaches the page: pasted markup would let anything in.
 */
class Maps
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const KEYLESS = 'https://maps.google.com/maps';
    const SHARED = 'https://www.google.com/maps/embed';
    const GOOGLE = '/^(?:www\.|maps\.)?google\.(?:com|[a-z]{2}|com?\.[a-z]{2})$/';
    const SHORT = ['maps.app.goo.gl', 'goo.gl'];
    const COORDINATES = '/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/';
    // A pin with no zoom of its own shows the streets around it.
    const PIN_ZOOM = '15';
    const MOST_HOPS = 3;
    const LONGEST = 200;
    const HEIGHT = 450;
    const LOWEST = 200;
    const HIGHEST = 800;
    const WHY = 'A map is Google Maps embed code, a link to a place on a map, or an address.';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The embed address for the new block's embed code, link or place, in that order.
     *
     * @param array $new The new block.
     * @return string|\WP_Error
     */
    public static function srcOf(array $new)
    {
        $embed = is_string($new['embed'] ?? null) ? trim($new['embed']) : '';
        if ($embed !== '') {
            return self::fromEmbed($embed);
        }

        $link = is_string($new['link'] ?? null) ? trim($new['link']) : '';
        if ($link !== '') {
            return self::fromLink($link);
        }

        $place = self::textOf($new['place'] ?? null);
        return $place === null ? self::notAMap() : self::built($place);
    }

    /**
     * The map's block, as wide as the space it sits in: a fixed 600px frame ran past a phone's screen.
     *
     * @param string $src An address srcOf built, or one drawn read off a placed map.
     * @param mixed $height The height asked for, in pixels.
     * @return array
     */
    public static function blockOf($src, $height = null)
    {
        $place = self::placeIn($src);
        $title = $place === ''
            // translators: The name screen readers give a map shown on a web page.
            ? \__('Map', 'extendify-local')
            // translators: A screen reader's name for a map on a web page. %s is the place it shows, like an address.
            : sprintf(\__('Map of %s', 'extendify-local'), $place);
        $markup = "<!-- wp:html -->\n"
            . '<iframe src="' . \esc_url($src, ['https']) . '"'
            . ' title="' . \esc_attr($title) . '"'
            . ' style="border:0;display:block;width:100%;height:' . self::heightOf($height) . 'px"'
            . ' allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
            . "\n<!-- /wp:html -->";
        return array_values(Tree::named(\parse_blocks($markup)))[0];
    }

    // The place in words, which the agent finds the map by; a pin's coordinates name nothing.
    private static function placeIn($src)
    {
        $parts = self::partsOf($src);
        $place = (string) ($parts['query']['q'] ?? '');
        if ($place === '' && preg_match('/!2s([^!]+)/', $parts['rawQuery'] ?? '', $named)) {
            $place = rawurldecode(str_replace('+', ' ', $named[1]));
        }

        return preg_match(self::COORDINATES, $place) ? '' : (self::textOf($place) ?? '');
    }

    public static function heightOf($height)
    {
        return is_numeric($height)
            ? max(self::LOWEST, min(self::HIGHEST, (int) round((float) $height)))
            : self::HEIGHT;
    }

    /**
     * The address and height of a map this class built, or null for any other HTML.
     *
     * @param string $html The block's markup.
     * @return array|null
     */
    public static function drawn($html)
    {
        if (!preg_match('#<iframe[^>]*\ssrc=["\']([^"\']+)["\']#i', (string) $html, $found)) {
            return null;
        }

        $src = \html_entity_decode($found[1], ENT_QUOTES);
        if (strpos($src, self::KEYLESS . '?') !== 0 && strpos($src, self::SHARED . '?') !== 0) {
            return null;
        }

        // A map placed before maps filled their width kept its height as an attribute.
        $tall = preg_match('#height:\s*(\d+)px#i', $html, $height)
            || preg_match('#\sheight=["\'](\d+)#i', $html, $height);
        return ['src' => $src, 'height' => self::heightOf($tall ? $height[1] : null)];
    }

    private static function fromEmbed($code)
    {
        if (!preg_match('#<iframe[^>]*\ssrc=["\']([^"\']+)["\']#i', $code, $found)) {
            return self::notAMap();
        }

        $parts = self::partsOf($found[1]);
        return $parts && self::isGoogleMaps($parts) ? self::fromGoogle($parts) : self::notAMap();
    }

    private static function fromLink($link)
    {
        $parts = self::partsOf($link);
        if (!$parts) {
            return self::notAMap();
        }

        $host = $parts['host'];
        if (in_array($host, self::SHORT, true)) {
            return self::opened($parts['url']);
        }

        if (self::isGoogleMaps($parts)) {
            return self::fromGoogle($parts);
        }

        if ($host === 'maps.apple.com') {
            return self::fromApple($parts);
        }

        if (preg_match('/(?:^|\.)(?:openstreetmap|osm)\.org$/', $host)) {
            return self::fromOpenStreetMap($parts);
        }

        if (preg_match('/(?:^|\.)bing\.com$/', $host) && strpos($parts['path'], '/maps') === 0) {
            return self::fromBing($parts);
        }

        if (preg_match('/(?:^|\.)waze\.com$/', $host)) {
            return self::fromWaze($parts);
        }

        if (preg_match('/(?:^|\.)here\.com$/', $host)) {
            return self::fromHere($parts);
        }

        if (preg_match('/^(?:www\.)?yandex\.[a-z.]+$/', $host) && strpos($parts['path'], '/maps') === 0) {
            return self::fromYandex($parts);
        }

        return self::notAMap();
    }

    // A short link names nothing until opened; a European visitor's may pass the consent page first.
    private static function opened($url)
    {
        for ($hop = 0; $hop < self::MOST_HOPS; $hop++) {
            $response = \wp_safe_remote_get($url, ['redirection' => 0, 'timeout' => 10, 'limit_response_size' => 4096]);
            $next = \is_wp_error($response) ? '' : (string) \wp_remote_retrieve_header($response, 'location');
            $parts = $next === '' ? null : self::partsOf($next);
            if ($parts && $parts['host'] === 'consent.google.com') {
                $parts = self::partsOf($parts['query']['continue'] ?? '');
            }

            if (!$parts) {
                return self::notAMap();
            }

            if (self::isGoogleMaps($parts)) {
                return self::fromGoogle($parts);
            }

            if (!in_array($parts['host'], self::SHORT, true)) {
                return self::notAMap();
            }

            $url = $parts['url'];
        }

        return self::notAMap();
    }

    private static function fromGoogle(array $parts)
    {
        $path = $parts['path'];
        $query = $parts['query'];
        if (preg_match('#^/maps/embed/?$#', $path)) {
            // Kept exactly as Google wrote it, escapes included.
            return preg_match('/(?:^|&)pb=([^&\s"\'<>#]+)/', $parts['rawQuery'], $pb)
                ? self::SHARED . '?pb=' . $pb[1]
                : self::notAMap();
        }

        $at = preg_match('#/@(-?[\d.]+),(-?[\d.]+)(?:,([\d.]+)z)?#', $path, $view) ? $view : [];
        $zoom = $query['z'] ?? $query['zoom'] ?? $at[3] ?? null;
        if (preg_match('#!3d(-?[\d.]+)!4d(-?[\d.]+)#', $path, $pin)) {
            return self::pinned($pin[1], $pin[2], $zoom);
        }

        $named = self::segmentAfter($path, '/maps/place/')
            ?? self::segmentAfter($path, '/maps/search/')
            ?? self::lastStop($path);
        $text = self::textOf($query['q'] ?? $query['query'] ?? $query['daddr'] ?? $query['destination'] ?? $named);
        if ($text !== null) {
            return self::built($text, $zoom);
        }

        if ($at) {
            return self::pinned($at[1], $at[2], $zoom);
        }

        $center = preg_match(self::COORDINATES, (string) ($query['center'] ?? ''), $found) ? $found : [];
        return $center ? self::pinned($center[1], $center[2], $zoom) : self::notAMap();
    }

    private static function fromApple(array $parts)
    {
        $query = $parts['query'];
        $zoom = $query['z'] ?? null;
        $address = self::textOf($query['address'] ?? null);
        if ($address !== null) {
            return self::built($address, $zoom);
        }

        $at = (string) ($query['ll'] ?? $query['coordinate'] ?? $query['sll'] ?? '');
        if (preg_match(self::COORDINATES, $at, $pin)) {
            return self::pinned($pin[1], $pin[2], $zoom);
        }

        $text = self::textOf($query['q'] ?? $query['name'] ?? null);
        return $text === null ? self::notAMap() : self::built($text, $zoom);
    }

    private static function fromOpenStreetMap(array $parts)
    {
        $query = $parts['query'];
        $view = preg_match('#map=(\d+)/(-?[\d.]+)/(-?[\d.]+)#', $parts['fragment'], $found) ? $found : [];
        if (isset($query['mlat'], $query['mlon'])) {
            return self::pinned($query['mlat'], $query['mlon'], $view[1] ?? null);
        }

        if ($view) {
            return self::pinned($view[2], $view[3], $view[1]);
        }

        $text = self::textOf($query['query'] ?? null);
        return $text === null ? self::notAMap() : self::built($text);
    }

    private static function fromBing(array $parts)
    {
        $query = $parts['query'];
        $zoom = $query['lvl'] ?? null;
        if (preg_match('/point\.(-?[\d.]+)_(-?[\d.]+)/', (string) ($query['sp'] ?? ''), $pin)) {
            return self::pinned($pin[1], $pin[2], $zoom);
        }

        $text = self::textOf($query['q'] ?? $query['where1'] ?? null);
        if ($text !== null) {
            return self::built($text, $zoom);
        }

        return preg_match('/^(-?[\d.]+)~(-?[\d.]+)$/', (string) ($query['cp'] ?? ''), $view)
            ? self::pinned($view[1], $view[2], $zoom)
            : self::notAMap();
    }

    private static function fromWaze(array $parts)
    {
        $query = $parts['query'];
        if (preg_match('/^ll\.(-?[\d.]+),(-?[\d.]+)/', (string) ($query['to'] ?? ''), $pin)) {
            return self::pinned($pin[1], $pin[2], $query['zoom'] ?? null);
        }

        if (preg_match(self::COORDINATES, (string) ($query['ll'] ?? $query['latlng'] ?? ''), $pin)) {
            return self::pinned($pin[1], $pin[2], $query['zoom'] ?? null);
        }

        $text = self::textOf($query['q'] ?? null);
        return $text === null ? self::notAMap() : self::built($text);
    }

    private static function fromHere(array $parts)
    {
        $map = (string) ($parts['query']['map'] ?? '');
        if (preg_match('/^(-?[\d.]+),(-?[\d.]+)(?:,(\d+))?/', $map, $view)) {
            return self::pinned($view[1], $view[2], $view[3] ?? null);
        }

        return preg_match('#/l/(-?[\d.]+),(-?[\d.]+)#', $parts['path'], $pin)
            ? self::pinned($pin[1], $pin[2], null)
            : self::notAMap();
    }

    // Yandex writes the longitude first.
    private static function fromYandex(array $parts)
    {
        $query = $parts['query'];
        $at = (string) ($query['pt'] ?? $query['ll'] ?? '');
        if (preg_match(self::COORDINATES, $at, $pin)) {
            return self::pinned($pin[2], $pin[1], $query['z'] ?? null);
        }

        $text = self::textOf($query['text'] ?? null);
        return $text === null ? self::notAMap() : self::built($text, $query['z'] ?? null);
    }

    private static function isGoogleMaps(array $parts)
    {
        return (bool) preg_match(self::GOOGLE, $parts['host']) && strpos($parts['path'], '/maps') === 0;
    }

    private static function segmentAfter($path, $start)
    {
        if (strpos($path, $start) !== 0) {
            return null;
        }

        $segment = urldecode(explode('/', substr($path, strlen($start)))[0]);
        return $segment === '' || $segment[0] === '@' || strpos($segment, 'data=') === 0 ? null : $segment;
    }

    // Directions name every stop; the last is where the visitor is headed.
    private static function lastStop($path)
    {
        if (strpos($path, '/maps/dir/') !== 0) {
            return null;
        }

        $stops = array_filter(explode('/', substr($path, strlen('/maps/dir/'))), function ($stop) {
            return $stop !== '' && $stop[0] !== '@' && strpos($stop, 'data=') !== 0;
        });
        return $stops ? urldecode((string) end($stops)) : null;
    }

    private static function pinned($lat, $lng, $zoom)
    {
        $lat = is_numeric($lat) ? (float) $lat : null;
        $lng = is_numeric($lng) ? (float) $lng : null;
        if ($lat === null || $lng === null || abs($lat) > 90 || abs($lng) > 180) {
            return self::notAMap();
        }

        return self::built(self::degrees($lat) . ',' . self::degrees($lng), $zoom ?? self::PIN_ZOOM);
    }

    private static function degrees($value)
    {
        return rtrim(rtrim(sprintf('%.7F', $value), '0'), '.');
    }

    private static function built($place, $zoom = null)
    {
        $level = is_numeric($zoom) ? (int) round((float) $zoom) : 0;
        return self::KEYLESS . '?q=' . rawurlencode($place)
            . ($level >= 1 && $level <= 21 ? '&z=' . $level : '')
            . '&output=embed';
    }

    private static function textOf($value)
    {
        if (!is_string($value)) {
            return null;
        }

        $text = trim(preg_replace('/\s+/u', ' ', \wp_strip_all_tags($value)));
        $text = function_exists('mb_substr') ? mb_substr($text, 0, self::LONGEST) : substr($text, 0, self::LONGEST);
        return preg_match('/[\p{L}\p{N}]/u', $text) ? $text : null;
    }

    private static function partsOf($url)
    {
        $url = trim(\html_entity_decode((string) $url, ENT_QUOTES));
        if (!preg_match('#^[a-z][a-z0-9+.-]*://#i', $url)) {
            $url = 'https://' . $url;
        }

        $parts = \wp_parse_url($url);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        if (!$parts || empty($parts['host']) || !in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        parse_str((string) ($parts['query'] ?? ''), $query);
        return [
            'url' => $url,
            'host' => strtolower($parts['host']),
            'path' => (string) ($parts['path'] ?? ''),
            'rawQuery' => (string) ($parts['query'] ?? ''),
            'query' => $query,
            'fragment' => (string) ($parts['fragment'] ?? ''),
        ];
    }

    private static function notAMap()
    {
        return new \WP_Error('not_a_map', self::WHY, ['status' => 400]);
    }
}

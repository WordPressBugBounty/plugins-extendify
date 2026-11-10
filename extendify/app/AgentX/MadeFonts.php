<?php

/**
 * Made fonts.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Font pairs the agent makes from fonts the theme doesn't ship, kept so its card's previews and picks find them by id.
 */
class MadeFonts
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const KEPT = 'extendify_agentx_made_fonts';
    const MOST_KEPT = 24;
    // Each font's files come from this host only, by the family's own slug.
    const HOST = 'https://fonts.bunny.net';
    // The generic family a font falls back to, by the kind the agent names.
    const FALLBACKS = [
        'sans-serif' => 'sans-serif',
        'serif' => 'serif',
        'display' => 'sans-serif',
        'cursive' => 'cursive',
        'monospace' => 'monospace',
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * A kept pair, as a theme.json fragment like the theme's own pairs.
     *
     * @param string $id A made pair's id starts with made:.
     * @return array|null
     */
    public static function find($id)
    {
        return ((array) \get_option(self::KEPT, []))[$id] ?? null;
    }

    /**
     * Builds each pair from the fonts it names and keeps it.
     *
     * @param array $pairs Each one's title and its heading and text fonts.
     * @return array Each one's option, as the fonts tab lists it, with the faces that draw it.
     */
    public static function made(array $pairs)
    {
        $kept = (array) \get_option(self::KEPT, []);
        $options = [];
        foreach (array_slice($pairs, 0, 6) as $pair) {
            $built = is_array($pair) ? self::built($pair) : null;
            if (!$built) {
                continue;
            }

            $id = 'made:' . substr(md5((string) \wp_json_encode($built)), 0, 12);
            unset($kept[$id]);
            $kept[$id] = $built;
            $families = $built['settings']['typography']['fontFamilies'];
            $stacks = array_column($families, 'fontFamily', 'slug');
            $options[] = [
                'id' => $id,
                'title' => $built['title'],
                'fonts' => [
                    'heading' => $stacks[$built['heading']],
                    'body' => $stacks[$built['body']],
                ],
                'faces' => implode('', array_map([self::class, 'facesOf'], $families)),
            ];
        }

        \update_option(self::KEPT, array_slice($kept, -self::MOST_KEPT, null, true), false);
        return $options;
    }

    private static function built(array $pair)
    {
        $title = \sanitize_text_field((string) ($pair['title'] ?? ''));
        $heading = self::fontOf((array) ($pair['heading'] ?? []));
        $body = self::fontOf((array) ($pair['body'] ?? []));
        if ($title === '' || !$heading || !$body) {
            return null;
        }

        $families = [self::fontFamilyOf($heading)];
        if ($body['slug'] !== $heading['slug']) {
            $families[] = self::fontFamilyOf($body);
        }

        return [
            'title' => $title,
            'heading' => 'made-' . $heading['slug'],
            'body' => 'made-' . $body['slug'],
            'settings' => ['typography' => ['fontFamilies' => $families]],
            'styles' => [
                'typography' => ['fontFamily' => 'var(--wp--preset--font-family--made-' . $body['slug'] . ')'],
                'elements' => ['heading' => ['typography' => [
                    'fontFamily' => 'var(--wp--preset--font-family--made-' . $heading['slug'] . ')',
                ]]],
            ],
        ];
    }

    // Plain slugs and names only, so neither can escape the font host's path or the CSS string.
    private static function fontOf(array $font)
    {
        $slug = (string) ($font['slug'] ?? '');
        $name = trim((string) ($font['name'] ?? ''));
        $kind = (string) ($font['kind'] ?? '');
        $weights = array_values(array_unique(array_filter(
            array_map('intval', (array) ($font['weights'] ?? [])),
            function ($weight) {
                return $weight >= 100 && $weight <= 900 && $weight % 100 === 0;
            }
        )));
        if (
            !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)
            || !preg_match('/^[A-Za-z0-9 ]{1,60}$/', $name)
            || !isset(self::FALLBACKS[$kind])
            || !$weights
        ) {
            return null;
        }

        return ['slug' => $slug, 'name' => $name, 'kind' => $kind, 'weights' => array_slice($weights, 0, 2)];
    }

    private static function fontFamilyOf(array $font)
    {
        return [
            'name' => $font['name'],
            'slug' => 'made-' . $font['slug'],
            'fontFamily' => '"' . $font['name'] . '", ' . self::FALLBACKS[$font['kind']],
            'fontFace' => array_map(function ($weight) use ($font) {
                return [
                    'fontFamily' => $font['name'],
                    'fontWeight' => (string) $weight,
                    'fontStyle' => 'normal',
                    'fontDisplay' => 'swap',
                    'src' => [self::HOST . "/{$font['slug']}/files/{$font['slug']}-latin-{$weight}-normal.woff2"],
                ];
            }, $font['weights']),
        ];
    }

    private static function facesOf(array $family)
    {
        return implode('', array_map(function ($face) {
            return sprintf(
                '@font-face{font-family:"%s";font-style:normal;font-weight:%s;font-display:swap;'
                . 'src:url("%s") format("woff2");}',
                $face['fontFamily'],
                $face['fontWeight'],
                $face['src'][0]
            );
        }, $family['fontFace']));
    }
}

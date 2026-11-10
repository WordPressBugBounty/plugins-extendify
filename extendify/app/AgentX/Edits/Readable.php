<?php

/**
 * Readable text.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Text colors Quick Edit sets so a section's words read on its new background. The section keeps what each
 * replaced, so turning the fix off puts those back.
 */
class Readable
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const KEY = 'extendifyReadable';
    const SETTINGS = ['text_color', 'heading_color', 'link_color', 'background_color'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The tree with the section's fix applied, or put back when it's turned off.
     *
     * @param array $blocks   The tree.
     * @param array $path     The section's path in it.
     * @param array $readable `changes`, each a path inside the section with its styles, or `off` to put back.
     * @return array
     */
    public static function apply(array $blocks, array $path, array $readable)
    {
        $section = Tree::blockAt($blocks, $path);
        $entries = [];
        foreach (self::kept($section) as $entry) {
            $entries[$entry['at'] . '|' . $entry['setting']] = $entry;
        }

        if (!empty($readable['off'])) {
            foreach ($entries as $entry) {
                $blocks = self::set($blocks, $path, $entry['at'], $entry['setting'], $entry['before']);
            }

            return self::keep($blocks, $path, []);
        }

        foreach ((array) ($readable['changes'] ?? []) as $change) {
            $at = (string) ($change['at'] ?? '');
            foreach ((array) ($change['styles'] ?? []) as $setting => $value) {
                $block = self::blockIn($blocks, $path, $at);
                if (!$block || !in_array($setting, self::SETTINGS, true)) {
                    continue;
                }

                $was = self::valueOf($block['attrs'], $setting);
                $changed = self::set($blocks, $path, $at, $setting, $value);
                $now = self::valueOf(self::blockIn($changed, $path, $at)['attrs'], $setting);
                if ($now === $was) {
                    continue;
                }

                // A fix over an earlier one still puts back the colors from before either.
                $earlier = $entries["{$at}|{$setting}"] ?? null;
                $entries["{$at}|{$setting}"] = [
                    'at' => $at,
                    'setting' => $setting,
                    'before' => $earlier ? $earlier['before'] : $was,
                    'set' => $now,
                    'shown' => $earlier ? $earlier['shown'] : self::shown($change, $setting),
                ];
                $blocks = $changed;
            }
        }

        return self::keep($blocks, $path, array_values($entries));
    }

    /**
     * The colors the section's fix can put back, for its Quick Edit bar.
     *
     * @param array $section The section as parsed.
     * @return array|null
     */
    public static function forFrame(array $section)
    {
        $entries = self::kept($section);
        if (!$entries) {
            return null;
        }

        return [
            'entries' => array_map(function ($entry) {
                return array_intersect_key($entry, array_flip(['at', 'setting', 'shown']));
            }, $entries),
        ];
    }

    /**
     * A color setting as set-style takes it: a theme color's slug, a color, or null for none.
     *
     * @param array  $attrs   The block's attributes.
     * @param string $setting The setting.
     * @return string|null
     */
    public static function valueOf(array $attrs, $setting)
    {
        $paths = [
            'text_color' => [['textColor'], ['style', 'color', 'text']],
            'background_color' => [['backgroundColor'], ['style', 'color', 'background']],
            'heading_color' => [['style', 'elements', 'heading', 'color', 'text']],
            'link_color' => [['style', 'elements', 'link', 'color', 'text']],
        ];
        foreach ($paths[$setting] ?? [] as $path) {
            $value = $attrs;
            foreach ($path as $key) {
                $value = is_array($value) ? ($value[$key] ?? null) : null;
            }

            if (!is_string($value) || $value === '') {
                continue;
            }

            $preset = '/^(?:var:preset\|color\||var\(--wp--(?:preset|custom)--color--)([a-z0-9-]+)\)?$/';
            return preg_match($preset, $value, $match) ? $match[1] : $value;
        }

        return null;
    }

    // Entries whose color is still the one the fix set; one changed since is the user's now.
    private static function kept(array $section)
    {
        $record = $section['attrs']['metadata'][self::KEY] ?? null;
        $entries = is_array($record) && is_array($record['entries'] ?? null) ? $record['entries'] : [];
        return array_values(array_filter($entries, function ($entry) use ($section) {
            if (!is_array($entry) || !isset($entry['at'], $entry['setting'], $entry['set'])) {
                return false;
            }

            $block = self::blockIn([$section], [0], (string) $entry['at']);
            return $block && self::valueOf($block['attrs'], (string) $entry['setting']) === $entry['set'];
        }));
    }

    private static function blockIn(array $blocks, array $path, $at)
    {
        return Tree::blockAt($blocks, $at === '' ? $path : array_merge($path, explode('.', $at)));
    }

    // A block that can't take the color, like one without text colors, is left as it is.
    private static function set(array $blocks, array $path, $at, $setting, $value)
    {
        $inner = $at === '' ? $path : array_merge($path, explode('.', $at));
        if (!Tree::blockAt($blocks, $inner)) {
            return $blocks;
        }

        $result = Style::apply($blocks, $inner, ['styles' => [$setting => $value]], []);
        return \is_wp_error($result) ? $blocks : $result['blocks'];
    }

    private static function shown(array $change, $setting)
    {
        $shown = $change['shown'][$setting] ?? null;
        return is_string($shown) && \sanitize_hex_color($shown) ? $shown : null;
    }

    private static function keep(array $blocks, array $path, array $entries)
    {
        $section = Tree::blockAt($blocks, $path);
        $metadata = (array) ($section['attrs']['metadata'] ?? []);
        unset($metadata[self::KEY]);
        if ($entries) {
            $metadata[self::KEY] = ['entries' => $entries];
        }

        $attrs = $section['attrs'];
        unset($attrs['metadata']);
        if ($metadata) {
            $attrs['metadata'] = $metadata;
        }

        return Tree::setAt($blocks, $path, array_merge($section, ['attrs' => $attrs]));
    }
}

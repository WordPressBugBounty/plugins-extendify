<?php

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Theme settings a block edit changes across the whole site, kept as a draft layer beside the palette.
 */
class ThemeSettings
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    // Each setting's place in theme.json, and whether it takes a length or scales what is there.
    const SETTINGS = [
        'content_width' => [['settings', 'layout', 'contentSize'], 'size'],
        'wide_width' => [['settings', 'layout', 'wideSize'], 'size'],
        'block_gap' => [['styles', 'spacing', 'blockGap'], 'size'],
        'spacing_scale' => [['settings', 'spacing', 'spacingSizes'], 'scale'],
        'font_scale' => [['settings', 'typography', 'fontSizes'], 'scale'],
    ];
    // Past these a page stops being readable rather than roomier.
    const LEAST_SCALE = 0.5;
    const MOST_SCALE = 2.0;
    // Site-wide CSS for a look the style's settings can't give.
    const CSS = 'custom_css';
    const MOST_CSS = 6000;
    // What WordPress won't render, and what could load or run something rather than style the site.
    const UNSAFE = '#</?\w|@|\\\\|expression\s*\(|javascript:|url\s*\(#i';
    // The agent's rules sit between these, so applying them again replaces rather than adds.
    const CSS_START = '/* agent styles */';
    const CSS_END = '/* end agent styles */';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * Whether the site's theme has a setting by this name.
     *
     * @param string $setting The agent's name for the setting.
     * @return bool
     */
    public static function has($setting)
    {
        return isset(self::SETTINGS[$setting]) || $setting === self::CSS;
    }

    /**
     * The factor a setting takes, or null when it isn't one this writes.
     *
     * Every size is a factor on what the theme already has, never an absolute: the
     * theme's own value is the only thing that says what bigger or smaller means.
     *
     * @param string $setting The agent's name for the setting.
     * @param mixed $value A multiplier, like 0.8 for narrower.
     * @return float|null
     */
    public static function valueOf($setting, $value)
    {
        if (!self::has($setting)) {
            return null;
        }

        if ($setting === self::CSS) {
            return self::cssOf($value);
        }

        $scale = is_numeric($value) ? (float) $value : 0;
        return $scale >= self::LEAST_SCALE && $scale <= self::MOST_SCALE ? $scale : null;
    }

    /**
     * The layer's settings, as the draft stores them.
     *
     * @param string $layer The draft's settings layer, as JSON.
     * @return array
     */
    public static function changes($layer)
    {
        $changes = json_decode((string) $layer, true);
        if (!is_array($changes)) {
            return [];
        }

        $kept = [];
        foreach ($changes as $setting => $value) {
            $taken = self::valueOf((string) $setting, $value);
            if ($taken !== null) {
                $kept[$setting] = $taken;
            }
        }

        return $kept;
    }

    /**
     * The layer with one setting changed.
     *
     * @param string $layer The draft's settings layer, as JSON.
     * @param string $setting The agent's name for the setting.
     * @param mixed $value A length like 48rem, or a multiplier for a scale.
     * @return string
     */
    public static function with($layer, $setting, $value)
    {
        $changes = self::changes($layer);
        $changes[$setting] = $setting === self::CSS
            ? self::joined(self::merged($changes[self::CSS] ?? '', (string) $value))
            : $value;
        ksort($changes);
        return (string) \wp_json_encode($changes);
    }

    /**
     * The styles with the layer's settings written into them.
     *
     * @param array $data The theme.json data the frame shows.
     * @param string $layer The draft's settings layer, as JSON.
     * @return array
     */
    public static function applied(array $data, $layer)
    {
        foreach (self::changes($layer) as $setting => $value) {
            if ($setting === self::CSS) {
                $data = self::withCss($data, $value);
                continue;
            }

            list($path, $takes) = self::SETTINGS[$setting];
            $data = $takes === 'size'
                ? self::sized($data, $path, (float) $value)
                : self::scaled($data, $path, (float) $value);
        }

        return $data;
    }

    // Rules only, each a selector and its declarations, or nothing at all.
    private static function cssOf($value)
    {
        if (!is_string($value)) {
            return null;
        }

        $css = trim($value);
        if ($css === '' || strlen($css) > self::MOST_CSS || preg_match(self::UNSAFE, $css)) {
            return null;
        }

        $rules = self::rulesOf($css);
        $left = trim(preg_replace('/[^{}]+\{[^{}]*\}/', '', $css));
        return $rules && $left === '' ? self::joined($rules) : null;
    }

    // Keyed by selector, so a rule for the same part replaces the one before it.
    private static function rulesOf($css)
    {
        $rules = [];
        preg_match_all('/([^{}]+)\{([^{}]*)\}/', (string) $css, $found, PREG_SET_ORDER);
        foreach ($found as $rule) {
            $selector = preg_replace('/\s+/', ' ', trim($rule[1]));
            unset($rules[$selector]);
            $rules[$selector] = $selector . ' { ' . trim($rule[2]) . ' }';
        }

        return $rules;
    }

    // The newer rule for a part goes last, so it also wins where both would apply.
    private static function merged($was, $css)
    {
        $rules = self::rulesOf($was);
        foreach (self::rulesOf($css) as $selector => $rule) {
            unset($rules[$selector]);
            $rules[$selector] = $rule;
        }

        return $rules;
    }

    private static function joined(array $rules)
    {
        return implode("\n", array_values($rules));
    }

    // A rule already saved stays under the layer's, which replaces one for the same part.
    private static function withCss(array $data, $css)
    {
        $all = (string) ($data['styles']['css'] ?? '');
        $start = strpos($all, self::CSS_START);
        $end = $start === false ? false : strpos($all, self::CSS_END, $start);
        $saved = $start === false || $end === false
            ? ''
            : substr($all, $start + strlen(self::CSS_START), $end - $start - strlen(self::CSS_START));
        $rest = $start === false || $end === false
            ? $all
            : substr($all, 0, $start) . substr($all, $end + strlen(self::CSS_END));
        $block = self::CSS_START . "\n" . self::joined(self::merged($saved, $css))
            . "\n" . self::CSS_END;
        $data['styles']['css'] = trim(trim($rest) . "\n" . $block);
        return $data;
    }

    // Nothing to scale from until the theme sets it.
    // A size the site never saved is stated only by the theme, not in the user layer.
    private static function theirs(array $path)
    {
        return self::at(\WP_Theme_JSON_Resolver::get_theme_data()->get_raw_data(), $path);
    }

    private static function sized(array $data, array $path, $by)
    {
        $size = self::at($data, $path) ?? self::theirs($path);
        return is_string($size) && $size !== ''
            ? self::put($data, $path, self::times($size, $by))
            : $data;
    }

    /**
     * One of ours around the theme's value, with the factor applied.
     *
     * The styles are composed again on every render, so scaling what is already
     * scaled nests a calc each time; the theme's own value is taken back out first.
     *
     * @param string $size The value the styles hold now.
     * @param float $by The factor to apply.
     * @return string
     */
    private static function times($size, $by)
    {
        $was = preg_match('/^calc\(\((.*)\) \* [0-9.]+\)$/', $size, $found) ? $found[1] : $size;
        return 'calc((' . $was . ') * ' . $by . ')';
    }

    // Any length the theme wrote stays as it is inside the calc, clamp() and var() included.
    private static function scaled(array $data, array $path, $by)
    {
        $presets = self::at($data, $path) ?? self::theirs($path);
        if (!is_array($presets)) {
            return $data;
        }

        foreach ($presets as $index => $preset) {
            $size = is_array($preset) ? ($preset['size'] ?? null) : null;
            if (is_string($size) && $size !== '') {
                $presets[$index]['size'] = self::times($size, $by);
            }
        }

        return self::put($data, $path, $presets);
    }

    private static function at(array $data, array $path)
    {
        $at = $data;
        foreach ($path as $key) {
            if (!is_array($at) || !array_key_exists($key, $at)) {
                return null;
            }

            $at = $at[$key];
        }

        return $at;
    }

    private static function put(array $data, array $path, $value)
    {
        $key = array_shift($path);
        if (!$path) {
            $data[$key] = $value;
            return $data;
        }

        $under = isset($data[$key]) && is_array($data[$key]) ? $data[$key] : [];
        $data[$key] = self::put($under, $path, $value);
        return $data;
    }
}

<?php

/**
 * Made styles.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Styles the agent mixes from parts of the served ones, kept so its card's previews and picks find them by id.
 */
class MadeStyles
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const KEPT = 'extendify_agentx_made_styles';
    const MOST_KEPT = 24;
    // A part's block styles, named as patterns use them; the page part is the rest of its style.
    const PARTS = [
        'sections' => ['core/group' => ['section']],
        'buttons' => ['core/button' => ['button-1']],
        'cards' => [
            'core/group' => ['item-card-1--align-center', 'item-card-1--align-start'],
            'core/media-text' => ['card-1'],
        ],
        'images' => [
            'core/image' => [
                'image-1--content-any',
                'image-1--content-bottom',
                'image-1--content-left',
                'image-1--content-right',
                'image-1--content-top',
                'gallery-1',
            ],
            'core/cover' => [
                'image-1--content-any',
                'image-1--content-bottom',
                'image-1--content-left',
                'image-1--content-right',
                'image-1--content-top',
            ],
        ],
    ];
    const CORNERS = [
        'buttons' => ['square' => '0px', 'slight' => '4px', 'rounded' => '8px', 'round' => '16px', 'pill' => '9999px'],
        'cards' => ['square' => '0px', 'slight' => '4px', 'rounded' => '12px', 'round' => '32px'],
        'images' => ['square' => '0px', 'slight' => '4px', 'rounded' => '12px', 'round' => '32px'],
    ];
    const EDGES = [
        'none' => [],
        'faint' => [
            'width' => '1px',
            'style' => 'solid',
            'color' => 'color-mix(in srgb, var(--wp--preset--color--foreground) 8%, transparent)',
        ],
        'strong' => ['width' => '1px', 'style' => 'solid', 'color' => 'var(--wp--preset--color--foreground)'],
    ];
    const SHADOWS = [
        'none' => null,
        'soft' => 'var(--wp--preset--shadow--md)',
        'hard' => 'var(--wp--preset--shadow--brutalism)',
    ];
    const WIDTHS = [
        'standard' => ['contentSize' => '42rem', 'wideSize' => '80rem'],
        'wide' => ['contentSize' => '56rem', 'wideSize' => '120rem'],
    ];
    // Extendable multiplies every spacing preset and gap by these.
    const SPACINGS = [
        'snug' => ['space-scale' => '0.8', 'gap-scale' => '0.8'],
        'standard' => ['space-scale' => '1', 'gap-scale' => '1'],
        'roomy' => ['space-scale' => '1.35', 'gap-scale' => '1.25'],
    ];
    // The tinted bands as panels set in from the page's edges.
    const FRAMES = [
        'none' => '',
        'inset' => '&.alignfull.has-tertiary-background-color { width: 92%; margin-inline: auto !important;'
            . ' border-radius: 24px; }',
        'outlined' => '&.alignfull.has-tertiary-background-color { width: 92%; margin-inline: auto !important;'
            . ' border-radius: 24px;'
            . ' border: 1px solid color-mix(in srgb, var(--wp--preset--color--foreground) 12%, transparent); }',
    ];
    const BUTTONS = [
        'filled' => '',
        'outline' => '& { background-color: transparent !important;'
            . ' color: var(--wp--preset--color--primary) !important;'
            . ' box-shadow: inset 0 0 0 2px var(--wp--preset--color--primary); }',
    ];
    const HOVERS = [
        'none' => '',
        'lift' => '& { transition: translate 0.2s ease, box-shadow 0.2s ease; }'
            . ' &:hover { translate: 0 -4px; box-shadow: var(--wp--preset--shadow--md); }',
        'straighten' => '',
    ];
    const TILTED_HOVERS = [
        'none' => '',
        'lift' => '& { transition: rotate 0.2s ease, translate 0.2s ease, box-shadow 0.2s ease; }'
            . ' &:hover { rotate: 0deg; translate: 0 -4px; box-shadow: var(--wp--preset--shadow--md); }',
        'straighten' => '& { transition: rotate 0.2s ease; } &:hover { rotate: 0deg; }',
    ];
    // A box in a row: beside its siblings in a grid, or alone in its column.
    const EVEN = ':is(:nth-child(even), .wp-block-column:nth-child(even) > *)';
    const THIRD = ':is(:nth-child(3n), .wp-block-column:nth-child(3n) > *)';
    const SCALES = ['none' => 0, 'subtle' => 0.97, 'slight' => 0.94];
    // Kept so the agent can rebuild a style without a touch.
    const SOURCE = [
        'title', 'page', 'sections', 'buttons', 'cards', 'images', 'corners', 'cardEdge', 'cardShadow', 'width',
        'spacing', 'sectionFrame', 'tilt', 'tiltEvery', 'buttonStyle', 'cardHover', 'photoShape', 'scale',
        'cardShape', 'sectionEdge',
    ];
    // Beside drawn edges, gradients or a grid, a frame leaves a gap and a new edge draws over the old one.
    const DRAWN = '/--(wave|scallop)-|gradient\(|background-image/';
    // A 0.5deg turn moved a card's edge about 5px, too little for anyone to see.
    const TILTS = ['none' => 0, 'subtle' => 1, 'slight' => 1.5, 'playful' => 2];
    // Cards that turn: all of them (pictures too), every other one, or every third.
    const TILT_EVERY = [
        'all' => '& { rotate: -%1$sdeg; } &' . self::EVEN . ' { rotate: %1$sdeg; }',
        'alternate' => '&' . self::EVEN . ' { rotate: %1$sdeg; }',
        'few' => '&' . self::THIRD . ' { rotate: -%1$sdeg; }',
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * A kept made style, as a theme.json fragment like a served one.
     *
     * @param string $id A made style's id starts with made:.
     * @return array|null
     */
    public static function find($id)
    {
        return ((array) \get_option(self::KEPT, []))[$id] ?? null;
    }

    /**
     * The parts and touches a kept style was built from.
     *
     * @param string $id A made style's id starts with made:.
     * @return array|null
     */
    public static function source($id)
    {
        return self::find($id)['source'] ?? null;
    }

    /**
     * Builds each style from the served styles' parts it names, and keeps it.
     *
     * @param array $styles Each one's title, the served style each part comes from, and named settings.
     * @return array Each one's option, as the style tab lists it.
     */
    public static function made(array $styles)
    {
        $kept = (array) \get_option(self::KEPT, []);
        $options = [];
        foreach (array_slice($styles, 0, 6) as $style) {
            $built = is_array($style) ? self::built($style) : null;
            if (!$built) {
                continue;
            }

            $id = 'made:' . substr(md5((string) \wp_json_encode($built)), 0, 12);
            unset($kept[$id]);
            $kept[$id] = $built;
            $options[] = Vibes::optionOf($id, $built);
        }

        \update_option(self::KEPT, array_slice($kept, -self::MOST_KEPT, null, true), false);
        return $options;
    }

    // A made style takes only served parts and named sizes, never CSS from the request.
    private static function built(array $style)
    {
        $title = \sanitize_text_field((string) ($style['title'] ?? ''));
        $page = self::served($style['page'] ?? '');
        if ($title === '' || !$page) {
            return null;
        }

        $built = ['title' => $title, 'settings' => $page['settings'], 'styles' => $page['styles']];
        foreach (self::PARTS as $part => $blocks) {
            $from = self::served($style[$part] ?? '');
            if (!$from) {
                return null;
            }

            foreach ($blocks as $block => $names) {
                foreach ($names as $name) {
                    $key = self::nameOf($block, $name);
                    $built['styles']['blocks'][$block]['variations'][$key]
                        = $from['styles']['blocks'][$block]['variations'][$key] ?? [];
                }
            }
        }

        $corners = (array) ($style['corners'] ?? []);
        foreach (self::CORNERS as $part => $sizes) {
            $size = $sizes[(string) ($corners[$part] ?? '')] ?? null;
            if ($size !== null) {
                $built = self::reshaped($built, $part, function ($variation) use ($size) {
                    $variation['border']['radius'] = $size;
                    return $variation;
                });
            }
        }

        $cardShape = (string) ($style['cardShape'] ?? '');
        $clipped = Shapes::clips($cardShape);
        if ($clipped) {
            $built = self::reshaped($built, 'cards', function ($variation) {
                return self::unoutlined($variation);
            });
        }

        $edge = $clipped ? null : self::EDGES[(string) ($style['cardEdge'] ?? '')] ?? null;
        if ($edge !== null) {
            $built = self::reshaped($built, 'cards', function ($variation) use ($edge) {
                $border = array_diff_key($variation['border'] ?? [], self::EDGES['faint']) + $edge;
                unset($variation['border']);
                return $variation + ($border ? ['border' => $border] : []);
            });
        }

        $shadow = $clipped ? '' : (string) ($style['cardShadow'] ?? '');
        if (array_key_exists($shadow, self::SHADOWS)) {
            $built = self::reshaped($built, 'cards', function ($variation) use ($shadow) {
                unset($variation['shadow']);
                return $variation + (self::SHADOWS[$shadow] ? ['shadow' => self::SHADOWS[$shadow]] : []);
            });
        }

        $radius = Shapes::cardRadius($cardShape);
        if ($radius !== null) {
            $built = self::reshaped($built, 'cards', function ($variation) use ($radius) {
                $variation['border']['radius'] = $radius;
                return $variation;
            });
        }

        $width = self::WIDTHS[(string) ($style['width'] ?? '')] ?? null;
        if ($width) {
            $built['settings']['layout'] = $width + ($built['settings']['layout'] ?? []);
        }

        $spacing = self::SPACINGS[(string) ($style['spacing'] ?? '')] ?? null;
        if ($spacing) {
            $built['settings']['custom'] = $spacing + ($built['settings']['custom'] ?? []);
        }

        $frame = self::FRAMES[(string) ($style['sectionFrame'] ?? '')] ?? '';
        $band = Shapes::edgeCss((string) ($style['sectionEdge'] ?? ''));
        $built = self::withCss($built, 'sections', function ($css) use ($frame, $band) {
            if (preg_match(self::DRAWN, $css)) {
                return '';
            }

            // An edge runs the page's full width, which a panel set in from it would break.
            return $band ?: $frame;
        });

        $tilt = self::TILTS[(string) ($style['tilt'] ?? '')] ?? 0;
        $every = (string) ($style['tiltEvery'] ?? '');
        $every = isset(self::TILT_EVERY[$every]) ? $every : 'all';
        if ($tilt) {
            $built = self::withCss($built, 'cards', function () use ($tilt, $every) {
                return sprintf(self::TILT_EVERY[$every], $tilt);
            }, ['card-1']);
            if ($every === 'all') {
                $built = self::withCss($built, 'images', function () use ($tilt) {
                    return "& { rotate: {$tilt}deg; }";
                });
            }
        }

        $button = self::BUTTONS[(string) ($style['buttonStyle'] ?? '')] ?? '';
        $built = self::withCss($built, 'buttons', function () use ($button) {
            return $button;
        });
        $hover = ($tilt ? self::TILTED_HOVERS : self::HOVERS)[(string) ($style['cardHover'] ?? '')] ?? '';
        $built = self::withCss($built, 'cards', function () use ($hover) {
            return $hover;
        }, ['card-1']);
        $scale = self::SCALES[(string) ($style['scale'] ?? '')] ?? 0;
        if ($scale) {
            $built = self::withCss($built, 'cards', function () use ($scale) {
                return '&' . self::EVEN . " { scale: {$scale}; }";
            }, ['card-1']);
            $built = self::withCss($built, 'images', function () use ($scale) {
                return "&:is(.wp-block-column:nth-child(even) > *) { scale: {$scale}; }";
            });
        }
        $cardCss = Shapes::cardCss($cardShape);
        $built = self::withCss($built, 'cards', function ($css) use ($cardCss) {
            return strpos($css, 'clip-path') === false ? $cardCss : '';
        });
        $photo = (string) ($style['photoShape'] ?? '');
        if (Shapes::photoClips($photo)) {
            $built = self::reshaped($built, 'images', function ($variation) {
                return self::unoutlined($variation);
            }, 'core/image');
        }

        // A cover is a section's background, and a picture its style already clips keeps that shape.
        $built = self::withCss($built, 'images', function ($css, $name, $block) use ($photo) {
            return $block === 'core/image' && strpos($css, 'clip-path') === false
                ? Shapes::photoCss($photo, $name)
                : '';
        });

        Vibes::register($built);
        return $built + [
            'preview' => Vibes::previewOf($built['styles']['blocks'] ?? []),
            'source' => self::sourceOf($style),
        ];
    }

    // Our own rules after a part's served ones, so they win where both set a property.
    private static function withCss(array $built, $part, callable $rule, array $skip = [])
    {
        foreach (self::PARTS[$part] as $block => $names) {
            foreach (array_diff($names, ['gallery-1'], $skip) as $name) {
                $key = self::nameOf($block, $name);
                $variation = $built['styles']['blocks'][$block]['variations'][$key] ?? [];
                $added = $rule((string) ($variation['css'] ?? ''), $name, $block);
                if ($added !== '') {
                    $variation['css'] = trim(($variation['css'] ?? '') . ' ' . $added);
                    $built['styles']['blocks'][$block]['variations'][$key] = $variation;
                }
            }
        }

        return $built;
    }

    private static function sourceOf(array $style)
    {
        $source = [];
        foreach (array_intersect_key($style, array_flip(self::SOURCE)) as $key => $value) {
            if ($key === 'corners') {
                $source[$key] = array_map(function ($size) {
                    return $size === null ? null : \sanitize_key((string) $size);
                }, array_intersect_key((array) $value, array_flip(['buttons', 'cards', 'images'])));
                continue;
            }

            $source[$key] = $value === null || $key === 'title'
                ? ($value === null ? null : \sanitize_text_field((string) $value))
                : preg_replace('/[^a-z0-9:_-]/', '', strtolower((string) $value));
        }

        return $source;
    }

    private static function served($id)
    {
        return strpos((string) $id, 'vibe:') === 0 ? Vibes::find($id) : null;
    }

    private static function nameOf($block, $name)
    {
        $kind = strpos($name, 'image-1') === 0 ? 'image' : substr($block, strpos($block, '/') + 1);
        return "ext-preset--{$kind}--" . Vibes::PATTERN_VIBE . "--{$name}";
    }

    // A clip path, like Prism's cut corners, would also cut off a new border or shadow.
    private static function reshaped(array $built, $part, callable $change, $only = null)
    {
        foreach (self::PARTS[$part] as $block => $names) {
            if ($only && $block !== $only) {
                continue;
            }

            foreach (array_diff($names, ['gallery-1']) as $name) {
                $key = self::nameOf($block, $name);
                $variation = $built['styles']['blocks'][$block]['variations'][$key] ?? [];
                if (strpos((string) ($variation['css'] ?? ''), 'clip-path') === false) {
                    $built['styles']['blocks'][$block]['variations'][$key] = $change($variation);
                }
            }
        }

        return $built;
    }

    // A clip cuts an outline and a shadow off at every cut; the corners stay.
    private static function unoutlined(array $variation)
    {
        $border = array_diff_key($variation['border'] ?? [], self::EDGES['faint']);
        unset($variation['border'], $variation['shadow']);
        return $variation + ($border ? ['border' => $border] : []);
    }
}

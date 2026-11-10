<?php

/**
 * Block edit ops.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * The edits the agent can make to a block, by the op name the backend sends.
 */
class Ops
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ALL = [
        'delete' => Remove::class,
        'edit-text' => Text::class,
        'format-text' => Format::class,
        'edit-code' => Code::class,
        'set-style' => Style::class,
        'set-css' => Css::class,
        'copy-style' => CopyStyle::class,
        'set-link' => Link::class,
        'set-settings' => Settings::class,
        'move' => Move::class,
        'duplicate' => Duplicate::class,
        'add' => Add::class,
        'replace-image' => Image::class,
        'set-alt' => Alt::class,
        'wrap' => Wrap::class,
        'stack-columns' => Stack::class,
        'text-on-image' => TextOnImage::class,
        'set-map' => Map::class,
        'logo-title' => LogoTitle::class,
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function of($op)
    {
        return self::ALL[$op] ?? null;
    }
}

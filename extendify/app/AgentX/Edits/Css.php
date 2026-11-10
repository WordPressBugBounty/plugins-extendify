<?php

/**
 * Style a piece inside a block.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * Styles pieces inside a block that aren't blocks of their own, like an accordion's icon, with CSS of the block's own.
 */
class Css extends Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const REPORT = 'style';
    const MOST = 2000;
    // What WordPress won't render, and what could load or run something rather than style the piece.
    const UNSAFE = '#</?\w+|@import|expression\s*\(|javascript:|url\s*\(#i';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function apply(array $blocks, array $path, array $args, array $context)
    {
        $block = Tree::blockAt($blocks, $path);
        $css = is_string($args['css'] ?? null) ? trim($args['css']) : '';
        if ($css === '' || strlen($css) > self::MOST || preg_match(self::UNSAFE, $css)) {
            return self::refuse('bad_args', 'Send CSS rules that only set how pieces of the block look.');
        }

        // A block's own CSS renders from WordPress 7.0 on.
        $type = \WP_Block_Type_Registry::get_instance()->get_registered($block['blockName']);
        if (!function_exists('wp_render_custom_css_support_styles') || !$type || !\block_has_support($type, 'customCSS', true)) {
            return self::refuse('unsupported', 'This block takes no CSS of its own.');
        }

        // Blocks users without edit_css from adding CSS, which WordPress also strips when they save.
        if (!\current_user_can('edit_css')) {
            return self::refuse('no_css', 'Only someone who may edit CSS can style part of a block.');
        }

        $style = is_array($block['attrs']['style'] ?? null) ? $block['attrs']['style'] : [];
        $style['css'] = self::merged(is_string($style['css'] ?? null) ? $style['css'] : '', $css);
        $block['attrs']['style'] = $style;
        // The editor's save adds this class, so markup without it reads as invalid there.
        $block = self::withOpening($block, function ($html) {
            $tags = new \WP_HTML_Tag_Processor($html);
            if ($tags->next_tag()) {
                $tags->add_class('has-custom-css');
            }

            return $tags->get_updated_html();
        });
        return ['blocks' => Tree::setAt($blocks, $path, $block), 'at' => $path, 'block' => $path];
    }

    // WordPress splits a block's CSS at each &, so a piece's new rule replaces its old one.
    private static function merged($was, $css)
    {
        $rules = [];
        foreach (array_merge(explode('&', $was), explode('&', $css)) as $rule) {
            $rule = trim($rule);
            if ($rule === '') {
                continue;
            }

            $selector = strpos($rule, '{') === false ? '' : preg_replace('/\s+/', ' ', trim(strstr($rule, '{', true)));
            unset($rules[$selector]);
            $rules[$selector] = $rule;
        }

        $root = $rules[''] ?? '';
        unset($rules['']);
        // A state like :hover stays on the &; with a space it would mean anything inside.
        $nested = array_map(function ($rule) {
            return ($rule[0] === ':' ? '&' : '& ') . $rule;
        }, array_values($rules));
        return trim(implode("\n", array_merge([$root], $nested)));
    }
}

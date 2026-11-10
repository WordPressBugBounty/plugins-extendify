<?php

/**
 * Block edit.
 */

namespace Extendify\AgentX\Edits;

defined('ABSPATH') || die('No direct access.');

/**
 * One kind of change to a block in the draft; Draft::editBlock runs the checks every kind shares.
 */
abstract class Edit
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    // The op the Changes list labels.
    const REPORT = '';
    // Post content and template parts show what's stored elsewhere, so copying or removing them breaks the page.
    const KEEPS_CONTENT = false;
    // The Changes list names the block the edit made, not the one it was asked about.
    const NAMES_MADE = true;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The changed blocks, the path whose subtree changed, and where the edited or new block sits.
     *
     * @return array|\WP_Error ['blocks' => array, 'at' => array, 'block' => array|null]
     */
    abstract public static function apply(array $blocks, array $path, array $args, array $context);

    /**
     * What the change list calls this change, which one kind of edit can tell apart from another.
     *
     * @param array      $before - The block before the edit.
     * @param array|null $after  - The block the edit left, or null when it made none.
     * @return string
     */
    public static function reportFor(array $before, $after = null)
    {
        return static::REPORT;
    }

    protected static function refuse($code, $message)
    {
        return new \WP_Error($code, $message, ['status' => 400]);
    }

    // The current path of a block the args name by its id, read from the marks the edit started with.
    protected static function pathOf(array $blocks, $id, $source)
    {
        $split = strrpos((string) $id, ':');
        if ($split === false || substr($id, 0, $split) !== $source) {
            return null;
        }

        $now = Tree::marks($blocks)[substr($id, $split + 1)] ?? null;
        return $now === null ? null : explode('.', (string) $now);
    }

    // The markup before a block's first inner block, which holds its own element and text.
    protected static function withOpening(array $block, callable $change)
    {
        $content = $block['innerContent'];
        if (!isset($content[0]) || !is_string($content[0])) {
            return $block;
        }

        $content[0] = $change($content[0]);
        return array_merge($block, [
            'innerContent' => $content,
            'innerHTML' => implode('', array_filter($content, 'is_string')),
        ]);
    }

    protected static function hasMarkup(array $block)
    {
        return trim($block['innerHTML']) !== '';
    }

    protected static function inParent(array $blocks, array $path, callable $change)
    {
        $parent = array_slice($path, 0, -1);
        $children = Tree::children($blocks, $parent);
        $index = (int) end($path);
        $result = $change($children, $index);
        if (\is_wp_error($result)) {
            return $result;
        }

        list($children, $landed) = $result;
        return [
            'blocks' => Tree::withChildren($blocks, $parent, $children),
            'at' => $parent,
            'block' => $landed === null ? null : array_merge($parent, [$landed]),
        ];
    }
}

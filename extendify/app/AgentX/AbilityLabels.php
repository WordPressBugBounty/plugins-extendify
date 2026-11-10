<?php

/**
 * Our translations for other plugins' ability labels.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

/**
 * Translates the labels other plugins register, keyed by the exact English they register them in.
 *
 * A plugin shipping its own translation returns it from get_label(), which no longer
 * matches the key here, so theirs wins and ours goes unused.
 */
class AbilityLabels
{
    /**
     * Our translation for a label, or the label as it came.
     *
     * @param string $label The label the plugin registered.
     * @return string
     */
    public static function of($label)
    {
        $ours = self::all();
        return isset($ours[$label]) ? $ours[$label] : $label;
    }

    /**
     * Every label we translate, by the English the plugin registers.
     *
     * @return array
     */
    public static function all()
    {
        return [
            // translators: WooCommerce AI Agent ability — searches the store's products.
            'Query products' => __('Query products', 'extendify-local'),
            // translators: WooCommerce AI Agent ability — searches the store's orders.
            'Query orders' => __('Query orders', 'extendify-local'),
            // translators: WooCommerce AI Agent ability — creates a product.
            'Create product' => __('Create product', 'extendify-local'),
            // translators: WooCommerce AI Agent ability — updates a product.
            'Update product' => __('Update product', 'extendify-local'),
            // translators: WooCommerce AI Agent ability — deletes a product.
            'Delete product' => __('Delete product', 'extendify-local'),
            // translators: WooCommerce AI Agent ability — adds a note to an order.
            'Add order note' => __('Add order note', 'extendify-local'),
            // translators: WooCommerce AI Agent ability — changes an order's status.
            'Update order status' => __('Update order status', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — adds a translation language.
            'Add a translation language' => __('Add a translation language', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — sets the license key.
            'Set TranslatePress license key' => __('Set TranslatePress license key', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — turns on automatic translation.
            'Enable Automatic Translation' => __('Enable Automatic Translation', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — lists the site's configured languages.
            'List configured languages' => __('List configured languages', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — lists selectable language codes.
            'List available language codes' => __('List available language codes', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — removes a translation language.
            'Remove a translation language' => __('Remove a translation language', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — updates a translation language.
            'Update a translation language' => __('Update a translation language', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — sets the site's default language.
            'Set the default language' => __('Set the default language', 'extendify-local'),
            // translators: WPForms AI Agent ability — lists the site's forms.
            'List Forms' => __('List Forms', 'extendify-local'),
            // translators: WPForms AI Agent ability — fetches a form's details.
            'Get Form' => __('Get Form', 'extendify-local'),
            // translators: WPForms AI Agent ability — describes which form fields and settings can be edited.
            'Describe Editing Schema' => __('Describe Editing Schema', 'extendify-local'),
            // translators: WPForms AI Agent ability — creates a form.
            'Create Form' => __('Create Form', 'extendify-local'),
            // translators: WPForms AI Agent ability — updates a form's settings.
            'Update Form Settings' => __('Update Form Settings', 'extendify-local'),
            // translators: WPForms AI Agent ability — adds a field to a form.
            'Add Field' => __('Add Field', 'extendify-local'),
            // translators: WPForms AI Agent ability — updates a form field.
            'Update Field' => __('Update Field', 'extendify-local'),
            // translators: WPForms AI Agent ability — gets a form's entry statistics.
            'Get Form Stats' => __('Get Form Stats', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — gets booking statistics.
            'Get Statistics' => __('Get Statistics', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — counts bookings from the last 30 days.
            'Count Recent Bookings' => __('Count Recent Bookings', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — updates the booking widget's design settings.
            'Update Design Settings' => __('Update Design Settings', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — lists the booking widget's design settings.
            'List Design Settings' => __('List Design Settings', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — lists the plugin's setup tasks.
            'List Tasks' => __('List Tasks', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — updates a setup task's status.
            'Update Task Status' => __('Update Task Status', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — lists service providers (staff).
            'List Providers' => __('List Providers', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — updates a service provider (staff member).
            'Update Service Provider' => __('Update Service Provider', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — updates a bookable service.
            'Update Service' => __('Update Service', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — lists the bookable services.
            'List Services' => __('List Services', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — lists the times a service can still be booked.
            'Get Available Booking Slots' => __('Get Available Booking Slots', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — gets the hours the business takes bookings in.
            'Get Working Hours' => __('Get Working Hours', 'extendify-local'),
            // translators: Name of the SimplyBook.me group in the AI Agent's list of what it can do.
            'SimplyBook.me General Abilities' => __('SimplyBook.me General Abilities', 'extendify-local'),
            // translators: Name of the SimplyBook.me booking group in the AI Agent's list of what it can do.
            'SimplyBook.me Schedule Abilities' => __('SimplyBook.me Schedule Abilities', 'extendify-local'),
            // translators: Imagify AI Agent ability — optimizes an image in the media library.
            'Optimize media' => __('Optimize media', 'extendify-local'),
            // translators: Imagify AI Agent ability — optimizes every unoptimized image in the media library.
            'Bulk optimize' => __('Bulk optimize', 'extendify-local'),
            // translators: Imagify AI Agent ability — puts an image back to the original file it was optimized from.
            'Restore media' => __('Restore media', 'extendify-local'),
            // translators: Imagify AI Agent ability — gets an image's optimization status.
            'Get Media Status' => __('Get Media Status', 'extendify-local'),
            // translators: Imagify AI Agent ability — gets the site's image optimization statistics.
            'Get Imagify optimization stats' => __('Get Imagify optimization stats', 'extendify-local'),
            // translators: Imagify AI Agent ability — reports how many images have next-gen formats (WebP/AVIF).
            'Get next-gen coverage' => __('Get next-gen coverage', 'extendify-local'),
            // translators: Imagify AI Agent ability — makes the WebP/AVIF copies of images that have none.
            'Generate missing next-gen versions' => __('Generate missing next-gen versions', 'extendify-local'),
            // translators: Imagify AI Agent ability — gets the plugin's settings.
            'Get Imagify settings' => __('Get Imagify settings', 'extendify-local'),
            // translators: Imagify AI Agent ability — updates the plugin's settings.
            'Update Imagify settings' => __('Update Imagify settings', 'extendify-local'),
            // translators: Imagify AI Agent ability — gets the Imagify account status and quota.
            'Get Imagify account status' => __('Get Imagify account status', 'extendify-local'),
        ];
    }
}

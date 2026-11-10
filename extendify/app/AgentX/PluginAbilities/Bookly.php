<?php

/**
 * Bookly's services.
 */

namespace Extendify\AgentX\PluginAbilities;

defined('ABSPATH') || die('No direct access.');

use Bookly\Lib\Entities\Service;

/**
 * Lists and changes the services customers book, through the plugin's own service entity.
 */
class Bookly extends Plugin
{
    public static function active()
    {
        return class_exists(Service::class);
    }

    public static function category()
    {
        return [
            'bookly',
            'Bookly',
            'The services customers book online: their names, lengths, prices and descriptions.',
        ];
    }

    public static function abilities()
    {
        return [
            'bookly-list-services' => self::ability(
                // translators: Name of a Bookly action the AI Agent can run. List is a verb; services are booked.
                \__('List services', 'extendify-local'),
                'Lists the services customers can book, with their ids, lengths and prices.',
                [],
                [],
                'read',
                [self::class, 'listServices'],
                self::can('manage_options')
            ),
            'bookly-update-service' => self::ability(
                // translators: Name of a Bookly action the AI Agent can run. A service is what customers book.
                \__('Change a service', 'extendify-local'),
                'Changes a bookable service\'s name, length, price or description. Only what is given changes.',
                [
                    'service_id' => ['type' => 'integer', 'description' => 'The service\'s id.'],
                    'title' => ['type' => 'string', 'description' => 'The service\'s name.'],
                    'minutes' => [
                        'type' => 'integer',
                        'minimum' => 5,
                        'description' => 'How long it takes, in minutes.',
                    ],
                    'price' => ['type' => 'number', 'minimum' => 0, 'description' => 'What it costs.'],
                    'info' => ['type' => 'string', 'description' => 'A description customers see when booking.'],
                ],
                ['service_id'],
                'update',
                [self::class, 'updateService'],
                self::can('manage_options')
            ),
        ];
    }

    public static function listServices()
    {
        $services = Service::query()->sortBy('position')->find();
        return ['services' => array_values(array_map([self::class, 'shape'], $services))];
    }

    public static function updateService($input)
    {
        $service = Service::find((int) $input['service_id']);
        if (!$service) {
            return self::missing('service');
        }

        if (isset($input['title'])) {
            $service->setTitle($input['title']);
        }

        if (isset($input['minutes'])) {
            $service->setDuration((int) $input['minutes'] * MINUTE_IN_SECONDS);
        }

        if (isset($input['price'])) {
            $service->setPrice($input['price']);
        }

        if (isset($input['info'])) {
            $service->setInfo($input['info']);
        }

        $service->save();
        return self::shape($service);
    }

    private static function shape(Service $service)
    {
        return [
            'id' => (int) $service->getId(),
            'title' => $service->getTitle(),
            'minutes' => (int) round($service->getDuration() / MINUTE_IN_SECONDS),
            'price' => (float) $service->getPrice(),
            'info' => (string) $service->getInfo(),
        ];
    }
}

<?php

// autoload_static.php @generated by Composer

namespace Composer\Autoload;

class ComposerStaticInit309acb7c2a3c55abe5247e5cfa5317db
{
    public static $prefixLengthsPsr4 = array (
        'E' => 
        array (
            'Extendify\\' => 10,
        ),
    );

    public static $prefixDirsPsr4 = array (
        'Extendify\\' => 
        array (
            0 => __DIR__ . '/../..' . '/app',
        ),
    );

    public static function getInitializer(ClassLoader $loader)
    {
        return \Closure::bind(function () use ($loader) {
            $loader->prefixLengthsPsr4 = ComposerStaticInit309acb7c2a3c55abe5247e5cfa5317db::$prefixLengthsPsr4;
            $loader->prefixDirsPsr4 = ComposerStaticInit309acb7c2a3c55abe5247e5cfa5317db::$prefixDirsPsr4;

        }, null, ClassLoader::class);
    }
}

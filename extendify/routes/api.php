<?php

/**
 * Api routes
 */

if (!defined('ABSPATH')) {
    die('No direct access.');
}

use Extendify\ApiRouter;
use Extendify\Assist\Controllers\DomainsSuggestionController;
use Extendify\Assist\Controllers\GlobalsController;
use Extendify\Assist\Controllers\RouterController;
use Extendify\Assist\Controllers\TasksController;

use Extendify\HelpCenter\Controllers\TourController;
use Extendify\HelpCenter\Controllers\RouterController as HelpCenterRouterController;
use Extendify\HelpCenter\Controllers\SupportArticlesController;

use Extendify\Draft\Controllers\ImageController;
use Extendify\Draft\Controllers\RouterController as DraftRouterController;

use Extendify\Launch\Controllers\WPController;
use Extendify\Launch\Controllers\WooCommerceController;
use Extendify\AutoLaunch\Controllers\WPController as AutoLaunchWPController;
use Extendify\AutoLaunch\Controllers\WooCommerceController as AutoLaunchWooCommerceController;

use Extendify\Library\Controllers\SiteController;

use Extendify\PageCreator\Controllers\SiteController as PageCreatorSiteController;

use Extendify\Agent\Controllers\WPController as AgentWPController;
use Extendify\Agent\Controllers\ChatHistoryController as AgentChatController;
use Extendify\Agent\Controllers\ContentController as AgentContentController;
use Extendify\Agent\Controllers\OptionsController as AgentOptionsController;
use Extendify\Agent\Controllers\SiteNavigationController as AgentSiteNavigationController;
use Extendify\Agent\Controllers\UpdateBlocksController as AgentUpdateBlocksController;
use Extendify\AgentX\Controllers\ConversationController as AgentXConversationController;
use Extendify\AgentX\Controllers\DesignController as AgentXDesignController;
use Extendify\AgentX\Controllers\DraftController as AgentXDraftController;
use Extendify\AgentX\Controllers\GuideController as AgentXGuideController;
use Extendify\AgentX\Controllers\MapsController as AgentXMapsController;
use Extendify\AgentX\Controllers\PageStatusController as AgentXPageStatusController;
use Extendify\AgentX\Controllers\PluginsController as AgentXPluginsController;
use Extendify\AgentX\Controllers\ProfileController as AgentXProfileController;
use Extendify\AgentX\Controllers\SettingsController as AgentXSettingsController;

use Extendify\PluginNotifications\Controllers\NotificationsController;
use Extendify\Shared\Controllers\AutoUpdateController;
use Extendify\Shared\Controllers\PatternPlaceholderController;
use Extendify\Shared\Controllers\UserSelectionController;
use Extendify\Shared\Controllers\UserSettingsController as SharedUserSettingsController;
use Extendify\Shared\Controllers\ActivityController;
use Extendify\Shared\Controllers\SiteProfileController;
use Extendify\Shared\Controllers\SiteVisibilityController;
use Extendify\Shared\Controllers\SiteImagesController;
use Extendify\Shared\Controllers\DataController as SharedDataController;
use Extendify\Shared\Controllers\ImageGenerationController;
use Extendify\Shared\Services\PluginsActivation\SimplyBook as SimplyBookActivation;
use Extendify\Shared\Services\PluginsActivation\TranslatePress as TranslatePressActivation;
use Extendify\Shared\Services\PluginsActivation\Imagify as ImagifyActivation;
use Extendify\Shared\Services\PluginsActivation\Metricool as MetricoolActivation;

\add_action(
    'rest_api_init',
    function () {
        // Library.
        ApiRouter::get('/library/settings', [SiteController::class, 'get']);
        ApiRouter::post('/library/settings', [SiteController::class, 'store']);
        ApiRouter::post('/library/settings/single', [SiteController::class, 'single']);

        // Page Creator.
        ApiRouter::get('/page-creator/settings/get-option', [PageCreatorSiteController::class, 'get']);
        ApiRouter::post('/page-creator/settings/single', [PageCreatorSiteController::class, 'single']);

        // Launch.
        ApiRouter::post('/launch/options', [WPController::class, 'updateOption']);
        ApiRouter::get('/launch/options', [WPController::class, 'getOption']);
        ApiRouter::post('/launch/save-pattern', [WPController::class, 'savePattern']);
        ApiRouter::get('/launch/active-plugins', [WPController::class, 'getActivePlugins']);
        ApiRouter::get('/launch/prefetch-assist-data', [WPController::class, 'prefetchAssistData']);
        ApiRouter::post('/launch/create-navigation', [WPController::class, 'createNavigationWithMeta']);
        ApiRouter::post('/launch/post-launch-functions', [WPController::class, 'postLaunch']);
        ApiRouter::get('/launch/import-woocommerce', [WooCommerceController::class, 'importTemporaryProducts']);

        // AutoLaunch.
        ApiRouter::post('/auto-launch/options', [AutoLaunchWPController::class, 'updateOption']);
        ApiRouter::get('/auto-launch/options', [AutoLaunchWPController::class, 'getOption']);
        ApiRouter::post('/auto-launch/save-pattern', [AutoLaunchWPController::class, 'savePattern']);
        ApiRouter::get('/auto-launch/active-plugins', [AutoLaunchWPController::class, 'getActivePlugins']);
        ApiRouter::get('/auto-launch/prefetch-assist-data', [AutoLaunchWPController::class, 'prefetchAssistData']);
        ApiRouter::post('/auto-launch/create-navigation', [AutoLaunchWPController::class, 'createNavigationWithMeta']);
        ApiRouter::get('/auto-launch/get-navigation', [AutoLaunchWPController::class, 'getNavigation']);
        ApiRouter::post('/auto-launch/pre-launch-functions', [AutoLaunchWPController::class, 'preLaunch']);
        ApiRouter::post('/auto-launch/reset-launch-state', [AutoLaunchWPController::class, 'resetLaunchState']);
        ApiRouter::post('/auto-launch/post-launch-functions', [AutoLaunchWPController::class, 'postLaunch']);
        ApiRouter::post('/auto-launch/run-updates', [AutoLaunchWPController::class, 'runUpdates']);
        ApiRouter::get(
            '/auto-launch/import-woocommerce',
            [AutoLaunchWooCommerceController::class, 'importTemporaryProducts']
        );

        // Assist.
        ApiRouter::get('/assist/task-data', [TasksController::class, 'get']);
        ApiRouter::post('/assist/task-data', [TasksController::class, 'store']);
        ApiRouter::post('/assist/router-data', [RouterController::class, 'store']);
        ApiRouter::get('/assist/global-data', [GlobalsController::class, 'get']);
        ApiRouter::post('/assist/global-data', [GlobalsController::class, 'store']);
        ApiRouter::post('/assist/delete-domains-recommendations', [DomainsSuggestionController::class, 'deleteCache']);
        ApiRouter::post('assists/domains-recommendations-activities', [DomainsSuggestionController::class, 'tracking']);

        // Help Center.
        ApiRouter::get('/help-center/tour-data', [TourController::class, 'get']);
        ApiRouter::post('/help-center/tour-data', [TourController::class, 'store']);
        ApiRouter::post('/help-center/router-data', [HelpCenterRouterController::class, 'store']);
        ApiRouter::get('/help-center/router-data', [HelpCenterRouterController::class, 'get']);
        ApiRouter::get('/help-center/support-article', [SupportArticlesController::class, 'article']);
        ApiRouter::post('/help-center/support-articles-data', [SupportArticlesController::class, 'store']);
        ApiRouter::get('/help-center/get-redirect', [SupportArticlesController::class, 'getRedirect']);

        // Draft.
        ApiRouter::get('/shared/image-generation', [ImageGenerationController::class, 'get']);
        ApiRouter::post('/shared/image-generation', [ImageGenerationController::class, 'store']);
        ApiRouter::post('/draft/upload-image', [ImageController::class, 'uploadMedia']);
        ApiRouter::post('/draft/router-data', [DraftRouterController::class, 'store']);
        ApiRouter::get('/draft/router-data', [DraftRouterController::class, 'get']);

        // Agent.
        ApiRouter::get('/agent/theme-variations', [AgentWPController::class, 'getVariations']);
        ApiRouter::get('/agent/theme-fonts-variations', [AgentWPController::class, 'getFontsVariations']);
        ApiRouter::get('/agent/get-block-code', [AgentWPController::class, 'getBlockCode']);
        ApiRouter::get('/agent/shared-block-usage', [AgentWPController::class, 'getSharedBlockUsage']);
        ApiRouter::post('/agent/get-block-html', [AgentWPController::class, 'getBlockHtml']);
        ApiRouter::post('/agent/update-blocks', [AgentUpdateBlocksController::class, 'updateBlocks']);
        ApiRouter::post('/agent/lock-post', [AgentWPController::class, 'lockPost']);
        ApiRouter::get('/agent/chat-events', [AgentChatController::class, 'get']);
        ApiRouter::post('/agent/chat-events', [AgentChatController::class, 'store']);
        ApiRouter::post('/agent/site-navigation', [AgentSiteNavigationController::class, 'getSiteNavigation']);
        ApiRouter::post('/agent/site-design-variations', [AgentWPController::class, 'getSiteDesignVariations']);
        ApiRouter::get('/agent/block-style-variations', [AgentWPController::class, 'getBlockStyleVariations']);
        ApiRouter::post('/agent/options', [AgentWPController::class, 'updateOption']);
        ApiRouter::get('/agent/options', [AgentWPController::class, 'getOption']);
        ApiRouter::post('/agent/site-options', [AgentOptionsController::class, 'handle']);
        ApiRouter::post('/agent/content-search', [AgentContentController::class, 'search']);
        ApiRouter::post('/agent/content-read', [AgentContentController::class, 'read']);

        // AgentX.
        ApiRouter::post('/agentx/draft/edit', [AgentXDraftController::class, 'editBlock']);
        ApiRouter::post('/agentx/draft/replace', [AgentXDraftController::class, 'replaceText']);
        ApiRouter::post('/agentx/draft/variation', [AgentXDraftController::class, 'chooseVariation']);
        ApiRouter::post('/agentx/draft/style', [AgentXDraftController::class, 'chooseStyle']);
        ApiRouter::post('/agentx/draft/palette', [AgentXDraftController::class, 'choosePalette']);
        ApiRouter::post('/agentx/draft/theme-setting', [AgentXDraftController::class, 'chooseThemeSetting']);
        ApiRouter::post('/agentx/draft/layout', [AgentXDraftController::class, 'chooseLayout']);
        ApiRouter::post('/agentx/draft/look', [AgentXDraftController::class, 'chooseLook']);
        ApiRouter::post('/agentx/draft/undo', [AgentXDraftController::class, 'undo']);
        ApiRouter::post('/agentx/draft/drop', [AgentXDraftController::class, 'drop']);
        ApiRouter::post('/agentx/draft/redo', [AgentXDraftController::class, 'redo']);
        ApiRouter::post('/agentx/draft/restore', [AgentXDraftController::class, 'restore']);
        ApiRouter::post('/agentx/draft/live', [AgentXDraftController::class, 'live']);
        ApiRouter::post('/agentx/draft/revert', [AgentXDraftController::class, 'revert']);
        ApiRouter::get('/agentx/draft/changes', [AgentXDraftController::class, 'changes']);
        ApiRouter::post('/agentx/draft/discard', [AgentXDraftController::class, 'discard']);
        ApiRouter::post('/agentx/draft/save', [AgentXDraftController::class, 'save']);
        ApiRouter::post('/agentx/draft/resolve', [AgentXDraftController::class, 'resolve']);
        ApiRouter::get('/agentx/presence', [AgentXDraftController::class, 'presence']);
        ApiRouter::post('/agentx/draft/check', [AgentXDraftController::class, 'check']);
        ApiRouter::get('/agentx/design/colors', [AgentXDesignController::class, 'colors']);
        ApiRouter::post('/agentx/design/made', [AgentXDesignController::class, 'made']);
        ApiRouter::get('/agentx/design/made-style', [AgentXDesignController::class, 'madeStyle']);
        ApiRouter::get('/agentx/design/fonts', [AgentXDesignController::class, 'fonts']);
        ApiRouter::get('/agentx/design/vibe', [AgentXDesignController::class, 'vibe']);
        ApiRouter::get('/agentx/design/layout', [AgentXDesignController::class, 'layout']);
        ApiRouter::get('/agentx/design/look', [AgentXDesignController::class, 'look']);
        ApiRouter::post('/agentx/setting', [AgentXSettingsController::class, 'update']);
        ApiRouter::post('/agentx/profile', [AgentXProfileController::class, 'update']);
        ApiRouter::post('/agentx/guide', [AgentXGuideController::class, 'update']);
        ApiRouter::get('/agentx/store-guide', [AgentXGuideController::class, 'store']);
        ApiRouter::post('/agentx/store-guide', [AgentXGuideController::class, 'storeStep']);
        ApiRouter::get('/agentx/domains', [AgentXGuideController::class, 'domains']);
        ApiRouter::post('/agentx/conversation', [AgentXConversationController::class, 'save']);
        ApiRouter::get('/agentx/page-status', [AgentXPageStatusController::class, 'target']);
        ApiRouter::post('/agentx/page-status', [AgentXPageStatusController::class, 'change']);
        ApiRouter::post('/agentx/pages/check', [AgentXPageStatusController::class, 'facts']);
        ApiRouter::post('/agentx/pages/delete', [AgentXPageStatusController::class, 'delete']);
        ApiRouter::get('/agentx/trash', [AgentXPageStatusController::class, 'trashed']);
        ApiRouter::get('/agentx/find-text', [AgentXPageStatusController::class, 'findText']);
        ApiRouter::post('/agentx/map-preview', [AgentXMapsController::class, 'preview']);
        ApiRouter::post('/agentx/trash/restore', [AgentXPageStatusController::class, 'restore']);
        ApiRouter::get('/agentx/plugins', [AgentXPluginsController::class, 'index']);
        ApiRouter::post('/agentx/install-plugin', [AgentXPluginsController::class, 'install']);
        ApiRouter::post('/agentx/update-plugin', [AgentXPluginsController::class, 'update']);

        // Site visibility.
        ApiRouter::post('/site-visibility/publish', [SiteVisibilityController::class, 'publish']);
        ApiRouter::post('/site-visibility/unpublish', [SiteVisibilityController::class, 'unpublish']);

        // Search engine indexing.
        ApiRouter::post('/search-indexing/enable', [SiteVisibilityController::class, 'allowIndexing']);
        ApiRouter::post('/search-indexing/disable', [SiteVisibilityController::class, 'blockIndexing']);

        // Notifications.
        ApiRouter::post('/notifications/dismiss', [NotificationsController::class, 'dismiss']);
        ApiRouter::post('/notifications/dismiss-all', [NotificationsController::class, 'dismissAll']);

        // Shared.
        ApiRouter::get('/shared/user-selections-data', [UserSelectionController::class, 'get']);
        ApiRouter::post('/shared/user-selections-data', [UserSelectionController::class, 'store']);
        ApiRouter::post('/shared/update-user-meta', [SharedUserSettingsController::class, 'updateUserMeta']);
        ApiRouter::post('/shared/process-placeholders', [PatternPlaceholderController::class, 'processPlaceholders']);
        ApiRouter::post('/shared/enable-auto-update', [AutoUpdateController::class, 'enable']);
        ApiRouter::get('/shared/activity', [ActivityController::class, 'get']);
        ApiRouter::post('/shared/activity', [ActivityController::class, 'store']);
        ApiRouter::post('/shared/site-profile', [SiteProfileController::class, 'store']);
        ApiRouter::get('/shared/site-profile', [SiteProfileController::class, 'get']);
        ApiRouter::get('/shared/site-images', [SiteImagesController::class, 'get']);
        ApiRouter::post('/shared/site-images', [SiteImagesController::class, 'store']);
        ApiRouter::post('/shared/site-images/clear', [SiteImagesController::class, 'clear']);
        ApiRouter::get('/shared/ping', [SharedDataController::class, 'ping']);
        ApiRouter::get('/shared/partner-plugins', [SharedDataController::class, 'getPartnerPlugins']);
        ApiRouter::post(
            SimplyBookActivation::createAccountRoute(),
            [SimplyBookActivation::class, 'createAccount']
        );
        ApiRouter::post(
            TranslatePressActivation::createAccountRoute(),
            [TranslatePressActivation::class, 'createAccount']
        );
        ApiRouter::post(
            ImagifyActivation::createAccountRoute(),
            [ImagifyActivation::class, 'createAccount']
        );
        ApiRouter::post(
            MetricoolActivation::createAccountRoute(),
            [MetricoolActivation::class, 'createAccount']
        );
    }
);

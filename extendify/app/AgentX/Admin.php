<?php

/**
 * Admin.
 */

namespace Extendify\AgentX;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\PartnerData;
use Extendify\Shared\Services\Iubenda;
use Extendify\Shared\Services\WooProductImages;

/**
 * Serves the agent shell in place of the theme while the agent is open.
 */
class Admin
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const COOKIE = 'ai_agent_admin_open';
    const HANDLE = 'extendify-agentx';
    const CHAT_PARAM = 'extendify-agent-chat';
    const HAND_OFF_PARAM = 'extendify-agent-retry';
    // phpcs:disable Generic.Files.LineLength.TooLong -- inline SVG paths
    const AGENT_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        . '<path d="M17.0909 9.81818L18 7.81818L20 6.90909L18 6L17.0909 4L16.1818 6L14.1818 6.90909L16.1818 7.81818L17.0909 9.81818Z" fill="currentColor"/>'
        . '<path d="M17.0909 14.1818L16.1818 16.1818L14.1818 17.0909L16.1818 18L17.0909 20L18 18L20 17.0909L18 16.1818L17.0909 14.1818Z" fill="currentColor"/>'
        . '<path d="M11.6364 10.1818L9.81818 6.18182L8 10.1818L4 12L8 13.8182L9.81818 17.8182L11.6364 13.8182L15.6364 12L11.6364 10.1818ZM10.5382 12.72L9.81818 14.3055L9.09818 12.72L7.51273 12L9.09818 11.28L9.81818 9.69455L10.5382 11.28L12.1236 12L10.5382 12.72Z" fill="currentColor"/>'
        . '</svg>';
    const PENCIL_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        . '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>'
        . '</svg>';
    const NEW_TAB_ICON = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">'
        . '<path d="M7 1.5h3.5V5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
        . '<path d="M10.5 1.5L5.5 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
        . '<path d="M9.5 7v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1H5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
        . '</svg>';
    const BAR_LINK = 'flex items-center gap-1.5 px-3 text-agentx-inverse-ink no-underline hover:bg-agentx-inverse-hover hover:text-agentx-inverse-accent focus-visible:bg-agentx-inverse-hover focus-visible:text-agentx-inverse-accent';
    // phpcs:enable Generic.Files.LineLength.TooLong
    const PREVIEW_PARAMS = [
        StyleVariations::PARAM,
        ColorSchemes::PARAM,
        FontPairs::PARAM,
        Vibes::PARAM,
        Animations::PARAM,
        Layouts::PARAM,
        Draft::AT_PARAM,
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    private $view = 'normal';

    public function __construct()
    {
        // After the query is parsed, before the admin bar reads its filter.
        \add_action('wp', [$this, 'route']);
        \add_action('admin_init', [$this, 'launchRedirect'], 1);
        \add_filter('rest_attachment_query', [self::class, 'generatedImages'], 10, 2);
        \add_action('admin_enqueue_scripts', [$this, 'enqueueAdmin']);
        \add_action('admin_bar_menu', [$this, 'addAdminButton'], 100);
        \add_action('admin_footer', [$this, 'printAdminRoot']);
        \add_action('admin_menu', [Screens::class, 'remember'], PHP_INT_MAX);
        \add_filter('render_block_data', [Edits\Style::class, 'ownDuotone'], 11, 2);
        \add_filter('render_block_core/site-logo', [Edits\Style::class, 'ownDuotoneOnImage'], 10, 2);
        \add_filter('render_block', [SectionLooks::class, 'render'], 10, 2);
        Refreshes::watch();
        PluginWrites::allow();
        PluginAbilities::register();
        WooProductImages::init();
        new Iubenda();
    }

    /**
     * Whether this wp-admin screen gets the floating agent.
     *
     * @return bool
     */
    public static function floatsHere()
    {
        if (!\is_admin() || \wp_doing_ajax() || !\function_exists('get_current_screen')) {
            return false;
        }

        $screen = \get_current_screen();
        // The editors have no admin bar to open it from, and their canvas isn't the agent's.
        return $screen && !$screen->is_block_editor() && $screen->id !== 'site-editor';
    }

    public function enqueueAdmin()
    {
        if (!self::floatsHere()) {
            return;
        }

        $this->registerAssets([Config::$slug . '-shared-scripts']);
        \wp_add_inline_script(
            self::HANDLE,
            'window.extAgentXData = ' . \wp_json_encode(array_merge(self::notices(), [
                'siteUrl' => self::siteUrl(),
                'conversation' => Conversation::served(),
                'welcomeBack' => Conversation::quiet(),
                'session' => Sessions::current(),
                'settings' => Settings::current(),
                'screens' => Screens::all(),
                'blockTitles' => self::blockTitles(),
                'profile' => Profile::current(),
                'business' => BusinessInfo::current(),
                'samplePhone' => in_array('phone', BusinessInfo::saved()['sample'] ?? [], true),
                'refreshes' => Refreshes::current(),
                'summary' => SiteFacts::summary(),
                'plugins' => Plugins::current(),
                'abilities' => Abilities::discover(),
                'facts' => PluginFacts::current(),
                'design' => self::design(),
            ])),
            'before'
        );
        \wp_enqueue_script(self::HANDLE);
        \wp_enqueue_style(self::HANDLE);
        \wp_add_inline_style(self::HANDLE, self::brandStyle());
    }

    /**
     * Adds the button that opens the floating agent.
     *
     * @param \WP_Admin_Bar $bar The admin bar.
     * @return void
     */
    public function addAdminButton($bar)
    {
        if (!self::floatsHere()) {
            return;
        }

        // translators: Button on the WordPress admin bar that opens the AI Agent over the dashboard.
        $label = \esc_html__('AI Agent', 'extendify-local');
        $bar->add_node([
            'id' => 'extendify-agentx',
            'parent' => 'top-secondary',
            'title' => self::AGENT_ICON . '<span class="ab-label">' . $label . '</span>',
            // Before the script runs, it opens the agent on the site instead.
            'href' => self::siteUrl(),
        ]);
    }

    public function printAdminRoot()
    {
        if (!self::floatsHere()) {
            return;
        }

        echo '<div class="extendify-agentx"><div id="extendify-agentx-admin"></div></div>';
    }

    /**
     * The host's banner colors for the agent's header, unless the banner is white.
     *
     * @return string
     */
    public static function brandStyle()
    {
        return self::hostStyle() . self::tokenStyle();
    }

    private static function hostStyle()
    {
        $banner = \sanitize_hex_color((string) (PartnerData::$colors['backgroundColor'] ?? ''));
        // A white bar on the agent's light surface reads as a stray box.
        if (!$banner || in_array(strtolower($banner), ['#fff', '#ffffff'], true)) {
            return '';
        }

        $ink = \sanitize_hex_color((string) (PartnerData::$colors['foregroundColor'] ?? ''));
        $colors = '--agentx-host-banner:' . $banner . ($ink ? ';--agentx-host-ink:' . $ink : '');
        return ':root{' . $colors . ';--agentx-host-bar:1}';
    }

    /**
     * The partner's agent design, from the Designer. Unlayered, so it outranks the theme's own values.
     *
     * @return string
     */
    private static function tokenStyle()
    {
        $tokens = (self::partnerAgent()['tokens'] ?? []);
        if (!$tokens) {
            return '';
        }

        $declarations = array_map(function ($name, $value) {
            return $name . ':' . $value;
        }, array_keys($tokens), $tokens);
        return '.extendify-agentx{' . implode(';', $declarations) . '}';
    }

    private static function partnerAgent()
    {
        $design = PartnerData::setting('customDesignAgent');
        return is_array($design) ? $design : [];
    }

    /**
     * The partner's choice of templates, logos, spinner and backdrop shader, which the shell starts from.
     *
     * @return array
     */
    private static function design()
    {
        $agent = self::partnerAgent();
        return array_filter([
            'templates' => ($agent['templates'] ?? []),
            'logos' => ($agent['logos'] ?? []),
            'spinner' => ($agent['spinner'] ?? ''),
            'spinnerSource' => ($agent['spinnerSource'] ?? ''),
            'shader' => ($agent['shader'] ?? ''),
        ]) ?: null;
    }

    private static function siteUrl()
    {
        return \add_query_arg(['extendify-agent' => 'open', self::CHAT_PARAM => 'open'], \home_url('/'));
    }

    /**
     * What changed in the build being tried, newest first, one change a line.
     *
     * @return array
     */
    private static function builtChanges()
    {
        if (!constant('EXTENDIFY_DEVMODE') && Config::$partnerId !== 'dkdemo') {
            return [];
        }

        $notes = @file_get_contents(EXTENDIFY_PATH . 'build-note.txt');
        if (!$notes) {
            return [];
        }

        $lines = array_filter(array_map('trim', explode("\n", $notes)));
        return array_values(array_map(
            fn ($line) => mb_substr($line, 0, 160),
            array_slice($lines, 0, 30)
        ));
    }

    private static function notices()
    {
        return [
            'updateWordPress' => WordPressVersion::supported(\get_bloginfo('version')) ? null : [
                'floor' => WordPressVersion::floor(),
                'url' => \current_user_can('update_core') ? \admin_url('update-core.php') : '',
            ],
            'updatePlugin' => PluginUpdate::waiting(EXTENDIFY_PLUGIN_BASENAME, Config::$version),
            'updatePluginUrl' => PluginUpdate::url(),
        ];
    }

    /**
     * Lets the agent's image sheet list only the media library's AI-generated images.
     *
     * @param array            $args    The attachment query.
     * @param \WP_REST_Request $request The media collection request.
     * @return array
     */
    public static function generatedImages($args, $request)
    {
        if (!$request->get_param('extendify_ai_generated')) {
            return $args;
        }

        // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- one indexed key, paged by REST
        $args['meta_query'] = [['key' => 'extendify_ai_generated', 'value' => '1']];
        return $args;
    }

    public function launchRedirect()
    {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- only picks where to land
        if (!isset($_GET['launch-redirect']) || \wp_doing_ajax() || !Config::$launchCompleted) {
            return;
        }

        \wp_safe_redirect(\add_query_arg('extendify-agent', 'open', \home_url('/')));
        exit;
    }

    public function route()
    {
        $request = Router::request();
        $this->view = Router::decide($request);
        // Over the site wherever it shows, never over the agent's own screens.
        if (in_array($this->view, ['normal', 'frame', 'toolbar', 'fallback'], true)) {
            \add_action('wp_enqueue_scripts', [SiteCanvas::class, 'enqueue']);
        }

        if ($this->view === 'normal') {
            return;
        }

        self::noCache(self::vary($this->view, $request['query']));
        if ($this->view === 'frame') {
            $query = $request['query'];
            $preview = (bool) array_intersect_key($query, array_flip(self::PREVIEW_PARAMS));
            // Raw, since the request's text sanitizer strips a signed URL's escapes; the preview checks it.
            // phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- a read-only render for this user, nothing saved
            $logo = isset($_GET[LogoPreview::PARAM]) ? \wp_unslash($_GET[LogoPreview::PARAM]) : null;
            \add_filter('show_admin_bar', '__return_false');
            // The shell runs them; in the frame they only slow every reload.
            \add_filter('extendify_load_shared_scripts', '__return_false');
            \header('Cache-Control: ' . self::frameCache($query, $preview || $logo));
            \header_remove('Expires');
            \header_remove('Pragma');
            // Load can come seconds late, and a click before it skips the link rules.
            \add_action('wp_head', [$this, 'announcePage'], 1);
            // WordPress redirects an empty pick like extendify-colors= to drop its "=", a second request per load.
            if ($preview || isset($query[Draft::PARAM]) || isset($query[Router::FRAME_FETCH])) {
                \add_filter('redirect_canonical', '__return_false');
            }

            if (isset($query[Draft::AT_PARAM])) {
                Draft::showAt((int) $query[Draft::AT_PARAM]);
            }

            if (isset($query[Layouts::PARAM])) {
                Draft::showLayout($query[Layouts::PARAM]);
            }

            BlockIds::stamp();
            ProductParts::mark();
            Draft::show();
            // A first load plays the fade-ins; the shell's reloads would replay them, unless they show one.
            if (($preview || $logo || isset($query[Draft::PARAM])) && !isset($query[Animations::PARAM])) {
                \add_filter('extendable_enable_animations', '__return_false');
            }

            // Without a param the frame shows the draft's pick.
            $draft = Draft::get();
            $colors = $query[ColorSchemes::PARAM] ?? $draft['colors'];
            StyleLayers::preview([
                'variation' => $query[StyleVariations::PARAM] ?? $draft['variation'],
                'colors' => $colors,
                'fonts' => $query[FontPairs::PARAM] ?? $draft['fonts'],
                'vibe' => $query[Vibes::PARAM] ?? $draft['vibe'],
                // Picking another scheme clears the palette's changes, so its preview leaves them off.
                'palette' => $colors === $draft['colors'] ? $draft['palette'] : '',
                // A preview swaps the look only, so a size already changed stays on under it.
                'settings' => $draft['settings'],
                'named' => $draft['named'],
            ]);
            Animations::preview($query[Animations::PARAM] ?? $draft['animation']);
            if (is_string($logo)) {
                LogoPreview::preview($logo);
            }

            return;
        }

        // A page that won't load inside the agent opens on its own, under the same toolbar.
        if ($this->view === 'toolbar' || $this->view === 'fallback') {
            // Themes leave room only while the admin bar shows; ours covers it.
            \add_filter('show_admin_bar', '__return_true');
            \add_action('wp_enqueue_scripts', [$this, 'enqueueStyle']);
            \add_action('wp_body_open', [$this, 'printToolbar']);
            return;
        }

        // Late, so redirects meant for the page run before the shell.
        \add_action('template_redirect', [$this, 'respond'], 999);
    }

    public function respond()
    {
        if (in_array($this->view, ['open', 'close'], true)) {
            $open = $this->view === 'open';
            self::setCookie($open ? (string) \get_current_user_id() : '', $open ? 400 * DAY_IN_SECONDS : 0);
            \wp_safe_redirect(\remove_query_arg('extendify-agent'));
            exit;
        }

        if ($this->view !== 'prerender') {
            self::setCookie((string) \get_current_user_id(), 400 * DAY_IN_SECONDS);
        }

        $this->printShell();
        exit;
    }

    public function enqueueStyle()
    {
        $this->registerAssets();
        \wp_enqueue_style(self::HANDLE);
        \wp_add_inline_style(self::HANDLE, self::brandStyle());
    }

    public function announcePage()
    {
        // A search page's title carries the query from the URL, so no tag may reach the script.
        $page = \wp_json_encode(self::pageInView(), JSON_HEX_TAG);
        $translated = Translations::plugin();
        \wp_print_inline_script_tag(
            'window.extAgentXDuotones = ' . \wp_json_encode(Presets::duotones(), JSON_HEX_TAG) . ';'
            . ($translated ? 'window.extAgentXTranslatedBy = ' . \wp_json_encode($translated) . ';' : '')
            . 'window.extAgentXPage = ' . $page . ';'
            . 'window.frameElement?.dispatchEvent(new Event("extendify-agentx-page"));'
        );
    }

    private static function pageInView()
    {
        $post = \get_queried_object();
        $post = $post instanceof \WP_Post ? $post : null;
        $title = $post ? self::plain(\wp_strip_all_tags($post->post_title)) : '';
        return [
            'id' => \get_queried_object_id() ?: null,
            'type' => $post ? $post->post_type : null,
            'kind' => self::pageKind(),
            'title' => $title !== '' ? $title : self::plain(\wp_get_document_title()),
        ];
    }

    private static function plain($text)
    {
        return html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    private static function pageKind()
    {
        if (\is_front_page()) {
            return 'homepage';
        }

        if (\is_home()) {
            return 'blog';
        }

        if (\function_exists('is_shop') && \is_shop()) {
            return 'shop';
        }

        if (\function_exists('is_product') && \is_product()) {
            return 'product';
        }

        return \is_archive() || \is_search() ? 'archive' : null;
    }

    public function printToolbar()
    {
        $post = \get_queried_object();
        $edit = $post instanceof \WP_Post ? \get_edit_post_link($post->ID) : '';
        // phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- constant markup
        // phpcs:disable Generic.Files.LineLength.TooLong -- class lists in markup
        ?>
<div class="extendify-agentx">
    <nav
        id="extendify-agentx-toolbar"
        class="fixed inset-x-0 top-0 z-99999 flex h-11.5 items-stretch justify-between bg-agentx-inverse font-agentx text-[13px] leading-none text-agentx-inverse-ink md:h-8"
        aria-label="<?php echo \esc_attr__('AI Agent', 'extendify-local'); ?>">
        <a
            id="extendify-agentx-open"
            href="<?php echo \esc_url(\add_query_arg(['extendify-agent' => 'open', self::CHAT_PARAM => 'open'])); ?>"
            class="<?php echo self::BAR_LINK; ?>">
            <?php echo self::AGENT_ICON; ?>
            <?php
            // translators: Link on the toolbar atop the website that opens the AI Agent.
            echo \esc_html__('AI Agent', 'extendify-local');
            ?>
        </a>
        <div class="flex items-stretch">
            <?php if ($edit) : ?>
                <a href="<?php echo \esc_url($edit); ?>" target="_blank" rel="noopener noreferrer" class="<?php echo self::BAR_LINK; ?>">
                    <?php echo self::PENCIL_ICON; ?>
                    <?php
                    // translators: Link on the toolbar atop the website that opens this page in the WordPress block editor.
                    echo \esc_html__('Block Editor', 'extendify-local');
                    ?>
                    <?php echo self::NEW_TAB_ICON; ?>
                    <span class="sr-only"><?php echo \esc_html__('(opens in a new tab)', 'extendify-local'); ?></span>
                </a>
            <?php endif; ?>
            <a href="<?php echo \esc_url(\admin_url()); ?>" target="_blank" rel="noopener noreferrer" class="<?php echo self::BAR_LINK; ?>">
                <?php
                // translators: Link on the toolbar atop the website that opens the WordPress dashboard.
                echo \esc_html__('WP Admin', 'extendify-local');
                ?>
                <?php echo self::NEW_TAB_ICON; ?>
                <span class="sr-only"><?php echo \esc_html__('(opens in a new tab)', 'extendify-local'); ?></span>
            </a>
        </div>
    </nav>
</div>
        <?php
        // phpcs:enable Generic.Files.LineLength.TooLong
        // phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
        \wp_print_inline_script_tag(\wp_json_encode([
            'prerender' => [[
                'source' => 'document',
                'where' => ['selector_matches' => '#extendify-agentx-open'],
                'eagerness' => 'moderate',
            ]],
        ]), ['type' => 'speculationrules']);
    }

    public static function vary($view, array $query)
    {
        // Sec-Fetch-Dest: the site frame's page and the shell share an address.
        // Cookie: a page cached before a draft change, a login or a logout isn't reused.
        $versioned = isset($query[Draft::PARAM]) || array_intersect_key($query, array_flip(self::PREVIEW_PARAMS));
        // A preview's address names the draft version, and other plugins' cookies change on every page.
        return $view === 'frame' && $versioned ? 'Sec-Fetch-Dest' : 'Cookie, Sec-Fetch-Dest';
    }

    // Private, so a warmed copy serves this user's click; a preview stays warm while compared.
    public static function frameCache(array $query, $warm)
    {
        // A request's later edits join its change, so the change's address renders new content.
        if (isset($query[Draft::AT_PARAM])) {
            return 'no-store';
        }

        return 'private, max-age=' . ($warm ? 300 : 15);
    }

    private static function noCache($vary)
    {
        // A cached shell or frame would reach visitors at the same URL.
        if (!defined('DONOTCACHEPAGE')) {
            // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound -- read by page caches
            define('DONOTCACHEPAGE', true);
        }

        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- LiteSpeed Cache's own hook
        \do_action('litespeed_control_set_nocache', 'Extendify agent view');
        \header('Vary: ' . $vary, false);
    }

    private static function setCookie($value, $maxAge)
    {
        // setcookie() takes no SameSite before PHP 7.3.
        \header(sprintf(
            'Set-Cookie: %s=%s; Max-Age=%d; Path=%s; SameSite=Lax; HttpOnly%s',
            self::COOKIE,
            rawurlencode($value),
            $maxAge,
            COOKIEPATH,
            \is_ssl() ? '; Secure' : ''
        ), false);
    }

    private function registerAssets($deps = [])
    {
        $version = constant('EXTENDIFY_DEVMODE') ? uniqid() : Config::$version;
        $build = EXTENDIFY_BASE_URL . 'public/build/';
        $assetPath = EXTENDIFY_PATH . 'public/build/' . Config::$assetManifest['extendify-agentx.php'];
        $asset = file_exists($assetPath) ? require $assetPath : ['dependencies' => [], 'version' => $version];

        // The shell prints only its own handles, so the chunks load as their dependencies.
        $chunks = [];
        foreach (['extendify-vendors', 'extendify-common', 'extendify-runtime'] as $chunk) {
            if (!isset(Config::$assetManifest[$chunk . '.js'])) {
                continue;
            }

            // wp-admin loads the runtime under Shared's handle, and a second copy runs every entry twice.
            $shared = Config::$slug . '-runtime-scripts';
            $handle = $chunk === 'extendify-runtime' && \wp_script_is($shared, 'registered') ? $shared : $chunk;
            if (!\wp_script_is($handle, 'registered')) {
                \wp_register_script($handle, $build . Config::$assetManifest[$chunk . '.js'], $chunks, $version, true);
            }

            $chunks[] = $handle;
        }

        \wp_register_script(
            self::HANDLE,
            $build . Config::$assetManifest['extendify-agentx.js'],
            array_merge($chunks, $asset['dependencies'], $deps),
            $asset['version'],
            true
        );
        \wp_set_script_translations(self::HANDLE, 'extendify-local', EXTENDIFY_PATH . 'languages/js');
        \wp_register_style(
            self::HANDLE,
            $build . Config::$assetManifest['extendify-agentx.css'],
            [],
            $asset['version']
        );
    }

    /**
     * Each registered block's title, which WordPress has already put in the site's language.
     *
     * @return array<string, string>
     */
    private static function blockTitles()
    {
        $titles = [];
        foreach (\WP_Block_Type_Registry::get_instance()->get_all_registered() as $name => $type) {
            if (is_string($type->title) && $type->title !== '') {
                $titles[$name] = $type->title;
            }
        }
        return $titles;
    }

    private function printShell()
    {
        $this->registerAssets();
        \wp_add_inline_script(
            self::HANDLE,
            'window.extAgentXData = ' . \wp_json_encode(array_merge([
                'leaveUrls' => [\admin_url(), \wp_login_url()],
                // The frame's own params, like a preview's, would carry over from the address bar.
                'dropParams' => array_merge(
                    ['extendify-agent', self::CHAT_PARAM, self::HAND_OFF_PARAM, Draft::AT_PARAM],
                    Router::OPEN_PARAMS
                ),
                'showsSite' => $this->view !== 'warning',
                'variations' => StyleVariations::all(),
                // The site may have changed in wp-admin while the agent was closed.
                'draft' => Draft::run(null),
                'animations' => Animations::available(),
                'layouts' => Layouts::available(),
                'shapes' => Shapes::names(),
                // AutoLaunch opens the agent with this on the first load after a build.
                // phpcs:ignore WordPress.Security.NonceVerification.Recommended
                'guide' => Guide::current() + ['welcome' => isset($_GET['extendify-launch-success'])],
                'storeGuide' => StoreGuide::current(),
                'domainSearchUrl' => PartnerData::setting('domainSearchURL'),
                'domainTask' => (bool) PartnerData::setting('showDomainTask'),
                'stagingSites' => array_map('esc_attr', (array) PartnerData::setting('stagingSites')),
                'conversation' => Conversation::served(),
                'welcomeBack' => Conversation::quiet(),
                'session' => Sessions::current(),
                'settings' => Settings::current(),
                'screens' => Screens::all(),
                'blockTitles' => self::blockTitles(),
                'profile' => Profile::current(),
                'business' => BusinessInfo::current(),
                'samplePhone' => in_array('phone', BusinessInfo::saved()['sample'] ?? [], true),
                'refreshes' => Refreshes::current(),
                'summary' => SiteFacts::summary(),
                'presets' => Presets::current(),
                'plugins' => Plugins::current(),
                'abilities' => Abilities::discover(),
                'facts' => PluginFacts::current(),
                // The dev tool is for devmode and the demo partner only.
                'devTool' => constant('EXTENDIFY_DEVMODE') || Config::$partnerId === 'dkdemo',
                // A preview's testers need to know how old the build they're trying is.
                'builtAt' => constant('EXTENDIFY_DEVMODE') || Config::$partnerId === 'dkdemo'
                    ? (int) @filemtime(EXTENDIFY_PATH . 'public/build/manifest.json')
                    : 0,
                'builtChanges' => self::builtChanges(),
                'design' => self::design(),
            ], self::notices())),
            'before'
        );
        \wp_add_inline_style(self::HANDLE, self::brandStyle());
        // Shared registers its bundle here; its launch-success handling must run in the shell.
        \wp_enqueue_scripts();
        ?>
<!doctype html>
<html <?php \language_attributes(); ?>>
<head>
<meta charset="<?php \bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?php echo \esc_html(\wp_get_document_title()); ?></title>
        <?php \wp_print_styles([self::HANDLE, Config::$slug . '-shared-common-styles']); ?>
</head>
<body class="extendify-agentx">
<div id="extendify-agentx-shell" class="extendify-agentx-surface fixed inset-0"></div>
        <?php
        // The shell skips wp_head, so without this its scripts call the production backends.
        \Extendify\Constants::printOverriddenHosts();
        \wp_print_scripts([Config::$slug . '-shared-scripts', self::HANDLE]);
        // The shell skips wp_footer; hosts that print footer markup hook this.
        \do_action('extendify_agentx_footer');
        ?>
</body>
</html>
        <?php
    }
}

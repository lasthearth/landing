import { Routes } from '@angular/router';
import { RouteKeys } from './enums/route-keys';
import { routeSeoData } from './seo-data';
import { adminGuard } from '../core/guards/admin.guard';
import { userGuard } from '../core/guards/user.guard';
import { loadPage } from '@core/i18n';

/**
 * Роуты приложения.
 *
 * Каждая страница подключена через `loadComponent`: при статических импортах
 * в начальный бандл попадали правила, юридические страницы и админка целиком,
 * хотя первый экран их не показывает. Вместе со страницей приезжает её словарь
 * переводов — см. `loadPage`.
 */
export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('../features/landing/landing.component').then((m) => m.LandingComponent),
        children: [
            {
                path: '',
                loadComponent: () =>
                    loadPage(
                        () => import('../features/home/home.component').then((m) => m.HomeComponent),
                        [() => import('@core/i18n/translations/features/home.i18n').then((m) => m.HOME_I18N)]
                    ),
                data: { route_keys: RouteKeys.home, seo: routeSeoData.home },
            },
            {
                path: 'home',
                loadComponent: () =>
                    loadPage(
                        () => import('../features/home/home.component').then((m) => m.HomeComponent),
                        [() => import('@core/i18n/translations/features/home.i18n').then((m) => m.HOME_I18N)]
                    ),
                data: { route_keys: RouteKeys.home, seo: routeSeoData.home },
            },
            {
                path: 'rules',
                loadComponent: () =>
                    loadPage(
                        () => import('../features/rules/rules.component').then((m) => m.RulesComponent),
                        [() => import('@core/i18n/translations/features/rules.i18n').then((m) => m.RULES_I18N)]
                    ),
                data: { route_keys: RouteKeys.rules, seo: routeSeoData.rules },
            },
            {
                path: 'profile',
                loadComponent: () =>
                    loadPage(
                        () => import('../features/profile/profile.component').then((m) => m.ProfileComponent),
                        [
                            () => import('@core/i18n/translations/features/profile.i18n').then((m) => m.PROFILE_I18N),
                            () =>
                                import('@core/i18n/translations/features/settlements.i18n').then(
                                    (m) => m.SETTLEMENTS_I18N
                                ),
                        ]
                    ),
                canActivate: [userGuard],
                data: { route_keys: RouteKeys.profile, seo: routeSeoData.profile },
                children: [
                    { path: '', redirectTo: 'how-play', pathMatch: 'full' },
                    {
                        path: 'stats',
                        loadComponent: () =>
                            import('../features/profile/statistics/statistics.component').then(
                                (m) => m.StatisticsComponent
                            ),
                        data: { route_keys: RouteKeys.stats, seo: routeSeoData.profile },
                    },
                    {
                        path: 'how-play',
                        loadComponent: () =>
                            import('../features/profile/how-play/how-play.component').then((m) => m.HowPlayComponent),
                        data: { route_keys: RouteKeys.howPlay, seo: routeSeoData.startGame },
                    },
                    {
                        path: 'settlement',
                        loadComponent: () =>
                            import('../features/settlements/settlement/settlement.component').then(
                                (m) => m.SettlementComponent
                            ),
                        data: { route_keys: RouteKeys.settlement, seo: routeSeoData.profile },
                    },
                    {
                        path: 'referral',
                        loadComponent: () =>
                            loadPage(
                                () => import('@features/referral').then((m) => m.ReferralWidgetComponent),
                                [
                                    () =>
                                        import('@core/i18n/translations/features/referral.i18n').then(
                                            (m) => m.REFERRAL_I18N
                                        ),
                                ]
                            ),
                        data: { route_keys: RouteKeys.referral, seo: routeSeoData.profile },
                    },
                    {
                        path: 'admin',
                        loadComponent: () =>
                            loadPage(
                                () => import('../features/admin/admin.component').then((m) => m.AdminComponent),
                                [
                                    () =>
                                        import('@core/i18n/translations/features/admin.i18n').then((m) => m.ADMIN_I18N),
                                ]
                            ),
                        canActivate: [adminGuard],
                        data: { route_keys: RouteKeys.admin, seo: routeSeoData.profile },
                    },
                ],
            },
            {
                path: 'start-game',
                loadComponent: () =>
                    import('../features/start-game/start-game.component').then((m) => m.StartGameComponent),
                data: { route_keys: RouteKeys.startGame, seo: routeSeoData.startGame },
            },
            {
                path: 'market',
                loadComponent: () =>
                    loadPage(
                        () => import('../features/market/market.component').then((m) => m.MarketComponent),
                        [() => import('@core/i18n/translations/features/market.i18n').then((m) => m.MARKET_I18N)]
                    ),
                data: { route_keys: RouteKeys.market, seo: routeSeoData.market },
            },
            {
                path: 'privacy-policy',
                loadComponent: () =>
                    loadPage(
                        () =>
                            import('../features/privacy-policy/privacy-policy.component').then(
                                (m) => m.PrivacyPolicyComponent
                            ),
                        [() => import('@core/i18n/translations/features/legal.i18n').then((m) => m.LEGAL_I18N)]
                    ),
                data: { route_keys: RouteKeys.privacyPolicy, seo: routeSeoData.privacyPolicy },
            },
            {
                path: 'public-offer',
                loadComponent: () =>
                    loadPage(
                        () =>
                            import('../features/public-offer/public-offer/public-offer.component').then(
                                (m) => m.PublicOfferComponent
                            ),
                        [() => import('@core/i18n/translations/features/legal.i18n').then((m) => m.LEGAL_I18N)]
                    ),
                data: { route_keys: RouteKeys.publicOffer, seo: routeSeoData.publicOffer },
            },
            {
                path: 'faq',
                loadComponent: () =>
                    loadPage(
                        () => import('../features/faq/faq.component').then((m) => m.FaqComponent),
                        [() => import('@core/i18n/translations/features/faq.i18n').then((m) => m.FAQ_I18N)]
                    ),
                data: { route_keys: RouteKeys.faq, seo: routeSeoData.faq },
            },
            {
                path: 'settlements',
                loadComponent: () =>
                    loadPage(
                        () => import('../features/settlements/settlements.component').then((m) => m.SettlementsComponent),
                        [
                            () =>
                                import('@core/i18n/translations/features/settlements.i18n').then(
                                    (m) => m.SETTLEMENTS_I18N
                                ),
                        ]
                    ),
                data: { route_keys: RouteKeys.settlements, seo: routeSeoData.settlements },
            },
            {
                path: 'gallery',
                loadComponent: () =>
                    loadPage(
                        () => import('../features/gallery/gallery.component').then((m) => m.GalleryComponent),
                        [() => import('@core/i18n/translations/features/gallery.i18n').then((m) => m.GALLERY_I18N)]
                    ),
                data: { route_keys: RouteKeys.gallery, seo: routeSeoData.gallery },
            },
            {
                path: 'videos',
                loadComponent: () =>
                    import('../features/videos/ui/videos-page/videos-page.component').then(
                        (m) => m.VideosPageComponent
                    ),
                data: { route_keys: RouteKeys.videos, seo: routeSeoData.videos },
            },
            {
                path: 'diplomacy',
                loadComponent: () =>
                    loadPage(
                        () =>
                            import('../features/diplomacy/diplomacy-page.component').then(
                                (m) => m.DiplomacyPageComponent
                            ),
                        [
                            () =>
                                import('@core/i18n/translations/features/diplomacy.i18n').then((m) => m.DIPLOMACY_I18N),
                        ]
                    ),
                data: { route_keys: RouteKeys.diplomacy, seo: routeSeoData.diplomacy },
            },
            {
                path: 'unauthorized',
                redirectTo: '/home',
                pathMatch: 'full',
            },
            {
                path: '**',
                loadComponent: () =>
                    import('../features/not-found/not-found.component').then((m) => m.NotFoundComponent),
                data: { seo: routeSeoData.notFound },
            },
        ],
    },
];

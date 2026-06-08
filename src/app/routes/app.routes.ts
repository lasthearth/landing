import { Routes } from '@angular/router';
import { LandingComponent } from '../features/landing/landing.component';
import { RulesComponent } from '../features/rules/rules.component';
import { HomeComponent } from '../features/home/home.component';
import { RouteKeys } from './enums/route-keys';
import { ProfileComponent } from '../features/profile/profile.component';
import { AdminComponent } from '../features/admin/admin.component';
import { adminGuard } from '../core/guards/admin.guard';
import { StatisticsComponent } from '../features/profile/statistics/statistics.component';
import { HowPlayComponent } from '../features/profile/how-play/how-play.component';
import { StartGameComponent } from '../features/start-game/start-game.component';
import { userGuard } from '../core/guards/user.guard';
import { SettlementComponent } from '../features/settlements/settlement/settlement.component';
import { PrivacyPolicyComponent } from '../features/privacy-policy/privacy-policy.component';
import { PublicOfferComponent } from '../features/public-offer/public-offer/public-offer.component';
import { FaqComponent } from '../features/faq/faq.component';
import { SettlementsComponent } from '../features/settlements/settlements.component';
import { MarketComponent } from '../features/market/market.component';

export const routes: Routes = [
    {
        path: '',
        component: LandingComponent,
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            {
                path: 'home',
                component: HomeComponent,
                data: { route_keys: RouteKeys.home },
            },
            {
                path: 'rules',
                component: RulesComponent,
                data: { route_keys: RouteKeys.rules },
            },
            {
                path: 'profile',
                component: ProfileComponent,
                canActivate: [userGuard],
                data: { route_keys: RouteKeys.profile },
                children: [
                    { path: '', redirectTo: 'how-play', pathMatch: 'full' },
                    {
                        path: 'stats',
                        component: StatisticsComponent,
                        data: { route_keys: RouteKeys.stats },
                    },
                    {
                        path: 'how-play',
                        component: HowPlayComponent,
                        data: { route_keys: RouteKeys.howPlay },
                    },
                    {
                        path: 'settlement',
                        component: SettlementComponent,
                        data: { route_keys: RouteKeys.settlement },
                    },
                    {
                        path: 'admin',
                        component: AdminComponent,
                        canActivate: [adminGuard],
                        data: { route_keys: RouteKeys.admin },
                    },
                ],
            },
            {
                path: 'start-game',
                component: StartGameComponent,
                data: { route_keys: RouteKeys.startGame },
            },
            {
                path: 'market',
                component: MarketComponent,
                data: { route_keys: RouteKeys.market },
            },
            {
                path: 'privacy-policy',
                component: PrivacyPolicyComponent,
                data: { route_keys: RouteKeys.privacyPolicy },
            },
            {
                path: 'public-offer',
                component: PublicOfferComponent,
                data: { route_keys: RouteKeys.publicOffer },
            },
            {
                path: 'faq',
                component: FaqComponent,
                data: { route_keys: RouteKeys.faq },
            },
            {
                path: 'settlements',
                canActivate: [userGuard],
                component: SettlementsComponent,
                data: { route_keys: RouteKeys.settlements },
            },
            {
                path: 'unauthorized',
                redirectTo: '/home',
                pathMatch: 'full',
            },
        ],
    },
];

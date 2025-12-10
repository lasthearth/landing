import { Routes } from '@angular/router';
import { LandingComponent } from '../landing/landing.component';
import { RulesComponent } from '../rules/rules.component';
import { HomeComponent } from '../home/home.component';
import { RouteKeys } from './enums/route-keys';
import { ProfileComponent } from '../profile/profile.component';
import { AdminComponent } from '../profile/admin/admin.component';
import { adminGuard } from '../guards/admin.guard';
import { StatisticsComponent } from '../profile/statistics/statistics.component';
import { HowPlayComponent } from '../profile/how-play/how-play.component';
import { StartGameComponent } from '../start-game/start-game.component';
import { userGuard } from '../guards/user.guard';
import { SettlementComponent } from '../settlements/settlement/settlement.component';
import { PrivacyPolicyComponent } from '../privacy-policy/privacy-policy.component';
import { PublicOfferComponent } from '../public-offer/public-offer/public-offer.component';
import { FaqComponent } from '../faq/faq.component';
import { SettlementsComponent } from '../settlements/settlements.component';
import { MarketComponent } from '../../market/market.component';

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
        ],
    },
];

import { Routes } from "@angular/router";
import { LandingComponent } from "../landing/landing.component";
import { RulesComponent } from "../rules/rules.component";
import { HomeComponent } from "../home/home.component";
import { TitlesComponent } from "../titles/titles.component";
import { MarketComponent } from "../market/market.component";
import { RouteKeys } from "./enums/route-keys";
import { ProfileComponent } from "../profile/profile.component";
import { AdminComponent } from "../admin/admin.component";
import { adminGuard } from "../guards/admin.guard";

export const routes: Routes = [
    {
        path: "",
        component: LandingComponent,
        children: [
            { path: "", redirectTo: "home", pathMatch: "full" },
            {
                path: "home",
                component: HomeComponent,
                data: { route_keys: RouteKeys.home },
            },
            {
                path: "rules",
                component: RulesComponent,
                data: { route_keys: RouteKeys.rules },
            },
            {
                path: "titles",
                component: TitlesComponent,
            },
            {
                path: "market",
                component: MarketComponent,
                data: { route_keys: RouteKeys.market },
            },
            {
                path: "profile",
                component: ProfileComponent,
                data: { route_keys: RouteKeys.profile },
            },
            {
                path: "admin",
                component: AdminComponent,
                canActivate: [adminGuard],
                data: { route_keys: RouteKeys.admin },
            }
        ],
    },
];

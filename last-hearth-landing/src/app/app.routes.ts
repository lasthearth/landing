import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { NewsDetailedComponent } from './news/news-detailed/news-detailed.component';
import { RulesComponent } from './rules/rules.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
    {
        path: 'home',
        component: LandingComponent,
        children: [
            { path: '', component: HomeComponent },
            { path: 'rules', component: RulesComponent }
        ]
    },
    { path: '', redirectTo: 'home', pathMatch: 'full' },
]

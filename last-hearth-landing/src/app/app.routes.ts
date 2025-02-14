import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { NewsDetailedComponent } from './news/news-detailed/news-detailed.component';

export const routes: Routes = [
    {
        path: 'home',
        component: LandingComponent,
    },
    { path: 'home/news/:id', component: NewsDetailedComponent },
    {path: '', redirectTo: 'home', pathMatch: 'full' }
]

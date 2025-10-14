import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import rybbit from '@rybbit/js';

rybbit.init({
    analyticsHost: 'https://app.rybbit.io/api',
    siteId: '27f3b1f62317',
    autoTrackPageviews: true,
    autoTrackSpaRoutes: true
});

bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err));

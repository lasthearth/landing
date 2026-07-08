import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/core/config/app.config';
import { AppComponent } from './app/app.component';

console.log('[ENV] DISCORD_BOT_TOKEN length:', process.env['DISCORD_BOT_TOKEN']?.length ?? 0);

bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err));

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';
import { RuleSectionComponent } from '@app/features/rules/ui/rule-section/rule-section.component';
import { BaseScrollableComponent } from '@app/features/rules/abstracts/base-scrollable.component';
import { HomesteadComponent } from './components/homestead/homestead.component';
import { CampComponent } from './components/camp/camp.component';
import { PatrimonyComponent } from './components/patrimony/patrimony.component';
import { BaronyComponent } from './components/barony/barony.component';
import { CountyComponent } from './components/county/county.component';
import { MargraviateComponent } from './components/margraviate/margraviate.component';
import { ExclaveCenterComponent } from './components/exclave-center/exclave-center.component';
import { GuildComponent } from './components/guild/guild.component';

/**
 * Подраздел «2.1 Типы и статусы»: иммунитет нового надела и все типы наделов.
 *
 * Заголовки подразделов — в словаре `rules.i18n.ts` (`rules.content.titles`).
 */
@Component({
    selector: 'app-types-and-statuses',
    templateUrl: './types-and-statuses.component.html',
    imports: [
        RuleParagraphComponent,
        RuleSectionComponent,
        HomesteadComponent,
        CampComponent,
        PatrimonyComponent,
        BaronyComponent,
        CountyComponent,
        MargraviateComponent,
        ExclaveCenterComponent,
        GuildComponent,
        TranslatePipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypesAndStatusesComponent extends BaseScrollableComponent {}

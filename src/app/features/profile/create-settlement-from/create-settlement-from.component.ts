import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { SETTLEMENT_TYPE, SettlementTypeValue } from '@entities/settlement';
import { TranslatePipe } from '@core/i18n';
import { CampFormComponent } from './settlements-types-forms/camp-form/camp-form.component';
import { VillageFormComponent } from './settlements-types-forms/village-form/village-form.component';
import { RegionFormComponent } from './settlements-types-forms/region-form/region-form.component';
import { CityFormComponent } from './settlements-types-forms/city-form/city-form.component';
import { TownshipFormComponent } from './settlements-types-forms/township-form/township-form.component';
import { GuildFormComponent } from './settlements-types-forms/guild-form/guild-form.component';

@Component({
    standalone: true,
    selector: 'app-create-settlement',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        CampFormComponent,
        VillageFormComponent,
        RegionFormComponent,
        CityFormComponent,
        TownshipFormComponent,
        GuildFormComponent,
        TranslatePipe,
    ],
    templateUrl: './create-settlement-from.component.html',
    styleUrl: './create-settlement-from.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateSettlementFormComponent {
    /**
     * Контекст открытого диалогового окна.
     *
     * `level` — текущая ступень надела (тип из ответа API): диалог показывает
     * форму следующей ступени. {@link SETTLEMENT_TYPE.unspecified} означает,
     * что надела ещё нет, и открывает форму лагеря.
     */
    protected readonly context: TuiDialogContext<void, { level: SettlementTypeValue }> = inject<
        TuiDialogContext<void, { level: SettlementTypeValue }>
    >(POLYMORPHEUS_CONTEXT);

    /**
     * Значения типа надела из API — для выбора формы в шаблоне.
     */
    protected readonly settlementType: typeof SETTLEMENT_TYPE = SETTLEMENT_TYPE;
}

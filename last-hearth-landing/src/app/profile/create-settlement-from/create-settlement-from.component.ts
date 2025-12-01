import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TuiDialogContext } from '@taiga-ui/core';
import { TuiFiles } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { SettlementsTypes } from '@app/services/enums/settlements-types';
import { CampFormComponent } from './settlements-types-forms/camp-form/camp-form.component';
import { VillageFormComponent } from './settlements-types-forms/village-form/village-form.component';
import { RegionFormComponent } from './settlements-types-forms/region-form/region-form.component';
import { CityFormComponent } from './settlements-types-forms/city-form/city-form.component';
import { TownshipFormComponent } from './settlements-types-forms/township-form/township-form.component';
/**
 * Ключ файла-изображения.
 */

@Component({
    standalone: true,
    selector: 'app-create-settlement',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        TuiFiles,
        CampFormComponent,
        VillageFormComponent,
        RegionFormComponent,
        CityFormComponent,
        TownshipFormComponent,
    ],
    templateUrl: './create-settlement-from.component.html',
    styleUrl: './create-settlement-from.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateSettlementFormComponent {
    /**
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext<void, { level: SettlementsTypes }> =
        inject<TuiDialogContext<void, { level: SettlementsTypes }>>(POLYMORPHEUS_CONTEXT);
    protected readonly settlementsTypes: typeof SettlementsTypes = SettlementsTypes;
}

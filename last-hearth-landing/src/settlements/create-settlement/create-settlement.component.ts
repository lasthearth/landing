import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { TuiIcon, TuiSelect, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiTooltip } from '@taiga-ui/kit';

@Component({
    standalone: true,
    selector: 'app-create-settlement',
    imports: [
        FormsModule,
        NgIf,
        TuiChevron,
        TuiDataListWrapper,
        TuiIcon,
        TuiSelect,
        TuiTextfield,
        TuiTooltip,
    ],
    templateUrl: './create-settlement.component.html',
    styleUrls: ['./create-settlement.component.css']
})
export class CreateSettlementComponent {
    protected readonly users = [
        'Dmitriy Demenskiy',
        'Alex Inkin',
        'Vladimir Potekhin',
        'Nikita Barsukov',
        'Maxim Ivanov',
        'German Panov',
    ];

    protected value: string | null = null;

}

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiExpand, TuiIcon } from '@taiga-ui/core';

@Component({
    standalone: true,
    selector: 'app-privacy-policy',
    imports: [TuiIcon, NgClass, TuiExpand],
    templateUrl: './privacy-policy.component.html',
    styleUrl: './privacy-policy.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyComponent {
    protected isBase: boolean = false;
    protected isPersonalInformation: boolean = false;
    protected isPurposes: boolean = false;
    protected isLegalGrounds: boolean = false;
    protected isProcedure: boolean = false;
    protected isSecurityMeasures: boolean = false;
    protected isFinalProvisions: boolean = false;
}

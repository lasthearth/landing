import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiIcon, TuiExpand } from '@taiga-ui/core';

@Component({
    selector: 'app-public-offer',
    imports: [TuiIcon, NgClass, TuiExpand],
    templateUrl: './public-offer.component.html',
    styleUrl: './public-offer.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicOfferComponent {
    protected isTerms: boolean = false;
    protected isGeneralProvisions: boolean = false;
    protected isRightsAndObligations: boolean = false;
    protected isResponsibility: boolean = false;
    protected isTermsOfReturn: boolean = false;
    protected isPersonalData: boolean = false;
    protected isLegislation: boolean = false;
    protected isRequisites: boolean = false;
}

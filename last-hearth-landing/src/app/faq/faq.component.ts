import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiExpand, TuiIcon } from '@taiga-ui/core';

@Component({
    selector: 'app-faq',
    imports: [TuiExpand, TuiIcon, CommonModule],
    templateUrl: './faq.component.html',
    styleUrl: './faq.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqComponent {
    protected isAboutServer: boolean = false;
    protected isHowToPlay: boolean = false;
    protected isRegistration: boolean = false;
    protected isTroubles: boolean = false;
    protected isSeason: boolean = false;
    protected isHowToStart: boolean = false;
    protected isDocsAndSuzerain: boolean = false;
    protected isSettlements: boolean = false;
    protected isBagsOrViolation: boolean = false;
    protected isDeathOrTheft: boolean = false;
    protected isSettlementRegistration: boolean = false;
    protected isMoney: boolean = false;
    protected isOffer: boolean = false;
    protected isTeam: boolean = false;
}

import { Component, inject } from '@angular/core';
import { TitleCardComponent } from './title-card/title-card.component';
import { TitlesService } from '../services/titles.service';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { VerificationComponent } from '../verification/verification.component';
import { HowToBuyComponent } from './how-to-buy/how-to-buy/how-to-buy.component';

@Component({
    standalone: true,
    selector: 'app-titles',
    imports: [TitleCardComponent, RouterOutlet, RouterLink],
    templateUrl: './titles.component.html',
    styleUrl: './titles.component.less',
})
export class TitlesComponent {
    /**
     * Список титулов.
     */
    protected readonly titles = inject(TitlesService).titles;

    private readonly router = inject(Router);

    private readonly dialogs = inject(TuiDialogService);

    protected howBuyTitle() {
        this.dialogs.open(new PolymorpheusComponent(HowToBuyComponent), { size: 'l' }).subscribe();
    }
}

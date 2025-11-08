import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TitlesService } from '../../../services/titles.service';
import { GameItemCardComponent } from '../../game-item-card/game-item-card/game-item-card.component';

@Component({
    selector: 'app-warrior-title',
    imports: [GameItemCardComponent],
    templateUrl: './warrior-title.component.html',
    styleUrl: './warrior-title.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarriorTitleComponent {
    protected readonly gameItems = inject(TitlesService).warriorGameItems;
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TitlesService } from '../../../services/titles.service';
import { GameItemCardComponent } from '../../game-item-card/game-item-card/game-item-card.component';

@Component({
    selector: 'app-graph-title',
    imports: [GameItemCardComponent, TuiIcon],
    templateUrl: './graph-title.component.html',
    styleUrl: './graph-title.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphTitleComponent {
    protected readonly gameItems = inject(TitlesService).graphGameItems;
}

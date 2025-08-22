import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TitlesService } from '../../../services/titles.service';
import { GameItemCardComponent } from '../../game-item-card/game-item-card/game-item-card.component';

@Component({
    selector: 'app-explorer-title',
    imports: [GameItemCardComponent, TuiIcon],
    templateUrl: './explorer-title.component.html',
    styleUrl: './explorer-title.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorerTitleComponent {
    protected readonly gameItems = inject(TitlesService).explorerGameItems;
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { GameItemCardComponent } from '../../game-item-card/game-item-card/game-item-card.component';
import { TitlesService } from '../../../services/titles.service';

@Component({
    selector: 'app-builder-title',
    imports: [GameItemCardComponent, TuiIcon],
    templateUrl: './builder-title.component.html',
    styleUrl: './builder-title.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuilderTitleComponent {
    protected readonly gameItems = inject(TitlesService).builderGameItems;
}

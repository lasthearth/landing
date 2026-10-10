import { ChangeDetectionStrategy, Component, computed, input, InputSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlayerAvatarComponent } from '@entities/player-style';
import { TranslatePipe, AmountPipe } from '@core/i18n';

/**
 * Колонка пьедестала рейтинга (топ-3): игрок на ступени со своим местом.
 * Цвет кольца и ступени — по медали (золото, серебро, бронза).
 */
@Component({
    standalone: true,
    selector: 'app-leader-card',
    imports: [AmountPipe, RouterLink, PlayerAvatarComponent, TranslatePipe],
    templateUrl: './leader-card.component.html',
    styleUrl: './leader-card.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderCardComponent {
    /**
     * Ник игрока (ссылка на его страницу).
     */
    public playerName: InputSignal<string> = input.required<string>();

    /**
     * Место в рейтинге: «1», «2» или «3».
     */
    public ratingPlace: InputSignal<string> = input.required<string>();

    /**
     * Подпись показателя («смертей», «часов», «убийств»).
     */
    public type: InputSignal<string> = input.required<string>();

    /**
     * Значение показателя.
     */
    public count: InputSignal<number> = input.required<number>();

    /**
     * Адрес аватара игрока.
     */
    public userImage: InputSignal<string | undefined> = input<string | undefined>();

    /**
     * Игрок — для его рамки.
     */
    public userId: InputSignal<string | undefined> = input<string | undefined>();

    /**
     * Медаль по месту: задаёт цвет кольца, ступени и её высоту.
     */
    protected readonly medal = computed(() => {
        const place = this.ratingPlace();
        return place === '1' ? 'gold' : place === '2' ? 'silver' : place === '3' ? 'bronze' : 'default';
    });
}

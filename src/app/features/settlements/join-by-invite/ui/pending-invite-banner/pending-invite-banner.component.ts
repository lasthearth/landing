import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n';
import { TuiIcon } from '@taiga-ui/core';
import { PendingInviteService } from '../../api/pending-invite.service';

/**
 * Плашка «Вас пригласили в поселение» — пока приглашение ждёт игрока.
 */
@Component({
    selector: 'app-pending-invite-banner',
    templateUrl: './pending-invite-banner.component.html',
    styleUrl: './pending-invite-banner.component.less',
    imports: [RouterLink, TuiIcon, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingInviteBannerComponent {
    protected readonly pending = inject(PendingInviteService);

    /**
     * Прошёл ли игрок проверку анкеты (иначе вступить пока нельзя).
     */
    public readonly verified = input(false);
}

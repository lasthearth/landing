import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@core/i18n';

/**
 * Ступени выплат реферальной программы.
 *
 * Награда пригласившему приходит двумя частями: 25% — когда приглашённый друг
 * прошёл проверку на сайте, 75% — когда он впервые зашёл на игровой сервер.
 * Приглашённый друг получает свою награду целиком, но только после первого входа.
 *
 * Абсолютных сумм в тексте нет: они приходят из конфига окружения и на каждом
 * развёртывании разные, поэтому показаны только доли.
 *
 * Блок один на реферальную страницу и на главную: терминология и доли не
 * расходятся между ними.
 */
@Component({
    standalone: true,
    selector: 'app-referral-payout',
    imports: [TranslatePipe],
    templateUrl: './referral-payout.component.html',
    styleUrl: './referral-payout.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferralPayoutComponent {
    /**
     * Две ступени награды пригласившему: ключ, доля и подписи из словаря `referral`.
     */
    protected readonly stages = [
        {
            key: 'verification',
            shareKey: 'referral.stages.verification.share',
            labelKey: 'referral.stages.verification.label',
            noteKey: 'referral.stages.verification.note',
        },
        {
            key: 'firstJoin',
            shareKey: 'referral.stages.firstJoin.share',
            labelKey: 'referral.stages.firstJoin.label',
            noteKey: 'referral.stages.firstJoin.note',
        },
    ] as const;
}

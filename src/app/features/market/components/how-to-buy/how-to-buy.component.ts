import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { catchError, filter, of, switchMap } from 'rxjs';

import { TuiSlider } from '@taiga-ui/kit/components/slider';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { UserService } from '@entities/user/api/user.service';
import { IPlayer } from '@entities/user/model/i-player';
import { SBP_REQUISITES } from './sbp.config';

/**
 * Диалог пополнения осколков (донат-валюты).
 *
 * Позволяет выбрать сумму в рублях через слайдер или ручной ввод.
 * Курс: 1 рубль = 10 осколков.
 */
@Component({
    selector: 'app-how-to-buy',
    standalone: true,
    imports: [FormsModule, DecimalPipe, TuiSlider, TuiIcon, LHInputComponent, TranslatePipe],
    templateUrl: './how-to-buy.component.html',
    styleUrl: './how-to-buy.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowToBuyComponent implements OnInit {
    /**
     * Курс обмена: 1 рубль = 10 осколков.
     */
    private readonly rate = 10;

    /**
     * Минимальная сумма пополнения в рублях.
     */
    protected readonly minAmount = 50;

    /**
     * Максимальная сумма пополнения в рублях.
     */
    protected readonly maxAmount = 10000;

    /**
     * Шаг слайдера в рублях.
     */
    protected readonly step = 50;

    /**
     * Сервис пользователя.
     */
    private readonly userService = inject(UserService);

    /**
     * Референс для автоматической отписки при уничтожении компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Игровой никнейм текущего пользователя.
     * По умолчанию используется имя из OIDC, затем заменяется на игровой ник из API.
     */
    protected readonly username = signal<string>(this.userService.userName || 'Неизвестный');

    /**
     * Текущая сумма в рублях.
     */
    protected readonly rubles = signal(500);

    /**
     * Вычисляемое количество осколков на основе суммы в рублях.
     */
    protected readonly shards = computed(() => this.rubles() * this.rate);

    /**
     * Популярные суммы пополнения для быстрого выбора.
     */
    protected readonly quickAmounts = [100, 500, 1000, 5000];

    /**
     * Реквизиты для перевода через СБП.
     */
    protected readonly sbpPhone = SBP_REQUISITES.phone;

    /**
     * Банк получателя для перевода через СБП.
     */
    protected readonly sbpBank = SBP_REQUISITES.bank;

    /**
     * Имя получателя для перевода через СБП.
     */
    protected readonly sbpRecipient = SBP_REQUISITES.recipient;

    /**
     * Признак успешного копирования номера телефона.
     */
    protected readonly phoneCopied = signal(false);

    /**
     * Итоговая сумма к оплате через Boosty, включая комиссию.
     */
    protected readonly boostyTotal = computed(() => this.rubles() + 300);

    /**
     * Ссылка на оплату через Boosty с учётом комиссии.
     */
    protected readonly boostyUrl = computed(
        () => `https://boosty.to/lisov/single-payment/donation/amount/${this.boostyTotal()}`
    );

    /**
     * Загружает игровой никнейм пользователя из API.
     */
    public ngOnInit(): void {
        this.userService.authState$
            .pipe(
                filter(Boolean),
                switchMap(() => this.userService.getPlayer$(this.userService.userId)),
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((player: IPlayer | null) => {
                const gameName = player?.user_game_name;
                if (gameName) {
                    this.username.set(gameName);
                }
            });
    }

    /**
     * Копирует номер телефона получателя в буфер обмена.
     */
    protected async copyPhone(): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.sbpPhone);
            this.phoneCopied.set(true);
            setTimeout(() => this.phoneCopied.set(false), 2000);
        } catch {
            // Если API буфера обмена недоступно, ничего не делаем.
        }
    }

    /**
     * Копирует полные реквизиты для перевода через СБП.
     */
    protected async copySbpDetails(): Promise<void> {
        const details = [
            `Телефон: ${this.sbpPhone}`,
            `Банк: ${this.sbpBank}`,
            `Получатель: ${this.sbpRecipient}`,
            `Сумма: ${this.rubles()} ₽`,
            `Ник: ${this.username()}`,
        ].join('\n');
        try {
            await navigator.clipboard.writeText(details);
        } catch {
            // Если API буфера обмена недоступно, ничего не делаем.
        }
    }

    /**
     * Обрабатывает изменение суммы в рублях из слайдера или инпута.
     *
     * @param value Новое значение (строка из инпута или число из слайдера).
     */
    protected onRublesChange(value: string | number): void {
        const num = typeof value === 'string' ? parseInt(value, 10) || 0 : value;
        this.rubles.set(this.clampRubles(num));
    }

    /**
     * Устанавливает одну из популярных сумм пополнения.
     *
     * @param value Сумма в рублях.
     */
    protected setRubles(value: number): void {
        this.rubles.set(this.clampRubles(value));
    }

    /**
     * Ограничивает сумму в рублях допустимым диапазоном
     * и округляет до шага.
     *
     * @param value Исходное значение.
     * @returns Скорректированное значение.
     */
    private clampRubles(value: number): number {
        const rounded = Math.round(value / this.step) * this.step;
        return Math.max(this.minAmount, Math.min(this.maxAmount, rounded));
    }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TuiSlider } from '@taiga-ui/kit/components/slider';
import { TuiIcon } from '@taiga-ui/core';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { UserService } from '@entities/user/api/user.service';
import { YOOMONEY_WALLET_NUMBER } from './how-to-buy.config';

/**
 * Диалог пополнения осколков (донат-валюты).
 *
 * Позволяет выбрать сумму в рублях через слайдер или ручной ввод.
 * Курс: 1 рубль = 10 осколков.
 */
@Component({
    selector: 'app-how-to-buy',
    standalone: true,
    imports: [FormsModule, DecimalPipe, TuiSlider, TuiIcon, LHInputComponent],
    templateUrl: './how-to-buy.component.html',
    styleUrl: './how-to-buy.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowToBuyComponent {
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
     * Никнейм текущего пользователя.
     */
    protected readonly username = computed(() => this.userService.userName || 'Неизвестный');

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
     * URL формы оплаты ЮMoney с подставленной суммой и сообщением.
     * Содержит номер кошелька, сумму, назначение платежа и ник игрока.
     */
    protected readonly yoomoneyUrl = computed(() => {
        const amount = this.rubles();
        const username = this.username();
        const message = `Пополнение баланса Last Hearth, ник: ${username}`;
        const params = new URLSearchParams({
            receiver: YOOMONEY_WALLET_NUMBER,
            'quickpay-form': 'button',
            paymentType: 'AC',
            sum: amount.toString(),
            targets: message,
            comment: message,
        });
        return `https://yoomoney.ru/quickpay/confirm?${params.toString()}`;
    });

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

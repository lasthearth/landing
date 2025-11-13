import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TuiExpand } from '@taiga-ui/experimental';

/**
 * Компонент "FAQ".
 */
@Component({
    selector: 'app-faq',
    imports: [TuiExpand, TuiIcon, CommonModule],
    templateUrl: './faq.component.html',
    styleUrl: './faq.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqComponent {
    /**
     * Признак того, что секция "Концепция сервер" открыта или скрыта.
     */
    protected isServerConcept: boolean = false;

    /**
     * Признак того, что секция "Забыл пароль" открыта или скрыта.
     */
    protected isPasswordLost: boolean = false;

    /**
     * Признак того, что секция "Проблемы входа" открыта или скрыта.
     */
    protected isTroubles: boolean = false;

    /**
     * Признак того, что секция "Информация о сезоне" открыта или скрыта.
     */
    protected isSeason: boolean = false;

    /**
     * Признак того, что секция "Как начать игру" открыта или скрыта.
     */
    protected isHowToStart: boolean = false;

    /**
     * Признак того, что секция "Баги или нарушения" открыта или скрыта.
     */
    protected isBagsOrViolation: boolean = false;

    /**
     * Признак того, что секция "Что делать если меня убили или обокрали" открыта или скрыта.
     */
    protected isDeathOrTheft: boolean = false;

    /**
     * Признак того, что секция "Предложения" открыта или скрыта.
     */
    protected isOffer: boolean = false;

    /**
     * Признак того, что секция "Попасть в команду" открыта или скрыта.
     */
    protected isTeam: boolean = false;
}

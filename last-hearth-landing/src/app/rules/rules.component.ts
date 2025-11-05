import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { LocalStorageService } from "@app/services/local-storage.service";
import { TuiExpand, TuiIcon } from "@taiga-ui/core";
import { TuiPulse } from "@taiga-ui/kit";

@Component({
    standalone: true,
    selector: "app-rules",
    imports: [TuiExpand, TuiIcon, CommonModule, TuiPulse],
    templateUrl: "./rules.component.html",
    styleUrl: "./rules.component.less",
})
export class RulesComponent {
    /**
     * Признак того, открыта ли секция "Терминология".
     */
    protected isTerminology: boolean = false;

    /**
     * Признак того, что секция "Терминология" была просмотрена.
     */
    protected isTerminologyWasWatched: boolean = false;

    /**
     * Признак того, открыта ли секция "Основы".
     */
    protected isBase: boolean = false;

    /**
     * Признак того, что секция "Основы" была просмотрена.
     */
    protected isBaseWasWatched: boolean = false;

    protected isAllOpened = false;

    protected isDefendBuilds: boolean = false;
    protected isDefendBuildsWasWatched: boolean = false;

    protected isTypesAndStatuses: boolean = false;
    protected isTypesAndStatusesWasWatched: boolean = false;

    protected isAboutSettlements: boolean = false;
    protected isAboutSettlementsWasWatched: boolean = false;

    protected isSinglePlayers: boolean = false;
    protected isSinglePlayersWasWatched: boolean = false;

    protected isCamp: boolean = false;
    protected isCampWasWatched: boolean = false;

    protected isVillage: boolean = false;
    protected isVillageWasWatched: boolean = false;

    protected isTownship: boolean = false;
    protected isTownshipWasWatched: boolean = false;

    protected isCity: boolean = false;
    protected isCityWasWatched: boolean = false;

    protected isRegion: boolean = false;
    protected isRegionWasWatched: boolean = false;

    protected isSuzerain: boolean = false;
    protected isSuzerainWasWatched: boolean = false;

    protected isPlayersActions: boolean = false;
    protected isPlayersActionsWasWatched: boolean = false;

    protected isTheft: boolean = false;
    protected isTheftWasWatched: boolean = false;

    protected isKills: boolean = false;
    protected isKillsWasWatched: boolean = false;

    protected isColonization: boolean = false;
    protected isColonizationWasWatched: boolean = false;

    protected isRaid: boolean = false;
    protected isRaidWasWatched: boolean = false;

    protected isMilitaryActions: boolean = false;
    protected isMilitaryActionsWasWatched: boolean = false;

    protected isSpy: boolean = false;
    protected isSpyWasWatched: boolean = false;

    protected isAdmin: boolean = false;
    protected isAdminWasWatched: boolean = false;

    protected isWar: boolean = false;
    protected isWarWasWatched: boolean = false;

    protected isOccupyPoints: boolean = false;
    protected isOccupyPointsWasWatched: boolean = false;

    private readonly localStorageService = inject(LocalStorageService);

    /**
     * Инициализирует экземпляр класса {@link RulesComponent}.
     */
    public constructor() {
        const sections = [
            'isTerminologyWasWatched', 'isBaseWasWatched', 'isDefendBuildsWasWatched',
            'isTypesAndStatusesWasWatched', 'isAboutSettlementsWasWatched', 'isSinglePlayersWasWatched',
            'isCampWasWatched', 'isVillageWasWatched', 'isTownshipWasWatched',
            'isCityWasWatched', 'isRegionWasWatched', 'isSuzerainWasWatched',
            'isPlayersActionsWasWatched', 'isTheftWasWatched', 'isKillsWasWatched',
            'isColonizationWasWatched', 'isRaidWasWatched', 'isMilitaryActionsWasWatched',
            'isSpyWasWatched', 'isAdminWasWatched', 'isWarWasWatched', 'isOccupyPointsWasWatched'
        ];

        sections.forEach(key => {
            if (this.localStorageService.hasKey(key)) {
                (this as any)[key] = true;
            }
        });
    }

    /**
     * Раскрывает/скрывает все секции.
     */
    protected toggle(): void {
        this.isAllOpened = !this.isAllOpened

        if (this.isAllOpened) {
            this.isDefendBuilds = true;
            this.isTypesAndStatuses = true;
            this.isTerminology = true;
            this.isBase = true;
            this.isAboutSettlements = true;
            this.isSinglePlayers = true;
            this.isCamp = true;
            this.isVillage = true;
            this.isTownship = true;
            this.isCity = true;
            this.isRegion = true;
            this.isSuzerain = true;
            this.isPlayersActions = true;
            this.isTheft = true;
            this.isKills = true;
            this.isColonization = true;
            this.isRaid = true;
            this.isMilitaryActions = true;
            this.isSpy = true;
            this.isAdmin = true;
            this.isWar = true;
            this.isOccupyPoints = true;
        }
        else {
            this.isDefendBuilds = false;
            this.isTypesAndStatuses = false;
            this.isTerminology = false;
            this.isBase = false;
            this.isAboutSettlements = false;
            this.isSinglePlayers = false;
            this.isCamp = false;
            this.isVillage = false;
            this.isTownship = false;
            this.isCity = false;
            this.isRegion = false;
            this.isSuzerain = false;
            this.isPlayersActions = false;
            this.isTheft = false;
            this.isKills = false;
            this.isColonization = false;
            this.isRaid = false;
            this.isMilitaryActions = false;
            this.isSpy = false;
            this.isAdmin = false;
            this.isWar = false;
            this.isOccupyPoints = false;
        }
    }

    /**
     * Переключает секцию "Терминология".
     */
    protected toggleTerminology(): void {
        if (!this.localStorageService.hasKey('isTerminologyWasWatched') && this.isTerminology) {
            this.localStorageService.setItem('isTerminologyWasWatched', true);
            this.isTerminologyWasWatched = true;
        }
    }

    /**
     * Переключает секцию "Основы".
     */
    protected toggleBase(): void {
        if (!this.localStorageService.hasKey('isBaseWasWatched') && this.isBase) {
            this.localStorageService.setItem('isBaseWasWatched', true);
            this.isBaseWasWatched = true;
        }
    }

    /**
     * Переключает секцию "Защитные постройки".
     */
    protected toggleDefendBuilds(): void {
        if (!this.localStorageService.hasKey('isDefendBuildsWasWatched') && this.isDefendBuilds) {
            this.localStorageService.setItem('isDefendBuildsWasWatched', true);
            this.isDefendBuildsWasWatched = true;
            this.toggleAboutSettlements();
        }
    }

    /**
     * Переключает секцию "Типы и статусы".
     */
    protected toggleTypesAndStatuses(): void {
        if (!this.localStorageService.hasKey('isTypesAndStatusesWasWatched') && this.isTypesAndStatuses) {
            if (this.localStorageService.hasKey('isSinglePlayersWasWatched') &&
                this.localStorageService.hasKey('isCampWasWatched') &&
                this.localStorageService.hasKey('isVillageWasWatched') &&
                this.localStorageService.hasKey('isTownshipWasWatched') &&
                this.localStorageService.hasKey('isCityWasWatched') &&
                this.localStorageService.hasKey('isRegionWasWatched') &&
                this.localStorageService.hasKey('isSuzerainWasWatched')) {
                this.localStorageService.setItem('isTypesAndStatusesWasWatched', true);
                this.isTypesAndStatusesWasWatched = true;
                this.toggleAboutSettlements();
            }
        }
    }

    /**
     * Переключает секцию "Типы игроков".
     */
    protected toggleAboutSettlements(): void {
        if (!this.localStorageService.hasKey('isAboutSettlementsWasWatched') && this.isAboutSettlements) {
            if (this.localStorageService.hasKey('isTypesAndStatusesWasWatched') && this.localStorageService.hasKey('isDefendBuildsWasWatched')) {
                this.localStorageService.setItem('isAboutSettlementsWasWatched', true);
                this.isAboutSettlementsWasWatched = true;
            }
        }
    }

    /**
     * Переключает секцию "Одиночные игроки".
     */
    protected toggleSinglePlayers(): void {
        if (!this.localStorageService.hasKey('isSinglePlayersWasWatched') && this.isSinglePlayers) {
            this.localStorageService.setItem('isSinglePlayersWasWatched', true);
            this.isSinglePlayersWasWatched = true;
            this.toggleTypesAndStatuses();
        }
    }

    /**
     * Переключает секцию "Лагерь".
     */
    protected toggleCamp(): void {
        if (!this.localStorageService.hasKey('isCampWasWatched') && this.isCamp) {
            this.localStorageService.setItem('isCampWasWatched', true);
            this.isCampWasWatched = true;
            this.toggleTypesAndStatuses();
        }
    }

    /**
     * Переключает секцию "Деревня".
     */
    protected toggleVillage(): void {
        if (!this.localStorageService.hasKey('isVillageWasWatched') && this.isVillage) {
            this.localStorageService.setItem('isVillageWasWatched', true);
            this.isVillageWasWatched = true;
            this.toggleTypesAndStatuses();
        }
    }

    /**
     * Переключает секцию "Городок".
     */
    protected toggleTownship(): void {
        if (!this.localStorageService.hasKey('isTownshipWasWatched') && this.isTownship) {
            this.localStorageService.setItem('isTownshipWasWatched', true);
            this.isTownshipWasWatched = true;
            this.toggleTypesAndStatuses();
        }
    }

    /**
     * Переключает секцию "Город".
     */
    protected toggleCity(): void {
        if (!this.localStorageService.hasKey('isCityWasWatched') && this.isCity) {
            this.localStorageService.setItem('isCityWasWatched', true);
            this.isCityWasWatched = true;
            this.toggleTypesAndStatuses();
        }
    }

    /**
     * Переключает секцию "Регион".
     */
    protected toggleRegion(): void {
        if (!this.localStorageService.hasKey('isRegionWasWatched') && this.isRegion) {
            this.localStorageService.setItem('isRegionWasWatched', true);
            this.isRegionWasWatched = true;
            this.toggleTypesAndStatuses();
        }
    }

    /**
     * Переключает секцию "Сюзерен".
     */
    protected toggleSuzerain(): void {
        if (!this.localStorageService.hasKey('isSuzerainWasWatched') && this.isSuzerain) {
            this.localStorageService.setItem('isSuzerainWasWatched', true);
            this.isSuzerainWasWatched = true;
            this.toggleTypesAndStatuses();
        }
    }

    /**
     * Переключает секцию "Действия игроков".
     */
    protected togglePlayersActions(): void {
        if (!this.localStorageService.hasKey('isPlayersActionsWasWatched') && this.isPlayersActions) {
            if (this.localStorageService.hasKey('isKillsWasWatched') && this.localStorageService.hasKey('isSpyWasWatched') && this.localStorageService.hasKey('isTheftWasWatched')) {
                this.localStorageService.setItem('isPlayersActionsWasWatched', true);
                this.isPlayersActionsWasWatched = true;
            }
        }
    }

    /**
     * Переключает секцию "Кража".
     */
    protected toggleTheft(): void {
        if (!this.localStorageService.hasKey('isTheftWasWatched') && this.isTheft) {
            this.localStorageService.setItem('isTheftWasWatched', true);
            this.isTheftWasWatched = true;
            this.togglePlayersActions();
        }
    }

    /**
     * Переключает секцию "Убийства".
     */
    protected toggleKills(): void {
        if (!this.localStorageService.hasKey('isKillsWasWatched') && this.isKills) {
            this.localStorageService.setItem('isKillsWasWatched', true);
            this.isKillsWasWatched = true;
            this.togglePlayersActions();
        }
    }

    /**
     * Переключает секцию "Колонизация".
     */
    protected toggleColonization(): void {
        if (!this.localStorageService.hasKey('isColonizationWasWatched') && this.isColonization) {
            this.localStorageService.setItem('isColonizationWasWatched', true);
            this.isColonizationWasWatched = true;
        }
    }

    /**
     * Переключает секцию "Рейд".
     */
    protected toggleRaid(): void {
        if (!this.localStorageService.hasKey('isRaidWasWatched') && this.isRaid) {
            this.localStorageService.setItem('isRaidWasWatched', true);
            this.isRaidWasWatched = true;
            this.toggleMilitaryActions();
        }
    }

    /**
     * Переключает секцию "Захват точек".
     */
    protected toggleOccupyPoints(): void {
        if (!this.localStorageService.hasKey('isOccupyPointsWasWatched') && this.isOccupyPoints) {
            this.localStorageService.setItem('isOccupyPointsWasWatched', true);
            this.isOccupyPointsWasWatched = true;
            this.toggleMilitaryActions();
        }
    }

    /**
     * Переключает секцию "Военные действия".
     */
    protected toggleMilitaryActions(): void {
        if (!this.localStorageService.hasKey('isMilitaryActionsWasWatched') && this.isMilitaryActions) {
            if (this.localStorageService.hasKey('isRaidWasWatched') && this.localStorageService.hasKey('isWarWasWatched') && this.localStorageService.hasKey('isOccupyPointsWasWatched')) {
                this.localStorageService.setItem('isMilitaryActionsWasWatched', true);
                this.isMilitaryActionsWasWatched = true;
            }
        }
    }

    /**
     * Переключает секцию "Шпионаж".
     */
    protected toggleSpy(): void {
        if (!this.localStorageService.hasKey('isSpyWasWatched') && this.isSpy) {
            this.localStorageService.setItem('isSpyWasWatched', true);
            this.isSpyWasWatched = true;
            this.togglePlayersActions();
        }
    }

    /**
     * Переключает секцию "Защитные сооружения".
     */
    protected toggleAdmin(): void {
        if (!this.localStorageService.hasKey('isAdminWasWatched') && this.isAdmin) {
            this.localStorageService.setItem('isAdminWasWatched', true);
            this.isAdminWasWatched = true;
        }
    }

    /**
     * Переключает секцию "Война".
     */
    protected toggleWar(): void {
        if (!this.localStorageService.hasKey('isWarWasWatched') && this.isWar) {
            this.localStorageService.setItem('isWarWasWatched', true);
            this.isWarWasWatched = true;
            this.toggleMilitaryActions();
        }
    }

    /**
 * Плавно прокручивает к элементу и добавляет анимацию "дергания" после того как элемент появился в viewport.
 * @param element - HTML элемент, к которому нужно прокрутить
 */
    protected scrollToElement(element: HTMLElement): void {
        setTimeout(() => {
            if (!element) {
                console.warn('Элемент для прокрутки не найден');
                return;
            }

            // Используем Intersection Observer для точного определения когда элемент появляется в viewport
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Элемент появился в viewport - запускаем анимацию
                        this.addShakeAnimation(element);
                        observer.disconnect();
                    }
                });
            }, {
                threshold: 0.9, // Элемент считается видимым когда 70% его в viewport
                rootMargin: '0px'
            });

            // Начинаем наблюдать за элементом
            observer.observe(element);

            // Плавная прокрутка к элементу
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });

            // Fallback: если через 3 секунды observer не сработал, отключаем его
            setTimeout(() => {
                observer.disconnect();
            }, 4000);
        }, 50);
    }

    /**
     * Добавляет анимацию "дергания" к элементу.
     * @param element - HTML элемент для анимации
     */
    private addShakeAnimation(element: HTMLElement): void {
        // Небольшая задержка для лучшего визуального эффекта
        setTimeout(() => {
            element.classList.add('shake-animation');

            // Убираем класс анимации после ее завершения

            // Fallback: убираем класс через 1 секунду
            setTimeout(() => {
                const onAnimationEnd = () => {
                    element.classList.remove('shake-animation');
                    element.removeEventListener('animationend', onAnimationEnd);
                };

                element.addEventListener('animationend', onAnimationEnd);
                element.classList.remove('shake-animation');
            }, 700);
        }, 300);
    }
}

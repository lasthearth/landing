/**
 * Проверяет, что `animationend` пришёл от нужного кадра.
 *
 * Кадры, объявленные в стилях компонента, Angular переименовывает, добавляя
 * область видимости: `bell-panel-exit` живёт в DOM как
 * `_ngcontent-ng-c12345_bell-panel-exit`. Сравнение с литералом промахивается,
 * обработчик выхода не срабатывает, и узел остаётся в DOM невидимым — при
 * `position: absolute` он продолжает ловить клики поверх страницы. Хвост после
 * подчёркивания совпадает и у кадра из `styles.css`, и у компонентного.
 *
 * @param event Событие конца анимации.
 * @param name Имя кадра так, как оно записано в стилях.
 * @returns Истина, если закончился именно этот кадр.
 */
export function isKeyframeEnd(event: AnimationEvent, name: string): boolean {
    return event.animationName === name || event.animationName.endsWith(`_${name}`);
}
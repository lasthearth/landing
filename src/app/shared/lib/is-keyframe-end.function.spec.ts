import { isKeyframeEnd } from './is-keyframe-end.function';

/**
 * Собирает событие конца анимации: jsdom не знает `AnimationEvent`,
 * поэтому имя кадра кладётся в обычное событие.
 *
 * @param name Имя кадра так, как его видит DOM.
 * @returns Событие для обработчика.
 */
function animationEnd(name: string): AnimationEvent {
    const event = new Event('animationend', { bubbles: true });

    Object.defineProperty(event, 'animationName', { value: name });

    return event as AnimationEvent;
}

describe('isKeyframeEnd', () => {
    it('узнаёт кадр из styles.css — без префикса', () => {
        expect(isKeyframeEnd(animationEnd('lh-swap-out'), 'lh-swap-out')).toBe(true);
    });

    it('узнаёт кадр компонента, переименованный Angular', () => {
        expect(isKeyframeEnd(animationEnd('_ngcontent-ng-c3242796939_bell-panel-exit'), 'bell-panel-exit')).toBe(
            true
        );
    });

    it('не принимает чужой кадр с тем же хвостом', () => {
        expect(isKeyframeEnd(animationEnd('_ngcontent-ng-c1_my-bell-panel-exit'), 'bell-panel-exit')).toBe(false);
    });

    it('не принимает вход того же элемента', () => {
        expect(isKeyframeEnd(animationEnd('_ngcontent-ng-c1_bell-panel-enter'), 'bell-panel-exit')).toBe(false);
    });
});
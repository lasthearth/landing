import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n';
import { RevealDirective } from '@shared/lib/directives';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { FooterPrototypeState } from '../../footer-prototype-state.service';

/**
 * Вариант подвала «Врата очага».
 *
 * Подвал — тёмный зал портала: верхняя кромка — прямая линия жара в 2px, над
 * ней в щель страницы уходит мягкий ореол, внутри зала от линии поднимаются
 * и гаснут угли, по линии скользит импульс жара. Движение — циклы CSS ореола,
 * линии и углей; скрипт прокрутки варианту не нужен.
 * При `prefers-reduced-motion` циклы стоят в видимом состоянии, ничего не
 * спрятано.
 */
@Component({
    standalone: true,
    selector: 'app-footer-hearth-gate',
    imports: [RouterLink, TranslatePipe, ImageLoaderComponent, RevealDirective],
    templateUrl: './hearth-gate.component.html',
    styleUrl: './hearth-gate.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HearthGateComponent {
    /**
     * Данные подвала из общего сервиса прототипа.
     */
    protected readonly state = inject(FooterPrototypeState);
}

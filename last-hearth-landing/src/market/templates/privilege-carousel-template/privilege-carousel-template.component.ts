import { Component, input, InputSignal, output, OutputEmitterRef, TemplateRef } from '@angular/core';
import { PrivilegeCard } from '../../interfaces/privilege-card.interface';
import { TuiIcon } from '@taiga-ui/core';
import { TuiCarousel, TuiPagination } from '@taiga-ui/kit';
import { NgTemplateOutlet } from '@angular/common';

@Component({
    selector: 'privilege-carousel-template',
    imports: [TuiCarousel, TuiIcon, TuiPagination, NgTemplateOutlet],
    templateUrl: './privilege-carousel-template.component.html',
})
export class PrivilegeCarouselTemplateComponent {
    public items: InputSignal<PrivilegeCard[]> = input.required<PrivilegeCard[]>();
    public itemTemplate: InputSignal<TemplateRef<any>> = input.required<TemplateRef<any>>();
    public selectedPrivilege: OutputEmitterRef<PrivilegeCard> = output<PrivilegeCard>();

    protected carouselIndex: number = 0;

    /**
     * Производит переключение изображений в карусели.
     *
     * @param direction Направление (1 - вправо, -1 влево).
     */
    protected navigate(direction: number): void {
        if (direction > 0) {
            this.carouselIndex = this.carouselIndex === this.items().length - 3 ? 0 : this.carouselIndex + 1;
        }

        if (direction < 0) {
            this.carouselIndex = this.carouselIndex === 0 ? this.items().length - 3 : this.carouselIndex - 1;
        }
    }
}

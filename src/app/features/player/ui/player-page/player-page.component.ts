import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService, TranslatePipe } from '@core/i18n';
import { SeoService } from '@core/services/seo.service';
import { SettlementDisplayNamePipe } from '@entities/settlement';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { ShareButtonComponent } from '@shared/ui/share-button/share-button.component';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { PlayerProfileService } from '../../api/player-profile.service';
import { PlayerProfile } from '../../model/player-profile';
import { PlayerBadgesComponent } from '../player-badges/player-badges.component';

/**
 * Адрес сайта для канонических ссылок.
 */
const SITE_URL = 'https://lasthearth.ru';

/**
 * Состояние страницы игрока.
 */
type PlayerPageState =
    | { status: 'loading' }
    | { status: 'not-found'; nickname: string }
    | { status: 'ready'; profile: PlayerProfile };

/**
 * Публичная страница игрока `/player/:nick`: аватар, статус, поселение,
 * статистика с местами в рейтинге, «Голодные игры» и значки.
 *
 * Данные — открытые (таблица лидеров, поселения), поэтому страница видна и гостям.
 */
@Component({
    selector: 'app-player-page',
    templateUrl: './player-page.component.html',
    styleUrl: './player-page.component.less',
    imports: [
        RouterLink,
        TuiIcon,
        TranslatePipe,
        ImageLoaderComponent,
        RelativeTimeComponent,
        ShareButtonComponent,
        SettlementDisplayNamePipe,
        PlayerBadgesComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerPageComponent {
    private readonly profiles = inject(PlayerProfileService);
    private readonly seo = inject(SeoService);
    private readonly i18n = inject(I18nService);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Состояние страницы.
     */
    protected readonly state = toSignal(
        inject(ActivatedRoute).paramMap.pipe(
            map((params) => decodeURIComponent(params.get('nick') ?? '')),
            switchMap((nickname) =>
                !this.isBrowser
                    ? of<PlayerPageState>({ status: 'loading' })
                    : this.profiles.load(nickname).pipe(
                          map(
                              (profile): PlayerPageState =>
                                  profile ? { status: 'ready', profile } : { status: 'not-found', nickname }
                          ),
                          catchError(() => of<PlayerPageState>({ status: 'not-found', nickname })),
                          startWith<PlayerPageState>({ status: 'loading' })
                      )
            )
        ),
        { initialValue: { status: 'loading' } as PlayerPageState }
    );

    /**
     * Профиль, если загружен.
     */
    protected readonly profile = computed(() => {
        const state = this.state();
        return state.status === 'ready' ? state.profile : null;
    });

    public constructor() {
        // SEO обновляем при каждом новом состоянии.
        effect(() => this.applySeo(this.state()));
    }

    /**
     * Ставит заголовок и описание страницы.
     *
     * @param state Состояние страницы.
     */
    private applySeo(state: PlayerPageState): void {
        if (state.status === 'not-found') {
            this.seo.setSeoTags({
                title: this.i18n.translate('player.notFound.title') + ' — Last Hearth',
                description: this.i18n.translate('player.notFound.text'),
                keywords: '',
                robots: 'noindex, follow',
            });
        } else if (state.status === 'ready') {
            const { profile } = state;
            this.seo.setSeoTags({
                title: this.i18n.translate('player.seoTitle', { name: profile.nickname }),
                description: this.i18n.translate('player.seoDescription', {
                    name: profile.nickname,
                    hours: Math.round(profile.hours),
                }),
                keywords: '',
                robots: 'noindex, follow',
                url: `${SITE_URL}/player/${encodeURIComponent(profile.nickname)}`,
            });
        }
    }
}

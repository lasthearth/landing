import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { map, Observable } from 'rxjs';
import { isReactionEmoji } from '../model/reaction-emojis.constant';
import {
    MyReactionsDto,
    ReactionCountDto,
    ReactionCounts,
    ReactionEmoji,
    TargetReactionsDto,
    ToggleReactionResult,
} from '../model/reaction.types';

/**
 * Сколько целей можно спросить одним запросом (ограничение сервера).
 */
export const REACTION_TARGETS_LIMIT = 50;

/**
 * Превращает счётчики из API в словарь, отбрасывая неизвестные реакции.
 *
 * @param counts Счётчики из API.
 * @returns Словарь «реакция → число».
 */
function toCounts(counts: ReactionCountDto[] | undefined): ReactionCounts {
    const result: ReactionCounts = {};

    for (const item of counts ?? []) {
        const count = Number(item.count);

        if (isReactionEmoji(item.emoji) && count > 0) {
            result[item.emoji] = count;
        }
    }

    return result;
}

/**
 * API реакций.
 *
 * Счётчики публичные; свои реакции и переключение — для вошедших игроков.
 * Ошибки не показываются всплывающими уведомлениями: реакции второстепенны.
 */
@Injectable({ providedIn: 'root' })
export class ReactionApiService {
    /**
     * HTTP-клиент.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Счётчики реакций для целей (не больше {@link REACTION_TARGETS_LIMIT}).
     *
     * @param targets Цели.
     * @returns Observable со словарём «цель → счётчики».
     */
    public counts(targets: readonly string[]): Observable<Map<string, ReactionCounts>> {
        return this.http
            .get<{ reactions?: TargetReactionsDto[] }>(`${this.baseUrl}/reactions`, {
                params: { targets: [...targets] },
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(
                map(
                    (response) =>
                        new Map((response.reactions ?? []).map((item) => [item.target, toCounts(item.counts)]))
                )
            );
    }

    /**
     * Реакции текущего игрока на целях.
     *
     * @param targets Цели.
     * @returns Observable со словарём «цель → поставленные реакции».
     */
    public mine(targets: readonly string[]): Observable<Map<string, ReactionEmoji[]>> {
        return this.http
            .get<{ reactions?: MyReactionsDto[] }>(`${this.baseUrl}/reactions/me`, {
                params: { targets: [...targets] },
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(
                map(
                    (response) =>
                        new Map(
                            (response.reactions ?? []).map((item) => [
                                item.target,
                                (item.emojis ?? []).filter(isReactionEmoji),
                            ])
                        )
                )
            );
    }

    /**
     * Ставит реакцию или снимает уже поставленную.
     *
     * @param target Цель.
     * @param emoji Реакция.
     * @returns Observable с итогом и актуальными счётчиками цели.
     */
    public toggle(target: string, emoji: ReactionEmoji): Observable<ToggleReactionResult> {
        return this.http
            .post<{
                active?: boolean;
                reactions?: TargetReactionsDto;
            }>(`${this.baseUrl}/reactions:toggle`, { target, emoji }, { context: new HttpContext().set(SKIP_ERROR_ALERT, true) })
            .pipe(map((response) => ({ active: !!response.active, counts: toCounts(response.reactions?.counts) })));
    }
}

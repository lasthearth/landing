import { inject, Injectable, RESPONSE_INIT } from '@angular/core';

/**
 * Код ответа, который сервер отдаёт вместе с отрисованной страницей.
 *
 * Роботу важно не только содержимое: несуществующая статья должна отвечать
 * 404, иначе поисковик считает такие адреса «мягкими 404» и тратит на них обход.
 * В браузере токена нет, поэтому вызовы ничего не делают.
 */
@Injectable({ providedIn: 'root' })
export class ServerResponseService {
    /**
     * Ответ текущего запроса (только при серверном рендере).
     */
    private readonly response = inject(RESPONSE_INIT, { optional: true });

    /**
     * Ставит код ответа.
     *
     * @param status Код HTTP.
     */
    public setStatus(status: number): void {
        if (this.response) {
            this.response.status = status;
        }
    }
}

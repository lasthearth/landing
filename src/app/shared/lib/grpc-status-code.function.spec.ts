import { HttpErrorResponse } from '@angular/common/http';
import { grpcStatusCode } from './grpc-status-code.function';

describe('grpcStatusCode', () => {
    it('берёт числовой код из тела ответа бэкенда', () => {
        const error = new HttpErrorResponse({ status: 400, error: { code: 9, message: 'conflict' } });

        expect(grpcStatusCode(error)).toBe(9);
    });

    it('возвращает null, если тела нет', () => {
        const error = new HttpErrorResponse({ status: 500 });

        expect(grpcStatusCode(error)).toBeNull();
    });

    it('возвращает null, если код не число', () => {
        const error = new HttpErrorResponse({ status: 400, error: { code: '9' } });

        expect(grpcStatusCode(error)).toBeNull();
    });

    it('возвращает null для чужих ошибок', () => {
        expect(grpcStatusCode(new Error('network'))).toBeNull();
        expect(grpcStatusCode(null)).toBeNull();
    });
});

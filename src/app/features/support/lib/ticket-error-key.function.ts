import { GrpcCode } from '@shared/lib/grpc-code.constant';
import { grpcStatusCode } from '@shared/lib/grpc-status-code.function';

/**
 * Ключ перевода для ошибки запроса к обращениям игрока.
 *
 * @param error Ошибка запроса.
 * @returns Ключ `tickets.player.toast.*`.
 */
export function ticketErrorKey(error: unknown): string {
    switch (grpcStatusCode(error)) {
        case GrpcCode.resourceExhausted:
            return 'tickets.player.toast.limit';
        case GrpcCode.failedPrecondition:
            return 'tickets.player.toast.closedTicket';
        default:
            return 'tickets.player.toast.failed';
    }
}

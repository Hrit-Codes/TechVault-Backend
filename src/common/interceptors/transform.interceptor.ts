import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: true;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((result) => {
        const isPlainObject =
          result !== null &&
          typeof result === 'object' &&
          !Array.isArray(result);

        if (isPlainObject && 'message' in result) {
          const { message, ...rest } = result as {
            message: string;
            [key: string]: unknown;
          };

          return {
            success: true,
            message,
            data: Object.keys(rest).length ? rest : null,
          };
        }

        return {
          success: true,
          message: 'Request successful',
          data: result ?? null,
        };
      }),
    );
  }
}

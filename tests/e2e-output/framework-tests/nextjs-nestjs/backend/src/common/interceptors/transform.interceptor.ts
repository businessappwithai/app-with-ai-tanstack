/**
 * Transform Interceptor
 *
 * Standardizes API responses with consistent format.
 * Generated: 2026-03-20T16:41:26.574Z
 */

import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface Response<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data already has proper format, return as-is
        if (data && typeof data === "object" && "data" in data) {
          return data;
        }

        // Wrap response in standard format
        return { data };
      })
    );
  }
}

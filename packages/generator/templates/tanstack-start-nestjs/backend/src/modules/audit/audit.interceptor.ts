import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuditService } from './audit.service';
import type { AuditEvent, AuditSource } from './audit.types';
import { diffFields } from './audit.types';

/** Methods that mutate data and should be audited. */
const AUDIT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Map HTTP method + route pattern → audit action. */
function resolveAction(method: string, path: string): string {
  if (method === 'DELETE') return 'ENTITY_DELETE';
  if (method === 'POST') return 'ENTITY_CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'ENTITY_UPDATE';
  return 'ENTITY_READ';
}

function resolveEntityType(path: string): string | null {
  // /bus/:entity/... → entity name
  const busMatch = path.match(/\/bus\/([^/]+)/);
  if (busMatch) return busMatch[1];
  // /sys/... → sys
  if (path.includes('/sys/')) return 'sys';
  return null;
}

function resolveEntityId(params: Record<string, string>): string | null {
  return params?.id ?? params?.entityId ?? null;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const method: string = req.method?.toUpperCase() ?? '';

    if (!AUDIT_METHODS.has(method)) return next.handle();

    const path: string = req.url ?? req.path ?? '';
    const entityType = resolveEntityType(path);

    // Skip pure sys reads — only audit sys mutations (handled separately)
    if (!entityType) return next.handle();

    const user = req.user;
    const params = req.params ?? {};
    const headers = req.headers ?? {};

    const base: Partial<AuditEvent> = {
      user_id: user?.id ?? null,
      user_name: user?.name ?? null,
      user_email: user?.email ?? null,
      session_id: req.session?.session?.id ?? null,
      entity_type: entityType,
      entity_id: resolveEntityId(params),
      action: resolveAction(method, path),
      ip_address: (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? null,
      user_agent: headers['user-agent'] as string ?? null,
      source: (headers['x-source'] as AuditSource) ?? 'WEB_UI',
      request_id: headers['x-request-id'] as string ?? null,
    };

    return next.handle().pipe(
      tap((responseData: any) => {
        // Read __auditBefore here (after handler ran) — controller sets it before its mutation
        const beforeValue = req.__auditBefore ?? null;
        const after = responseData?.data ?? responseData ?? null;
        const changed = diffFields(beforeValue, after);
        // For POST (CREATE), extract entity_id from the response body
        const entityId = base.entity_id ?? after?.id ?? null;
        this.auditService.log({
          ...base,
          entity_id: entityId,
          before_value: beforeValue,
          after_value: method === 'DELETE' ? null : after,
          changed_fields: changed,
          success: true,
        } as AuditEvent);
      }),
      catchError(err => {
        const beforeValue = req.__auditBefore ?? null;
        this.auditService.log({
          ...base,
          before_value: beforeValue,
          after_value: null,
          changed_fields: [],
          success: false,
          error_message: err?.message ?? String(err),
        } as AuditEvent);
        return throwError(() => err);
      }),
    );
  }
}

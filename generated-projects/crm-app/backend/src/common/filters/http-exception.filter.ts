/**
 * HTTP Exception Filter
 *
 * Generated: 2026-05-12T11:48:19.410Z
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: any;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const methodName = 'catch';
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // Log comprehensive request information for debugging
    this.logger.error(`[${methodName}] ========== EXCEPTION ==========`);
    this.logger.error(`[${methodName}] Request Method: ${request.method}`);
    this.logger.error(`[${methodName}] Request URL: ${request.url}`);
    this.logger.error(`[${methodName}] Request ID: ${request.id}`);
    this.logger.error(`[${methodName}] Query Params: ${JSON.stringify(request.query)}`);
    this.logger.error(`[${methodName}] Route Params: ${JSON.stringify(request.params)}`);
    this.logger.error(`[${methodName}] Headers: ${JSON.stringify(this.sanitizeHeaders(request.headers))}`);
    this.logger.error(`[${methodName}] User Agent: ${(request.headers as any)['user-agent'] || 'Unknown'}`);
    this.logger.error(`[${methodName}] Client IP: ${(request.headers as any)['x-forwarded-for'] || (request.headers as any)['x-real-ip'] || request.ip || 'Unknown'}`);

    // Log request body if present (excluding file uploads)
    if ((request as any).body && !request.url.includes('/upload') && request.method !== 'GET') {
      try {
        const bodyStr = JSON.stringify((request as any).body);
        if (bodyStr.length < 2000) {
          this.logger.error(`[${methodName}] Request Body: ${bodyStr}`);
        } else {
          this.logger.error(`[${methodName}] Request Body: ${bodyStr.substring(0, 2000)}... (truncated)`);
        }
      } catch (e) {
        this.logger.error(`[${methodName}] Request Body: [Unable to stringify]`);
      }
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      this.logger.error(`[${methodName}] Exception Type: HttpException`);
      this.logger.error(`[${methodName}] HTTP Status: ${status}`);
      this.logger.error(`[${methodName}] Exception Response:`, exceptionResponse);

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || this.getErrorName(status);
        details = responseObj.details;

        // Log all keys from response object for debugging
        this.logger.error(`[${methodName}] Response Object Keys: ${Object.keys(responseObj).join(', ')}`);

        // If message is an array (validation errors), log each error
        if (Array.isArray(message)) {
          this.logger.error(`[${methodName}] Validation Errors (${message.length}):`);
          message.forEach((err, idx) => {
            this.logger.error(`[${methodName}]   [${idx + 1}] ${err}`);
          });
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`[${methodName}] Exception Type: Error`);
      this.logger.error(`[${methodName}] Error Name: ${exception.name}`);
      this.logger.error(`[${methodName}] Error Message: ${exception.message}`);
      this.logger.error(`[${methodName}] Error Stack:`, exception.stack);
    } else {
      this.logger.error(`[${methodName}] Exception Type: Unknown`);
      this.logger.error(`[${methodName}] Exception:`, exception);
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.id,
      ...(details && { details }),
    };

    this.logger.error(`[${methodName}] Response Status: ${status}`);
    this.logger.error(`[${methodName}] Response Message: ${message}`);
    this.logger.error(`[${methodName}] Response Error: ${error}`);
    if (details) {
      this.logger.error(`[${methodName}] Response Details: ${JSON.stringify(details)}`);
    }
    this.logger.error(`[${methodName}] ========== END EXCEPTION ==========`);

    // Additional logging based on status code severity
    if (status >= 500) {
      this.logger.error(
        `[${methodName}] Server Error - ${request.method} ${request.url} - ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${methodName}] Client Error - ${request.method} ${request.url} - ${status}: ${message}`,
      );
    } else {
      this.logger.log(
        `[${methodName}] Other Error - ${request.method} ${request.url} - ${status}: ${message}`,
      );
    }

    response.status(status).send(errorResponse);
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };

    // Remove sensitive headers from logs
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private getErrorName(status: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      412: 'Precondition Failed',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };

    return errorNames[status] || 'Unknown Error';
  }
}

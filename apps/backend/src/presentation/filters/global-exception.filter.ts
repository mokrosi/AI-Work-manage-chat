import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApplicationError } from '@application/errors/application.error';

const APPLICATION_STATUS: Record<string, HttpStatus> = {
  INVALID_TIME_RANGE: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_TIMEZONE: HttpStatus.BAD_REQUEST,
  TIME_CONFLICT: HttpStatus.CONFLICT,
  TASK_NOT_FOUND: HttpStatus.NOT_FOUND,
  APPROVAL_NOT_FOUND: HttpStatus.NOT_FOUND,
  APPROVAL_EXPIRED: HttpStatus.GONE,
  INVALID_COMMAND: HttpStatus.UNPROCESSABLE_ENTITY,
  AI_NOT_CONFIGURED: HttpStatus.SERVICE_UNAVAILABLE,
  EXECUTION_FAILED: HttpStatus.INTERNAL_SERVER_ERROR,
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ApplicationError) {
      this.logError(exception.code, exception.message, exception);
      response.status(APPLICATION_STATUS[exception.code] ?? HttpStatus.BAD_REQUEST).json({
        statusCode: APPLICATION_STATUS[exception.code] ?? HttpStatus.BAD_REQUEST,
        code: exception.code,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      this.logError(`HTTP_${status}`, typeof body === 'string' ? body : JSON.stringify(body), exception);
      response.status(status).json(
        typeof body === 'object'
          ? body
          : { statusCode: status, message: body },
      );
      return;
    }

    const isTimeout =
      exception instanceof Error &&
      /timeout|timed out|abort/i.test(exception.message ?? '');

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    if (isTimeout) {
      this.logError('AI_TIMEOUT', message, exception);
      response.status(HttpStatus.GATEWAY_TIMEOUT).json({
        statusCode: HttpStatus.GATEWAY_TIMEOUT,
        code: 'AI_TIMEOUT',
        message: 'The AI agent took too long to respond',
      });
      return;
    }

    this.logger.error(`Unhandled exception: ${message}`);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  }

  private logError(code: string, message: string, error: unknown): void {
    this.logger.error(`[${code}] ${message}`, error instanceof Error ? error.stack : undefined);
  }
}
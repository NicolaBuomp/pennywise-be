import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseMessage = exception.getResponse();
      message =
        typeof responseMessage === 'string'
          ? responseMessage
          : (responseMessage as { message: string }).message;
    }

    // Log error
    console.error(`HTTP Error: ${status} - ${message} - ${request.url}`);

    // Handle Supabase errors
    if (typeof exception === 'object' && exception !== null) {
      const supabaseError = (exception as { error?: { message?: string } })
        .error;
      if (supabaseError) {
        status = HttpStatus.BAD_REQUEST;
        message = supabaseError.message || 'Supabase request failed';
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

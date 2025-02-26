// logger/logger.service.ts
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(private context?: string) {}

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    console.log(
      `[${this.getTimestamp()}] [${context || this.context}] ${message}`,
    );
  }

  error(message: any, trace?: string, context?: string) {
    console.error(
      `[${this.getTimestamp()}] [${context || this.context}] ERROR: ${message}`,
    );
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: any, context?: string) {
    console.warn(
      `[${this.getTimestamp()}] [${context || this.context}] WARN: ${message}`,
    );
  }

  debug(message: any, context?: string) {
    console.debug(
      `[${this.getTimestamp()}] [${context || this.context}] DEBUG: ${message}`,
    );
  }

  verbose(message: any, context?: string) {
    console.log(
      `[${this.getTimestamp()}] [${context || this.context}] VERBOSE: ${message}`,
    );
  }

  private getTimestamp() {
    return new Date().toISOString();
  }
}

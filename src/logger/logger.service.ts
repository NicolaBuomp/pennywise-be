import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logLevels: LogLevel[] = ['log', 'error', 'warn', 'debug', 'verbose'];
  private logFilePath = path.join(__dirname, '../../logs/app.log');

  constructor() {
    // Ensure logs directory exists
    if (!fs.existsSync(path.dirname(this.logFilePath))) {
      fs.mkdirSync(path.dirname(this.logFilePath), { recursive: true });
    }
  }

  private writeLog(level: string, message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}]: ${message}\n`;

    // Log to console
    console[level](logMessage);

    // Append to file
    fs.appendFileSync(this.logFilePath, logMessage);
  }

  log(message: string) {
    this.writeLog('log', message);
  }

  error(message: string, trace?: string) {
    this.writeLog('error', `${message}${trace ? `\nTrace: ${trace}` : ''}`);
  }

  warn(message: string) {
    this.writeLog('warn', message);
  }

  debug(message: string) {
    this.writeLog('debug', message);
  }

  verbose(message: string) {
    this.writeLog('verbose', message);
  }
}

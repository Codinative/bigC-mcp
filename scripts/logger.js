import winston from 'winston';

const logger = winston.createLogger({
  level: 'debug', // minimum level to log
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json() // or winston.format.simple()
  ),
//   transports: [
//     new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
//     new winston.transports.File({ filename: 'logs/combined.log' }),
//   ],
});

// Optional: also log to console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export default logger;

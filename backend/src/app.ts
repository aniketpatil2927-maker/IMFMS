import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/index.js';
import routes from './routes/index.js';
import { sendSuccess } from './utils/apiResponse.js';

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (no Origin) and configured frontend URLs
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.replace(/\/+$/, '');
      const isAllowed = env.frontendUrls.some((allowed) => {
        const normAllowed = allowed.replace(/\/+$/, '');
        return normAllowed === '*' || normAllowed === normalizedOrigin;
      });
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Production health check endpoints
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (_req, res) => sendSuccess(res, { status: 'ok' }));
app.use('/api', routes);
app.use(errorHandler);

export default app;

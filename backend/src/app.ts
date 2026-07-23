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
      if (!origin || env.frontendUrls.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => sendSuccess(res, { status: 'ok' }));
app.use('/api', routes);
app.use(errorHandler);

export default app;

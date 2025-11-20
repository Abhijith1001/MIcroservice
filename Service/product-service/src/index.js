import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import productsRouter from './routes/products.js';
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import cors from 'cors';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });


const logger = {
  info: (...args) => console.log('[INFO]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[ERROR]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[WARN]', new Date().toISOString(), ...args),
  debug: (...args) => console.debug('[DEBUG]', new Date().toISOString(), ...args)
};

global.logger = logger;

const app = express();


app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});


app.use(cors());


app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

app.use('/api', productsRouter);
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4300;
app.listen(PORT, () => {
  logger.info(`Product service started on port ${PORT}`);
  logger.info('Environment:', process.env.NODE_ENV || 'development');
});

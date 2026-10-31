import express from 'express';
import cors from 'cors';
import { swaggerDocs } from './config/swagger.js';
import appRoutes from './routes/index.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

swaggerDocs(app);

app.use('/api', appRoutes);

export default app;

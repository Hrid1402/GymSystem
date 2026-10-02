import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { swaggerDocs } from './config/swagger.js';
import appRoutes from './routes/index.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

swaggerDocs(app);

app.use('/api', appRoutes);


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`📄 Docs available at http://localhost:${port}/api-docs`);
  console.log(`Test connection: http://localhost:${port}/api/health`);
});
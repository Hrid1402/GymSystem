import 'dotenv/config';
import app from './app.js';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`📄 Docs available at http://localhost:${port}/api-docs`);
  console.log(`Test connection: http://localhost:${port}/api/health`);
});

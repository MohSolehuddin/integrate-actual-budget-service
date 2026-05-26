import { createServer } from './infrastructure/web/Server';

const start = async () => {
  try {
    const server = await createServer();
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    server.log.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();

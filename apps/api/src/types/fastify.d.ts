// types/fastify.d.ts or any global `.d.ts` file (make sure it's included in tsconfig)
import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
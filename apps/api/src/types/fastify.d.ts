// src/types/fastify.d.ts
import 'fastify';
import '@fastify/jwt';

declare module 'fastify' {
  // 1) our JWT request extensions
  interface FastifyRequest {
    jwtVerify(): Promise<void>;
    jwtSign(payload: FastifyJWT['payload']): string;
    user: FastifyJWT['user'];
  }

  // 2) our auth decorator
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

import 'fastify';
import { ApiKey } from '../database/schema/api_keys.js';

declare module 'fastify' {
  interface FastifyRequest {
    apiKey: ApiKey | null;
  }
}
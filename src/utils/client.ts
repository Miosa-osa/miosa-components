import { Miosa } from "@miosa/sdk";

export function createClient(apiKey: string): Miosa {
  return new Miosa({ apiKey });
}

/**
 * Memoize a client instance per API key so components sharing the same key
 * reuse the same HTTP connection pool.
 */
const cache = new Map<string, Miosa>();

export function getClient(apiKey: string): Miosa {
  let client = cache.get(apiKey);
  if (!client) {
    client = createClient(apiKey);
    cache.set(apiKey, client);
  }
  return client;
}

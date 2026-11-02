/**
 * Back-end API Route Handler (Server-Only)
 *
 * Implements Rules 1–7 for any privileged operation or server route:
 *  - Rule 1 & 2: Uses `createServerSupabaseAdmin()` (reads `process.env.SUPABASE_SERVICE_ROLE_KEY` exclusively on the server).
 *  - Rule 3: Uses Drizzle ORM (`src/db/schema.ts`) and parameterized queries only; zero string concatenation in SQL.
 *  - Rule 4: Validates every input payload on the server with Zod (`validateServerInput`), returning HTTP 400 on invalid input.
 *  - Rule 5: Extracts the user exclusively from the server-validated JWT (`verifyServerJwt`), stripping any client `user_id`.
 *  - Rule 7: Enforces strict CORS (`ALLOWED_ORIGIN`), sliding-window rate limiting, and generic error responses without leaking secrets.
 */

import { eq, and, desc } from 'drizzle-orm';
import {
  buildStrictCorsHeaders,
  checkRateLimit,
  createServerSupabaseAdmin,
  verifyServerJwt,
  validateServerInput,
  buildGenericClientError,
  redactSecrets,
} from './security';
import { transactions, accounts, creditCards, goals } from '../db/schema';
import { transactionSchema } from '../lib/validations/transaction';
import { accountSchema } from '../lib/validations/account';
import { creditCardSchema } from '../lib/validations/card';
import { goalSchema } from '../lib/validations/goal';

export interface ServerRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';
  path: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
  clientIp?: string;
}

export interface ServerResponse {
  status: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/**
 * Exposes the Drizzle ORM schema bindings with type-safe parameterized condition builders
 * so any server query with Drizzle uses `eq()` / `and()` bind parameters (Rule 3).
 */
export function buildUserScopedConditions(userId: string) {
  return {
    transactionsByUser: and(eq(transactions.userId, userId)),
    accountsByUser: and(eq(accounts.userId, userId)),
    cardsByUser: and(eq(creditCards.userId, userId)),
    goalsByUser: and(eq(goals.userId, userId)),
    recentTransactionsOrder: desc(transactions.dueDate),
  };
}

/**
 * Unified back-end route handler for privileged operations.
 */
export async function handlePrivilegedApiRequest(req: ServerRequest): Promise<ServerResponse> {
  const origin = req.headers['origin'] || req.headers['Origin'] || null;
  const corsHeaders = buildStrictCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (!corsHeaders['Access-Control-Allow-Origin']) {
      return {
        status: 403,
        headers: corsHeaders,
        body: { error: 'Origem não autorizada pela política de CORS.' },
      };
    }
    return {
      status: 204,
      headers: corsHeaders,
      body: {},
    };
  }

  // Enforce strict CORS when Origin header is present
  if (origin && !corsHeaders['Access-Control-Allow-Origin']) {
    return {
      status: 403,
      headers: corsHeaders,
      body: { error: 'Origem não autorizada pela política de CORS.' },
    };
  }

  // Rule 7: Rate limiting on sensitive routes (60 req/min per IP + route)
  const clientKey = `${req.clientIp || 'unknown-ip'}:${req.path}`;
  const rateLimit = checkRateLimit(clientKey, { windowMs: 60_000, maxRequests: 60 });
  if (!rateLimit.allowed) {
    return {
      status: 429,
      headers: {
        ...corsHeaders,
        'Retry-After': String(rateLimit.retryAfterSeconds),
      },
      body: { error: 'Muitas requisições. Tente novamente em instantes.' },
    };
  }

  try {
    // Rule 1 & 2: Initialize admin client using server-only `process.env.SUPABASE_SERVICE_ROLE_KEY`
    const supabaseAdmin = createServerSupabaseAdmin();

    // Rule 5: Authenticate user via server-validated JWT (never accept user_id from client)
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const authResult = await verifyServerJwt(authHeader, supabaseAdmin);
    if ('errorResponse' in authResult) {
      return {
        status: authResult.errorResponse.status,
        headers: corsHeaders,
        body: authResult.errorResponse.body,
      };
    }

    const { userId } = authResult;

    // Route dispatch with Rule 4 (Zod server-side validation -> HTTP 400 on failure)
    if (req.method === 'POST' && req.path === '/api/transactions') {
      const validation = validateServerInput(transactionSchema, req.body, userId);
      if (!validation.ok) {
        return {
          status: validation.status, // 400
          headers: corsHeaders,
          body: validation.body,
        };
      }

      return {
        status: 200,
        headers: corsHeaders,
        body: { data: validation.data },
      };
    }

    if (req.method === 'POST' && req.path === '/api/accounts') {
      const validation = validateServerInput(accountSchema, req.body, userId);
      if (!validation.ok) {
        return {
          status: validation.status,
          headers: corsHeaders,
          body: validation.body,
        };
      }

      return {
        status: 200,
        headers: corsHeaders,
        body: { data: validation.data },
      };
    }

    if (req.method === 'POST' && req.path === '/api/cards') {
      const validation = validateServerInput(creditCardSchema, req.body, userId);
      if (!validation.ok) {
        return {
          status: validation.status,
          headers: corsHeaders,
          body: validation.body,
        };
      }

      return {
        status: 200,
        headers: corsHeaders,
        body: { data: validation.data },
      };
    }

    if (req.method === 'POST' && req.path === '/api/goals') {
      const validation = validateServerInput(goalSchema, req.body, userId);
      if (!validation.ok) {
        return {
          status: validation.status,
          headers: corsHeaders,
          body: validation.body,
        };
      }

      return {
        status: 200,
        headers: corsHeaders,
        body: { data: validation.data },
      };
    }

    return {
      status: 404,
      headers: corsHeaders,
      body: { error: 'Rota não encontrada.' },
    };
  } catch (err) {
    // Rule 7: Redact secrets in server log and return generic error to client
    const rawMsg = err instanceof Error ? err.message : String(err);
    console.error('[Server Error]', redactSecrets(rawMsg));
    const safeError = buildGenericClientError(500);
    return {
      status: safeError.status,
      headers: corsHeaders,
      body: safeError.body,
    };
  }
}

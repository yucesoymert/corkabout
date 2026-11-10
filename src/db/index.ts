import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// ponytail: neon-serverless (WebSocket) like garage; neon-http would also do, nothing here needs a transaction yet
export const db = drizzle({ client: new Pool({ connectionString: process.env.DATABASE_URL }), schema });

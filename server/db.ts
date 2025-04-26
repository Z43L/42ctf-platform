import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

// Create postgres connection
const connectionString = process.env.DATABASE_URL || '';
const queryClient = postgres(connectionString, { max: 1 });
export const db = drizzle(queryClient, { schema });
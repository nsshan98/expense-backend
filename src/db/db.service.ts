import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

@Injectable()
export class DrizzleService {
  public db: NodePgDatabase<typeof schema>;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });

    this.db = drizzle(pool, { schema });
  }
}

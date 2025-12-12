import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

@Injectable()
export class DrizzleService implements OnModuleInit {
  public db!: NodePgDatabase<typeof schema>;

  onModuleInit() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });

    this.db = drizzle(pool, { schema });
  }
}

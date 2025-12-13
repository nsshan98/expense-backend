import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { subscriptionPlans } from './entities/subscription_plans.schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class PlansService {
  constructor(private readonly drizzleService: DrizzleService) { }

  async findAll() {
    return this.drizzleService.db.select().from(subscriptionPlans);
  }

  async findOne(id: string) {
    const [plan] = await this.drizzleService.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async getFeaturesForPlan(planId: string) {
    const plan = await this.findOne(planId);
    return plan ? plan.features : null;
  }
}

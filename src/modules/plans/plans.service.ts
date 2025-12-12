import { Injectable, OnModuleInit } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { subscriptionPlans } from './entities/subscription_plans.schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(private readonly drizzleService: DrizzleService) {}

  async onModuleInit() {
    await this.seedDefaultPlans();
  }

  async seedDefaultPlans() {
    const count = await this.drizzleService.db.select().from(subscriptionPlans);
    if (count.length === 0) {
      await this.drizzleService.db.insert(subscriptionPlans).values([
        {
          name: 'Free',
          price_monthly: '0',
          price_yearly: '0',
          features: { limit: 100, premium: false },
        },
        {
          name: 'Pro',
          price_monthly: '9.99',
          price_yearly: '99.99',
          features: { limit: -1, premium: true },
        },
      ]);
    }
  }

  async findAll() {
    return this.drizzleService.db.select().from(subscriptionPlans);
  }

  async findOne(id: number) {
    const [plan] = await this.drizzleService.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async getFeaturesForPlan(planId: number) {
    const plan = await this.findOne(planId);
    return plan ? plan.features : null;
  }
}

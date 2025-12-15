import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { subscriptionPlans } from './entities/subscription_plans.schema';
import { eq } from 'drizzle-orm';

import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly drizzleService: DrizzleService) { }

  async create(data: CreatePlanDto) {
    const [plan] = await this.drizzleService.db
      .insert(subscriptionPlans)
      .values({
        name: data.name,
        price_monthly: data.price_monthly.toString(),
        price_yearly: data.price_yearly.toString(),
        features: data.features,
      })
      .returning();
    return plan;
  }

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

  async findByName(name: string) {
    const [plan] = await this.drizzleService.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, name));
    return plan;
  }

  async update(id: string, data: UpdatePlanDto) {
    const updateData: any = { ...data };
    if (data.price_monthly) updateData.price_monthly = data.price_monthly.toString();
    if (data.price_yearly) updateData.price_yearly = data.price_yearly.toString();

    const [plan] = await this.drizzleService.db
      .update(subscriptionPlans)
      .set(updateData)
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return plan;
  }

  async getFeaturesForPlan(planId: string) {
    const plan = await this.findOne(planId);
    return plan ? plan.features : null;
  }
}

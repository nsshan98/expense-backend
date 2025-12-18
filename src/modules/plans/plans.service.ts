import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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
        price_monthly: data.price_monthly,
        price_yearly: data.price_yearly,
        features: data.features,
      })
      .returning();
    return plan;
  }

  async findAll() {
    return this.drizzleService.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.is_active, true));
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
    if (data.price_monthly) updateData.price_monthly = data.price_monthly;
    if (data.price_yearly) updateData.price_yearly = data.price_yearly;

    // If features are being updated, we must merge them with existing features
    // because existing implementation replaces the entire JSON object
    if (data.features) {
      const existingPlan = await this.findOne(id);
      if (existingPlan) {
        updateData.features = {
          ...existingPlan.features as Record<string, any>,
          ...data.features,
        };
      }
    }

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id);
    }

    const [plan] = await this.drizzleService.db
      .update(subscriptionPlans)
      .set(updateData)
      .where(eq(subscriptionPlans.id, id))
      .returning();

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  async getFeaturesForPlan(planId: string) {
    const plan = await this.findOne(planId);
    return plan ? plan.features : null;
  }

  async remove(id: string) {
    const [plan] = await this.drizzleService.db
      .update(subscriptionPlans)
      .set({ is_active: false })
      .where(eq(subscriptionPlans.id, id))
      .returning();

    return {
      message: 'Plan deactivated successfully',
    };
  }
}

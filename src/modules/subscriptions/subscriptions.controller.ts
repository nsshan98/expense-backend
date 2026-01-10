import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
    constructor(private readonly subscriptionsService: SubscriptionsService) { }

    @Post('create')
    create(@Request() req, @Body() createSubscriptionDto: CreateSubscriptionDto) {
        return this.subscriptionsService.create(req.user.id, createSubscriptionDto);
    }

    @Get()
    findAll(@Request() req) {
        return this.subscriptionsService.findAll(req.user.id);
    }

    @Get('breakdown')
    getBreakdown(@Request() req) {
        return this.subscriptionsService.getBreakdown(req.user.id);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.subscriptionsService.findOne(id, req.user.id);
    }

    @Patch(':id')
    update(@Request() req, @Param('id') id: string, @Body() updateSubscriptionDto: UpdateSubscriptionDto) {
        return this.subscriptionsService.update(id, req.user.id, updateSubscriptionDto);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.subscriptionsService.remove(id, req.user.id);
    }

    @Post('cancel')
    cancel(@Request() req, @Body('ids') ids: string[]) {
        return this.subscriptionsService.cancel(ids, req.user.id);
    }

    @Post('transactions/confirm')
    confirmTransaction(@Request() req, @Body('ids') ids: string[]) {
        return this.subscriptionsService.confirmTransaction(ids, req.user.id);
    }

    @Post('transactions/details')
    getTransactionsDetails(@Request() req, @Body('ids') ids: string[]) {
        return this.subscriptionsService.getTransactionsDetails(ids, req.user.id);
    }

    @Post('test/trigger-checks')
    async triggerChecks(@Body('targetHour') targetHour: number, @Body('targetMinute') targetMinute: number, @Body('customDate') customDateString: string) {
        const forceDate = customDateString ? new Date(customDateString) : undefined;

        await this.subscriptionsService.handleDailyRenewalCheck(forceDate, targetHour, targetMinute);
        await this.subscriptionsService.handlePostRenewalCheck(forceDate, targetHour, targetMinute);

        return {
            message: 'Checks triggered',
            details: {
                targetHour,
                targetMinute,
                simulatedDate: forceDate ? forceDate.toISOString() : 'Real Time'
            }
        };
    }
}

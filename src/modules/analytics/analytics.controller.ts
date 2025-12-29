import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { DateUtil } from '../../common/utils/date.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin, Role.User)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('breakdown')
    async getSpendBreakdown(
        @Request() req,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        // Default to current month if not specified
        let end = new Date();
        if (endDate) {
            end = DateUtil.parseDate(endDate);
            end.setHours(23, 59, 59, 999);
        }

        const start = startDate ? DateUtil.parseDate(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        return this.analyticsService.getSpendBreakdown(req.user.id, start, end);
    }

    @Get('trends')
    async getTrendAnalysis(@Request() req) {
        return this.analyticsService.getTrendAnalysis(req.user.id);
    }
    @Get('forecast/end-of-month')
    async getEndOfMonthProjection(@Request() req) {
        return this.analyticsService.getEndOfMonthProjection(req.user.id);
    }

    @Get('forecast/rolling')
    async getRollingForecast(@Request() req) {
        return this.analyticsService.getRollingForecast(req.user.id);
    }
}

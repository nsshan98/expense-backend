import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class ReviewSubmissionDto {
    @IsNotEmpty()
    @IsIn(['approve', 'reject'])
    action: 'approve' | 'reject';

    @IsOptional()
    @IsString()
    reason?: string;
}

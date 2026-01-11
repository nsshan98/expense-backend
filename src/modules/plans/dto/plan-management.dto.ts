import { IsString, IsBoolean, IsOptional, IsObject, IsEnum } from 'class-validator';

export class CreatePlanDto {
    @IsString()
    name: string;

    @IsString()
    plan_key: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsObject()
    @IsOptional()
    features?: any;

    @IsBoolean()
    @IsOptional()
    is_paddle_enabled?: boolean;

    @IsEnum(['digital-goods', 'ebooks', 'implementation-services', 'professional-services', 'saas', 'software-programming-services', 'standard', 'training-services', 'website-hosting'])
    @IsOptional()
    paddle_tax_category?: string;

    @IsString()
    @IsOptional()
    paddle_image_url?: string;
}

export class UpdatePlanDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsObject()
    @IsOptional()
    features?: any;

    @IsBoolean()
    @IsOptional()
    is_paddle_enabled?: boolean;

    @IsString()
    @IsOptional()
    paddle_image_url?: string;
}

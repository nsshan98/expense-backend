import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class ApplyMergeDto {
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    sourceNames: string[];

    @IsNotEmpty()
    @IsString()
    targetName: string;
}

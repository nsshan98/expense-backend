import { IsEmail, IsNotEmpty, IsString, MinLength, Length } from 'class-validator';

export class ResetPasswordDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    resetToken: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    newPassword: string;
}

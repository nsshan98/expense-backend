import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyRegistrationDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    otp: string;
}

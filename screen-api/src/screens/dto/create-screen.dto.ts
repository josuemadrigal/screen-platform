import { IsString, IsNotEmpty, IsInt, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScreenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ default: 1 })
  @IsInt()
  @IsOptional()
  status?: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  playlist?: string;

  @ApiProperty({ required: false, description: 'Sound off on the TV' })
  @IsOptional()
  @IsBoolean()
  muted?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Role id, or null to leave the user without role' })
  @IsOptional()
  @IsInt()
  roleId?: number | null;

  @ApiProperty({ required: false, description: "'1' active, '0' inactive (cannot log in)" })
  @IsOptional()
  @IsIn(['0', '1'])
  status?: string;
}

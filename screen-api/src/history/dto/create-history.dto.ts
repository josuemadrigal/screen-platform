import { IsString, IsNotEmpty, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHistoryDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  userid: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  action: string;
}

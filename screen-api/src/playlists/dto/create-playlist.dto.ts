import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlaylistDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  playlistname: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  videos: string;
}

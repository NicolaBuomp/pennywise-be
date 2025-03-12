import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SearchGroupsDto {
  @ApiProperty({
    required: false,
    description: 'Termine di ricerca per il nome del gruppo',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Filtra per valuta' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    required: false,
    enum: ['created_at', 'member_count', 'relevance'],
    default: 'relevance',
  })
  @IsOptional()
  @IsEnum(['created_at', 'member_count', 'relevance'])
  sortBy?: 'created_at' | 'member_count' | 'relevance' = 'relevance';

  @ApiProperty({ required: false, enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

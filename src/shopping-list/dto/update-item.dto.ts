import { CreateItemDto } from './create-item.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateItemDto extends PartialType(CreateItemDto) {}

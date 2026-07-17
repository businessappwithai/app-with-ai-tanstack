import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import type { WorkflowDefinitionDto } from './workflow-definitions.service';
import { WorkflowDefinitionsService } from './workflow-definitions.service';

@Controller('workflow-definitions')
export class WorkflowDefinitionsController {
  constructor(private readonly service: WorkflowDefinitionsService) {}

  @Get()
  findAll(
    @Query('entityName') entityName?: string,
    @Query('operation') operation?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll({
      entityName,
      operation,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: WorkflowDefinitionDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<WorkflowDefinitionDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

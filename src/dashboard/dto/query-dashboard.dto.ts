import { IsEnum, IsOptional } from 'class-validator';

export enum DashboardRange {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class QueryDashboardDto {
  @IsOptional()
  @IsEnum(DashboardRange)
  range?: DashboardRange = DashboardRange.WEEK;
}

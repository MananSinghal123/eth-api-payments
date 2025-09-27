'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn, formatCurrency, formatNumber, formatPercentage } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    period: string;
  };
  format?: 'currency' | 'number' | 'percentage' | 'default';
  className?: string;
  icon?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  description,
  trend,
  format = 'default',
  className,
  icon,
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'number':
        return formatNumber(val);
      case 'percentage':
        return formatPercentage(val);
      default:
        return val.toLocaleString();
    }
  };

  const getTrendIcon = (trendValue: number) => {
    if (trendValue > 0) return <TrendingUp className="h-4 w-4" />;
    if (trendValue < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = (trendValue: number) => {
    if (trendValue > 0) return 'text-green-500';
    if (trendValue < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-lg border-border/50', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-4 w-4 text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">
          {formatValue(value)}
        </div>
        {(description || trend) && (
          <div className="flex items-center justify-between mt-4">
            {description && (
              <CardDescription className="text-xs">
                {description}
              </CardDescription>
            )}
            {trend && (
              <Badge 
                variant="outline" 
                className={cn(
                  'flex items-center space-x-1 border-0 bg-transparent px-0',
                  getTrendColor(trend.value)
                )}
              >
                {getTrendIcon(trend.value)}
                <span className="text-xs">
                  {Math.abs(trend.value).toFixed(1)}% {trend.period}
                </span>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
  }[];
}

interface ChartComponentProps {
  title: string;
  description?: string;
  data: ChartData;
  type: 'line' | 'bar' | 'doughnut';
  height?: number;
  className?: string;
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#ffffff',
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      backgroundColor: '#1f2937',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#374151',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: {
        color: '#374151',
        drawBorder: false,
      },
      ticks: {
        color: '#9ca3af',
        font: {
          size: 11,
        },
      },
    },
    y: {
      grid: {
        color: '#374151',
        drawBorder: false,
      },
      ticks: {
        color: '#9ca3af',
        font: {
          size: 11,
        },
      },
    },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: '#ffffff',
        font: {
          size: 12,
        },
        padding: 20,
      },
    },
    tooltip: {
      backgroundColor: '#1f2937',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#374151',
      borderWidth: 1,
    },
  },
};

export function ChartComponent({
  title,
  description,
  data,
  type,
  height = 350,
  className,
}: ChartComponentProps) {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return <Line data={data} options={chartOptions} />;
      case 'bar':
        return <Bar data={data} options={chartOptions} />;
      case 'doughnut':
        return <Doughnut data={data} options={doughnutOptions} />;
      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-muted-foreground">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }}>
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}

// Predefined chart data for different metrics
export const generateVolumeChartData = (data: { date: string; volume: number }[]): ChartData => ({
  labels: data.map(d => d.date),
  datasets: [
    {
      label: 'Daily Volume (ETH)',
      data: data.map(d => d.volume),
      borderColor: '#ffffff',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 2,
      fill: true,
    },
  ],
});

export const generateUserGrowthChartData = (data: { date: string; users: number }[]): ChartData => ({
  labels: data.map(d => d.date),
  datasets: [
    {
      label: 'Active Users',
      data: data.map(d => d.users),
      borderColor: '#60a5fa',
      backgroundColor: 'rgba(96, 165, 250, 0.1)',
      borderWidth: 2,
      fill: true,
    },
  ],
});

export const generateProviderDistributionData = (providers: { name: string; revenue: number }[]): ChartData => ({
  labels: providers.map(p => p.name),
  datasets: [
    {
      label: 'Revenue Distribution',
      data: providers.map(p => p.revenue),
      backgroundColor: [
        'rgba(255, 255, 255, 0.8)',
        'rgba(255, 255, 255, 0.6)',
        'rgba(255, 255, 255, 0.4)',
        'rgba(255, 255, 255, 0.2)',
        'rgba(255, 255, 255, 0.1)',
      ],
      borderColor: '#ffffff',
      borderWidth: 1,
    },
  ],
});
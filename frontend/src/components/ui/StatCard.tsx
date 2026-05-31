import { LucideIcon } from 'lucide-react';
import { Card, CardBody } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  accent?: string;
}

export function StatCard({ title, value, icon: Icon, subtitle, accent = 'text-brand-600 bg-brand-50' }: StatCardProps) {
  return (
    <Card>
      <CardBody className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-semibold text-slate-900 mt-0.5">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
      </CardBody>
    </Card>
  );
}

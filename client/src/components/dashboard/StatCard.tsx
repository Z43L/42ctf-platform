interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
}

export default function StatCard({ title, value, subtitle, accentColor = "text-accent-cyan" }: StatCardProps) {
  return (
    <div className="bg-background-elevated p-5 rounded-lg shadow-sm border border-background-subtle">
      <h3 className="text-text-secondary text-sm uppercase font-medium mb-1">{title}</h3>
      <p className={`text-3xl font-bold ${accentColor}`}>{value}</p>
      {subtitle && (
        <div className="text-xs text-text-muted mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
}

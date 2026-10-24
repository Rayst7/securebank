import { Icon, type IconName } from './Icon'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon?: IconName
}

export function StatCard({ label, value, hint, icon = 'card' }: StatCardProps) {
  return (
    <div className="stat">
      <span className="stat-icon" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {hint && <p className="stat-hint">{hint}</p>}
      </div>
    </div>
  )
}

interface SpinnerProps {
  label?: string
}

export function Spinner({ label = 'Cargando' }: SpinnerProps) {
  return <span className="spinner" role="status" aria-label={label} />
}

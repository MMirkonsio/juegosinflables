export default function Badge({ color='slate', children }) {
  const map = {
    slate: 'bg-slate-100 text-slate-800 border-slate-200',
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-100 text-amber-900 border-amber-200',
    red: 'bg-rose-100 text-rose-800 border-rose-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
  }
  return <span className={`badge border ${map[color]}`}>{children}</span>
}
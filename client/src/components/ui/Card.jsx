export function Card({ className='', children }) { return <div className={`card ${className}`}>{children}</div> }
export function CardBody({ className='', children }) { return <div className={`p-4 sm:p-6 ${className}`}>{children}</div> }
export function CardHeader({ title, actions }) {
  return (
    <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between">
      <h3 className="h2">{title}</h3>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  )
}
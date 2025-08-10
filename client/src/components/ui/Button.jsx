export default function Button({ as:As='button', className='', ...props }) {
  const base = 'inline-flex items-center justify-center px-3 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed'
  return <As className={`${base} ${className}`} {...props} />
}
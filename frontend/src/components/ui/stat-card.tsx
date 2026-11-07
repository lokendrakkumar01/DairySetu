import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  prefix?: string
  suffix?: string
  icon: React.ReactNode
  color?: 'green' | 'blue' | 'purple' | 'amber' | 'red'
  subtitle?: string
  animate?: boolean
}

const colorMap = {
  green: { bg: 'bg-brand-50', iconBg: 'bg-brand-500', text: 'text-brand-600', border: 'border-brand-100' },
  blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-100' },
  purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-100' },
  amber: { bg: 'bg-amber-50', iconBg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-100' },
  red: { bg: 'bg-red-50', iconBg: 'bg-red-500', text: 'text-red-600', border: 'border-red-100' },
}

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString('en-IN'))

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 1.2, ease: 'easeOut' })
    return controls.stop
  }, [value, motionValue])

  return <motion.span>{rounded}</motion.span>
}

export function StatCard({ title, value, prefix, suffix, icon, color = 'green', subtitle, animate: shouldAnimate = true }: StatCardProps) {
  const c = colorMap[color]
  const isNumber = typeof value === 'number'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={cn('bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow', c.border)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
          <p className={cn('text-2xl font-bold mt-1', c.text)}>
            {prefix && <span className="text-lg">{prefix}</span>}
            {isNumber && shouldAnimate ? <AnimatedNumber value={value as number} /> : (isNumber ? value.toLocaleString('en-IN') : value)}
            {suffix && <span className="text-sm font-medium ml-1">{suffix}</span>}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 ml-3', c.iconBg)}>
          {icon}
        </div>
      </div>
    </motion.div>
  )
}

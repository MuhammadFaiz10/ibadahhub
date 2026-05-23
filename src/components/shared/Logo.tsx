import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: number
  className?: string
  withWordmark?: boolean
  wordmarkClassName?: string
  href?: string | null
  priority?: boolean
}

export function Logo({
  size = 36,
  className,
  withWordmark = false,
  wordmarkClassName,
  href = null,
  priority = false,
}: LogoProps) {
  const mark = (
    <Image
      src="/logo-mark.png"
      alt="IbadahHub"
      width={size}
      height={size}
      priority={priority}
      className={cn('shrink-0 select-none', className)}
      style={{ width: size, height: size }}
    />
  )

  const content = withWordmark ? (
    <span className="inline-flex items-center gap-2.5">
      {mark}
      <span className={cn('font-serif font-bold text-primary-dark leading-none', wordmarkClassName)}>
        IbadahHub
      </span>
    </span>
  ) : (
    mark
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center" aria-label="IbadahHub — beranda">
        {content}
      </Link>
    )
  }
  return content
}

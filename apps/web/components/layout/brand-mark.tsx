export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" role="img" aria-hidden="true">
      <rect width="512" height="512" rx="128" fill="#2f704f" />
      <path d="M136 224 256 140l120 84v137a7 7 0 0 1-7 7H143a7 7 0 0 1-7-7V224Z" fill="#bfe8cc" />
      <path d="M136 224 256 140l120 84v137a7 7 0 0 1-7 7H256V224H136Z" fill="#5fc18f" />
      <path d="M300 156h15a5 5 0 0 1 5 5v23h-20v-28Z" fill="#58ab80" />
      <path d="M237 224h15v148a4 4 0 0 1-4 4h-11V224Z" fill="#21523b" />
      <path
        d="M256 405c-14 0-26 11-26 25 0 12 8 22 19 25l7 25 7-25c11-3 19-13 19-25 0-14-12-25-26-25Zm0 13a12 12 0 1 1 0 24 12 12 0 0 1 0-24Z"
        fill="#f9c75f"
      />
    </svg>
  )
}

export function safeReturnPath(value: string | null | undefined): string {
  if (
    !value ||
    value.length > 2048 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return '/'
  try {
    const url = new URL(value, 'https://nearbook.invalid')
    if (url.origin !== 'https://nearbook.invalid') return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}

export function CacheNote({ info, label = '정보 확인' }: { info?: { fetchedAt?: string; stale?: boolean }; label?: string }) {
  if (!info?.fetchedAt || !Number.isFinite(Date.parse(info.fetchedAt))) return null
  const fetched = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(info.fetchedAt))
  return <p className="mt-2 text-xs text-muted-foreground">
    {info.stale ? '최신 정보를 확인하기 어려워 이전에 가져온 내용을 보여드립니다. ' : ''}
    {label}: {fetched}
  </p>
}

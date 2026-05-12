export interface WishlistDigestHit {
  isbn: string
  title: string
  author: string | null
  coverUrl: string | null
  libraryName: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderWishlistDigestEmail(args: {
  nickname: string
  hits: WishlistDigestHit[]
  unsubscribeUrl: string
  downgradeUrl: string
  tone: 'daily' | 'weekly'
  periodDays: number
}) {
  const count = args.hits.length
  const subject = args.tone === 'weekly'
    ? `이번 주 찜한 책 ${count}권이 도착했어요`
    : `찜한 책 ${count}권이 도서관에 도착했어요`
  const intro = args.tone === 'weekly'
    ? `지난 ${args.periodDays}일 동안 ${escapeHtml(args.nickname)}님이 기다리던 책이 도서관에 들어왔습니다.`
    : `${escapeHtml(args.nickname)}님이 기다리던 책이 대출 가능 상태가 됐습니다.`
  const frequencyFooter = args.tone === 'weekly'
    ? '주 1회 월요일 아침에 모아 보내드리고 있어요.'
    : '매일 아침 도착한 책을 모아 보내드려요.'

  const rows = args.hits.map((hit) => {
    const title = escapeHtml(hit.title)
    const author = escapeHtml(hit.author ?? '저자 미상')
    const libraryName = escapeHtml(hit.libraryName)
    const image = hit.coverUrl
      ? `<img src="${escapeHtml(hit.coverUrl)}" width="60" alt="" style="display:block;border-radius:6px;background:#f3f4f6" />`
      : `<div style="width:60px;height:88px;border-radius:6px;background:#f3f4f6;color:#9ca3af;font-size:11px;display:flex;align-items:center;justify-content:center">표지 없음</div>`

    return `
      <tr>
        <td style="padding:12px 12px 12px 0;border-bottom:1px solid #e5e7eb;vertical-align:top">${image}</td>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;vertical-align:top">
          <a href="https://우리동네책.kr/book/${encodeURIComponent(hit.isbn)}" style="color:#111827;text-decoration:none">
            <strong>${title}</strong><br />
            <span style="color:#6b7280;font-size:14px">${author} · ${libraryName} 대출 가능</span>
          </a>
        </td>
      </tr>
    `
  }).join('')

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f9fafb;padding:24px 12px;font-family:Pretendard,Apple SD Gothic Neo,system-ui,sans-serif;color:#111827">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:24px">
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">찜한 책 ${count}권이 도서관에 도착했어요</h1>
          <p style="margin:0;color:#4b5563;line-height:1.6">${intro}</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:20px">${rows}</table>
          <p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.6">
            대출 가능 여부는 발송 시점 기준입니다. 실제 재고는 빠르게 변동될 수 있어요.
          </p>
          <p style="margin:12px 0 0;color:#6b7280;font-size:12px;line-height:1.6">${frequencyFooter}</p>
          <hr style="margin:24px 0 12px;border:none;border-top:1px solid #e5e7eb" />
          <p style="margin:0;color:#9ca3af;font-size:11px">
            우리동네책 · <a href="${escapeHtml(args.downgradeUrl)}" style="color:#9ca3af">주 1회로 변경하기</a> · <a href="${escapeHtml(args.unsubscribeUrl)}" style="color:#9ca3af">알림 끄기</a>
          </p>
        </div>
      </body>
    </html>
  `

  const text = [
    `찜한 책 ${count}권이 도서관에 도착했어요`,
    '',
    ...args.hits.map((hit) => `- ${hit.title} (${hit.author ?? '저자 미상'}) — ${hit.libraryName}\n  https://우리동네책.kr/book/${hit.isbn}`),
    '',
    `주 1회로 변경: ${args.downgradeUrl}`,
    `알림 끄기: ${args.unsubscribeUrl}`,
  ].join('\n')

  return { subject, html, text }
}

'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'

type ScanCleanup = {
  stop: () => void
}

type NativeDetector = {
  detect: (input: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cleanup: ScanCleanup | null = null
    let active = true

    async function start() {
      const video = videoRef.current
      if (!video) return

      const nativeDetector = await getNativeDetector()
      if (nativeDetector) {
        cleanup = await startNativeScanner(video, nativeDetector, (isbn) => {
          if (!active) return
          trackEvent('barcode_scan_success', { isbn, source: 'scan' })
          router.push(`/book/${isbn}?source=scan`)
        }, setError)
        return
      }

      cleanup = await startZxingScanner(video, (isbn) => {
        if (!active) return
        trackEvent('barcode_scan_success', { isbn, source: 'scan', fallback: 'zxing' })
        router.push(`/book/${isbn}?source=scan`)
      }, setError)
    }

    start().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : '카메라를 사용할 수 없어요'
      setError(message)
    })

    return () => {
      active = false
      cleanup?.stop()
    }
  }, [router])

  if (error) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-6 py-12">
        <div className="w-full rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">스캔 불가</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">{error}</p>
          <Link href="/search" className="mt-6 inline-flex text-sm font-semibold text-primary-700 underline underline-offset-4">
            검색으로 입력하기
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-black">
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-x-8 top-[28%] h-32 rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      <div className="absolute inset-x-0 bottom-10 px-6 text-center text-white">
        <p className="text-base font-semibold">책 뒷면 ISBN 바코드를 비춰주세요</p>
        <p className="mt-2 text-sm text-white/80">숫자가 선명하게 보이도록 조금 더 가까이 가져가면 인식이 빨라집니다.</p>
      </div>
      <Link
        href="/search"
        className="absolute left-4 top-4 rounded-full bg-black/55 px-4 py-2 text-sm font-medium text-white backdrop-blur"
      >
        닫기
      </Link>
    </main>
  )
}

async function getNativeDetector(): Promise<NativeDetector | null> {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null

  const BarcodeDetectorCtor = (window as Window & {
    BarcodeDetector?: {
      getSupportedFormats?: () => Promise<string[]>
    }
  }).BarcodeDetector as (new (config: { formats: string[] }) => NativeDetector) & {
    getSupportedFormats?: () => Promise<string[]>
  }

  const supported = await BarcodeDetectorCtor.getSupportedFormats?.().catch(() => []) ?? []
  if (!supported.includes('ean_13')) return null

  return new BarcodeDetectorCtor({ formats: ['ean_13', 'ean_8'] })
}

async function startNativeScanner(
  video: HTMLVideoElement,
  detector: NativeDetector,
  onDetected: (isbn: string) => void,
  onError: (message: string) => void,
): Promise<ScanCleanup> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' },
    },
    audio: false,
  })

  video.srcObject = stream
  await video.play()

  let stopped = false

  const loop = async () => {
    while (!stopped) {
      try {
        const results = await detector.detect(video)
        const isbn = pickIsbn(results)
        if (isbn) {
          stopped = true
          onDetected(isbn)
          break
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : '바코드를 읽지 못했어요')
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 350))
    }
  }

  void loop()

  return {
    stop: () => {
      stopped = true
      stream.getTracks().forEach((track) => track.stop())
    },
  }
}

async function startZxingScanner(
  video: HTMLVideoElement,
  onDetected: (isbn: string) => void,
  onError: (message: string) => void,
): Promise<ScanCleanup | null> {
  try {
    const mod = await import('@zxing/browser')
    const ReaderCtor = (mod as any).BrowserMultiFormatReader
    const reader = new ReaderCtor()
    const controls = await reader.decodeFromConstraints(
      { video: { facingMode: 'environment' }, audio: false },
      video,
      (result: { getText: () => string } | null) => {
        const isbn = pickIsbn(result ? [{ rawValue: result.getText() }] : [])
        if (isbn) {
          controls?.stop?.()
          onDetected(isbn)
        }
      },
    )

    return {
      stop: () => {
        controls?.stop?.()
        reader?.reset?.()
      },
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : '이 브라우저는 바코드 스캔을 지원하지 않아요')
    return null
  }
}

function pickIsbn(results: Array<{ rawValue?: string }>): string | null {
  for (const result of results) {
    const raw = String(result.rawValue ?? '').replace(/[^\d]/g, '')
    if (/^97[89]\d{10}$/.test(raw)) return raw
  }
  return null
}

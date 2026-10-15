'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { personalJson, PersonalApiError } from './personal-data'
import { createClient } from './supabase/client'

export function usePersonalLoad<T>(path: string, parse: (value: unknown) => T) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: unknown }>({
    data: null,
    loading: true,
    error: null,
  })
  const [version, setVersion] = useState(0)
  const request = useRef<AbortController | null>(null)
  const generation = useRef(0)
  const boundary = useRef(new AbortController())
  const refresh = useCallback(() => {
    generation.current++
    request.current?.abort()
    setState({ data: null, loading: true, error: null })
    setVersion((previous) => previous + 1)
  }, [])
  useEffect(() => {
    const current = ++generation.current
    const controller = new AbortController()
    request.current = controller
    setState({ data: null, loading: true, error: null })
    void personalJson(path, parse, { signal: controller.signal })
      .then((data) => {
        if (current === generation.current && !controller.signal.aborted)
          setState({ data, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (current === generation.current && !controller.signal.aborted)
          setState({ data: null, loading: false, error })
      })
    return () => {
      controller.abort()
    }
  }, [path, parse, version])
  useEffect(() => {
    if (boundary.current.signal.aborted) boundary.current = new AbortController()
    let previous: string | null | undefined
    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((_event, session) => {
      const current = session?.user.id ?? null
      if (current === null || (previous !== undefined && previous !== current)) {
        boundary.current.abort()
        boundary.current = new AbortController()
      }
      if (current === null) {
        generation.current++
        request.current?.abort()
        setState({ data: null, loading: false, error: new PersonalApiError(401) })
      } else if (previous !== undefined && previous !== current) refresh()
      previous = current
    })
    return () => {
      boundary.current.abort()
      subscription.unsubscribe()
    }
  }, [refresh])
  return { ...state, refresh, scopeSignal: boundary.current.signal }
}

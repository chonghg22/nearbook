'use client'
import { useEffect, useRef, useState } from 'react'
import {
  parseAdded,
  personalJson,
  personalResponse,
  personalErrorMessage,
  PersonalApiError,
} from './personal-data'
import { createClient } from './supabase/client'

type Options = {
  statusPath: string
  addPath: string
  removePath: string
  addBody: object
  onChanged?: (added: boolean) => void
}
export function useSavedToggle({ statusPath, addPath, removePath, addBody, onChanged }: Options) {
  const [added, setAdded] = useState(false)
  const [mode, setMode] = useState<'checking' | 'ready' | 'anonymous' | 'error'>('checking')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<boolean | null>(null)
  const [version, setVersion] = useState(0)
  const active = useRef<AbortController | null>(null)
  const locked = useRef(false)
  const generation = useRef(0)
  const previousPath = useRef(statusPath)
  useEffect(() => {
    const current = ++generation.current
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    locked.current = false
    setBusy(false)
    setMode('checking')
    setError(null)
    if (previousPath.current !== statusPath) {
      setAdded(false)
      setNotice(null)
      previousPath.current = statusPath
    }
    void personalJson(statusPath, parseAdded, { signal: controller.signal })
      .then((value) => {
        if (current === generation.current && !controller.signal.aborted) {
          setAdded(value)
          setMode('ready')
        }
      })
      .catch((cause) => {
        if (current !== generation.current || controller.signal.aborted) return
        setNotice(null)
        setMode(cause instanceof PersonalApiError && cause.status === 401 ? 'anonymous' : 'error')
        setError(personalErrorMessage(cause))
      })
    return () => {
      controller.abort()
      active.current?.abort()
    }
  }, [statusPath, version])
  useEffect(() => {
    let previous: string | null | undefined
    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null
      if (id === null || (previous !== undefined && previous !== id)) {
        generation.current++
        active.current?.abort()
        locked.current = false
        setAdded(false)
        setNotice(null)
        setBusy(false)
        setError(null)
        if (id === null) setMode('anonymous')
        else {
          setMode('checking')
          setVersion((value) => value + 1)
        }
      }
      previous = id
    })
    return () => subscription.unsubscribe()
  }, [])
  async function toggle() {
    if (locked.current || mode !== 'ready') return
    locked.current = true
    setBusy(true)
    setError(null)
    setNotice(null)
    const current = generation.current
    const controller = new AbortController()
    active.current = controller
    try {
      await personalResponse(added ? removePath : addPath, {
        method: added ? 'DELETE' : 'POST',
        signal: controller.signal,
        ...(!added && { body: JSON.stringify(addBody) }),
      })
      if (current !== generation.current || controller.signal.aborted) return
      const confirmed = await personalJson(statusPath, parseAdded, { signal: controller.signal })
      if (current !== generation.current || controller.signal.aborted) return
      if (confirmed !== !added) throw new PersonalApiError()
      setAdded(confirmed)
      setNotice(confirmed)
      onChanged?.(confirmed)
    } catch (cause) {
      if (current !== generation.current || controller.signal.aborted) return
      setNotice(null)
      setMode(cause instanceof PersonalApiError && cause.status === 401 ? 'anonymous' : 'error')
      setError(personalErrorMessage(cause))
    } finally {
      if (current === generation.current && !controller.signal.aborted) {
        locked.current = false
        setBusy(false)
      }
    }
  }
  const samePath = previousPath.current === statusPath
  return {
    added: samePath && added,
    mode: samePath ? mode : ('checking' as const),
    busy,
    error: samePath ? error : null,
    notice: samePath ? notice : null,
    toggle,
    retry: () => setVersion((value) => value + 1),
  }
}

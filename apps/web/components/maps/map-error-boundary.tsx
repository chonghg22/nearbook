'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}
interface State {
  hasError: boolean
  message: string
}

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center text-gray-500 text-sm p-4">
            <p className="font-medium mb-1">지도를 불러올 수 없습니다</p>
            <p className="text-xs text-gray-400">Naver Cloud Console에서<br/>localhost:3000 등록 필요</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

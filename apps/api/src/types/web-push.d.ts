declare module 'web-push' {
  interface PushSubscription {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }

  function setVapidDetails(mailto: string, publicKey: string, privateKey: string): void

  function sendNotification(
    subscription: PushSubscription,
    payload?: string,
  ): Promise<unknown>

  const webpush: {
    setVapidDetails: typeof setVapidDetails
    sendNotification: typeof sendNotification
  }

  export default webpush
}

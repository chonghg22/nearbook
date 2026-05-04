export function AdSenseSlot({ slot }: { slot: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 my-8">
      <div className="h-24 bg-canvas-subtle rounded-2xl border border-border border-dashed flex items-center justify-center text-xs text-muted-foreground">
        [광고 슬롯: {slot}]
      </div>
    </div>
  )
}

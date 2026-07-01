export function AboutSection() {
  return (
    <section className="bg-canvas-subtle py-24 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-foreground mb-6">우리 동네 도서관을 더 가깝게</h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          전국 1,400개 이상의 공공도서관 데이터를 통합하여<br className="hidden md:block" />
          내가 읽고 싶은 책을 어느 도서관에서 확인할 수 있는지 알려드립니다.
        </p>
      </div>
    </section>
  )
}

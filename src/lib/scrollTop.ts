type LenisLike = {
  scrollTo: (target: number | string | HTMLElement, options?: { immediate?: boolean; force?: boolean }) => void;
};

export function scrollPageToTop() {
  const lenis = (window as Window & { __lenis?: LenisLike }).__lenis;
  const jump = () => {
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };
  jump();
  requestAnimationFrame(jump);
}

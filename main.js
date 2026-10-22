// Panel a sits left of the divider, panel b right of it. --split is the divider's position.
const figures = [...document.querySelectorAll(".fig")].map((fig) => ({
  fig,
  plate: fig.querySelector("[data-plate]"),
  range: fig.querySelector("[data-compare]"),
  beats: [...fig.querySelectorAll("[data-beat]")],
}));

function setSplit(f, percent) {
  f.plate.style.setProperty("--split", `${percent}%`);
  f.range.value = String(Math.round(percent));
}

// On wide screens the plates become a/b comparisons with a slider, for every visitor (the slider is
// user-driven, so it suits reduced motion too). Narrow screens and no-JS keep the side-by-side plates.
for (const f of figures) {
  f.range.addEventListener("input", () => setSplit(f, Number(f.range.value)));
}
const wide = matchMedia("(min-width: 900px)");
const syncCompare = () => document.documentElement.classList.toggle("compare-on", wide.matches);
wide.addEventListener("change", syncCompare);
syncCompare();

let lenis = null;
const onAnchor = (e) => {
  const a = e.target.closest('a[href^="#"]');
  const target = a && document.querySelector(a.getAttribute("href"));
  if (!lenis || !target) return;
  e.preventDefault();
  lenis.scrollTo(target, { offset: 0 });
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
};

if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  // Scroll scenes and smooth scroll only for a wide screen, a mouse or trackpad, and no reduced-motion
  // preference. gsap.matchMedia reverts everything if any of those stop being true mid-visit.
  gsap.matchMedia().add("(min-width: 900px) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.1 });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      document.addEventListener("click", onAnchor);
    }

    // Each figure pins while scroll wipes from the baseline (a) to the revision (b).
    const triggers = figures.map((f) =>
      ScrollTrigger.create({
        trigger: f.fig,
        start: "top top",
        end: "+=140%",
        pin: true,
        scrub: 0.6,
        onToggle: (self) => f.fig.classList.toggle("is-scrubbing", self.isActive),
        onUpdate: (self) => {
          // hold each end briefly so both panels can be read whole
          const p = gsap.utils.clamp(0, 1, (self.progress - 0.12) / 0.76);
          setSplit(f, 100 - p * 100);
          const beat = Math.min(f.beats.length - 1, Math.floor(self.progress * f.beats.length));
          f.beats.forEach((b, i) => b.classList.toggle("is-active", i === beat));
        },
      }),
    );
    // start each figure on its baseline (or its revision if already scrolled past)
    triggers.forEach((t, i) => setSplit(figures[i], t.progress >= 1 ? 0 : 100));
    return () => {
      if (lenis) {
        document.removeEventListener("click", onAnchor);
        gsap.ticker.remove(raf);
        lenis.destroy();
        lenis = null;
      }
      triggers.forEach((t) => t.kill());
      figures.forEach((f) => {
        f.fig.classList.remove("is-scrubbing");
        setSplit(f, 50);
      });
    };
  });
}

function raf(time) {
  lenis?.raf(time * 1000);
}

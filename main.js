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

// The slider works everywhere, with or without the scroll scenes.
for (const f of figures) {
  f.range.addEventListener("input", () => setSplit(f, Number(f.range.value)));
}

const motionOK = matchMedia("(prefers-reduced-motion: no-preference)").matches;

if (window.gsap && window.ScrollTrigger && motionOK) {
  gsap.registerPlugin(ScrollTrigger);

  // Smooth scroll only for a mouse or trackpad; touch scrolling stays native.
  if (window.Lenis && matchMedia("(pointer: fine)").matches) {
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach((a) =>
      a.addEventListener("click", (e) => {
        const target = document.querySelector(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0 });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }),
    );
  }

  // Each figure pins while scroll wipes from the baseline (a) to the revision (b).
  // ponytail: desktop only; phones get the side-by-side static plate (pre-mortem T1).
  gsap.matchMedia().add("(min-width: 900px)", () => {
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
      triggers.forEach((t) => t.kill());
      figures.forEach((f) => {
        f.fig.classList.remove("is-scrubbing");
        setSplit(f, 50);
      });
    };
  });
}

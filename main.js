// UNFINISHED FUTURES — Main interaction & scroll choreography controller
// 1. Opening sequence ("Fracture to Framework"): 5 storyboard phases driven by scroll on wide fine-pointer
//    screens, and always controllable by keyboard/mouse via the phase buttons and range scrubber.
// 2. Figure plates (Fig. 1 - Fig. 4): panel a sits left of the divider, panel b right of it.

document.documentElement.classList.add("js-ready");

const chamber = document.querySelector("[data-chamber]");
const scrubInput = document.querySelector("[data-fracture-scrub]");
const scrubOutput = document.querySelector("[data-fracture-out]");
const phaseLabel = document.querySelector("[data-phase-label]");
const shotButtons = [...document.querySelectorAll("[data-shot-btn]")];

const SHOT_PHASES = [
  { id: "1", max: 20, label: "01 / ARRIVAL: SPECIMEN", btnVal: 0 },
  { id: "2", max: 40, label: "02 / TENSION: STRESS SEAMS", btnVal: 30 },
  { id: "3", max: 65, label: "03 / FRACTURE: 12 FACETS", btnVal: 52 },
  { id: "4", max: 85, label: "04 / RECOMPOSE: PORTAL ALIGNMENT", btnVal: 75 },
  { id: "5", max: 100, label: "05 / RESOLUTION: FRAMEWORK", btnVal: 100 },
];

let heroTrigger = null;
let syncingTimer = 0;
let syncingFromControl = false;

function setChamberProgress(percent) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  const norm = clamped / 100;

  // Compute SVG fallback spread (peaks at Shot 3 ~0.55, returns to 0 during Recompose/Framework)
  // and recomposition factor (rises from 0.60 -> 1.0)
  const recompose = Math.max(0, Math.min(1, (norm - 0.6) / 0.4));
  const rawFracture = Math.max(0, Math.min(1, (norm - 0.15) / 0.45));
  const spread = rawFracture * (1 - recompose);

  if (chamber) {
    chamber.style.setProperty("--fracture-p", norm.toFixed(3));
    chamber.style.setProperty("--svg-spread", spread.toFixed(3));
    chamber.style.setProperty("--svg-recompose", recompose.toFixed(3));
    const phase = SHOT_PHASES.find((s) => clamped <= s.max) || SHOT_PHASES[SHOT_PHASES.length - 1];
    chamber.setAttribute("data-phase", phase.id);
    if (phaseLabel) phaseLabel.textContent = phase.label;
    shotButtons.forEach((btn) => {
      const active = Number(btn.getAttribute("data-shot-btn")) === phase.btnVal;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  if (scrubInput) scrubInput.value = String(Math.round(clamped));
  if (scrubOutput) scrubOutput.textContent = `${Math.round(clamped)}%`;

  window.__unfinishedSculpture?.setProgress(norm);
}

function applyManualChamberProgress(percent) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  setChamberProgress(clamped);
  if (heroTrigger) {
    syncingFromControl = true;
    if (syncingTimer) clearTimeout(syncingTimer);
    const targetScroll = Math.round(heroTrigger.start + (clamped / 100) * (heroTrigger.end - heroTrigger.start));
    window.scrollTo(0, targetScroll);
    if (typeof heroTrigger.scroll === "function") {
      heroTrigger.scroll(targetScroll);
    }
    if (lenis) {
      lenis.scrollTo(targetScroll, { immediate: true, force: true });
    }
    ScrollTrigger.update();
    syncingTimer = setTimeout(() => {
      syncingFromControl = false;
    }, 600);
  }
}

if (scrubInput) {
  scrubInput.addEventListener("input", () => {
    applyManualChamberProgress(Number(scrubInput.value));
  });
}

shotButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = Number(btn.getAttribute("data-shot-btn")) || 0;
    applyManualChamberProgress(target);
  });
});

// Initialize opening sequence at Shot 1 (Specimen)
setChamberProgress(0);

// Figure comparison plates (Fig. 1 - Fig. 4)
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

    // Opening sequence ("Fracture to Framework"): pins briefly (85% viewport scroll) so the sculpture
    // fractures into 12 facets and snaps into the 4 portal cards without holding the page hostage.
    heroTrigger = chamber
      ? ScrollTrigger.create({
          trigger: chamber,
          start: "top top",
          end: "+=85%",
          pin: true,
          scrub: 0.45,
          onUpdate: (self) => {
            if (syncingFromControl) return;
            setChamberProgress(self.progress * 100);
          },
        })
      : null;

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
      heroTrigger?.kill();
      heroTrigger = null;
      triggers.forEach((t) => t.kill());
      figures.forEach((f) => {
        f.fig.classList.remove("is-scrubbing");
        setSplit(f, 50);
      });
      setChamberProgress(0);
    };
  });
}

function raf(time) {
  lenis?.raf(time * 1000);
}

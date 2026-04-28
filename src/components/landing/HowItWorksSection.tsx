import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Escribí tu contenido",
    description: "Escribí tu post en el editor unificado. El conteo de caracteres se actualiza en tiempo real para cada plataforma.",
  },
  {
    number: "02",
    title: "Subí tus imágenes",
    description: "Agregá imágenes y mirá cómo se recortan en cada red. Las guías de aspect ratio te muestran exactamente lo que se ve.",
  },
  {
    number: "03",
    title: "Revisá cada preview",
    description: "Las cuatro previsualizaciones se actualizan mientras escribís. Detectá problemas antes que tu audiencia.",
  },
  {
    number: "04",
    title: "Publicá con confianza",
    description: "Copiá tu contenido optimizado a cada plataforma. Sin arrepentimientos después de publicar.",
  },
];

export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-foreground">
      <div className="mx-auto max-w-6xl px-6" ref={ref}>
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-semibold tracking-tight text-background md:text-4xl" style={{ letterSpacing: "-0.02em" }}>
            From draft to pixel-perfect in minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(16px)",
                filter: visible ? "blur(0)" : "blur(4px)",
                transition: `all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) ${i * 100}ms`,
              }}
            >
              <span className="text-4xl font-bold text-background/15">{step.number}</span>
              <h3 className="mt-3 text-sm font-semibold text-background">{step.title}</h3>
              <p className="mt-1.5 text-sm text-background/60 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import logoPinpost from "@/assets/logo-pinpost.png";

export function FooterSection() {
  return (
    <footer className="border-t border-border py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center text-center gap-4">
          <img src={logoPinpost} alt="PinPost" className="h-8 w-auto" />
          <p className="text-sm text-muted-foreground max-w-md">
            Previews precisos para creadores y equipos modernos. Hecho para quienes les importa cómo se ve su contenido.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-4">
            © {new Date().getFullYear()} PinPost. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

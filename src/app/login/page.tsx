import { entrarComSenha, enviarLinkMagico } from "./actions";
import { Button } from "@/components/ui";
import { Logo } from "@/components/Logo";

const MENSAGENS: Record<string, string> = {
  credenciais: "E-mail ou senha incorretos.",
  sem_acesso: "Este acesso está desativado. Fale com a equipe da Marmaris.",
  link_enviado: "Enviamos um link de acesso para o seu e-mail.",
  erro: "Não foi possível entrar. Tente de novo.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string; next?: string }>;
}) {
  const { erro, ok, next } = await searchParams;
  const aviso = erro ? MENSAGENS[erro] ?? MENSAGENS.erro : ok ? MENSAGENS[ok] : null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Brilhos de fundo */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-[var(--primary)]/25 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[520px] w-[520px] rounded-full bg-[var(--accent)]/10 blur-[140px]" />

      <div className="glass rise relative w-full max-w-[400px] rounded-[26px] p-8">
        <div className="mb-8 flex flex-col items-start">
          <Logo className="h-11 w-auto" />
          <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">Painel da Mentoria</h1>
          <p className="mt-1 text-[13.5px] text-[var(--fg-muted)]">Vender, entregar e acompanhar, em um só lugar.</p>
        </div>

        {aviso && (
          <p
            className={`rise mb-5 rounded-[12px] px-3.5 py-2.5 text-[13px] ring-1 ring-inset ${
              erro
                ? "bg-[var(--erro)]/10 text-[var(--erro)] ring-[var(--erro)]/25"
                : "bg-[var(--ok)]/10 text-[var(--ok)] ring-[var(--ok)]/25"
            }`}
          >
            {aviso}
          </p>
        )}

        <form className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/"} />
          <div className="rise rise-1">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" placeholder="voce@marmaristurismo.com" />
          </div>
          <div className="rise rise-2">
            <label htmlFor="senha">Senha</label>
            <input id="senha" name="senha" type="password" autoComplete="current-password" placeholder="••••••••" />
          </div>
          <div className="rise rise-3 space-y-2.5 pt-1">
            <Button type="submit" formAction={entrarComSenha} className="w-full">
              Entrar
            </Button>
            <Button type="submit" formAction={enviarLinkMagico} variante="secundario" className="w-full">
              Receber link mágico por e-mail
            </Button>
          </div>
        </form>

        <p className="mt-7 text-center text-[11px] uppercase tracking-[0.2em] text-[var(--fg-faint)]">
          Marmaris Viagens e Experiências
        </p>
      </div>
    </div>
  );
}

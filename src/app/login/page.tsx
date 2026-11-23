import { entrarComSenha, enviarLinkMagico } from "./actions";
import { Button } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { GloboLogin } from "@/components/GloboLogin";
import { DESTINOS } from "@/lib/destinos";

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
    <div className="relative min-h-screen overflow-hidden bg-[#050506]">
      {/* Brilho de fundo atrás do globo (também é o que aparece sem WebGL) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_72%_50%,rgba(224,38,46,0.14),transparent_62%)] max-lg:bg-[radial-gradient(90%_55%_at_50%_26%,rgba(224,38,46,0.16),transparent_65%)]" />

      <GloboLogin />

      {/* Véus para o texto ficar legível sobre as partículas */}
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] bg-gradient-to-r from-[#050506] via-[#050506]/85 to-transparent lg:block" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-[#050506] via-[#050506]/92 to-transparent lg:hidden" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1320px] flex-col px-6 py-7 sm:px-10 lg:px-14">
        <header className="rise flex items-center justify-between">
          <Logo className="h-9 w-auto" />
          <span className="hidden text-[10.5px] font-medium uppercase tracking-[0.28em] text-[var(--fg-faint)] sm:block">
            Painel da mentoria
          </span>
        </header>

        <main className="flex flex-1 items-end py-8 lg:items-center">
          <div className="w-full max-w-[400px]">
            <p className="rise rise-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Método Marmaris</p>
            <h1 className="rise rise-2 mt-4 text-[40px] font-medium leading-[1.04] tracking-[-0.035em] text-[var(--fg)] sm:text-[54px]">
              Sua agência,
              <br />
              no próximo nível.
            </h1>
            <p className="rise rise-3 mt-4 max-w-[340px] text-[14.5px] leading-relaxed text-[var(--fg-muted)]">
              Entre para acompanhar o plano, as reuniões e os materiais da mentoria.
            </p>

            {aviso && (
              <p
                className={`rise mt-6 rounded-[12px] px-3.5 py-2.5 text-[13px] ring-1 ring-inset ${
                  erro
                    ? "bg-[var(--erro)]/10 text-[var(--erro)] ring-[var(--erro)]/25"
                    : "bg-[var(--ok)]/10 text-[var(--ok)] ring-[var(--ok)]/25"
                }`}
              >
                {aviso}
              </p>
            )}

            <form className="mt-8 space-y-4">
              <input type="hidden" name="next" value={next ?? "/"} />
              <div className="rise rise-3">
                <label htmlFor="email">E-mail</label>
                <input id="email" name="email" type="email" required autoComplete="email" placeholder="voce@agencia.com.br" className="!rounded-[14px] !bg-white/[0.04] !py-3 backdrop-blur-md" />
              </div>
              <div className="rise rise-4">
                <label htmlFor="senha">Senha</label>
                <input id="senha" name="senha" type="password" autoComplete="current-password" placeholder="••••••••" className="!rounded-[14px] !bg-white/[0.04] !py-3 backdrop-blur-md" />
              </div>
              <div className="rise rise-5 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <Button type="submit" formAction={entrarComSenha} className="!px-7 !py-3 sm:min-w-[150px]">
                  Entrar
                </Button>
                <Button type="submit" formAction={enviarLinkMagico} variante="fantasma" className="!py-3">
                  Receber link por e-mail
                </Button>
              </div>
            </form>
          </div>
        </main>

        <footer className="rise rise-6 flex items-end justify-between gap-6 text-[10px] uppercase tracking-[0.22em] text-[var(--fg-faint)]">
          <span>Marmaris Viagens e Experiências</span>
          <span className="hidden max-w-[52%] text-right leading-relaxed lg:block">
            {DESTINOS.map((d) => d.nome).join("  ·  ")}
          </span>
        </footer>
      </div>
    </div>
  );
}

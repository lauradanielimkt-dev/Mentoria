import { entrarComSenha, enviarLinkMagico } from "./actions";
import { Button } from "@/components/ui";

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
    <div className="flex min-h-screen items-center justify-center bg-[var(--sidebar)] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)] text-lg font-bold text-[var(--primary-fg)]">
            M
          </div>
          <div>
            <h1 className="text-lg font-semibold">Mentoria Marmaris</h1>
            <p className="text-xs text-[var(--fg-muted)]">Painel de gestão</p>
          </div>
        </div>

        {aviso && (
          <p
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              erro ? "bg-[var(--erro)]/10 text-[var(--erro)]" : "bg-[var(--ok)]/10 text-[var(--ok)]"
            }`}
          >
            {aviso}
          </p>
        )}

        <form className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/"} />
          <div>
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <label htmlFor="senha">Senha</label>
            <input id="senha" name="senha" type="password" autoComplete="current-password" />
          </div>
          <Button type="submit" formAction={entrarComSenha} className="w-full">
            Entrar
          </Button>
          <Button type="submit" formAction={enviarLinkMagico} variante="secundario" className="w-full">
            Receber link mágico por e-mail
          </Button>
        </form>
      </div>
    </div>
  );
}

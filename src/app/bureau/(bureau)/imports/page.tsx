import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/store";
import { IMPORT_STATUS_LABELS } from "@/lib/types";
import { aiConfigured, AI_TASKS } from "@/lib/ai";
import { driveConfigured, driveConnected, listFolderFiles, listFolders, redirectUri, type DriveFile } from "@/lib/drive";
import { DisconnectDrive, DriveFileRow, DriveFolderForm, DriveRefForm, ImportTools, PasteForm, UploadForm } from "@/components/bureau/ImportForms";

export const metadata = { title: "Imports & Drive" };

const DRIVE_MESSAGES: Record<string, string> = {
  connecte: "Google Drive connecté. Choisissez maintenant le dossier autorisé.",
  refuse: "Autorisation Google refusée.",
  echec: "La connexion à Google a échoué.",
  "etat-invalide": "Session OAuth expirée ou invalide, réessayez.",
  "non-configure": "Configurez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.",
};

const SOURCE_LABEL = { upload: "Fichier", paste: "Texte collé", drive_ref: "Lien Drive", drive_api: "Google Drive" };

export default async function ImportsPage({ searchParams }: PageProps<"/bureau/imports">) {
  await requireAdmin();
  const sp = await searchParams;
  const repo = getRepo();
  const [books, imports, settings] = await Promise.all([repo.listBooks(), repo.listImports(), repo.getSettings()]);
  const opts = books.map((b) => ({ id: b.id, title: b.title })).sort((a, b) => a.title.localeCompare(b.title, "fr"));

  const configured = driveConfigured();
  const connected = configured && (await driveConnected());
  let folders: DriveFile[] = [];
  let files: DriveFile[] = [];
  let driveError: string | null = null;
  if (connected) {
    try {
      folders = await listFolders();
      if (settings.driveFolderId) files = await listFolderFiles(settings.driveFolderId);
    } catch (e) {
      driveError = e instanceof Error ? e.message : "Erreur Drive";
    }
  }
  const driveMsg = typeof sp.drive === "string" ? DRIVE_MESSAGES[sp.drive] : null;

  return (
    <div className="max-w-6xl space-y-14">
      <div>
        <p className="eyebrow">Enrichir la bibliothèque</p>
        <h1 className="display mt-3 text-5xl">Imports & Google Drive</h1>
      </div>

      <section className="space-y-5">
        <h2 className="display text-3xl">Méthode 1 — Import manuel</h2>
        <div className="grid gap-5 lg:grid-cols-3">
          <UploadForm books={opts} />
          <PasteForm books={opts} />
          <DriveRefForm books={opts} />
        </div>
      </section>

      <section className="panel space-y-5 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="display text-3xl">Méthode 2 — Google Drive connecté</h2>
          {connected && <DisconnectDrive />}
        </div>
        {driveMsg && <p role="status" className="text-sm text-gold-bright">{driveMsg}</p>}
        {!configured ? (
          <div className="space-y-2 text-sm text-muted">
            <p>Non configuré. Pour activer la synchronisation en lecture seule :</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Créez un client OAuth « Application Web » dans Google Cloud Console et activez l&apos;API Google Drive.</li>
              <li>URI de redirection autorisée : <code className="text-gold">{redirectUri()}</code></li>
              <li>Renseignez <code className="text-gold">GOOGLE_CLIENT_ID</code> et <code className="text-gold">GOOGLE_CLIENT_SECRET</code>, puis redémarrez.</li>
            </ol>
            <p>En attendant, l&apos;import manuel et les liens Drive fonctionnent normalement.</p>
          </div>
        ) : !connected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">Accès en lecture seule. SCRYPTORIUM ne modifie, ne partage et ne rend jamais publics vos documents.</p>
            <a href="/api/drive/connect" className="btn">Connecter mon Google Drive</a>
          </div>
        ) : (
          <div className="space-y-6">
            {driveError && <p role="alert" className="text-sm text-[#e3949e]">{driveError}</p>}
            <DriveFolderForm folders={folders.map((f) => ({ id: f.id, name: f.name }))} current={settings.driveFolderId} />
            {settings.driveFolderId && (
              <div>
                <p className="label">Documents compatibles dans « {settings.driveFolderName} »</p>
                {files.length === 0 ? (
                  <p className="text-sm text-muted">Aucun Google Doc, PDF, DOCX ou TXT dans ce dossier.</p>
                ) : (
                  <ul className="divide-y divide-line border-y border-line">
                    {files.map((f) => (
                      <DriveFileRow key={f.id} file={f} books={opts} imported={imports.some((i) => i.driveFileId === f.id)} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <h2 className="display text-3xl">Documents importés</h2>
        {imports.length === 0 ? (
          <p className="text-muted">Aucun import pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-5">
            {imports.map((i) => {
              const dupes = i.contentHash ? imports.filter((j) => j.id !== i.id && j.contentHash === i.contentHash).length : 0;
              return (
                <li key={i.id} id={i.id} className="panel space-y-4 p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="font-[family-name:var(--font-display)] text-2xl text-cream">{i.fileName ?? (i.driveUrl ? "Document Drive" : "Texte collé")}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">
                      {SOURCE_LABEL[i.source]} · {IMPORT_STATUS_LABELS[i.status]} · {new Date(i.createdAt).toLocaleDateString("fr-FR")}
                      {dupes > 0 && <span className="ml-2 text-[#e3949e]">· doublon ×{dupes}</span>}
                    </p>
                  </div>
                  {i.driveUrl && <a href={i.driveUrl} target="_blank" rel="noreferrer noopener" className="link-gilt text-sm text-gold">Ouvrir dans Google Drive ↗</a>}
                  <ImportTools id={i.id} bookId={i.bookId} books={opts} text={i.text} aiDraft={i.aiDraft} aiEnabled={aiConfigured()} tasks={AI_TASKS} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

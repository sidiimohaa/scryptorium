"use client";
import { useActionState } from "react";
import { importSummariesToBooks, importDriveRef, importFile, importPaste, driveSetFolder, driveImport, importToNote, generateDraft, linkImport, deleteImport, driveDisconnect } from "@/app/bureau/actions";
import { Feedback, Submit } from "./FormStatus";

type Opt = { id: string; title: string };

function BookSelect({ books, name = "bookId", value }: { books: Opt[]; name?: string; value?: string | null }) {
  return (
    <select name={name} defaultValue={value ?? ""} className="field">
      <option value="">— associer plus tard —</option>
      {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
    </select>
  );
}

export function UploadForm({ books }: { books: Opt[] }) {
  const [state, action] = useActionState(importFile, null);
  return (
    <form action={action} className="panel space-y-4 p-6">
      <h3 className="display text-2xl">Téléverser un document</h3>
      <p className="text-sm text-muted">PDF, DOCX, TXT ou MD — 10 Mo max. Le texte est extrait côté serveur.</p>
      <input type="file" name="file" required accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" className="field file:mr-3 file:border-0 file:bg-gold/20 file:px-3 file:py-1 file:text-cream" />
      <BookSelect books={books} />
      <div className="flex flex-wrap items-center gap-4"><Submit>Importer</Submit><Feedback state={state} /></div>
    </form>
  );
}

export function PasteForm({ books }: { books: Opt[] }) {
  const [state, action] = useActionState(importPaste, null);
  return (
    <form action={action} className="panel space-y-4 p-6">
      <h3 className="display text-2xl">Coller un texte</h3>
      <input name="label" placeholder="Intitulé (facultatif)" className="field" maxLength={300} />
      <textarea name="text" required rows={6} className="field" placeholder="Vos notes de lecture…" />
      <BookSelect books={books} />
      <div className="flex flex-wrap items-center gap-4"><Submit>Enregistrer</Submit><Feedback state={state} /></div>
    </form>
  );
}

export function DriveRefForm({ books }: { books: Opt[] }) {
  const [state, action] = useActionState(importDriveRef, null);
  return (
    <form action={action} className="panel space-y-4 p-6">
      <h3 className="display text-2xl">Référencer un document Drive</h3>
      <p className="text-sm text-muted">Enregistre seulement le lien — le document reste privé sur votre Drive.</p>
      <input name="url" type="url" required placeholder="https://docs.google.com/document/d/…" className="field" />
      <input name="label" placeholder="Intitulé (facultatif)" className="field" />
      <BookSelect books={books} />
      <div className="flex flex-wrap items-center gap-4"><Submit>Référencer</Submit><Feedback state={state} /></div>
    </form>
  );
}

export function DriveFolderForm({ folders, current }: { folders: { id: string; name: string }[]; current: string | null }) {
  const [state, action] = useActionState(driveSetFolder, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="block min-w-64 flex-1">
        <span className="label">Dossier autorisé</span>
        <select name="folder" defaultValue={current ? folders.find((f) => f.id === current) ? `${current}|${folders.find((f) => f.id === current)!.name}` : "" : ""} className="field">
          <option value="">— choisir —</option>
          {folders.map((f) => <option key={f.id} value={`${f.id}|${f.name}`}>{f.name}</option>)}
        </select>
      </label>
      <Submit className="btn px-4 py-2.5">Autoriser ce dossier</Submit>
      <Feedback state={state} />
    </form>
  );
}

export function DriveFileRow({ file, books, imported }: { file: { id: string; name: string; mimeType: string; modifiedTime: string; webViewLink?: string }; books: Opt[]; imported: boolean }) {
  const [state, action] = useActionState(driveImport, null);
  return (
    <li className="grid gap-3 py-4 md:grid-cols-[2fr_1.5fr_auto] md:items-center">
      <div>
        <p className="text-parchment">{file.name}</p>
        <p className="text-xs text-muted">
          Modifié le {new Date(file.modifiedTime).toLocaleDateString("fr-FR")}
          {imported && <span className="ml-2 text-gold-soft">· déjà importé</span>}
          {file.webViewLink && <> · <a href={file.webViewLink} target="_blank" rel="noreferrer noopener" className="link-gilt">aperçu dans Drive ↗</a></>}
        </p>
        <Feedback state={state} />
      </div>
      <form action={action} id={`drive-${file.id}`} className="contents">
        <input type="hidden" name="fileId" value={file.id} />
        <BookSelect books={books} />
        <Submit className="btn px-4 py-2">{imported ? "Réimporter" : "Importer"}</Submit>
      </form>
    </li>
  );
}

export function DisconnectDrive() {
  return (
    <button type="button" onClick={() => confirm("Déconnecter Google Drive ? Le jeton d'accès sera révoqué.") && driveDisconnect()} className="text-xs uppercase tracking-[0.2em] text-muted hover:text-[#e3949e]">
      Déconnecter
    </button>
  );
}

export function ImportTools({ id, bookId, books, text, aiDraft, aiEnabled, tasks }: { id: string; bookId: string | null; books: Opt[]; text: string; aiDraft: string | null; aiEnabled: boolean; tasks: Record<string, string> }) {
  const [noteState, noteAction] = useActionState(importToNote, null);
  const [aiState, aiAction] = useActionState(generateDraft, null);
  const [sumState, sumAction] = useActionState(importSummariesToBooks, null);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-64">
          <span className="label">Ouvrage associé</span>
          <select defaultValue={bookId ?? ""} onChange={(e) => linkImport(id, e.target.value || null)} className="field">
            <option value="">— aucun —</option>
            {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => confirm("Supprimer cet import ? Les notes déjà créées sont conservées.") && deleteImport(id)} className="btn btn-danger px-4 py-2.5">Supprimer l&apos;import</button>
      </div>
      {text && (
        <form action={sumAction} className="space-y-2 border-b border-line pb-5">
          <input type="hidden" name="importId" value={id} />
          <p className="text-sm text-muted">Document de résumés (« Titre de Auteur », texte, « Je le note x/5 ») : créer les fiches manquantes et mettre à jour les existantes. Vos textes et vos notes sont repris tels quels.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Submit className="btn px-4 py-2">Créer / mettre à jour les fiches</Submit>
            <Feedback state={sumState} />
          </div>
        </form>
      )}
      {text && (
        <form action={noteAction} className="space-y-3">
          <input type="hidden" name="importId" value={id} />
          <details>
            <summary className="cursor-pointer text-sm text-gold">Aperçu et sélection du texte ({text.length.toLocaleString("fr-FR")} caractères)</summary>
            <textarea name="content" defaultValue={text} rows={10} className="field mt-3" />
          </details>
          <div className="flex flex-wrap items-center gap-4">
            <Submit className="btn btn-ghost border-gold-soft px-4 py-2">Ajouter aux notes privées de l&apos;ouvrage</Submit>
            <Feedback state={noteState} />
          </div>
        </form>
      )}
      {text && (
        <form action={aiAction} className="space-y-3 border-t border-line pt-5">
          <input type="hidden" name="importId" value={id} />
          <p className="label">Assistant de lecture (brouillon, jamais publié automatiquement)</p>
          {aiEnabled ? (
            <div className="flex flex-wrap items-center gap-3">
              <select name="task" className="field w-auto">
                {Object.entries(tasks).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <Submit className="btn px-4 py-2">Proposer un brouillon</Submit>
              <Feedback state={aiState} />
            </div>
          ) : (
            <p className="text-sm text-muted">Définissez <code className="text-gold">ANTHROPIC_API_KEY</code> pour activer l&apos;assistant. Sans clé, l&apos;import manuel fonctionne normalement.</p>
          )}
          {aiDraft && (
            <div>
              <p className="text-xs text-muted">Copiez les passages utiles dans la fiche — après relecture. Les sections « Repères généraux » ne proviennent pas de vos notes.</p>
              <textarea readOnly value={aiDraft} rows={14} className="field mt-2" />
            </div>
          )}
        </form>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react'

interface UpdateInfo {
  version: string
  critical: boolean
  releaseNotes: string
}

declare global {
  interface Window {
    electronAPI?: {
      platform: string
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void
      onUpdateReady: (callback: () => void) => void
      installUpdate: () => void
    }
  }
}

export function UpdateManager() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info)
    })

    window.electronAPI.onUpdateReady(() => {
      setReady(true)
    })
  }, [])

  if (!updateInfo) return null

  const handleInstall = () => {
    if (ready) window.electronAPI?.installUpdate()
  }

  // ── Atualização crítica: bloqueia toda a UI ───────────────────────────────
  if (updateInfo.critical) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center bg-bg"
        style={{ zIndex: 9999 }}
      >
        <div className="flex flex-col items-center gap-6 w-full max-w-md px-8 text-center">
          {/* Ícone de alerta */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full border"
            style={{ backgroundColor: 'rgba(224,108,117,0.12)', borderColor: 'rgba(224,108,117,0.35)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          {/* Título e descrição */}
          <div>
            <h1 className="text-2xl font-bold text-text mb-2">Atualização Obrigatória</h1>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Uma atualização crítica está disponível. O app não pode ser usado até que ela seja instalada.
            </p>
          </div>

          {/* Release notes */}
          {updateInfo.releaseNotes && (
            <div className="w-full rounded-lg border p-4 text-left" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-mute)' }}>
                Versão {updateInfo.version}
              </p>
              <p className="text-sm leading-relaxed text-text">{updateInfo.releaseNotes}</p>
            </div>
          )}

          {/* Botão de instalar */}
          <button
            onClick={handleInstall}
            disabled={!ready}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold text-sm transition-all"
            style={{
              backgroundColor: ready ? 'var(--gold)' : 'rgba(240,192,96,0.4)',
              color: 'var(--bg)',
              cursor: ready ? 'pointer' : 'wait',
            }}
          >
            {ready ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Reiniciar e instalar
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" style={{ animationDuration: '1.5s' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Baixando atualização...
              </>
            )}
          </button>

          {!ready && (
            <p className="text-xs" style={{ color: 'var(--text-mute)' }}>
              O app será reiniciado automaticamente após o download.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Atualização normal: banner não bloqueante ─────────────────────────────
  if (dismissed) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 flex items-center justify-between px-6"
      style={{ zIndex: 60, height: '40px', backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
        Nova versão disponível:{' '}
        <span className="font-medium text-text">{updateInfo.version}</span>
      </span>

      <div className="flex items-center gap-3">
        <button
          onClick={handleInstall}
          disabled={!ready}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all"
          style={{
            backgroundColor: ready ? 'var(--gold)' : 'rgba(240,192,96,0.35)',
            color: 'var(--bg)',
            cursor: ready ? 'pointer' : 'wait',
          }}
        >
          {ready ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Atualizar agora
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.5s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Baixando...
            </>
          )}
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="transition-colors"
          title="Ignorar"
          style={{ color: 'var(--text-mute)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-mute)')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import type { Session, Settings } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { sendMessage } from '@/shared/messages';
import { AutoNextController } from './auto-next';
import { getPuzzleId, getPuzzleSetName, isPuzzlePage } from './adapters/chesscom';
import { Overlay } from './components/Overlay';
import '@/styles/tokens.css';
import '@/styles/global.css';
import './overlay.css';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const autoNextRef = useRef<AutoNextController | null>(null);

  const syncAutoNext = (s: Session | null, cfg: Settings) => {
    if (!autoNextRef.current) {
      autoNextRef.current = new AutoNextController(cfg, async (result, durationMs, puzzleId, stopOnFail) => {
        await sendMessage({
          type: 'PUZZLE_RESULT',
          result,
          puzzleId,
          durationMs,
        });
        if (stopOnFail && result === 'failed') {
          await sendMessage({ type: 'SESSION_STOP' });
        }
      });
    } else {
      autoNextRef.current.updateSettings(cfg);
    }

    if (s && s.status === 'running') {
      autoNextRef.current.start();
    } else {
      autoNextRef.current.stop();
    }
  };

  useEffect(() => {
    sendMessage({ type: 'GET_STATE' }).then((res) => {
      if (res.ok) {
        setSession(res.session);
        setSettings(res.settings);
        syncAutoNext(res.session, res.settings);
      }
    });

    const onMsg = (msg: {
      type: string;
      session?: Session | null;
      settings?: Settings;
      enabled?: boolean;
    }) => {
      if (msg.type === 'SESSION_STATE') {
        setSession(msg.session ?? null);
        const cfg = msg.settings ?? settings;
        if (msg.settings) setSettings(msg.settings);
        syncAutoNext(msg.session ?? null, cfg);
      }
      if (msg.type === 'AUTO_NEXT') {
        if (msg.enabled) autoNextRef.current?.start();
        else autoNextRef.current?.stop();
      }
    };
    chrome.runtime.onMessage.addListener(onMsg);
    return () => chrome.runtime.onMessage.removeListener(onMsg);
  }, []);

  useEffect(() => {
    syncAutoNext(session, settings);
  }, [session?.status, session?.id]);

  return <Overlay session={session} settings={settings} />;
}

function mount(): void {
  if (document.getElementById('puzzleflow-root')) return;
  const host = document.createElement('div');
  host.id = 'puzzleflow-root';
  document.body.appendChild(host);
  createRoot(host).render(<App />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_PAGE_INFO') {
    sendResponse({
      isPuzzlePage: isPuzzlePage(),
      puzzleSetUrl: window.location.href,
      puzzleSetName: getPuzzleSetName(),
    });
    return true;
  }
});

import { useCallback, useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { ApiError } from '../../../api/client';
import { finishWalk, getWalks, savePoints, startWalk } from './api';
import { PointQueue } from './PointQueue';
import { useLiveWalk } from './useLiveWalk';
import { toWalk, type SavedWalk, type RecordedPoint } from './types';

type Phase = 'idle' | 'starting' | 'startFailed' | 'recording' | 'pending';

export function useWalkRecorder(token: string) {
  const gps = useLiveWalk();
  const [history, setHistory] = useState<SavedWalk[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [error, setError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [busy, setBusy] = useState(false);
  const [activeWalk, setActiveWalk] = useState<SavedWalk | null>(null);
  const [points, setPoints] = useState<RecordedPoint[]>([]);
  const [pending, setPending] = useState(0);
  const historyRequest = useRef(0);
  const queue = useRef(new PointQueue());
  const walk = useRef<SavedWalk | null>(null);
  const requestId = useRef<string | null>(null);
  const endedAt = useRef<string | null>(null);
  const operation = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const report = useCallback((err: unknown) => {
    if (!alive.current) return;
    if (err instanceof ApiError && err.status === 401) setNeedsLogin(true);
    setError(err instanceof Error ? err.message : '保存できませんでした。再試行してください。');
  }, []);

  const load = useCallback(() => {
    const version = ++historyRequest.current;
    return getWalks(token).then(data => {
      if (alive.current && version === historyRequest.current) { setHistory(data); setHistoryError(''); }
    }).catch(err => {
      if (alive.current && version === historyRequest.current) {
        setHistoryError('履歴を読み込めませんでした。');
        if (err instanceof ApiError && err.status === 401) setNeedsLogin(true);
      }
    }).finally(() => {
      if (alive.current && version === historyRequest.current) setLoading(false);
    });
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  const reload = () => { setLoading(true); void load(); };

  const flush = useCallback(async () => {
    const id = walk.current?.id;
    if (!id) return;
    try { await queue.current.flush(points => savePoints(token, id, points)); }
    finally { if (alive.current) setPending(queue.current.pending); }
  }, [token]);

  useEffect(() => {
    if (phase !== 'recording' || needsLogin) return;
    const interval = setInterval(() => {
      if (operation.current || !queue.current.pending) return;
      operation.current = true;
      setBusy(true);
      void flush().then(() => setError('')).catch(report).finally(() => {
        operation.current = false;
        if (alive.current) setBusy(false);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [phase, needsLogin, flush, report]);

  const start = async () => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError('');
    setPhase('starting');
    try {
      await gps.prepare();
      if (!alive.current) return;
      requestId.current ??= randomUUID();
      const saved = await startWalk(token, requestId.current);
      if (!alive.current) return;
      walk.current = saved;
      setActiveWalk(saved);
      setPoints([]);
      setPending(0);
      // A retry of start reuses the same server record.
      queue.current = new PointQueue();
      endedAt.current = null;
      await gps.start(point => {
        queue.current.add(point);
        setPoints([...queue.current.points]);
        setPending(queue.current.pending);
      }, () => {
        gps.stop();
        endedAt.current ??= new Date().toISOString();
        setPhase('pending');
        setError('位置情報の取得が止まりました。取得済みの記録を保存してください。');
      });
      // An asynchronous GPS error can arrive before watchPositionAsync resolves.
      if (!endedAt.current) setPhase('recording');
    } catch (err) {
      gps.stop();
      if (walk.current) {
        endedAt.current ??= new Date().toISOString();
        setPhase('pending');
      } else setPhase(requestId.current ? 'startFailed' : 'idle');
      report(err);
    } finally {
      operation.current = false;
      if (alive.current) setBusy(false);
    }
  };

  const finish = async () => {
    if (operation.current || !walk.current) return;
    operation.current = true;
    gps.stop();
    endedAt.current ??= new Date().toISOString();
    setPhase('pending');
    setBusy(true);
    setError('');
    try {
      await flush();
      const saved = await finishWalk(token, walk.current.id, endedAt.current);
      if (!alive.current) return;
      historyRequest.current += 1;
      setLoading(false);
      setHistory(previous => [saved, ...previous.filter(item => item.id !== saved.id)]);
      walk.current = null;
      setActiveWalk(null);
      setPoints([]);
      setPending(0);
      requestId.current = null;
      queue.current = new PointQueue();
      setPhase('idle');
    } catch (err) { report(err); }
    finally {
      operation.current = false;
      if (alive.current) setBusy(false);
    }
  };

  const retrySave = async () => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    try { await flush(); setError(''); } catch (err) { report(err); }
    finally { operation.current = false; if (alive.current) setBusy(false); }
  };

  const live = activeWalk;
  const walks = history.filter(item => item.id !== live?.id).map(toWalk);
  if (live) walks.push({
    id: live.id, startedAt: live.started_at,
    points: points.map(p => ({ lat: p.latitude, lng: p.longitude })),
  });
  return {
    walks, current: phase === 'idle' ? null : gps.current, loading, historyError, error,
    phase, busy, locked: phase !== 'idle', needsLogin,
    pending, count: points.length,
    start, finish, retrySave, reload,
    authenticated: () => { setNeedsLogin(false); setError(''); },
  };
}

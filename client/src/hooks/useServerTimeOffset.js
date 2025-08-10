import { useEffect, useRef, useState } from 'react';
import api from '../api.js';

export default function useServerTimeOffset() {
  const [offset, setOffset] = useState(0);
  const timer = useRef(null);

  const sync = async () => {
    const t0 = Date.now();
    const { data } = await api.get('/time'); // ya lleva _ts
    const t1 = Date.now();
    const rtt = t1 - t0;
    // estimamos el "ahora" del server en el medio del RTT
    const estimatedServerNow = data.serverTime + rtt / 2;
    setOffset(estimatedServerNow - t1);
  };

  useEffect(() => {
    sync();
    timer.current = setInterval(sync, 60_000);
    return () => clearInterval(timer.current);
  }, []);

  return offset;
}

import React, { useState, useEffect, useRef } from 'react';
import { Shield, Sword, Zap, Target, Activity, Flame, Crosshair, TrendingUp, TrendingDown, XCircle, Info } from 'lucide-react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { io, Socket } from 'socket.io-client';

interface Position {
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  size: number;
}

const TradingWar = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  
  const [price, setPrice] = useState(100);
  const [balance, setBalance] = useState(10000);
  const [bullPower, setBullPower] = useState(50);
  const [bearPower, setBearPower] = useState(50);
  const [rsi, setRsi] = useState(50);
  const [macd, setMacd] = useState(0);
  const [range, setRange] = useState({ high: 105, low: 95 });
  const [unlockedIndicators, setUnlockedIndicators] = useState<string[]>([]);
  const [position, setPosition] = useState<Position | null>(null);
  const [showBriefing, setShowBriefing] = useState(true);
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info' | 'warn' | 'success'}[]>([
    { time: '13:44', msg: 'SYSTEM INITIALIZED...', type: 'info' },
    { time: '13:45', msg: 'RADAR_LINK_STABLE', type: 'info' }
  ]);

  const addLog = (msg: string, type: 'info' | 'warn' | 'success' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ time, msg, type }, ...prev].slice(0, 5));
  };

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('market_update', (data) => {
      const { price, bullPower, bearPower, rsi, macd, high, low } = data;
      setPrice(price);
      setBullPower(bullPower);
      setBearPower(bearPower);
      setRsi(rsi);
      setMacd(macd);
      setRange({ high, low });
      
      if (lineSeriesRef.current) {
        lineSeriesRef.current.update({
          time: (Date.now() / 1000) as any,
          value: price
        });
      }

      setBalance(prev => {
        const triggers = [
          { threshold: 11000, code: 'RSI', name: 'RSI_RECON_SCAN' },
          { threshold: 15000, code: 'MACD', name: 'MACD_OVERDRIVE' },
          { threshold: 25000, code: 'FIB', name: 'FIB_TACTICAL_GRID' }
        ];
        triggers.forEach(t => {
          if (prev >= t.threshold && !unlockedIndicators.includes(t.code)) {
            setUnlockedIndicators(u => [...u, t.code]);
            addLog(`NEW_TECH_UNLOCKED: ${t.name}`, 'success');
          }
        });
        return prev;
      });
    });

    socketRef.current.on('commander_attack', (data) => {
      addLog(`ALERT: ${data.msg}`, 'warn');
      const battlefield = document.getElementById('battlefield');
      if (battlefield) {
        battlefield.classList.add('animate-ping');
        setTimeout(() => battlefield.classList.remove('animate-ping'), 500);
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [unlockedIndicators]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showBriefing) {
        if (e.key === 'Enter') setShowBriefing(false);
        return;
      }
      switch(e.key.toLowerCase()) {
        case 'q': deployBulls(); break;
        case 'w': deployBears(); break;
        case 'a': enterPosition('LONG'); break;
        case 's': enterPosition('SHORT'); break;
        case 'd': closePosition(); break;
        case 'i': setShowBriefing(true); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [price, position, showBriefing]);

  useEffect(() => {
    if (chartContainerRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: { background: { color: '#0a0a0c' }, textColor: '#00ffcc' },
        grid: { vertLines: { color: '#1a1a20' }, horzLines: { color: '#1a1a20' } },
        timeScale: { timeVisible: true, secondsVisible: true },
      });
      const lineSeries = chart.addAreaSeries({
        lineColor: '#00ffcc',
        topColor: 'rgba(0, 255, 204, 0.4)',
        bottomColor: 'rgba(0, 255, 204, 0)',
        lineWidth: 2,
      });
      chartRef.current = chart;
      lineSeriesRef.current = lineSeries;
      const handleResize = () => chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const deployBulls = () => {
    socketRef.current?.emit('deploy_bulls');
    setBalance(prev => prev - 100);
    addLog('DEPLOYING BULL REINFORCEMENTS...', 'info');
  };

  const deployBears = () => {
    socketRef.current?.emit('deploy_bears');
    setBalance(prev => prev - 100);
    addLog('INITIATING BEAR SIEGE...', 'warn');
  };

  const enterPosition = (type: 'LONG' | 'SHORT') => {
    if (position) return;
    const size = 1000;
    setPosition({ type, entryPrice: price, size });
    addLog(`ENGAGED: ${type} @ ${price.toFixed(4)}`, 'success');
  };

  const closePosition = () => {
    if (!position) return;
    const pnl = position.type === 'LONG' 
      ? (price - position.entryPrice) * position.size
      : (position.entryPrice - price) * position.size;
    
    setBalance(prev => prev + pnl);
    setPosition(null);
    addLog(`DISSENGAGED: P&L $${pnl.toFixed(2)}`, pnl >= 0 ? 'success' : 'warn');
  };

  const currentPnl = position 
    ? (position.type === 'LONG' ? (price - position.entryPrice) * position.size : (position.entryPrice - price) * position.size)
    : 0;

  const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786];

  return (
    <div className="min-h-screen bg-[#050507] text-[#00ffcc] font-mono p-4 overflow-hidden select-none">
      {/* HUD Header */}
      <div className="flex justify-between items-center border-b border-[#00ffcc]/30 pb-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold tracking-tighter flex items-center gap-2">
            <Activity className="animate-pulse" /> TRADING_WAR.EXE
          </div>
          <div className="bg-[#1a1a20] px-4 py-1 border border-[#00ffcc]/50 shadow-[0_0_10px_rgba(0,255,204,0.3)]">
            CREDITS: <span className="text-white">${balance.toFixed(2)}</span>
          </div>
          {position && (
            <div className={`px-4 py-1 border ${currentPnl >= 0 ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'} animate-pulse`}>
              ACTIVE_PNL: <span className="text-white">${currentPnl.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <div className="text-[10px] opacity-50 text-green-400">BULL_FORCE_INDEX [Q]</div>
            <div className="w-48 h-1.5 bg-gray-800 mt-1 rounded-full overflow-hidden border border-green-900">
              <div className="h-full bg-green-500 shadow-[0_0_15px_#22c55e] transition-all duration-300" style={{ width: `${Math.min(bullPower, 100)}%` }} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] opacity-50 text-red-400">BEAR_FORCE_INDEX [W]</div>
            <div className="w-48 h-1.5 bg-gray-800 mt-1 rounded-full overflow-hidden border border-red-900">
              <div className="h-full bg-red-500 shadow-[0_0_15px_#ef4444] transition-all duration-300" style={{ width: `${Math.min(bearPower, 100)}%` }} />
            </div>
          </div>
          <button onClick={() => setShowBriefing(true)} className="p-2 border border-[#00ffcc]/30 hover:bg-[#00ffcc]/10">
            <Info size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
        {/* Left Sidebar - Power Ups */}
        <div className="col-span-2 border-r border-[#00ffcc]/20 pr-4 flex flex-col gap-4">
          <div className="text-[10px] font-bold mb-2 opacity-30 tracking-[0.2em]">TACTICAL_INDICATORS</div>
          {[
            { code: 'RSI', name: 'RSI_RECON_SCAN', icon: Shield, req: '$11K' },
            { code: 'MACD', name: 'MACD_OVERDRIVE', icon: Zap, req: '$15K' },
            { code: 'FIB', name: 'FIB_TACTICAL_GRID', icon: Target, req: '$25K' }
          ].map(tech => (
            <button key={tech.code} className={`flex items-center gap-3 p-3 border ${unlockedIndicators.includes(tech.code) ? 'border-[#00ffcc]/50 bg-[#00ffcc]/10 shadow-[0_0_10px_rgba(0,255,204,0.1)]' : 'border-[#00ffcc]/10 bg-[#111115] opacity-40 grayscale cursor-not-allowed border-dashed'} group transition-all`}>
              <tech.icon size={18} className={unlockedIndicators.includes(tech.code) ? 'text-[#00ffcc]' : 'text-white/30'} />
              <div className="text-left">
                <div className="text-xs font-bold">{tech.name}</div>
                <div className="text-[9px] opacity-50">
                  {unlockedIndicators.includes(tech.code) ? 'STATUS: ACTIVE' : `LOCKED: ${tech.req}`}
                </div>
              </div>
            </button>
          ))}
          
          {unlockedIndicators.includes('RSI') && (
            <div className="mt-4 p-3 border border-yellow-500/30 bg-yellow-500/5 animate-pulse">
              <div className="text-[10px] font-bold text-yellow-500 mb-1 flex items-center gap-1">
                <Activity size={10} /> RECON_DATA: RSI
              </div>
              <div className="text-xl font-black text-white">{rsi.toFixed(2)}</div>
              <div className="text-[8px] opacity-60">
                {rsi > 70 ? 'OVERBOUGHT: SELL PRESSURE LIKELY' : rsi < 30 ? 'OVERSOLD: BUY PRESSURE LIKELY' : 'ZONE: NEUTRAL'}
              </div>
            </div>
          )}

          {unlockedIndicators.includes('MACD') && (
            <div className="mt-2 p-3 border border-blue-500/30 bg-blue-500/5">
              <div className="text-[10px] font-bold text-blue-500 mb-1 flex items-center gap-1">
                <Flame size={10} /> MOMENTUM: MACD
              </div>
              <div className={`text-xl font-black ${macd > 0 ? 'text-green-400' : 'text-red-400'}`}>{macd.toFixed(4)}</div>
            </div>
          )}
          
          <div className="mt-auto p-4 border border-[#00ffcc]/10 bg-[#0a0a0c]">
             <div className="text-[10px] font-bold opacity-30 mb-2">ENGAGEMENT_INTEL</div>
             <p className="text-[10px] leading-relaxed text-white/50 italic">
               "Deploy reinforcements [Q/W] to move the price. Enter [A/S] to capture profit. Exit [D] when mission is complete."
             </p>
          </div>
        </div>

        {/* Main Battlefield */}
        <div id="battlefield" className="col-span-8 relative group transition-all duration-300">
          {unlockedIndicators.includes('RSI') && rsi > 70 && (
            <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none z-10 flex items-center justify-center">
              <div className="border-4 border-red-500/50 p-4 text-red-500 font-black text-2xl tracking-[0.5em] rotate-12 opacity-50">EXHAUSTION_ALERT: SELL</div>
            </div>
          )}
          {unlockedIndicators.includes('RSI') && rsi < 30 && (
            <div className="absolute inset-0 bg-green-500/10 animate-pulse pointer-events-none z-10 flex items-center justify-center">
              <div className="border-4 border-green-500/50 p-4 text-green-500 font-black text-2xl tracking-[0.5em] -rotate-12 opacity-50">EXHAUSTION_ALERT: BUY</div>
            </div>
          )}

          {unlockedIndicators.includes('MACD') && Math.abs(macd) > 0.05 && (
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 transition-all duration-500 ${macd > 0 ? 'text-green-500/5 scale-[2]' : 'text-red-500/5 scale-[2]'}`}>
               <Flame size={200} />
            </div>
          )}

          {unlockedIndicators.includes('FIB') && (
            <div className="absolute inset-0 pointer-events-none z-0">
               {fibLevels.map(level => (
                 <div key={level} className="absolute w-full border-t border-[#00ffcc]/10 flex justify-end" style={{ top: `${level * 100}%` }}>
                   <span className="text-[8px] bg-black/50 px-1 text-[#00ffcc]/30">FIB_{level}</span>
                 </div>
               ))}
            </div>
          )}

          {position && (
             <div className={`absolute w-full h-0.5 z-20 flex items-center justify-center ${position.type === 'LONG' ? 'bg-green-500/50 shadow-[0_0_10px_green]' : 'bg-red-500/50 shadow-[0_0_10px_red]'}`} style={{ top: '50%' }}>
                <span className="bg-black/80 px-4 text-xs font-bold border border-current">ENTRY_POINT: {position.entryPrice.toFixed(4)}</span>
             </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#00ffcc]/5 to-transparent pointer-events-none" />
          <div ref={chartContainerRef} className="w-full h-full border border-[#00ffcc]/10 shadow-[inset_0_0_20px_rgba(0,0,0,1)]" />
          
          <div className="absolute top-4 right-4 bg-black/90 border border-[#00ffcc]/40 p-3 shadow-[0_0_15px_rgba(0,255,204,0.2)]">
            <div className="text-[10px] opacity-50 mb-1">MARKET_LEVEL_HZ</div>
            <div className="text-2xl font-black tracking-widest text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
               {price.toFixed(4)}
            </div>
          </div>
          
          <div className="absolute left-0 w-full h-px bg-[#00ffcc]/20 shadow-[0_0_5px_#00ffcc] animate-[scan_4s_linear_infinite]" />
        </div>

        {/* Right Sidebar - Combat Controls */}
        <div className="col-span-2 pl-4 flex flex-col gap-4">
          <div className="text-[10px] font-bold mb-2 opacity-30 tracking-[0.2em]">COMMAND_CENTER</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={deployBulls} className="py-4 border border-green-500/50 bg-green-500/5 hover:bg-green-500/20 text-green-400 font-black text-xs transition-all active:scale-95 flex flex-col items-center gap-1">
              <TrendingUp size={16} /> BULL [Q]
            </button>
            <button onClick={deployBears} className="py-4 border border-red-500/50 bg-red-500/5 hover:bg-red-500/20 text-red-400 font-black text-xs transition-all active:scale-95 flex flex-col items-center gap-1">
              <TrendingDown size={16} /> BEAR [W]
            </button>
          </div>
          <div className="h-px bg-[#00ffcc]/20 my-2" />
          {!position ? (
            <>
              <button onClick={() => enterPosition('LONG')} className="w-full py-6 border-2 border-green-500 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-black flex flex-col items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                <Sword /> ENTER_LONG [A]
              </button>
              <button onClick={() => enterPosition('SHORT')} className="w-full py-6 border-2 border-red-500 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-black flex flex-col items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <Sword className="rotate-180" /> ENTER_SHORT [S]
              </button>
            </>
          ) : (
            <button onClick={closePosition} className="w-full py-12 border-4 border-yellow-500 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-black flex flex-col items-center gap-4 transition-all active:scale-95 shadow-[0_0_30px_rgba(234,179,8,0.3)] animate-pulse">
              <XCircle size={32} /> CLOSE_ENGAGEMENT [D]
            </button>
          )}
          <div className="mt-auto border border-[#00ffcc]/10 p-4 bg-[#0a0a0c] shadow-[0_0_10px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
              <div className="text-[10px] font-bold opacity-30">LIVE_COMMS</div>
            </div>
            <div className="text-[9px] mt-1 space-y-2 max-h-[120px] overflow-hidden">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-2 transition-all duration-300 ${log.type === 'success' ? 'text-green-400 font-bold' : log.type === 'warn' ? 'text-red-400' : 'text-[#00ffcc]/70'}`}>
                  <span className="opacity-40">{log.time}</span> {">"} {log.msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tactical Briefing Overlay */}
      {showBriefing && (
        <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-8 backdrop-blur-sm">
          <div className="max-w-2xl w-full border-2 border-[#00ffcc] p-8 shadow-[0_0_50px_rgba(0,255,204,0.3)] bg-[#050507]">
            <div className="flex items-center gap-4 mb-6 border-b border-[#00ffcc]/30 pb-4">
              <Activity className="text-[#00ffcc] animate-pulse" size={48} />
              <div>
                <h1 className="text-4xl font-black tracking-tighter">TACTICAL_BRIEFING</h1>
                <p className="text-xs opacity-50 uppercase tracking-widest">Operation: Market Domination</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-[#00ffcc] font-bold mb-4 flex items-center gap-2"><Sword size={16}/> COMBAT_CONTROLS</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-[#00ffcc]/10 pb-1"><span>DEPLOY_BULLS</span> <span className="text-white font-bold">[Q]</span></div>
                  <div className="flex justify-between border-b border-[#00ffcc]/10 pb-1"><span>INITIATE_BEAR_SIEGE</span> <span className="text-white font-bold">[W]</span></div>
                  <div className="flex justify-between border-b border-[#00ffcc]/10 pb-1"><span>ENTER_LONG_POSITION</span> <span className="text-white font-bold">[A]</span></div>
                  <div className="flex justify-between border-b border-[#00ffcc]/10 pb-1"><span>ENTER_SHORT_POSITION</span> <span className="text-white font-bold">[S]</span></div>
                  <div className="flex justify-between border-b border-[#00ffcc]/10 pb-1"><span>CLOSE_ENGAGEMENT</span> <span className="text-white font-bold">[D]</span></div>
                </div>
              </div>
              <div>
                <h2 className="text-[#00ffcc] font-bold mb-4 flex items-center gap-2"><Shield size={16}/> MISSION_OBJECTIVES</h2>
                <ul className="text-xs space-y-4 opacity-70 list-disc pl-4">
                  <li>Influence price movement by deploying reinforcements (Bulls/Bears).</li>
                  <li>Enter positions to capture credit profit from the trend you create.</li>
                  <li>Unlock advanced Tactical Indicators (RSI, MACD, FIB) by scaling your credits.</li>
                  <li><strong>SURVIVE:</strong> AI Commanders will counter-attack if you move the market too aggressively.</li>
                </ul>
              </div>
            </div>
            
            <button 
              onClick={() => setShowBriefing(false)}
              className="w-full py-4 border-2 border-[#00ffcc] hover:bg-[#00ffcc]/20 text-[#00ffcc] font-black tracking-[0.5em] transition-all animate-pulse"
            >
              INITIALIZE_DEPLOYMENT [ENTER]
            </button>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes scan { 0% { top: 0% } 100% { top: 100% } }
      `}</style>
    </div>
  );
};

export default TradingWar;

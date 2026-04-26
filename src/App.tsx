/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Bell, 
  Calendar, 
  Clock, 
  Gauge, 
  PlusCircle, 
  Grid3X3, 
  BarChart3, 
  Route, 
  Wallet,
  Fuel,
  Info,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  Sparkles,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`geometric-card rounded-2xl p-6 ${className}`}>
    {children}
  </div>
);

const InputGroup = ({ label, value, type = "text", placeholder = "", onChange }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{label}</label>
    <input 
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      className="w-full geometric-input rounded-xl px-4 py-3 text-sm text-white focus:ring-0 outline-none"
    />
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('shift_history');
    return saved ? JSON.parse(saved) : [];
  });

  React.useEffect(() => {
    localStorage.setItem('shift_history', JSON.stringify(history));
  }, [history]);

  const stats = React.useMemo(() => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('pt-BR');
    const monthYear = now.toLocaleDateString('pt-BR', { month: 'numeric', year: 'numeric' });
    const year = now.getFullYear().toString();

    return history.reduce((acc, item) => {
      const itemDate = new Date(item.id); // Using timestamp from ID
      const itemDayStr = itemDate.toLocaleDateString('pt-BR');
      const itemMonthYear = itemDate.toLocaleDateString('pt-BR', { month: 'numeric', year: 'numeric' });
      const itemYear = itemDate.getFullYear().toString();

      if (itemDayStr === todayStr) acc.day += item.net;
      if (itemMonthYear === monthYear) acc.month += item.net;
      if (itemYear === year) acc.year += item.net;
      
      return acc;
    }, { day: 0, month: 0, year: 0 });
  }, [history]);
  const [dailyGoal, setDailyGoal] = useState<number | string>('');
  const [sales, setSales] = useState([
    { id: 1, name: 'Água Mineral', qty: '' as number | string, price: '' as number | string },
    { id: 2, name: 'Barras de Cereal', qty: '' as number | string, price: '' as number | string },
  ]);
  const [confirmedSaleId, setConfirmedSaleId] = useState<number | null>(null);

  const addSale = () => {
    const id = Date.now();
    setSales([...sales, { id, name: '', qty: '', price: '' }]);
  };

  const confirmSale = (id: number) => {
    setConfirmedSaleId(id);
    setTimeout(() => setConfirmedSaleId(null), 2000);
  };

  const updateSale = (id: number, field: string, value: string | number) => {
    setSales(sales.map(sale => sale.id === id ? { ...sale, [field]: value } : sale));
  };

  const removeSale = (id: number) => {
    setSales(sales.filter(sale => sale.id !== id));
  };
  const [uberData, setUberData] = useState({ earnings: '' as number | string, km: '' as number | string, min: '' as number | string });
  const [uberManual, setUberManual] = useState({ earnings: '' as number | string, km: '' as number | string, min: '' as number | string });
  const [ninenineData, setNinenineData] = useState({ earnings: '' as number | string, km: '' as number | string, min: '' as number | string });
  const [ninenineManual, setNinenineManual] = useState({ earnings: '' as number | string, km: '' as number | string, min: '' as number | string });
  const [ocrLoaded, setOcrLoaded] = useState<{uber: boolean, ninenine: boolean}>({uber: false, ninenine: false});
  const [isProcessing, setIsProcessing] = useState<{uber?: boolean, ninenine?: boolean}>({});

  const extractDataFromImage = async (file: File) => {
    return new Promise<{earnings: string, km: string, min: string}>(async (resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: {
                parts: [
                  { inlineData: { mimeType: file.type, data: base64Data } },
                  { text: "Você é um especialista em extração de dados de aplicativos de transporte. Analise este print da Uber ou 99 (pode ter tons amarelos). Extraia: Ganhos totais, KM total e Tempo total. Retorne EXATAMENTE este formato JSON: {\"earnings\": \"0.00\", \"km\": \"0.0\", \"min\": \"0\"}. Se o tempo estiver em horas/minutos, converta tudo para minutos totais. Use ponto para decimais." }
                ],
              },
              config: { 
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    earnings: { type: Type.STRING },
                    km: { type: Type.STRING },
                    min: { type: Type.STRING },
                  },
                  required: ["earnings", "km", "min"],
                }
              },
            });

            const rawData = JSON.parse(response.text);
            const sanitize = (val: any) => {
              const str = String(val || '0').replace(/[^\d.,]/g, '');
              if (str.includes('.') && str.includes(',')) return str.replace(/\./g, '').replace(',', '.');
              return str.replace(',', '.');
            };

            resolve({
              earnings: sanitize(rawData.earnings),
              km: sanitize(rawData.km),
              min: sanitize(rawData.min)
            });
          } catch (e) {
            console.error("Gemini Error:", e);
            alert("Falha ao comunicar com a IA (Gemini). Verifique se o print está nítido ou tente novamente em instantes.");
            reject(e);
          }
        };
      } catch (error) {
        alert("Erro na leitura da imagem.");
        reject(error);
      }
    });
  };

  const handleUberUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setIsProcessing(prev => ({ ...prev, uber: true }));
      try {
        const data = await extractDataFromImage(file);
        setUberManual(data);
        setOcrLoaded(prev => ({ ...prev, uber: true }));
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessing(prev => ({ ...prev, uber: false }));
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      let totalEarnings = 0;
      let totalKm = 0;
      let totalMin = 0;
      
      lines.forEach((line, index) => {
        if (index === 0) return;
        const columns = line.split(',');
        if (columns.length >= 4) {
          totalEarnings += parseFloat(columns[1] || '0');
          totalKm += parseFloat(columns[2] || '0');
          totalMin += parseFloat(columns[3] || '0');
        }
      });
      setUberManual({ earnings: totalEarnings.toFixed(2), km: totalKm.toFixed(1), min: totalMin.toFixed(0) });
    };
    reader.readAsText(file);
  };

  const handleNinenineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setIsProcessing(prev => ({ ...prev, ninenine: true }));
      try {
        const data = await extractDataFromImage(file);
        setNinenineManual(data);
        setOcrLoaded(prev => ({ ...prev, ninenine: true }));
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessing(prev => ({ ...prev, ninenine: false }));
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      let totalEarnings = 0;
      let totalKm = 0;
      let totalMin = 0;

      lines.forEach((line, index) => {
        if (index === 0) return;
        const columns = line.split(',');
        if (columns.length >= 4) {
          totalEarnings += parseFloat(columns[1] || '0');
          totalKm += parseFloat(columns[2] || '0');
          totalMin += parseFloat(columns[3] || '0');
        }
      });
      setNinenineManual({ earnings: totalEarnings.toFixed(2), km: totalKm.toFixed(1), min: totalMin.toFixed(0) });
    };
    reader.readAsText(file);
  };
  const [fuelQty, setFuelQty] = useState<number | string>('');
  const [fuelPrice, setFuelPrice] = useState<number | string>('');
  const [fuelRange, setFuelRange] = useState<number | string>('');
  const [fuelType, setFuelType] = useState<'gas' | 'elet'>('gas');
  const [startKm, setStartKm] = useState<number | string>('');
  const [endKm, setEndKm] = useState<number | string>('');

  const uberInputRef = useRef<HTMLInputElement>(null);
  const ninenineInputRef = useRef<HTMLInputElement>(null);
  
  const totalEarnings = Number(uberData.earnings || 0) + Number(ninenineData.earnings || 0) + sales.reduce((acc, sale) => acc + (Number(sale.qty || 0) * Number(sale.price || 0)), 0);
  const progressPercentage = dailyGoal && Number(dailyGoal) > 0 ? (totalEarnings / Number(dailyGoal)) * 100 : 0;
  const clampedProgress = Math.min(100, progressPercentage);

  const getIncentive = (percent: number) => {
    if (percent >= 100) return { text: "Meta batida! Você é fera! 🚀", color: "bg-emerald-500", textColor: "text-emerald-400", shadow: "shadow-[0_0_15px_rgba(16,185,129,0.5)]" };
    if (percent >= 75) return { text: "Quase lá! Só mais um pouco!", color: "bg-yellow-500", textColor: "text-yellow-400", shadow: "shadow-[0_0_15px_rgba(234,179,8,0.5)]" };
    if (percent >= 50) return { text: "Metade já foi! Foco total!", color: "bg-indigo-500", textColor: "text-indigo-400", shadow: "shadow-[0_0_15px_rgba(99,102,241,0.5)]" };
    if (percent >= 25) return { text: "Bom início! Continue assim!", color: "bg-blue-500", textColor: "text-blue-400", shadow: "shadow-[0_0_15px_rgba(59,130,246,0.5)]" };
    return { text: "Vamos começar!", color: "bg-slate-600", textColor: "text-slate-500", shadow: "" };
  };

  const incentive = getIncentive(progressPercentage);

  const totalKm = Math.max(0, Number(endKm || 0) - Number(startKm || 0));
  const totalFuel = (Number(fuelQty || 0) * Number(fuelPrice || 0)).toFixed(2);
  
  // New Calculation: (Energy / Range) * Price per unit
  const consumptionFactor = Number(fuelRange) > 0 ? Number(fuelQty || 0) / Number(fuelRange) : 0;
  const estCostPerKm = consumptionFactor * Number(fuelPrice || 0);
  
  // Realized cost per KM based on total KM driven (legacy calculation)
  const realizedCostPerKm = totalKm > 0 ? (Number(totalFuel) / totalKm).toFixed(2) : '0.00';

  const uberTripCost = Number(uberData.km || 0) * estCostPerKm;
  const ninenineTripCost = Number(ninenineData.km || 0) * estCostPerKm;

  // Consolidated Platform Stats
  const totalCombinedKm = Number(uberData.km || 0) + Number(ninenineData.km || 0);
  const totalCombinedMin = Number(uberData.min || 0) + Number(ninenineData.min || 0);
  const totalEstFuelCost = uberTripCost + ninenineTripCost;

  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 2 + i);
    return {
      name: d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', ''),
      day: d.getDate(),
      current: i === 2,
    };
  });

  const finalizeShift = () => {
    const entry = {
      id: Date.now(),
      date: selectedDate.toLocaleString('pt-BR'),
      timestamp: selectedDate.getTime(),
      uber: { ...uberData },
      ninenine: { ...ninenineData },
      sales: sales.filter(s => (s.name && s.qty) || (s.qty && s.price)),
      total: totalEarnings,
      fuel: { qty: fuelQty, price: fuelPrice, range: fuelRange, type: fuelType, totalCost: totalFuel },
      combinedStats: {
        km: totalCombinedKm,
        min: totalCombinedMin,
        fuelCost: totalEstFuelCost
      },
      net: totalEarnings - Number(totalFuel)
    };
    setHistory([entry, ...history]);
    setActiveTab('historico');
    
    // Reset fields after finalizing
    setUberData({ earnings: '', km: '', min: '' });
    setNinenineData({ earnings: '', km: '', min: '' });
    setFuelQty('');
    setFuelPrice('');
    setSales([
      { id: Date.now(), name: 'Água Mineral', qty: '', price: '' },
      { id: Date.now() + 1, name: 'Barras de Cereal', qty: '', price: '' },
    ]);
    setStartKm('');
    setEndKm('');
  };

  const deleteHistoryEntry = (id: number) => {
    setHistory(history.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-32 font-sans text-slate-50">
      <input 
        type="file" 
        ref={uberInputRef} 
        className="hidden" 
        onChange={handleUberUpload} 
      />
      <input 
        type="file" 
        ref={ninenineInputRef} 
        className="hidden" 
        onChange={handleNinenineUpload} 
      />
      {/* Header */}
      <header className="sticky top-0 z-50 flex justify-between items-center px-6 h-20 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Route size={24} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold -mb-1">Horizon</p>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">Painel</h1>
          </div>
        </div>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 transition-colors"
        >
          <Bell size={24} />
        </motion.button>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-8">
        {activeTab === 'inicio' && (
          <div className="space-y-8">
            {/* Horizontal Calendar */}
            <section className="flex gap-4 overflow-x-auto no-scrollbar py-2">
              {days.map((d) => (
                <motion.div 
                  key={d.day}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center justify-center min-w-[70px] h-20 rounded-2xl transition-all duration-300 border ${
                    d.current 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30' 
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <span className={`text-[10px] font-bold tracking-widest uppercase mb-1 ${d.current ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {d.name}
                  </span>
                  <span className="text-2xl font-bold">{d.day}</span>
                </motion.div>
              ))}
            </section>

            {/* Date Navigation */}
            <section className="flex items-center justify-between bg-slate-900/50 p-2 rounded-2xl border border-slate-800 mb-6">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => changeDate(-1)}
                className="p-3 text-slate-400 hover:text-white"
              >
                <ChevronLeft size={20} />
              </motion.button>
              
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-0.5">Data do Lançamento</span>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-500" />
                  <span className="text-sm font-bold text-white">
                    {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => changeDate(1)}
                className="p-3 text-slate-400 hover:text-white"
              >
                <ChevronRight size={20} />
              </motion.button>
            </section>

            {/* Accumulated Stats Preview */}
            <section className="grid grid-cols-3 gap-3">
              <Card className="p-3 flex flex-col items-center justify-center bg-slate-900 border-slate-800">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Dia</span>
                <span className="text-sm font-bold text-emerald-400">R$ {stats.day.toFixed(2)}</span>
              </Card>
              <Card className="p-3 flex flex-col items-center justify-center bg-slate-900 border-slate-800">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Mês</span>
                <span className="text-sm font-bold text-indigo-400">R$ {stats.month.toFixed(2)}</span>
              </Card>
              <Card className="p-3 flex flex-col items-center justify-center bg-slate-900 border-slate-800">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ano</span>
                <span className="text-sm font-bold text-white">R$ {stats.year.toFixed(2)}</span>
              </Card>
            </section>

            {/* Daily Goal */}
            <section className="text-center mb-10">
              <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold mb-2">Progresso da Meta Diária</p>
              <div className="flex items-center justify-center gap-3">
                 <span className="text-4xl font-light text-slate-400">R$</span>
                 <input 
                    type="number" 
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(e.target.value === '' ? '' : Number(e.target.value))}
                    className="bg-transparent border-none p-0 text-5xl font-bold text-white focus:ring-0 w-36 text-center"
                  />
              </div>
              <div className="max-w-xs mx-auto mt-6">
                <div className="h-6 w-full bg-slate-800 rounded-full overflow-hidden relative">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${clampedProgress}%` }}
                    className={`h-full ${incentive.color} rounded-full transition-colors duration-500 ${incentive.shadow} flex items-center justify-center overflow-hidden`} 
                   >
                     <span className="text-[10px] font-bold text-black uppercase tracking-wider whitespace-nowrap px-2">
                       {incentive.text}
                     </span>
                   </motion.div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-slate-500">Ganhos: {progressPercentage.toFixed(0)}%</span>
                  <span className={incentive.textColor}>Meta: R$ {dailyGoal || 0}</span>
                </div>
                {/* Incentive message moved inside bar */}
              </div>
            </section>

            {/* Shift and Odometer */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="space-y-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={14} className="text-indigo-500" /> Horário Turno
                </p>
                <div className="space-y-2">
                  <input type="time" defaultValue="08:00" className="w-full geometric-input rounded-xl px-4 py-2.5 text-sm text-white" />
                  <input type="time" defaultValue="18:00" className="w-full geometric-input rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
              </Card>
              <Card className="space-y-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Gauge size={14} className="text-indigo-500" /> Hodômetro
                </p>
                <div className="space-y-2">
                  <input 
                    type="number"
                    placeholder="KM Inicial" 
                    value={startKm}
                    onChange={(e) => setStartKm(e.target.value)}
                    className="w-full geometric-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600" 
                  />
                  <input 
                    type="number"
                    placeholder="KM Final" 
                    value={endKm}
                    onChange={(e) => setEndKm(e.target.value)}
                    className="w-full geometric-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600" 
                  />
                </div>
                <p className="text-right text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Total: {totalKm} KM</p>
              </Card>
            </div>

            {/* Logistics: Fuel */}
            <Card className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Fuel size={14} className="text-indigo-500" /> Logística: Combustível
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setFuelType('gas')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-colors ${
                      fuelType === 'gas' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    Gas
                  </button>
                  <button 
                    onClick={() => setFuelType('elet')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-colors ${
                      fuelType === 'elet' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    Elet
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <InputGroup label={`Capacidade (${fuelType === 'gas' ? 'L' : 'kWh'})`} value={fuelQty} type="number" onChange={(e: any) => setFuelQty(e.target.value)} />
                  <InputGroup label="Preço Unit." value={fuelPrice} type="number" onChange={(e: any) => setFuelPrice(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <InputGroup label={`Autonomia Total (KM)`} value={fuelRange} type="number" onChange={(e: any) => setFuelRange(e.target.value)} />
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total R$</label>
                    <div className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-3 text-sm text-indigo-400 font-bold text-center">
                      {totalFuel}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Custo Estável Logística</span>
                <span className="text-lg font-bold text-emerald-400">R$ {estCostPerKm.toFixed(2)} / KM</span>
              </div>
            </Card>

            {/* Platform Cards */}
            <div className="space-y-6">
              <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-2">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" className="w-full h-auto" alt=""/>
                    </div>
                    <h3 className="text-lg font-bold uppercase tracking-tight">Uber <span className="text-slate-500 font-light">Ganhos</span></h3>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <motion.button 
                    whileHover={{ backgroundColor: isProcessing.uber ? '#000' : '#1e293b' }}
                    onClick={() => !isProcessing.uber && uberInputRef.current?.click()}
                    disabled={isProcessing.uber}
                    className={`w-full bg-black text-white border border-slate-800 font-bold py-4 rounded-xl shadow-lg uppercase tracking-widest text-xs flex items-center justify-center gap-2 ${isProcessing.uber ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isProcessing.uber ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-indigo-500" />
                        <span className="animate-pulse">Analisando Print Uber...</span>
                      </>
                    ) : (
                      'Importar Uber'
                    )}
                  </motion.button>

                  {ocrLoaded.uber && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-indigo-500/10 border border-indigo-400/30 rounded-xl space-y-2 mb-3"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} className="text-indigo-400" />
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Print Uber Lido</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-[7px] text-slate-500 uppercase font-bold">R$</p>
                          <p className="text-xs font-bold text-emerald-400">{uberManual.earnings}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[7px] text-slate-500 uppercase font-bold">KM</p>
                          <p className="text-xs font-bold text-blue-400">{uberManual.km}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[7px] text-slate-500 uppercase font-bold">MIN</p>
                          <p className="text-xs font-bold text-red-400">{uberManual.min}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-emerald-500 uppercase font-bold tracking-widest">Valor R$</label>
                      <input 
                        type="number"
                        value={uberManual.earnings}
                        onChange={(e) => {
                          setUberManual({...uberManual, earnings: e.target.value === '' ? '' : Number(e.target.value)});
                          setOcrLoaded(prev => ({ ...prev, uber: false }));
                        }}
                        className={`w-full bg-slate-800 border rounded-lg px-2 py-2 text-xs text-emerald-400 transition-colors ${ocrLoaded.uber ? 'border-indigo-500/50' : 'border-slate-700'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-blue-500 uppercase font-bold tracking-widest">Manual KM</label>
                      <input 
                        type="number"
                        value={uberManual.km}
                        onChange={(e) => {
                          setUberManual({...uberManual, km: e.target.value === '' ? '' : Number(e.target.value)});
                          setOcrLoaded(prev => ({ ...prev, uber: false }));
                        }}
                        className={`w-full bg-slate-800 border rounded-lg px-2 py-2 text-xs text-blue-400 transition-colors ${ocrLoaded.uber ? 'border-indigo-500/50' : 'border-slate-700'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-red-500 uppercase font-bold tracking-widest">Manual Min</label>
                      <input 
                        type="number"
                        value={uberManual.min}
                        onChange={(e) => {
                          setUberManual({...uberManual, min: e.target.value === '' ? '' : Number(e.target.value)});
                          setOcrLoaded(prev => ({ ...prev, uber: false }));
                        }}
                        className={`w-full bg-slate-800 border rounded-lg px-2 py-2 text-xs text-red-500 transition-colors ${ocrLoaded.uber ? 'border-indigo-500/50' : 'border-slate-700'}`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <motion.button 
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                          setUberData({ 
                            earnings: Number(uberData.earnings || 0) + Number(uberManual.earnings || 0),
                            km: Number(uberData.km || 0) + Number(uberManual.km || 0),
                            min: Number(uberData.min || 0) + Number(uberManual.min || 0)
                          });
                          setUberManual({ earnings: '', km: '', min: '' });
                          setOcrLoaded(prev => ({ ...prev, uber: false }));
                      }}
                      className={`flex-[3] font-bold py-2.5 rounded-xl uppercase tracking-widest text-[10px] transition-all ${ocrLoaded.uber ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'}`}
                    >
                      {ocrLoaded.uber ? 'Confirmar Dados do Print' : 'Confirmar Lançamento'}
                    </motion.button>
                    {(uberManual.earnings !== '' || uberManual.km !== '' || uberManual.min !== '') && (
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setUberManual({ earnings: '', km: '', min: '' });
                          setOcrLoaded(prev => ({ ...prev, uber: false }));
                        }}
                        className="flex-1 bg-slate-800 text-slate-500 border border-slate-700 rounded-xl flex items-center justify-center p-2"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                  <div className="text-center">
                    <p className="text-[9px] text-emerald-500 uppercase mb-1 font-bold">Ganhos</p>
                    <div className="text-lg font-bold text-emerald-400">R$ {Number(uberData.earnings || 0).toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-blue-500 uppercase mb-1 font-bold">KM</p>
                    <div className="text-lg font-bold text-blue-400">{uberData.km || 0}</div>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-red-500 uppercase mb-1 font-bold">Min</p>
                    <div className="text-lg font-bold text-red-500">{uberData.min || 0}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800/50 flex justify-between items-center">
                   <span className="text-[9px] text-slate-500 font-bold uppercase">Gasto Combustível Estimado:</span>
                   <span className="text-sm font-bold text-red-400">R$ {uberTripCost.toFixed(2)}</span>
                </div>
              </section>

              <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center font-black italic text-black">99</div>
                    <h3 className="text-lg font-bold uppercase tracking-tight">99 Driver <span className="text-slate-500 font-light">Status</span></h3>
                </div>
                <div className="space-y-4">
                  <motion.button 
                    onClick={() => !isProcessing.ninenine && ninenineInputRef.current?.click()}
                    disabled={isProcessing.ninenine}
                    className={`w-full py-4 rounded-xl border border-yellow-600 bg-yellow-500 text-black font-bold uppercase tracking-widest text-xs hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-2 ${isProcessing.ninenine ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isProcessing.ninenine ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-black/80" />
                        <span className="animate-pulse">Analisando Print 99...</span>
                      </>
                    ) : (
                      'Importar 99'
                    )}
                  </motion.button>

                  {ocrLoaded.ninenine && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-xl space-y-2 mb-3"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} className="text-yellow-500" />
                        <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Print 99 Lido</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-[7px] text-slate-500 uppercase font-bold">R$</p>
                          <p className="text-xs font-bold text-emerald-400">{ninenineManual.earnings}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[7px] text-slate-500 uppercase font-bold">KM</p>
                          <p className="text-xs font-bold text-blue-400">{ninenineManual.km}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[7px] text-slate-500 uppercase font-bold">MIN</p>
                          <p className="text-xs font-bold text-red-400">{ninenineManual.min}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-emerald-500 uppercase font-bold tracking-widest">Valor R$</label>
                      <input 
                        type="number"
                        value={ninenineManual.earnings}
                        onChange={(e) => {
                          setNinenineManual({...ninenineManual, earnings: e.target.value === '' ? '' : Number(e.target.value)});
                          setOcrLoaded(prev => ({ ...prev, ninenine: false }));
                        }}
                        className={`w-full bg-slate-800 border rounded-lg px-2 py-2 text-xs text-emerald-400 transition-colors ${ocrLoaded.ninenine ? 'border-indigo-500/50' : 'border-slate-700'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-blue-500 uppercase font-bold tracking-widest">Manual KM</label>
                      <input 
                        type="number"
                        value={ninenineManual.km}
                        onChange={(e) => {
                          setNinenineManual({...ninenineManual, km: e.target.value === '' ? '' : Number(e.target.value)});
                          setOcrLoaded(prev => ({ ...prev, ninenine: false }));
                        }}
                        className={`w-full bg-slate-800 border rounded-lg px-2 py-2 text-xs text-blue-400 transition-colors ${ocrLoaded.ninenine ? 'border-indigo-500/50' : 'border-slate-700'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-red-500 uppercase font-bold tracking-widest">Manual Min</label>
                      <input 
                        type="number"
                        value={ninenineManual.min}
                        onChange={(e) => {
                          setNinenineManual({...ninenineManual, min: e.target.value === '' ? '' : Number(e.target.value)});
                          setOcrLoaded(prev => ({ ...prev, ninenine: false }));
                        }}
                        className={`w-full bg-slate-800 border rounded-lg px-2 py-2 text-xs text-red-500 transition-colors ${ocrLoaded.ninenine ? 'border-indigo-500/50' : 'border-slate-700'}`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <motion.button 
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                          setNinenineData({ 
                            earnings: Number(ninenineData.earnings || 0) + Number(ninenineManual.earnings || 0),
                            km: Number(ninenineData.km || 0) + Number(ninenineManual.km || 0),
                            min: Number(ninenineData.min || 0) + Number(ninenineManual.min || 0)
                          });
                          setNinenineManual({ earnings: '', km: '', min: '' });
                          setOcrLoaded(prev => ({ ...prev, ninenine: false }));
                      }}
                      className={`flex-[3] font-bold py-2.5 rounded-xl uppercase tracking-widest text-[10px] transition-all ${ocrLoaded.ninenine ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/30'}`}
                    >
                      {ocrLoaded.ninenine ? 'Confirmar Dados do Print' : 'Confirmar Lançamento'}
                    </motion.button>
                    {(ninenineManual.earnings !== '' || ninenineManual.km !== '' || ninenineManual.min !== '') && (
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setNinenineManual({ earnings: '', km: '', min: '' });
                          setOcrLoaded(prev => ({ ...prev, ninenine: false }));
                        }}
                        className="flex-1 bg-slate-800 text-slate-500 border border-slate-700 rounded-xl flex items-center justify-center p-2"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                  <div className="bg-slate-800/50 p-3 rounded-2xl text-center border border-slate-800">
                    <p className="text-[9px] text-emerald-500 uppercase mb-1 font-bold">Ganhos</p>
                    <div className="text-lg font-bold text-emerald-400">R$ {Number(ninenineData.earnings || 0).toFixed(2)}</div>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-2xl text-center border border-slate-800">
                    <p className="text-[9px] text-blue-500 uppercase mb-1 font-bold">KM</p>
                    <div className="text-lg font-bold text-blue-400">{ninenineData.km || 0}</div>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-2xl text-center border border-slate-800">
                    <p className="text-[9px] text-red-500 uppercase mb-1 font-bold">Min</p>
                    <div className="text-lg font-bold text-red-500">{ninenineData.min || 0}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800/50 flex justify-between items-center px-2">
                   <span className="text-[9px] text-slate-500 font-bold uppercase">Gasto Combustível Estimado:</span>
                   <span className="text-sm font-bold text-red-400">R$ {ninenineTripCost.toFixed(2)}</span>
                </div>
              </section>
            </div>

            {/* Extra Sales */}
            <section className="geometric-card rounded-3xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestão de Vendas</h3>
                <PlusCircle size={20} className="text-indigo-500 cursor-pointer" onClick={addSale} />
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {sales.map((item) => (
                    <div key={item.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex justify-between items-start">
                        <input 
                          type="text"
                          value={item.name}
                          placeholder="Nome do Produto"
                          onChange={(e) => updateSale(item.id, 'name', e.target.value)}
                          className="bg-transparent border-none p-0 text-sm font-bold text-white uppercase tracking-tight focus:ring-0 w-full mr-4"
                        />
                        <button onClick={() => removeSale(item.id)} className="text-slate-600 hover:text-rose-500 transition-colors">
                          <PlusCircle size={16} className="rotate-45" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Qtd</label>
                          <input 
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateSale(item.id, 'qty', e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Preço</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateSale(item.id, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div className="text-right pt-4 flex flex-col items-end gap-2">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total</p>
                          <div className="flex items-center gap-3">
                            <p className="text-lg font-bold text-indigo-400">R$ {(Number(item.qty || 0) * Number(item.price || 0)).toFixed(2)}</p>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => confirmSale(item.id)}
                              disabled={!item.qty || !item.price}
                              className={`p-2 rounded-lg transition-all ${
                                confirmedSaleId === item.id 
                                  ? 'bg-emerald-500 text-white' 
                                  : 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30'
                              } ${(!item.qty || !item.price) ? 'opacity-30 grayscale' : ''}`}
                            >
                              <AnimatePresence mode="wait">
                                {confirmedSaleId === item.id ? (
                                  <motion.div
                                    key="check"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                  >
                                    <Check size={16} strokeWidth={3} />
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="plus"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="flex items-center gap-1"
                                  >
                                    <span className="text-[9px] font-black uppercase">Confirmar</span>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.button>
                          </div>
                        </div>
                      </div>
                      {confirmedSaleId === item.id && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-[10px] font-bold text-emerald-400 text-center uppercase tracking-widest"
                        >
                          Venda Confirmada com Sucesso!
                        </motion.p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Consolidated Summary */}
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Route size={16} className="text-indigo-500" />
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resumo Consolidado Plataformas</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                  <p className="text-[9px] text-blue-500 uppercase font-bold mb-1">Total KM</p>
                  <div className="text-lg font-bold text-blue-400">{totalCombinedKm.toFixed(1)}</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                  <p className="text-[9px] text-red-500 uppercase font-bold mb-1">Total Min</p>
                  <div className="text-lg font-bold text-red-500">{totalCombinedMin}</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                  <p className="text-[9px] text-emerald-500 uppercase font-bold mb-1">Gasto Comb.</p>
                  <div className="text-lg font-bold text-emerald-400">R$ {totalEstFuelCost.toFixed(2)}</div>
                </div>
              </div>
            </section>

            {/* Final Summary Card */}
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
              <div className="flex justify-between items-end mb-10">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-2">Ganhos Líquidos Totais</p>
                  <h2 className="text-4xl font-bold tracking-tight text-white">R$ {(Number(uberData.earnings || 0) + Number(ninenineData.earnings || 0) + sales.reduce((acc, sale) => acc + (Number(sale.qty || 0) * Number(sale.price || 0)), 0) - Number(totalFuel)).toFixed(2)}</h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Bruto</p>
                  <p className="text-lg font-bold">R$ {(Number(uberData.earnings || 0) + Number(ninenineData.earnings || 0) + sales.reduce((acc, sale) => acc + (Number(sale.qty || 0) * Number(sale.price || 0)), 0)).toFixed(2)}</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={finalizeShift}
                className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-indigo-600/20 uppercase tracking-widest text-sm"
              >
                Finalizar Turno Agora
              </motion.button>
              <p className="text-center mt-6 text-[10px] text-slate-500 tracking-[0.2em] uppercase">Arquitetura Alinhada • v2.04</p>
            </section>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'estatisticas' && (
          <div className="space-y-8">
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-lg font-bold uppercase tracking-tight mb-6 flex items-center gap-2">
                <BarChart3 size={20} className="text-indigo-400" /> Desempenho Geral
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center p-6 bg-slate-950 rounded-3xl border border-slate-800 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -mr-10 -mt-10 blur-xl" />
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Ganhos Hoje</span>
                  <span className="text-3xl font-black text-emerald-400">R$ {stats.day.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-6 bg-slate-950 rounded-3xl border border-slate-800 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full -mr-10 -mt-10 blur-xl" />
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Ganhos este Mês</span>
                  <span className="text-3xl font-black text-indigo-400">R$ {stats.month.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-6 bg-slate-950 rounded-3xl border border-slate-800 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Ganhos este Ano</span>
                  <span className="text-3xl font-black text-white">R$ {stats.year.toFixed(2)}</span>
                </div>
              </div>
            </section>
            
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">Informações de Apoio</h3>
               <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                 <p className="text-xs text-indigo-300 leading-relaxed italic">
                   "A persistência é o caminho do êxito. Continue acompanhando seus números para otimizar seus ganhos mensais."
                 </p>
               </div>
            </section>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'historico' && (
          <div className="space-y-8">
            <section className="space-y-4 pb-20">
              <div className="flex items-center gap-2 px-2">
                <Calendar size={18} className="text-indigo-500" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Linha do Tempo</h3>
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 text-slate-600">
                  <p className="text-xs uppercase tracking-widest font-bold">Nenhum turno finalizado ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <Card key={item.id} className="p-4 bg-slate-900/50 border border-slate-800 space-y-4 group relative overflow-hidden">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.date}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-indigo-400">R$ {item.net.toFixed(2)}</span>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => deleteHistoryEntry(item.id)}
                            className="text-red-500/30 hover:text-red-500 p-1 transition-colors"
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </div>
                      </div>
                      
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Desempenho Plataformas</p>
                        <div className="space-y-2">
                           <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/10">
                              <span className="text-[10px] font-bold text-white">Uber</span>
                              <span className="text-[10px] text-slate-400">R$ {Number(item.uber.earnings || 0).toFixed(2)} • {item.uber.km || 0}km • {item.uber.min || 0}min</span>
                           </div>
                           <div className="flex justify-between items-center bg-yellow-500/5 p-2 rounded-lg border border-yellow-500/10">
                              <span className="text-[10px] font-bold text-yellow-500">99 Driver</span>
                              <span className="text-[10px] text-slate-400">R$ {Number(item.ninenine.earnings || 0).toFixed(2)} • {item.ninenine.km || 0}km • {item.ninenine.min || 0}min</span>
                           </div>
                        </div>
                        
                        <div className="pt-2 border-t border-slate-800/50 flex justify-between items-center">
                           <span className="text-[9px] text-slate-500 font-bold uppercase">Consolidado:</span>
                           <span className="text-[10px] font-bold text-indigo-400">
                             {item.combinedStats?.km?.toFixed(1) || 0}km • {item.combinedStats?.min || 0}min
                           </span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {item.sales && item.sales.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Vendas Extras</p>
                            <div className="space-y-1">
                              {item.sales.map((s: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-[10px] text-slate-300 bg-slate-800/30 px-2 py-1 rounded">
                                  <span>{s.name} x{s.qty}</span>
                                  <span className="font-bold">R$ {(Number(s.qty || 0) * Number(s.price || 0)).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-2 border-t border-slate-800/50">
                           <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight mb-1">Combustível</p>
                           <div className="flex justify-between items-center text-[10px] text-rose-400/80">
                             <span>Gasto Estimado:</span>
                             <span className="font-bold">- R$ {item.combinedStats?.fuelCost?.toFixed(2) || 0}</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] text-rose-500 capitalize">
                             <span>Abastecimento:</span>
                             <span className="font-bold">- R$ {Number(item.fuel?.totalCost || 0).toFixed(2)}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-6 pb-10 pt-4 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800">
        <NavItem 
          icon={<Grid3X3 size={24} />} 
          label="Início" 
          active={activeTab === 'inicio'} 
          onClick={() => setActiveTab('inicio')}
        />
        <NavItem 
          icon={<BarChart3 size={24} />} 
          label="Estatísticas" 
          active={activeTab === 'estatisticas'} 
          onClick={() => setActiveTab('estatisticas')}
        />
        <NavItem 
          icon={<Calendar size={24} />} 
          label="Histórico" 
          active={activeTab === 'historico'} 
          onClick={() => setActiveTab('historico')}
        />
        <NavItem 
          icon={<Wallet size={24} />} 
          label="Carteira" 
          active={activeTab === 'carteira'} 
          onClick={() => setActiveTab('carteira')}
        />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, onClick, active = false }: { icon: React.ReactNode, label: string, onClick?: () => void, active?: boolean }) {
  return (
    <motion.button 
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className={`flex flex-col items-center gap-1 transition-all ${
        active ? 'text-indigo-500' : 'text-slate-600 hover:text-slate-400'
      }`}
    >
      <div className="relative">
        {icon}
        {active && <motion.div layoutId="nav-glow" className="absolute -inset-2 bg-indigo-500/10 rounded-full blur-md" />}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      {active && <motion.div layoutId="nav-line" className="w-1 h-1 bg-indigo-500 rounded-full mt-1" />}
    </motion.button>
  );
}


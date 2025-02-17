import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Twitter, Bitcoin, Coins } from 'lucide-react';

const MarketSimulator = () => {
  const [balance, setBalance] = useState(200);
  const [buyAmount, setBuyAmount] = useState('50');
  const [investment, setInvestment] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(100);
  const [investmentPrice, setInvestmentPrice] = useState(0);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [cryptoPrices, setCryptoPrices] = useState({
    solana: 0,
    ethereum: 0,
    bitcoin: 0
  });
  const [priceHistory, setPriceHistory] = useState([{
    open: 100,
    close: 100,
    high: 100,
    low: 100,
    timestamp: Date.now()
  }]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCryptoPrices = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum,bitcoin&vs_currencies=usd'
        );
        const data = await response.json();
        setCryptoPrices({
          solana: data.solana.usd,
          ethereum: data.ethereum.usd,
          bitcoin: data.bitcoin.usd
        });
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
      }
    };

    fetchCryptoPrices();

    const interval = setInterval(fetchCryptoPrices, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const generateNewCandle = () => {
      const lastCandle = priceHistory[priceHistory.length - 1];
      
      const baseVolatility = 8;
      const volatility = baseVolatility * (1 + Math.random() * 0.5);
      const trendStrength = Math.random();
      const bias = (Math.random() - 0.5) * 4 * trendStrength;
      const spikeChance = Math.random();
      const spikeMultiplier = spikeChance > 0.9 ? (Math.random() * 2 + 1) : 1;
      
      const open = lastCandle.close;
      const close = Math.max(1, open + (Math.random() - 0.5 + bias) * volatility * spikeMultiplier);
      const wickVolatility = volatility * (Math.random() * 0.5 + 0.5);
      const high = Math.max(open, close) + Math.random() * wickVolatility * spikeMultiplier;
      const low = Math.min(open, close) - Math.random() * wickVolatility * spikeMultiplier;
      
      return {
        open,
        close,
        high,
        low,
        timestamp: Date.now()
      };
    };
    
    const interval = setInterval(() => {
      const newCandle = generateNewCandle();
      setCurrentPrice(newCandle.close);
      setPriceHistory(prev => {
        const newHistory = [...prev, newCandle];
        return newHistory.length > 200 ? newHistory.slice(-200) : newHistory;
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, [currentPrice]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawCandle = (candle: any, x: number, width: number, minPrice: number, maxPrice: number) => {
      const candleHeight = canvas.height - 60;
      const priceToY = (price: number) => candleHeight - ((price - minPrice) / (maxPrice - minPrice) * candleHeight) + 30;
      
      ctx.beginPath();
      ctx.strokeStyle = candle.close > candle.open ? '#4AE3B5' : '#FF6B6B';
      ctx.lineWidth = 1;
      ctx.moveTo(x + width / 2, priceToY(candle.high));
      ctx.lineTo(x + width / 2, priceToY(candle.low));
      ctx.stroke();
      
      const bodyHeight = Math.max(2, Math.abs(priceToY(candle.open) - priceToY(candle.close)));
      ctx.fillStyle = candle.close > candle.open ? '#4AE3B5' : '#FF6B6B';
      ctx.fillRect(
        x,
        priceToY(Math.max(candle.open, candle.close)),
        width,
        bodyHeight
      );
    };

    const drawTradeMarkers = (candleX: number, width: number, minPrice: number, maxPrice: number) => {
      const candleHeight = canvas.height - 60;
      const priceToY = (price: number) => candleHeight - ((price - minPrice) / (maxPrice - minPrice) * candleHeight) + 30;

      tradeHistory.forEach(trade => {
        const tradeTimestamp = trade.timestamp.getTime();
        const relevantCandle = priceHistory.find(candle => 
          Math.abs(candle.timestamp - tradeTimestamp) < 1000
        );
        
        if (relevantCandle) {
          const index = priceHistory.indexOf(relevantCandle);
          const x = index * width + 20;
          const y = priceToY(trade.price);

          ctx.beginPath();
          ctx.arc(x + width / 2, y, 8, 0, Math.PI * 2);
          ctx.fillStyle = trade.type === 'BUY' ? '#4AE3B5' : '#FF6B6B';
          ctx.fill();

          ctx.fillStyle = 'black';
          ctx.font = 'bold 10px Segoe UI';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(trade.type === 'BUY' ? 'B' : 'S', x + width / 2, y);
        }
      });
    };

    const drawAveragePrice = (minPrice: number, maxPrice: number) => {
      const avgPrice = calculateAverageEntryPrice();
      if (investment > 0 && avgPrice > 0) {
        const candleHeight = canvas.height - 60;
        const y = candleHeight - ((avgPrice - minPrice) / (maxPrice - minPrice) * candleHeight) + 30;
        
        ctx.beginPath();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        ctx.moveTo(20, y);
        ctx.lineTo(canvas.width - 20, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#FFD700';
        ctx.font = '12px Segoe UI';
        ctx.fillText(`Avg: ${avgPrice.toFixed(2)}`, canvas.width - 100, y - 5);
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const prices = priceHistory.flatMap(candle => [candle.high, candle.low]);
      const minPrice = Math.min(...prices) * 0.95;
      const maxPrice = Math.max(...prices) * 1.05;
      
      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 5; i++) {
        const y = (canvas.height - 40) * (i / 4) + 20;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        
        const price = minPrice + (maxPrice - minPrice) * (1 - i / 4);
        ctx.fillStyle = '#4AE3B5';
        ctx.font = '12px Segoe UI';
        ctx.fillText(price.toFixed(2), 5, y - 5);
      }
      
      const candleWidth = Math.min((canvas.width - 40) / 200, (canvas.width - 40) / priceHistory.length);
      priceHistory.forEach((candle, i) => {
        const x = i * candleWidth + 20;
        if (i < priceHistory.length) {
          drawCandle(candle, x, Math.max(1, candleWidth * 0.8), minPrice, maxPrice);
        }
      });

      drawAveragePrice(minPrice, maxPrice);
      
      drawTradeMarkers(20, candleWidth, minPrice, maxPrice);
      
      ctx.fillStyle = '#4AE3B5';
      ctx.font = '10px Segoe UI';
      for(let i = 0; i < 5; i++) {
        const index = Math.floor(i * (priceHistory.length / 4));
        if(priceHistory[index]) {
          const x = index * candleWidth + 20;
          const timestamp = new Date(priceHistory[index].timestamp);
          const timeStr = timestamp.toLocaleTimeString();
          ctx.fillText(timeStr, x - 20, canvas.height - 5);
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [priceHistory, tradeHistory, investment]);

  const formatPnL = (value: number) => {
    const absValue = Math.abs(value);
    return `${value < 0 ? '-' : ''}${absValue.toFixed(2)}`;
  };

  const calculateProfitLoss = () => {
    const avgEntryPrice = calculateAverageEntryPrice();
    if (investment <= 0 || avgEntryPrice <= 0) return 0;
    const pnl = (investment * (currentPrice - avgEntryPrice) / avgEntryPrice);
    return pnl;
  };

  const calculateTotalPnL = () => {
    return tradeHistory
      .filter(trade => trade.pnl !== null)
      .reduce((total, trade) => total + trade.pnl, 0);
  };

  const calculateAverageEntryPrice = () => {
    const allTrades = [...tradeHistory];
    let lastFullSellIndex = -1;

    for (let i = allTrades.length - 1; i >= 0; i--) {
      if (allTrades[i].type === 'SELL' && allTrades[i].fullExit) {
        lastFullSellIndex = i;
        break;
      }
    }

    const relevantTrades = lastFullSellIndex === -1 
      ? allTrades 
      : allTrades.slice(lastFullSellIndex + 1);

    const buyTrades = relevantTrades.filter(trade => trade.type === 'BUY');
    if (buyTrades.length === 0) return 0;

    const totalInvested = buyTrades.reduce((sum, trade) => sum + (trade.amount * trade.price), 0);
    const totalAmount = buyTrades.reduce((sum, trade) => sum + trade.amount, 0);
    return totalInvested / totalAmount;
  };

  const handleBuy = () => {
    const amount = Math.min(balance, Number(buyAmount));
    if (amount > 0 && !isNaN(amount)) {
      setBalance(prev => prev - amount);
      setInvestment(prev => prev + amount);

      const newTrade = {
        type: 'BUY',
        amount: amount,
        price: currentPrice,
        timestamp: new Date(),
        pnl: null,
        fullExit: false
      };

      setTradeHistory(prev => {
        const newHistory = [...prev, newTrade];
        const avgPrice = calculateAverageEntryPrice();
        setInvestmentPrice(avgPrice);
        return newHistory;
      });
      
      toast({
        title: "Purchase Successful",
        description: `Bought ${amount.toFixed(2)} SOL at ${currentPrice.toFixed(2)}`,
      });
    }
  };

  const handleSell = (percentage = 100) => {
    if (investment > 0) {
      const sellAmount = (investment * percentage) / 100;
      const pnl = calculateProfitLoss() * (percentage / 100);
      const returnAmount = sellAmount + pnl;
      
      setBalance(prev => prev + returnAmount);
      setInvestment(prev => percentage === 100 ? 0 : prev - sellAmount);
      
      const newTrade = {
        type: 'SELL',
        amount: sellAmount,
        price: currentPrice,
        timestamp: new Date(),
        pnl: pnl,
        fullExit: percentage === 100
      };

      setTradeHistory(prev => [...prev, newTrade]);

      if (percentage === 100) {
        setInvestmentPrice(0);
      }

      toast({
        title: "Trade Completed",
        description: `Sold ${sellAmount.toFixed(2)} SOL with PnL: ${pnl.toFixed(2)} SOL`,
      });
    }
  };

  return (
    <div className="min-h-screen relative bg-black overflow-hidden font-['JetBrains_Mono']">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(40deg,transparent_25%,rgba(74,227,181,0.1)_50%,transparent_75%)] animate-[pulse_15s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(74,227,181,0.05),transparent_50%)] animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent,rgba(74,227,181,0.03)_50%,transparent)] animate-[slide_20s_linear_infinite]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4AE3B5] to-transparent opacity-30" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4AE3B5] to-transparent opacity-30" />
      </div>

      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <a 
          href="#" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block"
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20 hover:bg-black/60"
          >
            <img
              src="/lovable-uploads/9c85f0b2-42df-4aab-b96b-a4f12b06f1a6.png"
              alt="DEX Screener"
              className="h-5 w-5 text-[#4AE3B5]"
            />
          </Button>
        </a>
        <a 
          href="https://x.com/trenchsimulator" 
          target="_blank" 
          rel="noopener noreferrer" 
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20 hover:bg-black/60"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[#4AE3B5]"
              fill="currentColor"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </Button>
        </a>
      </div>

      <div className="relative z-10 container mx-auto p-6">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="w-full lg:w-[300px] flex flex-col gap-4">
            <Card className="bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20 shadow-[0_0_15px_rgba(74,227,181,0.1)] p-4">
              <div className="flex items-center gap-2">
                <span className="text-[#4AE3B5] font-mono">CA - coming soon</span>
              </div>
            </Card>

            <Card className="bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20 shadow-[0_0_15px_rgba(74,227,181,0.1)] p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-[#4AE3B5]">Trade History</h2>
                  <span className={`text-sm font-mono ${calculateTotalPnL() >= 0 ? 'text-[#4AE3B5]' : 'text-red-500'}`}>
                    ({calculateTotalPnL().toFixed(2)} SOL)
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-[#4AE3B5] hover:text-[#4AE3B5]/80"
                >
                  {showHistory ? '−' : '+'}
                </Button>
              </div>
              
              {showHistory && (
                <div className="space-y-3">
                  {tradeHistory.slice().reverse().map((trade, index) => (
                    <Card key={index} className="p-3 bg-black/40 border border-[#4AE3B5]/10">
                      <div className="flex justify-between mb-1">
                        <span className={trade.type === 'BUY' ? 'text-[#4AE3B5]' : 'text-red-500'}>
                          {trade.type}
                        </span>
                        <span className="text-gray-400">
                          {trade.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Amount:</span>
                          <span className="text-white">{trade.amount.toFixed(2)} SOL</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Price:</span>
                          <span className="text-white">{trade.price.toFixed(2)}</span>
                        </div>
                        {trade.pnl !== null && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">PnL:</span>
                            <span className={trade.pnl >= 0 ? 'text-[#4AE3B5]' : 'text-red-500'}>
                              {formatPnL(trade.pnl)} SOL
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="flex-1 space-y-6">
            <div className="relative text-center mb-12 flex flex-col items-center justify-center gap-2">
              <div className="w-32 h-32 opacity-80">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path 
                    d="M30 40 C30 20 70 20 70 40 L75 45 C75 30 25 30 25 45 Z" 
                    className="fill-[#4AE3B5]/30 stroke-[#4AE3B5] stroke-2"
                  />
                  
                  <path 
                    d="M35 42 L35 48 M65 42 L65 48" 
                    className="stroke-[#4AE3B5] stroke-2"
                  />
                  
                  <circle 
                    cx="50" 
                    cy="48" 
                    r="8" 
                    className="fill-[#4AE3B5]/20"
                  />
                  
                  <path 
                    d="M45 48 C45 52 55 52 55 48" 
                    className="fill-none stroke-[#4AE3B5] stroke-2"
                  />
                  <path 
                    d="M42 50 C42 55 58 55 58 50" 
                    className="fill-[#4AE3B5]/20 stroke-[#4AE3B5] stroke-2"
                  />
                  
                  <path 
                    d="M35 56 L35 85 L45 85 L50 75 L55 85 L65 85 L65 56" 
                    className="fill-[#4AE3B5]/20 stroke-[#4AE3B5] stroke-2"
                  />
                  
                  <rect 
                    x="45" 
                    y="60" 
                    width="10" 
                    height="10" 
                    className="fill-[#4AE3B5]/30 stroke-[#4AE3B5] stroke-2"
                  />
                  
                  <rect 
                    x="35" 
                    y="65" 
                    width="8" 
                    height="6" 
                    className="fill-[#4AE3B5]/30 stroke-[#4AE3B5] stroke-2"
                  />
                  <rect 
                    x="57" 
                    y="65" 
                    width="8" 
                    height="6" 
                    className="fill-[#4AE3B5]/30 stroke-[#4AE3B5] stroke-2"
                  />
                </svg>
              </div>
              <h1 className="text-5xl font-bold text-[#4AE3B5] tracking-tight relative glitch-effect">
                <span className="absolute inset-0 blur-lg animate-pulse">TRENCH SIMULATOR</span>
                <span className="relative">TRENCH SIMULATOR</span>
              </h1>
              <p className="font-['Dancing_Script'] text-xl text-[#4AE3B5] animate-[text-glow_2s_ease-in-out_infinite] [text-shadow:0_0_10px_rgba(74,227,181,0.5),0_0_20px_rgba(74,227,181,0.3),0_0_30px_rgba(74,227,181,0.2)]">
                "Trenching for Dummies"
              </p>
            </div>

            <Card className="p-6 bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20 shadow-[0_0_15px_rgba(74,227,181,0.1)]">
              <canvas 
                ref={canvasRef}
                width={800}
                height={400}
                className="w-full bg-black/80 rounded-lg"
              />
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20">
                <div className="text-sm text-gray-400 mb-1">BALANCE</div>
                <div className="text-lg font-bold text-white">{balance.toFixed(2)} SOL</div>
              </Card>
              <Card className="p-4 text-center bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20">
                <div className="text-sm text-gray-400 mb-1">INVESTMENT</div>
                <div className="text-lg font-bold text-white">{investment.toFixed(2)} SOL</div>
              </Card>
              <Card className="p-4 text-center bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20">
                <div className="text-sm text-gray-400 mb-1">MARKET CAP</div>
                <div className="text-lg font-bold text-white">{(currentPrice * 1000).toFixed(2)}K</div>
              </Card>
              <Card className="p-4 text-center bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20">
                <div className="text-sm text-gray-400 mb-1">PROFIT/LOSS</div>
                <div className={`text-lg font-bold ${calculateProfitLoss() >= 0 ? 'text-[#4AE3B5]' : 'text-red-500'}`}>
                  {formatPnL(calculateProfitLoss())} SOL
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20 shadow-[0_0_15px_rgba(74,227,181,0.1)]">
              <div className="flex flex-wrap gap-4 justify-center items-center">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="w-32 text-right bg-black/60 border-[#4AE3B5]/20 text-white"
                  />
                  <span className="text-[#4AE3B5]">SOL</span>
                </div>
                
                <Button
                  onClick={handleBuy}
                  disabled={balance <= 0}
                  className="bg-[#4AE3B5] hover:bg-[#4AE3B5]/80 text-black font-bold"
                >
                  BUY
                </Button>
                
                <div className="flex gap-2">
                  {[25, 50, 75, 100].map((percentage) => (
                    <Button
                      key={percentage}
                      onClick={() => handleSell(percentage)}
                      disabled={investment <= 0}
                      variant={percentage === 100 ? "destructive" : "outline"}
                      className={percentage === 100 
                        ? "bg-red-500 hover:bg-red-600 text-white border-none" 
                        : "border-red-500 text-red-500 hover:bg-red-500/10"}
                    >
                      {percentage}%
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 left-4 z-50 hidden md:block">
        <Card className="bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/14094ecc-0869-407c-9add-5d8fc6307cbb.png" 
              alt="Solana Logo" 
              className="h-5 w-5" 
            />
            <span className="text-[#4AE3B5] font-medium">SOL:</span>
            <span className="text-white">${cryptoPrices.solana.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/e7994385-956e-4b16-b136-1b8491d28b11.png" 
              alt="Ethereum Logo" 
              className="h-5 w-5" 
            />
            <span className="text-[#627EEA] font-medium">ETH:</span>
            <span className="text-white">${cryptoPrices.ethereum.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-3">
            <Bitcoin className="h-5 w-5 text-[#F7931A]" />
            <span className="text-[#F7931A] font-medium">BTC:</span>
            <span className="text-white">${cryptoPrices.bitcoin.toLocaleString()}</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MarketSimulator;

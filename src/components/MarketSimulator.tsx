
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

const MarketSimulator = () => {
  const [balance, setBalance] = useState(200);
  const [buyAmount, setBuyAmount] = useState('50');
  const [investment, setInvestment] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(100);
  const [investmentPrice, setInvestmentPrice] = useState(0);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(true);
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

  // Handle market movements
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

  // Draw the chart
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
  }, [priceHistory]);

  const formatPnL = (value: number) => {
    const absValue = Math.abs(value);
    return `${value < 0 ? '-' : ''}${absValue.toFixed(2)}`;
  };

  const calculateProfitLoss = () => {
    if (investment <= 0 || investmentPrice <= 0) return 0;
    const pnl = (investment * (currentPrice - investmentPrice) / investmentPrice);
    return pnl;
  };

  const handleBuy = () => {
    const amount = Math.min(balance, Number(buyAmount));
    if (amount > 0 && !isNaN(amount)) {
      setBalance(prev => prev - amount);
      setInvestment(prev => prev + amount);
      setInvestmentPrice(currentPrice);
      
      toast({
        title: "Purchase Successful",
        description: `Bought ${amount.toFixed(2)} SOL at ${currentPrice.toFixed(2)}`,
      });

      setTradeHistory(prev => [...prev, {
        type: 'BUY',
        amount: amount,
        price: currentPrice,
        timestamp: new Date(),
        pnl: null
      }]);
    }
  };

  const handleSell = (percentage = 100) => {
    if (investment > 0) {
      const sellAmount = (investment * percentage) / 100;
      const pnl = calculateProfitLoss() * (percentage / 100);
      let returnAmount;
      
      if (pnl >= 0) {
        returnAmount = investment + pnl;
      } else {
        returnAmount = investment + pnl;
      }
      
      setBalance(prev => prev + returnAmount);
      setInvestment(prev => percentage === 100 ? 0 : prev - sellAmount);
      setInvestmentPrice(percentage === 100 ? 0 : investmentPrice);
      
      setTradeHistory(prev => [...prev, {
        type: 'SELL',
        amount: investment,
        price: currentPrice,
        timestamp: new Date(),
        pnl: pnl
      }]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="container mx-auto">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Trade History Panel */}
          <Card className="w-full lg:w-[300px] h-fit bg-card/50 backdrop-blur p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary">Trade History</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
                {showHistory ? '−' : '+'}
              </Button>
            </div>
            
            {showHistory && (
              <div className="space-y-3">
                {tradeHistory.slice().reverse().map((trade, index) => (
                  <Card key={index} className="p-3 bg-background/50">
                    <div className="flex justify-between mb-1">
                      <span className={trade.type === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                        {trade.type}
                      </span>
                      <span className="text-muted-foreground">
                        {trade.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount:</span>
                        <span>{trade.amount.toFixed(2)} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span>{trade.price.toFixed(2)}</span>
                      </div>
                      {trade.pnl !== null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">PnL:</span>
                          <span className={trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
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

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <h1 className="text-4xl font-bold text-center text-primary mb-8">
              TRENCH SIMULATOR
            </h1>

            {/* Chart Container */}
            <Card className="p-6 bg-card/50 backdrop-blur">
              <canvas 
                ref={canvasRef}
                width={800}
                height={400}
                className="w-full bg-background rounded-lg"
              />
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center bg-card/50 backdrop-blur">
                <div className="text-sm text-muted-foreground mb-1">BALANCE</div>
                <div className="text-lg font-bold">{balance.toFixed(2)} SOL</div>
              </Card>
              <Card className="p-4 text-center bg-card/50 backdrop-blur">
                <div className="text-sm text-muted-foreground mb-1">INVESTMENT</div>
                <div className="text-lg font-bold">{investment.toFixed(2)} SOL</div>
              </Card>
              <Card className="p-4 text-center bg-card/50 backdrop-blur">
                <div className="text-sm text-muted-foreground mb-1">MARKET CAP</div>
                <div className="text-lg font-bold">{(currentPrice * 1000).toFixed(2)}K</div>
              </Card>
              <Card className="p-4 text-center bg-card/50 backdrop-blur">
                <div className="text-sm text-muted-foreground mb-1">PROFIT/LOSS</div>
                <div className={`text-lg font-bold ${calculateProfitLoss() >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPnL(calculateProfitLoss())} SOL
                </div>
              </Card>
            </div>

            {/* Controls */}
            <Card className="p-6 bg-card/50 backdrop-blur">
              <div className="flex flex-wrap gap-4 justify-center items-center">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="w-32 text-right"
                  />
                  <span className="text-primary">SOL</span>
                </div>
                
                <Button
                  onClick={handleBuy}
                  disabled={balance <= 0}
                  className="bg-green-500 hover:bg-green-600 text-white"
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
                      className={percentage === 100 ? "" : "text-destructive"}
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
    </div>
  );
};

export default MarketSimulator;

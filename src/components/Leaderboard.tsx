
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { TrophyIcon } from "lucide-react";

const Leaderboard = () => {
  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('username, current_profit')
        .order('current_profit', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <Card className="p-4 bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20">
        <div className="text-center text-gray-400">Loading leaderboard...</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20">
      <div className="flex items-center gap-2 mb-4">
        <TrophyIcon className="w-5 h-5 text-[#4AE3B5]" />
        <h2 className="text-lg font-bold text-[#4AE3B5]">Top Traders</h2>
      </div>
      <div className="space-y-2">
        {leaderboardData?.map((user, index) => (
          <div 
            key={index} 
            className="flex justify-between items-center p-2 rounded bg-black/20 border border-[#4AE3B5]/10"
          >
            <div className="flex items-center gap-2">
              <span className={`${index < 3 ? 'text-[#4AE3B5]' : 'text-gray-400'} font-bold`}>
                #{index + 1}
              </span>
              <span className="text-white">{user.username}</span>
            </div>
            <span className={`font-mono ${user.current_profit >= 0 ? 'text-[#4AE3B5]' : 'text-red-500'}`}>
              {user.current_profit?.toFixed(2)} SOL
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default Leaderboard;


import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Login = () => {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Please enter a username");
      return;
    }

    try {
      // Create a new user record
      const { data, error } = await supabase
        .from('users')
        .upsert([
          {
            username: username.trim(),
            current_profit: 0,
          }
        ], {
          onConflict: 'username'
        });

      if (error) throw error;

      // Store username in localStorage
      localStorage.setItem('trench_username', username.trim());
      toast.success("Welcome to Trench Simulator!");
      navigate('/simulator');
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to create user");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-[#4AE3B5]/20 shadow-[0_0_15px_rgba(74,227,181,0.1)] p-8">
        <h2 className="text-3xl font-bold text-[#4AE3B5] text-center mb-8">
          TRENCH SIMULATOR
        </h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-black/50 border-[#4AE3B5]/30 text-[#4AE3B5]"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-[#4AE3B5]/20 hover:bg-[#4AE3B5]/30 text-[#4AE3B5] border border-[#4AE3B5]/30"
          >
            Enter Simulation
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Login;

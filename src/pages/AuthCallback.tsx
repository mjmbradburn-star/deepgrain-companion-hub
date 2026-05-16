import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate("/");
      } else {
        navigate("/signin");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-[100svh] bg-walnut flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-brass" />
    </div>
  );
}

import { supabase } from "@/integrations/supabase/client";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

export async function createRoom(hostName: string) {
  const code = generateCode();
  const { data, error } = await supabase
    .from("rooms")
    .insert({ code, host_name: hostName })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function findRoom(code: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select()
    .eq("code", code.toUpperCase())
    .single();

  if (error) throw error;
  return data;
}

export async function sendMessage(roomId: string, userName: string, text: string) {
  const { error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, user_name: userName, text });

  if (error) throw error;
}

import { supabase } from '../../lib/supabase';

export type DirectConversation = {
  conversation_id: string;
  partner_id: string;
  partner_username: string | null;
  partner_display_name: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  unread_count: number;
  last_read_at: string | null;
};

export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function fail(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function listDirectConversations(): Promise<DirectConversation[]> {
  const { data, error } = await supabase.rpc('list_direct_conversations');
  fail(error);
  return (data ?? []) as DirectConversation[];
}

export async function getOrCreateDirectConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    other_user_id: otherUserId,
  });
  fail(error);
  if (typeof data !== 'string') {
    throw new Error('BRITUME could not open this conversation.');
  }
  return data;
}

export async function listMessages(conversationId: string): Promise<DirectMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(200);
  fail(error);
  return ((data ?? []) as DirectMessage[]).reverse();
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string
): Promise<void> {
  const content = body.trim();
  if (!content || content.length > 4000) {
    throw new Error('Messages must be between 1 and 4,000 characters.');
  }

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    body: content,
  });
  fail(error);
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_direct_conversation_read', {
    conversation_id: conversationId,
  });
  fail(error);
}

export async function hideMessage(messageId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('message_hides').insert({
    message_id: messageId,
    user_id: userId,
  });
  fail(error);
}

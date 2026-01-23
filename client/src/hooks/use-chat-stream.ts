import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function useChatStream(conversationId: number | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;

    setIsStreaming(true);
    setError(null);

    // Add user message immediately for optimistic UI
    const userMsg: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    
    // Add placeholder for assistant
    const assistantMsgPlaceholder: Message = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMsgPlaceholder]);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error("Failed to send message");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (!dataStr || dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                assistantContent += data.content;
                // Update the last message (assistant's placeholder)
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = { 
                    role: 'assistant', 
                    content: assistantContent 
                  };
                  return newMessages;
                });
              } else if (data.done) {
                 // Stream complete
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error("Error parsing SSE data", e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        toast({
          title: "Error",
          description: "Failed to receive response.",
          variant: "destructive",
        });
        // Remove the empty placeholder if it failed completely
        setMessages(prev => prev.slice(0, -1)); 
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, toast]);

  const loadHistory = useCallback(async () => {
    if (!conversationId) return;
    const res = await fetch(`/api/conversations/${conversationId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages.map((m: any) => ({
        role: m.role,
        content: m.content
      })));
    }
  }, [conversationId]);

  return { messages, isStreaming, error, sendMessage, loadHistory };
}

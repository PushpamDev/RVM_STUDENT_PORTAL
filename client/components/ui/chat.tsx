import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, User, Bot, Loader2 } from 'lucide-react';
import { Message } from '@/services/api'; // ✅ Import shared type from API

type ChatProps = {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isSending: boolean;
  isLoading: boolean;
  studentName?: string; // ✅ Pass the logged-in student's name
};

export function Chat({ messages, onSendMessage, isSending, isLoading, studentName = "Me" }: ChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  // ✅ Simplified Logic: If sender_student_id exists, it's the student.
  const isStudentSender = (message: Message) => {
    return !!message.sender_student_id;
  }

  return (
    <div className="flex flex-col h-full bg-muted/5">
      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-full text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
            <Bot className="h-10 w-10 mb-2" />
            <p>No messages yet.</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isMe = isStudentSender(msg);
              const displayName = isMe ? studentName : "Support Team";
              
              return (
                <motion.div
                  key={msg.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Avatar for Support (Left Side) */}
                  {!isMe && (
                    <Avatar className="h-8 w-8 border bg-white">
                      <AvatarFallback className="bg-muted"><Bot className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[85%] md:max-w-md p-3 rounded-2xl shadow-sm text-sm ${
                      isMe
                        ? 'bg-brand text-primary-foreground rounded-br-sm' // Uses your Brand color
                        : 'bg-white border rounded-bl-sm text-foreground'
                    }`}
                  >
                    {/* Optional: Show name on admin messages */}
                    {!isMe && <p className="text-[10px] font-bold opacity-70 mb-1 text-brand">Support Team</p>}
                    
                    <p className="leading-relaxed">{msg.message}</p>
                    
                    <p className={`text-[10px] text-right mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Avatar for Student (Right Side) */}
                  {isMe && (
                    <Avatar className="h-8 w-8 border-2 border-brand/20">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`} />
                      <AvatarFallback className="bg-brand text-primary-foreground"><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              );
            })}
            <div ref={scrollRef} />
          </>
        )}
      </div>

      <div className="p-4 bg-background border-t">
        <div className="relative flex gap-2">
          <Input
            placeholder="Type your message..."
            className="flex-1"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isSending}
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={isSending || !newMessage.trim()}
            className="bg-brand hover:bg-brand/90"
          >
             {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Send } from 'lucide-react';

type Message = {
  id: string;
  ticket_id: string;
  sender_user_id?: string;
  sender_student_id?: string;
  message: string;
  created_at: string;
  sender_name: string;
};

type ChatProps = {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isSending: boolean;
  isLoading: boolean;
};

export function Chat({ messages, onSendMessage, isSending, isLoading }: ChatProps) {
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const currentUserIsSender = (message: Message) => {
    // In a real app, you would have a more robust way of determining the current user.
    // For now, we'll assume if sender_student_id is present, it's the student.
    return !!message.sender_student_id;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p>Loading messages...</p>
          </div>
        ) : messages.map((msg, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`flex items-end gap-2 ${
              currentUserIsSender(msg) ? 'justify-end' : 'justify-start'
            }`}
          >
            {!currentUserIsSender(msg) && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://i.pravatar.cc/150?u=${msg.sender_name}`} alt={msg.sender_name} />
                <AvatarFallback>{msg.sender_name.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                currentUserIsSender(msg)
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-muted rounded-bl-none'
              }`}
            >
              <p className="text-sm">{msg.message}</p>
              <p className="text-xs text-right mt-1 opacity-70">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {currentUserIsSender(msg) && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://i.pravatar.cc/150?u=${msg.sender_name}`} alt={msg.sender_name} />
                <AvatarFallback>{msg.sender_name.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
          </motion.div>
        ))}
      </div>
      <div className="p-4 bg-background border-t">
        <div className="relative">
          <Input
            placeholder="Type your message..."
            className="pr-24"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isSending}
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="mr-2"
              onClick={handleSendMessage}
              disabled={isSending || !newMessage.trim()}
            >
              {isSending ? 'Sending...' : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
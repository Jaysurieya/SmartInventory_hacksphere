import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import type { SelectChat, SelectMessage } from "@db/schema";

export default function ChatPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<SelectMessage[]>([]);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, subscribe } = useWebSocket();

  const { data: chats } = useQuery<(SelectChat & {
    buyer: { username: string };
    farmer: { username: string };
    product: { name: string };
    messages: SelectMessage[];
  })[]>({
    queryKey: ["/api/chats"],
  });

  useEffect(() => {
    subscribe((message: SelectMessage) => {
      setLocalMessages((prev) => [...prev, message]);
    });
  }, [subscribe]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [localMessages]);

  const selectedChat = chats?.find((chat) => chat.id === selectedChatId);
  const allMessages = [
    ...(selectedChat?.messages || []),
    ...localMessages.filter((msg) => msg.chatId === selectedChatId),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-80 bg-white border-r">
        <div className="p-4 border-b">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-73px)]">
          {chats?.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={`w-full p-4 text-left border-b hover:bg-gray-50 transition-colors ${
                chat.id === selectedChatId ? "bg-gray-50" : ""
              }`}
            >
              <h3 className="font-medium">
                {user?.role === "farmer" ? chat.buyer.username : chat.farmer.username}
              </h3>
              <p className="text-sm text-gray-500 truncate">{chat.product.name}</p>
            </button>
          ))}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 bg-white border-b">
              <h2 className="font-semibold">
                Chat with{" "}
                {user?.role === "farmer"
                  ? selectedChat.buyer.username
                  : selectedChat.farmer.username}
              </h2>
              <p className="text-sm text-gray-500">
                Product: {selectedChat.product.name}
              </p>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {allMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === user?.id ? "justify-end" : "justify-start"
                    }`}
                  >
                    <Card
                      className={`max-w-[70%] p-3 ${
                        message.senderId === user?.id
                          ? "bg-primary text-primary-foreground"
                          : ""
                      }`}
                    >
                      {message.content}
                    </Card>
                  </div>
                ))}
                <div ref={messageEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 bg-white border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (message.trim() && selectedChatId) {
                    sendMessage(selectedChatId, message.trim());
                    setMessage("");
                  }
                }}
                className="flex gap-2"
              >
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}

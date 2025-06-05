import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatApi } from "@/services/api";
import type { ChatMessage } from "@/types";

interface AIChatProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export function AIChat({ isOpen: externalIsOpen, onToggle: externalOnToggle }: AIChatProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const onToggle = externalOnToggle || (() => setInternalIsOpen(!internalIsOpen));
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sessionId: "default",
      role: "assistant",
      content: "Привет! Я AI-агент SREDA. Помогу найти идеальную недвижимость для инвестиций. Какой у вас запрос?",
      createdAt: new Date().toISOString(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(`session_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      sessionId,
      role: "user",
      content: inputMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(inputMessage, sessionId);
      
      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        sessionId: response.sessionId,
        role: "assistant",
        content: response.response,
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setSessionId(response.sessionId);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        sessionId,
        role: "assistant",
        content: "Извините, произошла ошибка. Попробуйте позже.",
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={onToggle}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <i className="fas fa-robot text-xl"></i>
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={onToggle}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <i className="fas fa-robot text-xl"></i>
          </Button>
        </div>
      )}
      {/* Full Screen AI Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm">
          <div className="fixed right-0 top-0 h-full w-1/2 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out">
            <div className="flex h-full">
              {/* Sidebar */}
              <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-quantum font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 tracking-wide uppercase">AI SREDA</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onToggle}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <i className="fas fa-times text-lg"></i>
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">SMART-анализ рынка и персональные рекомендации</p>
                </div>

                {/* Popular Questions */}
                <div className="flex-1 p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <i className="fas fa-fire text-orange-500 mr-2"></i>
                      Популярные вопросы
                    </h3>
                    <div className="space-y-2">
                      {[
                        { icon: "fas fa-home", text: "Найти квартиру в центре города", category: "Поиск" },
                        { icon: "fas fa-chart-line", text: "Анализ доходности от аренды", category: "Аналитика" },
                        { icon: "fas fa-map-marker-alt", text: "Лучшие районы для покупки", category: "Рекомендации" },
                        { icon: "fas fa-trending-up", text: "Динамика цен за последний год", category: "Тренды" }
                      ].map((item, index) => (
                        <button
                          key={index}
                          onClick={() => setInputMessage(item.text)}
                          className="w-full text-left p-3 rounded-lg hover:bg-white border border-gray-200 hover:shadow-sm transition-all duration-200 group"
                        >
                          <div className="flex items-start space-x-3">
                            <i className={`${item.icon} text-blue-500 mt-1`}></i>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                {item.text}
                              </div>
                              <div className="text-xs text-gray-500">{item.category}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Session Stats */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Статистика сессии</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Сообщений:</span>
                        <span className="font-medium text-gray-900">{messages.length - 1}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Объектов найдено:</span>
                        <span className="font-medium text-gray-900">156</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Время сессии:</span>
                        <span className="font-medium text-gray-900">12 мин</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div className="p-6 border-b border-gray-200 bg-white">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-robot text-white"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Чат с AI агентом</h3>
                      <p className="text-sm text-gray-500">
                        Привет! Я AI-агент SREDA. Могу помочь с анализом недвижимости, 
                        поиском объектов и инвестиционными расчетами. Чем вам помочь?
                      </p>
                    </div>
                  </div>
                  
                  {/* Suggested Actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      "Найди квартиры в Москве до 15 млн ₽",
                      "Какая доходность от аренды в Санкт-Петербурге?",
                      "Проанализируй рынок новостроек",
                      "Покажи лучшие районы для инвестиций"
                    ].map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setInputMessage(suggestion)}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors duration-200"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'space-x-3'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                          <i className="fas fa-robot"></i>
                        </div>
                      )}
                      <div
                        className={`max-w-2xl rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {new Date(message.createdAt).toLocaleTimeString('ru-RU', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm">
                        <i className="fas fa-robot"></i>
                      </div>
                      <div className="bg-gray-100 rounded-2xl px-4 py-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 border-t border-gray-200 bg-white">
                  <div className="flex space-x-3">
                    <Input
                      placeholder="Задайте вопрос о недвижимости..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isLoading}
                      className="flex-1 h-12 px-4 text-base"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <i className="fas fa-paper-plane text-lg"></i>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, TrendingUp, Brain, Heart, Scale, User, Building, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/Auth/LoginButton";
import { UserProfile } from "@/components/Auth/UserProfile";
import { useUser } from "@/contexts/UserContext";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useUser();

  const navItems = [
    {
      path: '/',
      label: 'Главная',
      icon: <Home className="w-4 h-4" />,
      description: 'Карта и поиск недвижимости'
    },
    {
      path: '/insights',
      label: 'Инсайты',
      icon: <Brain className="w-4 h-4" />,
      description: 'Аналитические данные и прогнозы'
    },
    {
      path: '/analytics',
      label: 'Инвестиции',
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'Анализ доходности и рисков'
    },
    {
      path: '/favorites',
      label: 'Избранное',
      icon: <Heart className="w-4 h-4" />,
      description: 'Избранные объекты недвижимости'
    },
    {
      path: '/comparison',
      label: 'Сравнение',
      icon: <Scale className="w-4 h-4" />,
      description: 'Сравнение объектов недвижимости'
    }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 pl-4">
          {/* Логотип - скрыт на мобильных в портретной ориентации */}
          <div className="hidden landscape:flex md:flex items-center">
            <div className="text-xl font-quantum font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 tracking-wide uppercase">
              SREDA Market
            </div>
          </div>

          {/* Навигационные ссылки */}
          <div className="flex space-x-4 landscape:ml-1 md:ml-1 portrait:ml-0">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={location === item.path ? "default" : "ghost"}
                  className="flex items-center space-x-2"
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {user ? <UserProfile /> : <LoginButton />}
          </div>
        </div>
      </div>
    </nav>
  );
}
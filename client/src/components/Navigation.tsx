import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, BarChart3, Building, Heart, Scale, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/Auth/LoginButton";
import { UserProfile } from "@/components/Auth/UserProfile";
import { useAuth } from "@/contexts/AuthContext";

export function Navigation() {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();

  const navItems = [
    {
      path: '/',
      label: 'Главная',
      icon: <Home className="w-4 h-4" />,
      description: 'Карта и поиск недвижимости'
    },
    {
      path: '/map',
      label: 'Карта',
      icon: <Building className="w-4 h-4" />,
      description: 'Интерактивная карта недвижимости'
    },
    {
      path: '/analytics',
      label: 'Инвестиции',
      icon: <BarChart3 className="w-4 h-4" />,
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
    },
    {
      path: '/profile',
      label: 'Профиль',
      icon: <User className="w-4 h-4" />,
      description: 'Личный кабинет пользователя'
    }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Логотип */}
          <div className="flex items-center">
            <Building className="w-8 h-8 text-blue-600 mr-3" />
            <div className="text-xl font-bold text-gray-900">
              SREDA Market
            </div>
          </div>

          {/* Навигационные ссылки */}
          <div className="flex space-x-4">
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
          {loading ? (
            <div className="w-8 h-8 flex items-center justify-center">
              <i className="fas fa-spinner fa-spin text-gray-400"></i>
            </div>
          ) : isAuthenticated ? (
            <UserProfile />
          ) : (
            <LoginButton />
          )}
        </div>
        </div>
      </div>
    </nav>
  );
}
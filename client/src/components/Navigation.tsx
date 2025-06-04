import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, BarChart3, Building } from 'lucide-react';
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    {
      path: '/',
      label: 'Главная',
      icon: <Home className="w-4 h-4" />,
      description: 'Карта и поиск недвижимости'
    },
    {
      path: '/analytics',
      label: 'Инвестиционная аналитика',
      icon: <BarChart3 className="w-4 h-4" />,
      description: 'Анализ доходности и рисков'
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
        </div>
      </div>
    </nav>
  );
}
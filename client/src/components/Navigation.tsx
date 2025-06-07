import React from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

import { 
  HomeIcon, 
  TrendingUpIcon, 
  StarIcon, 
  UserIcon, 
  BarChart3Icon,
  LogOutIcon,
  SettingsIcon,
  CrownIcon,
  BookOpenIcon
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useUser();

  const navigationItems = [
    { path: '/', icon: HomeIcon, label: 'Главная' },
    { path: '/insights', icon: BookOpenIcon, label: 'Инсайты' },
    { path: '/favorites', icon: StarIcon, label: 'Избранное' },
    { path: '/comparison', icon: BarChart3Icon, label: 'Сравнение' },
    { path: '/profile', icon: UserIcon, label: 'Профиль' },
  ];

  if (user?.role === 'administrator') {
    navigationItems.push({ path: '/admin', icon: SettingsIcon, label: 'Админ панель' });
  }

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUpIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-quantum">SREDA Market</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path}>
                  <Button 
                    variant={isActive ? "default" : "ghost"} 
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-1"
              >
                <LogOutIcon className="h-4 w-4" />
                <span className="hidden sm:block">Выйти</span>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
          <div className="flex overflow-x-auto py-2 space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path}>
                  <Button 
                    variant={isActive ? "default" : "ghost"} 
                    size="sm"
                    className="flex items-center space-x-1 whitespace-nowrap"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
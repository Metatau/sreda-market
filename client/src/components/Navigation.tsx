import React from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  HomeIcon, 
  TrendingUpIcon, 
  StarIcon, 
  UserIcon, 
  BarChart3Icon,
  LogOutIcon,
  SettingsIcon,
  CrownIcon,
  BookOpenIcon,
  DatabaseIcon
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
    navigationItems.push(
      { path: '/admin', icon: SettingsIcon, label: 'Админ панель' },
      { path: '/admin/sources', icon: BarChart3Icon, label: 'Источники данных' }
    );
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
            <span className="text-xl font-bold text-gray-900 dark:text-white">SREDA Market</span>
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
              <>
                {/* Subscription Badge */}
                {user.subscription?.type && (
                  <Badge variant={user.subscription.type === 'premium' ? 'default' : 'secondary'}>
                    {user.subscription.type === 'premium' && <CrownIcon className="h-3 w-3 mr-1" />}
                    {user.subscription.type === 'premium' ? 'Premium' : 'Basic'}
                  </Badge>
                )}

                {/* User Avatar */}
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profileImageUrl || ''} alt={user.username} />
                    <AvatarFallback>
                      {user.firstName ? user.firstName[0] : user.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user.firstName || user.username}
                  </span>
                </div>

                {/* Logout Button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-1"
                >
                  <LogOutIcon className="h-4 w-4" />
                  <span className="hidden sm:block">Выйти</span>
                </Button>
              </>
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
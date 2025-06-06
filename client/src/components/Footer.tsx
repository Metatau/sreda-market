import { Link } from "wouter";
import { Mail, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 px-4 font-mono">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* О сервисе */}
          <div>
            <h3 className="text-xl font-bold mb-4 tracking-wider">SREDA Market</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Аналитическая платформа для инвестиций в недвижимость с AI-агентом, 
              инвестиционными рейтингами, прогнозами цен и комплексным анализом рынка.
            </p>
          </div>

          {/* Реквизиты */}
          <div>
            <h3 className="text-xl font-bold mb-4">Реквизиты</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p className="font-medium">ИП Шинкаренко А.А.</p>
              <p>ОГРНИП: 315595800025579</p>
              <p>ИНН: 590401203802</p>
              
              <div className="flex items-center space-x-2 mt-3">
                <Phone className="w-4 h-4" />
                <a href="tel:+78001015159" className="hover:text-blue-400 transition-colors">
                  8 800 101 51 59
                </a>
              </div>
              
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:info@monodigitalstudio.ru" className="hover:text-blue-400 transition-colors">
                  info@monodigitalstudio.ru
                </a>
              </div>
            </div>
          </div>

          {/* Правовые документы */}
          <div>
            <h3 className="text-xl font-bold mb-4">Правовые документы</h3>
            <div className="space-y-2">
              <Link href="/politika-konfidencialnosti/" className="block text-sm text-gray-300 hover:text-blue-400 transition-colors">
                Политика конфиденциальности
              </Link>
              <Link href="/politika-obrabotki-personalnyh-dannyh/" className="block text-sm text-gray-300 hover:text-blue-400 transition-colors">
                Политика обработки персональных данных
              </Link>
              <Link href="/polzovatelskoe-soglashenie/" className="block text-sm text-gray-300 hover:text-blue-400 transition-colors">
                Пользовательское соглашение
              </Link>
              <Link href="/publichnaya-oferta/" className="block text-sm text-gray-300 hover:text-blue-400 transition-colors">
                Публичная оферта
              </Link>
              <Link href="/soglasie-na-obrabotku-personalnyh-dannyh/" className="block text-sm text-gray-300 hover:text-blue-400 transition-colors">
                Согласие на обработку персональных данных
              </Link>
            </div>
          </div>
        </div>

        {/* Нижняя часть футера */}
        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>© 2025 SREDA Market. Все права защищены.</p>
            
          </div>
        </div>
      </div>
    </footer>
  );
}
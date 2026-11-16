import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { UserRole, ViewTab } from '../types/prose';

interface HeaderProps {
  activeView: ViewTab;
  onNavigate: (view: ViewTab) => void;
  savedCount: number;
  userRole?: UserRole;
}

const NAV_ITEMS: Array<{ id: ViewTab; label: string }> = [
  { id: 'antologi', label: 'Antologi' },
  { id: 'baca', label: 'Ruang Baca' },
  { id: 'rak', label: 'Rak Simpan' },
  { id: 'redaksi', label: 'Redaksi' },
];

export function Header({
  activeView,
  onNavigate,
  savedCount,
  userRole = 'visitor',
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const portalLabel =
    userRole === 'admin'
      ? 'Meja Redaksi'
      : userRole === 'author'
        ? 'Tulis Prosa'
        : 'Masuk Penulis';

  const handleSelect = (view: ViewTab) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  return (
    <header className="border-b border-[#E5DFD3] bg-[#FBF9F5] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-6 md:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('antologi')}
          aria-label="Utaraksara — Beranda Antologi Senandika"
          className="font-serif text-2xl font-semibold tracking-tight text-[#1C1917] transition-colors hover:text-[#881337] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#881337] whitespace-nowrap shrink-0 cursor-pointer"
        >
          Utaraksara
        </button>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-5 lg:gap-7 text-sm font-medium text-[#57534E]"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            const displayLabel =
              item.id === 'rak' && savedCount > 0
                ? `${item.label} (${savedCount})`
                : item.label;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-1 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#881337] ${
                  isActive
                    ? 'text-[#1C1917] font-semibold'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {displayLabel}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-[2px] bg-[#881337]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action + mobile menu button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleSelect('tulis')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#881337] ${
              activeView === 'tulis'
                ? 'bg-[#1C1917] text-[#FBF9F5]'
                : 'bg-[#881337] text-[#FBF9F5] hover:bg-[#9F1239]'
            }`}
          >
            {portalLabel}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#E5DFD3] text-[#1C1917] hover:bg-[#F3EFE7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#881337] cursor-pointer"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Navigasi seluler"
          className="md:hidden border-t border-[#E5DFD3] bg-[#F3EFE7] px-6 py-3"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              const displayLabel =
                item.id === 'rak' && savedCount > 0
                  ? `${item.label} (${savedCount})`
                  : item.label;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#FBF9F5] text-[#881337]'
                      : 'text-[#44403C] hover:bg-[#FBF9F5]/60'
                  }`}
                >
                  <span>{displayLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}

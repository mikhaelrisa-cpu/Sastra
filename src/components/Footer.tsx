import type { ViewTab } from '../types/prose';

interface FooterProps {
  onNavigate: (view: ViewTab) => void;
  totalWorks: number;
  actionLabel?: string;
}

export function Footer({
  onNavigate,
  totalWorks,
  actionLabel = 'Masuk Penulis',
}: FooterProps) {
  return (
    <footer className="mt-20 border-t border-[#E5DFD3] bg-[#F3EFE7]/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-serif text-xl font-semibold text-[#1C1917]">
            Utaraksara
          </p>
          <p className="mt-1 text-xs text-[#57534E]">
            Senandika · Antologi sastra prosa romantis berbahasa Indonesia · Edisi I ({totalWorks} naskah terhimpun)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#57534E]">
          <button
            type="button"
            onClick={() => onNavigate('antologi')}
            className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Antologi
          </button>
          <button
            type="button"
            onClick={() => onNavigate('baca')}
            className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ruang Baca
          </button>
          <button
            type="button"
            onClick={() => onNavigate('rak')}
            className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Rak Simpan
          </button>
          <button
            type="button"
            onClick={() => onNavigate('tulis')}
            className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {actionLabel}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('redaksi')}
            className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Redaksi
          </button>
        </div>
      </div>
    </footer>
  );
}

import { ArrowRight } from 'lucide-react';
import type { ProseTheme, ProseWork } from '../types/prose';
import { PROSE_THEMES } from '../utils/proseLogic';

interface EditorialViewProps {
  works: ProseWork[];
  onSelectThemeInAnthology: (theme: ProseTheme) => void;
  onGoToWrite: () => void;
  actionLabel?: string;
}

const THEME_DESCRIPTIONS: Record<ProseTheme, string> = {
  'Surat & Epistolari':
    'Prosa berbingkai korespondensi—surat-surat yang tak sempat dikirim, catatan pinggir amplop, dan pengakuan paling jujur di atas kertas.',
  Melankolia:
    'Renungan lirih tentang perpisahan tanpa gaduh, ingatan yang mengendap di ruang sunyi, dan kelembutan hati setelah kehilangan.',
  'Senja & Kota':
    'Pertemuan dan kepergian di antara peron kereta, lampu jalan selepas gerimis, serta sudut-sudut kota yang menyimpan jejak langkah.',
  'Alam & Rindu':
    'Dialog antara perasaan manusia dan lanskap alam—tanjung berkabut, embun bukit, pasang surut laut, dan waktu yang berjalan pelan.',
};

export function EditorialView({
  works,
  onSelectThemeInAnthology,
  onGoToWrite,
  actionLabel = 'Portal Penulis',
}: EditorialViewProps) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:py-14">
      <header className="border-b border-[#E5DFD3] pb-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#881337]">
          Manifest Redaksi
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.1] text-[#1C1917] sm:text-5xl headline-balance">
          Merawat Keheningan dalam Sastra Prosa Romantis
        </h1>
        <p className="mt-5 max-w-2xl font-serif text-xl italic leading-relaxed text-[#44403C]">
          Senandika oleh Utaraksara hadir sebagai ruang baca yang tenang—tempat kata-kata dipilih dengan sabar, jauh dari riuh linimasa, agar setiap kalimat memperoleh kembali bobot keintimannya.
        </p>
      </header>

      <section aria-labelledby="principles-heading" className="mt-12">
        <h2
          id="principles-heading"
          className="text-xs font-medium uppercase tracking-[0.16em] text-[#57534E]"
        >
          Prinsip Kurasi
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="border-t border-[#E5DFD3] pt-5">
            <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
              01. Ketepatan Diksi
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#44403C]">
              Prosa romantis bukan sekadar kumpulan ungkapan manis, melainkan keberanian memilih kata yang jujur, spesifik, dan berakar pada pengalaman indrawi.
            </p>
          </div>
          <div className="border-t border-[#E5DFD3] pt-5">
            <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
              02. Ruang Baca Tenang
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#44403C]">
              Setiap naskah ditata dengan lebar kolom baca optimal, tipografi buku klasik, serta pilihan tema kertas hangat hingga malam tinta untuk kenyamanan mata.
            </p>
          </div>
          <div className="border-t border-[#E5DFD3] pt-5">
            <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
              03. Penulis Terkurasi
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#44403C]">
              Ruang penulisan dikhususkan bagi penulis yang akunnya didaftarkan atau disetujui oleh Admin Redaksi, sehingga setiap naskah dan sampul visual terjaga keindahannya.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="rooms-heading" className="mt-16 border-t border-[#E5DFD3] pt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#57534E]">
              Kamar Tema
            </p>
            <h2
              id="rooms-heading"
              className="mt-1 font-serif text-3xl font-semibold text-[#1C1917]"
            >
              Empat Ragam Suasana Prosa
            </h2>
          </div>
          <button
            type="button"
            onClick={onGoToWrite}
            className="self-start rounded-md bg-[#881337] px-4 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#9F1239] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {actionLabel}
          </button>
        </div>

        <div className="mt-8 divide-y divide-[#E5DFD3] border-y border-[#E5DFD3]">
          {PROSE_THEMES.map((themeName) => {
            const count = works.filter((w) => w.theme === themeName).length;
            return (
              <div
                key={themeName}
                className="grid grid-cols-1 gap-4 py-6 md:grid-cols-12 md:items-center"
              >
                <div className="md:col-span-4">
                  <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
                    {themeName}
                  </h3>
                  <p className="mt-1 text-xs text-[#57534E] tabular-nums">
                    {count} naskah terhimpun
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-[#44403C] md:col-span-6">
                  {THEME_DESCRIPTIONS[themeName]}
                </p>
                <div className="md:col-span-2 md:text-right">
                  <button
                    type="button"
                    onClick={() => onSelectThemeInAnthology(themeName)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#881337] hover:text-[#9F1239] cursor-pointer"
                  >
                    <span>Buka Tema</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

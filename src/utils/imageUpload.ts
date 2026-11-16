export interface CoverImagePreset {
  id: string;
  label: string;
  src: string;
  defaultCaption: string;
}

export const CURATED_COVER_IMAGES: CoverImagePreset[] = [
  {
    id: 'cover-letters',
    label: 'Meja Surat & Mawar Kering',
    src: '/src/assets/images/hero_romantic_letters_1794803327178.jpg',
    defaultCaption: 'Fig. 1 — Meja surat dan kelopak mawar kering, arsip Edisi Pertama.',
  },
  {
    id: 'cover-station',
    label: 'Peron Stasiun Hujan Senja',
    src: '/src/assets/images/prose_rain_station_1794803328545.jpg',
    defaultCaption: 'Fig. 2 — Peron stasiun kota selepas gerimis senja.',
  },
  {
    id: 'cover-sea',
    label: 'Tanjung Karang & Mercusuar',
    src: '/src/assets/images/prose_sea_lighthouse_1794803329003.jpg',
    defaultCaption: 'Fig. 3 — Tanjung karang pada jam biru menjelang malam.',
  },
  {
    id: 'cover-library',
    label: 'Meja Baca Linen & Teh Hangat',
    src: '/src/assets/images/prose_autumn_library_1794803328957.jpg',
    defaultCaption: 'Fig. 4 — Meja baca pagi dengan catatan tangan di buku linen.',
  },
];

const MAX_DIMENSION = 1100;
const MAX_DATA_URL_LENGTH = 550000;

export async function compressImageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Berkas yang dipilih harus berupa gambar (JPG, PNG, atau WebP).');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
      el.src = objectUrl;
    });

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Peramban tidak mendukung pengolahan gambar.');
    }
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.82;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.35) {
      quality -= 0.12;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      throw new Error('Ukuran gambar terlalu besar setelah dikompresi. Pilih gambar yang lebih kecil.');
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

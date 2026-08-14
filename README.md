# Seleksi Drone Scorer

Web app penilaian misi drone (Vue 3 + Vite), sesuai rubrik: Misi 1 (10), Misi 2 (40),
Misi 3 (20), Finish (10) — total maksimal 80.

## Cara jalanin

```bash
npm install
npm run dev
```

Lalu buka URL yang muncul di terminal (biasanya http://localhost:5173).

## Build untuk produksi

```bash
npm run build
npm run preview
```

## Fitur
- Input penilaian per tim (Ya/Tidak per elemen penilaian, plus opsi dropping paket)
- Skor dan ranking otomatis (tie-break berdasarkan waktu tercepat)
- Data tersimpan otomatis di localStorage browser
- Export ke JSON dan CSV
- Import JSON (untuk gabungkan data dari beberapa laptop juri)

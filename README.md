# CupCut

Aplikasi desktop kecil untuk memotong video panjang menjadi beberapa file MP4 dengan durasi tetap.

## Fitur
- Pilih file video input
- Atur durasi potongan dalam menit
- Pilih folder output
- Proses video menggunakan FFmpeg
- Menampilkan progres dan daftar file hasil

## Cara pakai
1. Pasang dependencies:
   ```bash
   npm install
   ```
2. Jalankan aplikasi:
   ```bash
   npm start
   ```

## Catatan
- Aplikasi menggunakan paket `ffmpeg-static` dan `ffprobe-static`, jadi tidak perlu menginstal FFmpeg/FFprobe secara terpisah.
- Jika paket terpasang dengan benar, binary akan otomatis digunakan dari dependensi npm.

## Struktur proyek
- `main.js` — proses utama Electron
- `preload.js` — bridge aman untuk renderer
- `renderer.js` — logika UI
- `services/videoService.js` — pemrosesan FFmpeg dan metadata video
- `index.html` — antarmuka pengguna
- `styles.css` — gaya tampilan

## Catatan
- Aplikasi ini menggunakan FFmpeg untuk re-encoding setiap potongan menjadi MP4.
- Jika FFmpeg tidak terpasang, aplikasi akan menampilkan pesan kesalahan saat dijalankan.

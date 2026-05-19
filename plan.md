# Plan Aplikasi Pemotong Video dengan Node.js

## Ringkasan Proyek
Aplikasi ini adalah aplikasi desktop berbasis Node.js yang berfungsi untuk memotong video panjang menjadi beberapa bagian dengan durasi tetap berdasarkan input pengguna. Proses pemotongan video akan menggunakan FFmpeg, karena FFmpeg mendukung pemrosesan video seperti splitting, transcoding, dan export file MP4, serta dapat dijalankan dari Node.js melalui proses child process.[cite:1][cite:2]

## Tujuan Aplikasi
Tujuan utama aplikasi ini adalah menyediakan cara sederhana bagi pengguna untuk:

- Mengunggah video panjang ke aplikasi.
- Menentukan durasi potongan video dalam satuan menit.
- Menentukan format hasil video, yaitu MP4.
- Memilih folder tujuan untuk menyimpan hasil potongan video.
- Menjalankan proses pemotongan otomatis hingga seluruh video habis diproses.

## Fitur Utama
Form utama aplikasi akan terdiri dari komponen berikut:

- **Upload video** — pengguna memilih satu file video sumber dari komputer.
- **Durasi potong** — pengguna mengisi berapa menit durasi tiap hasil video.
- **Jenis output video** — pilihan format output, untuk versi awal dikunci ke MP4 agar implementasi lebih sederhana dan konsisten dengan pipeline FFmpeg.[cite:1]
- **Pilih folder output** — pengguna memilih folder tujuan untuk menyimpan semua hasil video.
- **Tombol proses** — memulai proses splitting video.
- **Status proses** — menampilkan progres, jumlah potongan yang dihasilkan, dan status selesai/gagal.

## Flow Aplikasi
Alur aplikasi dirancang sebagai berikut:

1. Pengguna membuka aplikasi.
2. Pengguna mengunggah satu file video panjang.
3. Sistem membaca metadata video, termasuk durasi total video, menggunakan `ffprobe` dari ekosistem FFmpeg.[cite:2]
4. Pengguna mengisi durasi potong dalam menit, misalnya 1 menit.
5. Pengguna memilih format output MP4.
6. Pengguna memilih folder penyimpanan hasil.
7. Pengguna menekan tombol proses.
8. Sistem menghitung jumlah segmen berdasarkan durasi total video dibagi durasi potong.
9. Sistem menjalankan FFmpeg untuk memotong video menjadi beberapa bagian berurutan.[cite:1][cite:2]
10. Setiap hasil potongan disimpan otomatis ke folder yang dipilih pengguna dengan nama file berurutan.
11. Sistem menampilkan pesan selesai ketika seluruh potongan berhasil dibuat.

## Contoh Skenario
Contoh proses kerja aplikasi:

- Video input: 10 menit.
- Durasi potong: 1 menit.
- Hasil: 10 file video.
- Nama output: `video-part-001.mp4`, `video-part-002.mp4`, dan seterusnya.

Jika durasi video tidak habis dibagi rata, maka potongan terakhir akan memiliki durasi lebih pendek dari nilai yang diatur pengguna.

## Rekomendasi Arsitektur
Agar mudah dikembangkan dan dipakai user non-teknis, arsitektur yang disarankan adalah aplikasi desktop sederhana dengan tampilan form dan backend lokal Node.js.

| Layer | Rekomendasi | Fungsi |
|---|---|---|
| UI | Electron + HTML/CSS/JS | Menyediakan form upload, input durasi, pilihan format, dan folder output |
| Logic | Node.js | Mengatur validasi input, perhitungan segmen, dan orkestrasi proses |
| Video Engine | FFmpeg / ffprobe | Membaca metadata dan memotong video menjadi beberapa file MP4 [cite:1][cite:2] |
| File System | Node `fs` dan dialog folder | Menyimpan hasil output ke folder pilihan pengguna |

## Struktur Modul
Struktur modul awal yang disarankan:

- `ui/form` — komponen form input video, durasi, format, dan folder output.
- `services/videoProbe` — membaca metadata video dengan `ffprobe`.[cite:2]
- `services/videoSplitter` — menjalankan FFmpeg untuk splitting video.[cite:1][cite:2]
- `services/fileNaming` — membentuk nama file output berurutan.
- `services/outputManager` — memastikan folder output tersedia dan bisa ditulis.
- `validators/inputValidator` — validasi file video, durasi, dan folder tujuan.
- `logs/processLogger` — mencatat proses dan error.

## Detail Proses Teknis
Secara teknis, proses akan berjalan seperti ini:

1. Aplikasi menerima path file video input.
2. Aplikasi membaca durasi total video.
3. Aplikasi mengubah durasi potong dari menit ke detik.
4. Aplikasi menghitung jumlah segmen dengan pembagian durasi total terhadap durasi potong.
5. Untuk setiap segmen, aplikasi menentukan nilai `start time` dan `duration`.
6. Node.js mengeksekusi FFmpeg untuk menghasilkan file MP4 per segmen.[cite:1][cite:2]
7. Hasil file disimpan ke folder output yang sudah dipilih.
8. UI menerima update progres sampai semua segmen selesai.

## Validasi yang Dibutuhkan
Sebelum proses dimulai, aplikasi perlu memvalidasi beberapa hal:

- File video wajib dipilih.
- Durasi potong harus berupa angka dan lebih besar dari 0.
- Folder output wajib dipilih.
- Format output untuk versi awal hanya MP4.
- File input harus memiliki format video yang didukung FFmpeg.
- Aplikasi harus menolak proses bila durasi potong lebih besar dari durasi total video, atau minimal memberi peringatan agar hasil hanya 1 file.

## Penamaan Output
Format nama file hasil yang direkomendasikan:

- `{nama-video}-part-001.mp4`
- `{nama-video}-part-002.mp4`
- `{nama-video}-part-003.mp4`

Keuntungan pola ini adalah file hasil mudah diurutkan, dicari, dan diproses ulang bila dibutuhkan.

## Error Handling
Beberapa kondisi error yang harus ditangani:

- File video rusak atau tidak bisa dibaca.
- FFmpeg belum terpasang atau tidak ditemukan di sistem.
- Folder output tidak memiliki izin tulis.
- Proses splitting gagal di tengah jalan.
- Nama file bentrok dengan file lama di folder tujuan.

Solusi awal yang disarankan:

- Tampilkan pesan error yang jelas di UI.
- Simpan log proses untuk debugging.
- Gunakan pengecekan dependency FFmpeg saat aplikasi dijalankan.[cite:2]
- Tambahkan opsi overwrite atau auto-rename bila file output sudah ada.

## Tahapan Pengerjaan
Rencana implementasi dapat dibagi menjadi beberapa tahap:

### Tahap 1 — Setup Project
- Inisialisasi project Node.js.
- Setup Electron untuk desktop UI.
- Integrasi HTML form dasar.
- Setup dependency FFmpeg dan pengecekan environment.

### Tahap 2 — Form dan Validasi
- Buat form upload video.
- Buat input durasi potong dalam menit.
- Buat dropdown output format MP4.
- Buat pemilih folder output.
- Tambahkan validasi input.

### Tahap 3 — Integrasi Video Processing
- Implementasi pembacaan metadata video dengan `ffprobe`.[cite:2]
- Implementasi proses splitting per segmen dengan FFmpeg.[cite:1][cite:2]
- Simpan file hasil ke folder output.
- Tampilkan progres proses di UI.

### Tahap 4 — Penyempurnaan
- Tambahkan loading state.
- Tambahkan log error dan notifikasi sukses.
- Tangani overwrite file.
- Uji file video kecil, sedang, dan besar.

### Tahap 5 — Packaging
- Build aplikasi menjadi executable desktop.
- Uji pada Windows sebagai target utama.
- Dokumentasikan cara instalasi FFmpeg bila belum dibundling.

## Kebutuhan Teknis
Kebutuhan minimum untuk proyek ini:

- Node.js runtime.
- Electron untuk desktop app.
- FFmpeg dan ffprobe sebagai engine pemrosesan video.[cite:1][cite:2]
- Modul Node.js seperti `fs`, `path`, dan `child_process`.
- Opsional: `fluent-ffmpeg` bila ingin wrapper API yang lebih nyaman, walau pendekatan `spawn` langsung memberi kontrol proses yang lebih eksplisit.[cite:2]

## Output Akhir
Hasil akhir dari aplikasi ini adalah:

- Pengguna dapat memilih video panjang.
- Pengguna dapat menentukan durasi tiap potongan video.
- Sistem memotong video otomatis menjadi beberapa file MP4.
- Semua file hasil tersimpan otomatis ke folder pilihan pengguna.
- Pengguna mendapat status proses dan notifikasi selesai.

## Catatan Pengembangan
Untuk versi pertama, fokus terbaik adalah membuat aplikasi stabil dengan satu format output, yaitu MP4, tanpa fitur tambahan seperti subtitle, crop vertikal, atau AI scene detection. Pendekatan ini membuat ruang lingkup tetap sederhana dan sesuai dengan kemampuan dasar FFmpeg untuk splitting video dari Node.js.[cite:1][cite:2]

# 🐰 Forest Friends Runner (Petualangan Bun-Bun di Hutan Ajaib)

> **Webcam Body-Tracking Active 3-Lane Runner for Kids (4+ Tahun)**  
> Dibuat khusus untuk anak aktif usia dini, ditenagai MediaPipe Pose (100% on-device WASM, zero server upload), Canvas 2.5D Pseudo-3D, dan Pure Web Audio Synthesizer.

---

## 🌟 Fitur Utama & Tema Ramah Balita
* **Tema Fantasi Ceria**: Petualangan bersama **Bun-Bun si Kelinci Ajaib** di hutan permen dan pelangi mengumpulkan wortel emas 🥕, stroberi manis 🍓, dan bintang ajaib ⭐.
* **Non-Scary / Ramah Balita**: Tidak ada monster menyeramkan atau layar "Game Over" yang menakutkan. Rintangan berupa semak bunga membal 🌸, puding jeli goyang 🍮, dan kubangan air pelangi 💧. Jika mengenai rintangan, karakter hanya berputar lucu (*boing!*), mendapatkan perlindungan kebal 2.4 detik, dan selebrasi pencapaian bintang di akhir permainan.
* **Audio Prosedural Mandiri**: 100% dibangun menggunakan Web Audio API Synthesizer (BGM melodi pentatonik C-Mayor ceria dan efek suara lonceng peri). Bebas ketergantungan file MP3/WAV eksternal sehingga dijamin 100% langsung bersuara tanpa risiko file 404.

---

## 🛡️ Mitigasi Rekayasa Gerak Tubuh Anak 4 Tahun (*Child Pose Engine*)

1. **Under-Sensitivity Mitigation — Dynamic Body-Width Normalization**:
   * Anak usia 4 tahun memiliki rentang langkah dan postur tubuh yang lebih kecil (~95-105 cm).
   * Perpindahan jalur **tidak memakai koordinat absolut**, melainkan diukur secara relatif terhadap lebar bahu anak:  
     $$\Delta X_{\text{relatif}} = \frac{X_{\text{saat\_ini}} - X_{\text{tengah}}}{\text{Lebar Bahu}}$$
   * Sensitivitas otomatis menyesuaikan dengan postur anak maupun jarak anak dari laptop/kamera.

2. **Over-Sensitivity & Jitter Mitigation — Adaptive EMA + Deadzone**:
   * Filter *Exponential Moving Average (EMA)* adaptif: saat anak diam, smoothing diperkuat ($\alpha = 0.22$) untuk menghilangkan getaran kamera; saat anak melangkah, respon dinaikkan ($\alpha = 0.45$) agar gesit tanpa delay.
   * Toleransi tengah (*Center Deadzone*): Goyangan santai $\pm 12\%$ tidak memicu perpindahan jalur.

3. **Flickering Prevention — Schmitt Trigger (Hysteresis)**:
   * Ambang batas geser ke kiri/kanan: $0.35$ lebar tubuh.
   * Ambang batas kembali ke tengah: $0.18$ lebar tubuh.
   * Adanya *buffer zone* sebesar $0.17$ mencegah karakter melompat-lompat liar saat anak berdiri di perbatasan jalur.

4. **Torso Center-of-Mass (COM) Anchor**:
   * Mengabaikan gerakan kepala dan hidung (anak sering menoleh melihat orang tua).
   * Posisi dihitung murni dari titik berat batang tubuh (rata-rata bahu dan pinggul).

5. **Interactive PiP Mirror Overlay**:
   * Cermin webcam di pojok layar dengan 3 kolom zona berwarna cerah:
     * 🟢 **Hijau (Kiri)**
     * 🟡 **Kuning (Tengah)**
     * 🔵 **Biru (Kanan)**
   * Anak langsung memahami hubungan gerak tubuhnya dengan karakter di layar.

6. **Triple-Mode Control**:
   * **Gerak Tubuh Webcam** (Otomatis aktif).
   * **Keyboard (◀ ▶)**: Tombol Panah Kiri, Kanan, Spasi (Lompat).
   * **Layar Sentuh (On-Screen Touch)**: Tombol bantuan di layar untuk orang tua.

---

## 🚀 Cara Menjalankan

```bash
# Masuk ke direktori
cd /Volumes/DevSSD/Development/OneWeekOneApp/Apps/forest_friends_runner

# Jalankan server pengembangan
npm run dev
```

Buka URL yang muncul di terminal (misal: `http://localhost:5174/`) di browser Chrome atau Safari.
Izinkan akses webcam saat diminta, lalu ajak si kecil berdiri di depan kamera!


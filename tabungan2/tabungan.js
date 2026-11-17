let saldoEl;
let formTujuan;
let formTabungan;
let daftarEl;
let tampilanTujuan;
let resetTabunganBtn;
let tujuanDipilihEl;

const STORAGE_KEY = 'tabunganAppData';

const state = {
  saldo: 0,
  tujuan: [],
  riwayat: []
};

function formatRupiah(nilai) {
  var angka = Number(nilai) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(angka);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadData() {
  var saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) return;

  try {
    var parsed = JSON.parse(saved);

    state.tujuan = Array.isArray(parsed.tujuan)
      ? parsed.tujuan.map(function (tujuan) {
          return Object.assign({}, tujuan, {
            terkumpul: Number(tujuan.terkumpul) || 0
          });
        })
      : [];
    state.riwayat = Array.isArray(parsed.riwayat) ? parsed.riwayat : [];
    syncSaldoFromGoals();
  } catch (error) {
    console.warn('Data tabungan gagal dimuat:', error);
  }
}

function syncSaldoFromGoals() {
  state.saldo = state.tujuan.reduce(function (sum, item) {
    return sum + Number(item.terkumpul || 0);
  }, 0);
}

function renderSaldo() {
  saldoEl.textContent = formatRupiah(state.saldo);
}

function renderTujuanOptions() {
  var html = '<option value="">Pilih tujuan (opsional)</option>';

  state.tujuan.forEach(function (tujuan) {
    html += '<option value="' + tujuan.id + '">' + tujuan.nama + '</option>';
  });

  tujuanDipilihEl.innerHTML = html;
  tujuanDipilihEl.disabled = state.tujuan.length === 0;
}

function renderTujuan() {
  if (state.tujuan.length === 0) {
    tampilanTujuan.innerHTML = '<p>Belum ada tujuan menabung.</p>';
    return;
  }

  var html = '';

  state.tujuan.forEach(function (tujuan) {
    var terkumpul = Number(tujuan.terkumpul || 0);
    var progress = Math.min((terkumpul / Number(tujuan.harga || 1)) * 100, 100);
    var sisa = Math.max(Number(tujuan.harga || 0) - terkumpul, 0);
    var statusText = progress >= 100 ? 'Tujuan tercapai!' : 'Sisa: ' + formatRupiah(sisa);
    var gambarHtml = tujuan.gambar
      ? '<img src="' + tujuan.gambar + '" alt="' + tujuan.nama + '" class="tujuan-foto">'
      : '<div class="tujuan-placeholder">🎯</div>';

    html +=
      '<div class="tujuan-item" data-id="' + tujuan.id + '">' +
      '  <div class="tujuan-top">' +
      '    ' + gambarHtml +
      '    <div class="tujuan-meta">' +
      '      <strong>' + tujuan.nama + '</strong>' +
      '      <p>Target: ' + formatRupiah(tujuan.harga) + '</p>' +
      '      <p>Terkumpul: ' + formatRupiah(terkumpul) + '</p>' +
      '    </div>' +
      '  </div>' +
      '  <div class="progress"><div class="progress-bar" style="width:' + progress + '%"></div></div>' +
      '  <p>' + statusText + '</p>' +
      '  <div class="tujuan-actions"><button type="button" class="delete-btn" data-delete-tujuan="' + tujuan.id + '">Hapus</button></div>' +
      '</div>';
  });

  tampilanTujuan.innerHTML = html;
}

function renderRiwayat() {
  if (state.riwayat.length === 0) {
    daftarEl.innerHTML = '<li>Belum ada riwayat tabungan.</li>';
    return;
  }

  var html = '';

  state.riwayat.forEach(function (item) {
    var tanggal = new Date(item.tanggal).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    var tujuanLabel = item.tujuanNama ? ' • ' + item.tujuanNama : '';

    html +=
      '<li class="riwayat-item">' +
      '  <div class="riwayat-header">' +
      '    <strong>' + item.keterangan + tujuanLabel + '</strong>' +
      '    <span class="riwayat-nominal">+ ' + formatRupiah(item.jumlah) + '</span>' +
      '  </div>' +
      '  <small>' + tanggal + '</small>' +
      '</li>';
  });

  daftarEl.innerHTML = html;
}

function renderAll() {
  renderSaldo();
  renderTujuan();
  renderRiwayat();
  renderTujuanOptions();
}

function readFileAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      resolve(reader.result);
    };
    reader.onerror = function () {
      reject(new Error('Gagal membaca gambar'));
    };
    reader.readAsDataURL(file);
  });
}

function bindEvents() {
  formTujuan.addEventListener('submit', async function (event) {
    event.preventDefault();

    var namaInput = document.getElementById('namaTujuan');
    var hargaInput = document.getElementById('hargaTujuan');
    var fileInput = document.getElementById('gambarTujuan');

    var nama = namaInput.value.trim();
    var harga = Number(hargaInput.value);

    if (!nama || !harga || harga <= 0) {
      alert('Nama tujuan dan harga harus diisi dengan benar.');
      return;
    }

    var gambar = '';

    if (fileInput.files.length > 0) {
      gambar = await readFileAsDataUrl(fileInput.files[0]);
    }

    state.tujuan.push({
      id: Date.now(),
      nama: nama,
      harga: harga,
      gambar: gambar,
      terkumpul: 0
    });

    syncSaldoFromGoals();
    saveData();
    renderAll();
    formTujuan.reset();
  });

  tujuanDipilihEl.addEventListener('change', function () {
    renderSaldo();
  });

  formTabungan.addEventListener('submit', function (event) {
    event.preventDefault();

    var keteranganInput = document.getElementById('keterangan');
    var jumlahInput = document.getElementById('jumlah');

    var keterangan = keteranganInput.value.trim();
    var jumlah = Number(jumlahInput.value);
    var tujuanId = Number(tujuanDipilihEl.value || 0);

    if (!keterangan || !jumlah || jumlah <= 0) {
      alert('Keterangan dan jumlah tabungan harus diisi dengan benar.');
      return;
    }

    if (tujuanId) {
      var targetTujuan = state.tujuan.find(function (item) {
        return item.id === tujuanId;
      });

      if (targetTujuan) {
        targetTujuan.terkumpul = Number(targetTujuan.terkumpul || 0) + jumlah;
      }
    }

    syncSaldoFromGoals();

    var targetTujuanNama = '';

    if (tujuanId) {
      var tujuanYangDipilih = state.tujuan.find(function (item) {
        return item.id === tujuanId;
      });

      if (tujuanYangDipilih) {
        targetTujuanNama = tujuanYangDipilih.nama;
      }
    }

    state.riwayat.unshift({
      id: Date.now(),
      keterangan: keterangan,
      jumlah: jumlah,
      tanggal: new Date().toISOString(),
      tujuanId: tujuanId || null,
      tujuanNama: targetTujuanNama
    });

    saveData();
    renderAll();
    formTabungan.reset();
    tujuanDipilihEl.value = '';
  });

  tampilanTujuan.addEventListener('click', function (event) {
    var id = Number(event.target.dataset.deleteTujuan);

    if (!id) return;

    state.tujuan = state.tujuan.filter(function (item) {
      return item.id !== id;
    });

    syncSaldoFromGoals();
    saveData();
    renderAll();
  });

  resetTabunganBtn.addEventListener('click', function () {
    var yakin = window.confirm('Apakah Anda ingin menghapus semua data tabungan?');

    if (!yakin) return;

    state.saldo = 0;
    state.tujuan = [];
    state.riwayat = [];
    localStorage.removeItem(STORAGE_KEY);
    renderAll();
  });
}

function refreshGlobalTotal() {
  syncSaldoFromGoals();
  renderSaldo();
}

function initApp() {
  saldoEl = document.getElementById('saldo');
  formTujuan = document.getElementById('formtujuan');
  formTabungan = document.getElementById('formTabungan');
  daftarEl = document.getElementById('daftar');
  tampilanTujuan = document.getElementById('tampilanTujuan');
  resetTabunganBtn = document.getElementById('resetTabungan');
  tujuanDipilihEl = document.getElementById('tujuanDipilih');

  if (!saldoEl || !formTujuan || !formTabungan || !daftarEl || !tampilanTujuan || !resetTabunganBtn || !tujuanDipilihEl) {
    return;
  }

  bindEvents();
  loadData();
  renderAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

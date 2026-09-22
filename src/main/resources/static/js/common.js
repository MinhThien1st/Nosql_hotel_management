/**
 * ============================================================
 * COMMON JAVASCRIPT - SƯƠNG MAI HOTEL PMS
 * Dùng chung: Dropdown Chi Nhánh Khách Sạn, Toast, Utilities
 * ============================================================
 */

const API_BASE = '/api';

// Shared Application State
const appState = {
    hotels: [],
    selectedHotelId: '',
    onHotelChange: null
};

/**
 * Format tiền tệ VNĐ
 */
function formatVnd(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

/**
 * Hiển thị Toast thông báo hiện đại
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <div class="toast-content">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/**
 * Khởi tạo Custom Floating Dropdown chọn Chi Nhánh Khách Sạn
 */
function initCustomDropdown(onHotelChangeCallback) {
    appState.onHotelChange = onHotelChangeCallback;
    const btn = document.getElementById('hotelDropdownBtn');
    const menu = document.getElementById('hotelDropdownMenu');

    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.contains('show');
        if (isOpen) {
            menu.classList.remove('show');
            btn.classList.remove('open');
        } else {
            menu.classList.add('show');
            btn.classList.add('open');
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#hotelDropdownContainer')) {
            menu.classList.remove('show');
            btn.classList.remove('open');
        }
    });
}

/**
 * Tải danh sách Khách Sạn ('hotels' - Q1)
 */
async function loadHotels(afterLoadedCallback) {
    try {
        const res = await fetch(`${API_BASE}/hotels`);
        const data = await res.json();
        appState.hotels = data;

        const dropdownList = document.getElementById('hotelDropdownList');
        const modalHotelSelect = document.getElementById('modalHotelId');

        if (dropdownList) {
            dropdownList.innerHTML = `
                <div class="dropdown-item ${appState.selectedHotelId === '' ? 'active' : ''}" onclick="selectHotel('')">
                    <i class="fa-solid fa-globe"></i>
                    <span>Tất Cả Chi Nhánh</span>
                    <i class="fa-solid fa-check check-icon"></i>
                </div>
            `;

            data.forEach(h => {
                const shortName = h.hotelName.replace('Suong Mai ', '');
                dropdownList.innerHTML += `
                    <div class="dropdown-item ${appState.selectedHotelId === h.hotelId ? 'active' : ''}" onclick="selectHotel('${h.hotelId}')">
                        <i class="fa-solid fa-hotel"></i>
                        <span>${shortName} <small style="color:#94a3b8">(${h.city})</small></span>
                        <i class="fa-solid fa-check check-icon"></i>
                    </div>
                `;
            });
        }

        if (modalHotelSelect) {
            modalHotelSelect.innerHTML = '';
            data.forEach(h => {
                modalHotelSelect.innerHTML += `<option value="${h.hotelId}">${h.hotelName} (${h.city})</option>`;
            });
        }

        if (typeof afterLoadedCallback === 'function') {
            afterLoadedCallback();
        }

    } catch (err) {
        console.error('Lỗi khi tải danh sách khách sạn:', err);
    }
}

/**
 * Chọn chi nhánh từ Custom Dropdown
 */
function selectHotel(hotelId) {
    appState.selectedHotelId = hotelId;
    const hotel = appState.hotels.find(h => h.hotelId === hotelId);
    const label = hotel ? hotel.hotelName.replace('Suong Mai ', '') + ` (${hotel.city})` : 'Tất Cả Chi Nhánh';

    const labelElem = document.getElementById('selectedHotelLabel');
    if (labelElem) labelElem.innerText = label;

    const selector = document.getElementById('hotelSelector');
    if (selector) selector.value = hotelId;

    const menu = document.getElementById('hotelDropdownMenu');
    const btn = document.getElementById('hotelDropdownBtn');
    if (menu) menu.classList.remove('show');
    if (btn) btn.classList.remove('open');

    // Trigger callback nếu có
    if (typeof appState.onHotelChange === 'function') {
        appState.onHotelChange(hotelId);
    }
}

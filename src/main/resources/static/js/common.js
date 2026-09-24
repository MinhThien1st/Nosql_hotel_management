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

        // Render Hotel Information Banner (Address, Hotline, Star Rating, Pool, Spa)
        renderHotelBanner();

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

    // Cập nhật thông tin chi nhánh (Hotline, Địa chỉ, Tiện ích Bể bơi/Spa, Số sao)
    renderHotelBanner();

    // Trigger callback nếu có
    if (typeof appState.onHotelChange === 'function') {
        appState.onHotelChange(hotelId);
    }
}

/**
 * Render Khung Thông Tin Chi Nhánh Khách Sạn (Bảng 'hotels' - Q1)
 * Hiển thị đầy đủ các trường: Tên, Slogan, Địa chỉ, Hotline, Sao, Bể bơi, Spa
 */
function renderHotelBanner() {
    let bannerElem = document.getElementById('hotelInfoBanner');
    if (!bannerElem) {
        const topHeader = document.querySelector('.top-header');
        if (topHeader && topHeader.parentNode) {
            bannerElem = document.createElement('div');
            bannerElem.id = 'hotelInfoBanner';
            bannerElem.className = 'hotel-info-banner';
            topHeader.parentNode.insertBefore(bannerElem, topHeader.nextSibling);
        } else {
            return;
        }
    }

    const currentId = appState.selectedHotelId;
    const hotel = appState.hotels.find(h => h.hotelId === currentId);

    if (!hotel) {
        // Chế độ "Tất Cả Chi Nhánh"
        bannerElem.innerHTML = `
            <div class="branch-card branch-overview">
                <div class="branch-main">
                    <div class="branch-title-row">
                        <span class="branch-badge-chain"><i class="fa-solid fa-crown text-amber"></i> Hệ Thống Chuỗi Sương Mai</span>
                        <span class="branch-stars">
                            <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
                        </span>
                    </div>
                    <h2 class="branch-name"><i class="fa-solid fa-hotel text-indigo"></i> Chuỗi Khách Sạn & Resort Nghỉ Dưỡng Toàn Quốc</h2>
                    <p class="branch-tagline">“Trải nghiệm dịch vụ lưu trú 4-5 sao tại các thành phố du lịch biển và trung tâm kinh tế hàng đầu Việt Nam”</p>
                    <div class="branch-meta-row">
                        <div class="meta-item"><i class="fa-solid fa-building-flag text-indigo"></i> Quy mô: <strong>${appState.hotels.length} chi nhánh</strong></div>
                        <div class="meta-item"><i class="fa-solid fa-phone text-emerald"></i> Tổng đài CSKH: <strong>1900-8888</strong></div>
                        <div class="meta-item-amenities">
                            <span class="amenity-badge pool-badge"><i class="fa-solid fa-water-ladder"></i> Hồ bơi vô cực</span>
                            <span class="amenity-badge spa-badge"><i class="fa-solid fa-spa"></i> Spa & Massage</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // Chế độ chi nhánh cụ thể
    const starCount = hotel.starRating || 5;
    let starsHtml = '';
    for (let i = 0; i < starCount; i++) {
        starsHtml += '<i class="fa-solid fa-star text-amber"></i>';
    }

    bannerElem.innerHTML = `
        <div class="branch-card branch-detail">
            <div class="branch-main">
                <div class="branch-title-row">
                    <span class="branch-code-badge">${hotel.hotelId}</span>
                    <span class="branch-city-badge"><i class="fa-solid fa-location-dot text-indigo"></i> ${hotel.city || ''}</span>
                    <span class="branch-stars">${starsHtml} <strong style="color:var(--text-primary); margin-left:4px;">${starCount} Sao</strong></span>
                </div>
                <h2 class="branch-name"><i class="fa-solid fa-hotel text-indigo"></i> ${hotel.hotelName}</h2>
                <p class="branch-tagline">“${hotel.tagline || 'Không gian nghỉ dưỡng lý tưởng cho mọi chuyến đi'}”</p>
                <div class="branch-meta-row">
                    <div class="meta-item"><i class="fa-solid fa-map-location-dot text-indigo"></i> Địa chỉ: <strong>${hotel.address || 'Đang cập nhật'}</strong></div>
                    <div class="meta-item"><i class="fa-solid fa-phone text-emerald"></i> Hotline: <strong>${hotel.phone || '0236-xxx-xxxx'}</strong></div>
                    <div class="meta-item"><i class="fa-solid fa-door-open text-purple"></i> Quy mô: <strong>${hotel.totalRooms || 0} phòng</strong></div>
                    <div class="meta-item-amenities">
                        ${hotel.hasPool ? '<span class="amenity-badge pool-badge"><i class="fa-solid fa-water-ladder"></i> Hồ bơi</span>' : '<span class="amenity-badge disabled"><i class="fa-solid fa-xmark"></i> Không có bể bơi</span>'}
                        ${hotel.hasSpa ? '<span class="amenity-badge spa-badge"><i class="fa-solid fa-spa"></i> Spa & Massage</span>' : '<span class="amenity-badge disabled"><i class="fa-solid fa-xmark"></i> Không có Spa</span>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

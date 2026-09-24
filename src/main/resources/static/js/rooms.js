/**
 * ============================================================
 * ROOMS JAVASCRIPT (DEV 1)
 * Phụ trách: PMS Room Grid theo Ngày, Live Status Filter, Room CRUD, Room Detail
 * ============================================================
 */

let allRooms = [];
let allBookings = [];
let currentStatusFilter = 'ALL';
let viewMode = 'grid';
let isEditMode = false;
let selectedDate = '';

document.addEventListener('DOMContentLoaded', () => {
    // Mặc định chọn ngày hôm nay
    const todayStr = getTodayDateString();
    selectedDate = todayStr;
    const dateInput = document.getElementById('filterRoomDate');
    if (dateInput) {
        dateInput.value = todayStr;
        dateInput.addEventListener('change', (e) => {
            selectedDate = e.target.value;
            applyDateFilterAndRender();
        });
    }

    initCustomDropdown((hotelId) => {
        loadRooms();
    });

    loadHotels(() => {
        loadRooms();
    });

    initFilters();

    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            showToast('Đang làm mới danh sách phòng...', 'info');
            loadRooms();
        });
    }
});

function getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function setRoomDateToday() {
    const todayStr = getTodayDateString();
    selectedDate = todayStr;
    const dateInput = document.getElementById('filterRoomDate');
    if (dateInput) {
        dateInput.value = todayStr;
    }
    applyDateFilterAndRender();
}

function initFilters() {
    const floorFilter = document.getElementById('filterRoomFloor');
    const keywordFilter = document.getElementById('searchRoomKeyword');
    if (floorFilter) floorFilter.addEventListener('change', filterAndRenderRooms);
    if (keywordFilter) keywordFilter.addEventListener('input', filterAndRenderRooms);
}

/**
 * Tải danh sách phòng & danh sách đặt phòng từ API
 */
async function loadRooms() {
    try {
        let roomUrl = `${API_BASE}/rooms`;
        let bookingUrl = `${API_BASE}/bookings`;

        if (appState.selectedHotelId) {
            roomUrl += `?hotelId=${encodeURIComponent(appState.selectedHotelId)}`;
            bookingUrl += `?hotelId=${encodeURIComponent(appState.selectedHotelId)}`;
        }

        const [roomsRes, bookingsRes] = await Promise.all([
            fetch(roomUrl).catch(() => ({ json: () => [] })),
            fetch(bookingUrl).catch(() => ({ json: () => [] }))
        ]);

        allRooms = await roomsRes.json().catch(() => []);
        allBookings = await bookingsRes.json().catch(() => []);

        applyDateFilterAndRender();
    } catch (err) {
        console.error('Lỗi khi tải dữ liệu phòng & đặt phòng:', err);
    }
}

/**
 * Tính toán trạng thái thực tế của phòng theo ngày được chọn
 */
function calculateRoomStatusForDate(room, targetDate) {
    if (!targetDate) {
        return { status: room.status || 'AVAILABLE', booking: null };
    }

    // Tìm booking hợp lệ trùng với targetDate: checkInDate <= targetDate < checkOutDate
    const matchingBooking = allBookings.find(b => {
        if (b.hotelId !== room.hotelId || b.roomNumber !== room.roomNumber) return false;
        if (b.status === 'CANCELLED' || b.status === 'COMPLETED') return false;

        const checkIn = b.checkInDate;
        const checkOut = b.checkOutDate;
        if (!checkIn || !checkOut) return false;

        return checkIn <= targetDate && targetDate < checkOut;
    });

    if (matchingBooking) {
        if (matchingBooking.status === 'CHECKED_IN') {
            return { status: 'OCCUPIED', booking: matchingBooking };
        }
        if (matchingBooking.status === 'CONFIRMED') {
            return { status: 'BOOKED', booking: matchingBooking };
        }
    }

    // Nếu phòng trong DB đánh dấu bảo trì
    if (room.status === 'MAINTENANCE') {
        return { status: 'MAINTENANCE', booking: null };
    }

    return { status: 'AVAILABLE', booking: null };
}

function applyDateFilterAndRender() {
    allRooms.forEach(r => {
        const result = calculateRoomStatusForDate(r, selectedDate);
        r.effectiveStatus = result.status;
        r.activeBooking = result.booking;
    });

    updateStatusChipCounts();
    filterAndRenderRooms();
}

function updateStatusChipCounts() {
    const total = allRooms.length;
    const available = allRooms.filter(r => r.effectiveStatus === 'AVAILABLE').length;
    const occupied = allRooms.filter(r => r.effectiveStatus === 'OCCUPIED').length;
    const booked = allRooms.filter(r => r.effectiveStatus === 'BOOKED').length;
    const maintenance = allRooms.filter(r => r.effectiveStatus === 'MAINTENANCE').length;

    const elAll = document.getElementById('chipCountAll');
    const elAvail = document.getElementById('chipCountAvailable');
    const elOcc = document.getElementById('chipCountOccupied');
    const elBook = document.getElementById('chipCountBooked');
    const elMaint = document.getElementById('chipCountMaintenance');

    if (elAll) elAll.innerText = total;
    if (elAvail) elAvail.innerText = available;
    if (elOcc) elOcc.innerText = occupied;
    if (elBook) elBook.innerText = booked;
    if (elMaint) elMaint.innerText = maintenance;
}

function setStatusChipFilter(status) {
    currentStatusFilter = status;
    document.querySelectorAll('.status-chip').forEach(chip => {
        chip.classList.toggle('active', chip.getAttribute('data-status') === status);
    });
    filterAndRenderRooms();
}

function setRoomViewMode(mode) {
    viewMode = mode;
    const btnGrid = document.getElementById('btnViewGrid');
    const btnList = document.getElementById('btnViewList');
    if (btnGrid) btnGrid.classList.toggle('active', mode === 'grid');
    if (btnList) btnList.classList.toggle('active', mode === 'list');
    
    const gridEl = document.getElementById('roomGridContainer');
    const tableEl = document.getElementById('roomTableContainer');
    if (gridEl) gridEl.style.display = mode === 'grid' ? 'grid' : 'none';
    if (tableEl) tableEl.style.display = mode === 'list' ? 'block' : 'none';

    filterAndRenderRooms();
}

function filterAndRenderRooms() {
    const statusFilter = currentStatusFilter;
    const floorFilter = document.getElementById('filterRoomFloor') ? document.getElementById('filterRoomFloor').value : 'ALL';
    const keyword = document.getElementById('searchRoomKeyword') ? document.getElementById('searchRoomKeyword').value.trim().toLowerCase() : '';

    const filtered = allRooms.filter(r => {
        const matchStatus = (statusFilter === 'ALL') || (r.effectiveStatus === statusFilter);
        const matchFloor = (floorFilter === 'ALL') || (r.floor == floorFilter);
        const matchKeyword = !keyword || 
            (r.roomNumber && r.roomNumber.toLowerCase().includes(keyword)) ||
            (r.roomType && r.roomType.toLowerCase().includes(keyword)) ||
            (r.activeBooking && r.activeBooking.guestName && r.activeBooking.guestName.toLowerCase().includes(keyword));

        return matchStatus && matchFloor && matchKeyword;
    });

    if (viewMode === 'list') {
        renderRoomTable(filtered);
    } else {
        renderRoomGrid(filtered);
    }
}

function renderRoomGrid(rooms) {
    const container = document.getElementById('roomGridContainer');
    if (!container) return;
    
    if (rooms.length === 0) {
        container.innerHTML = '<div class="panel-card text-center text-muted" style="grid-column: 1/-1; padding: 40px;">Không tìm thấy phòng phù hợp.</div>';
        return;
    }

    if (!appState.selectedHotelId) {
        const groups = {};
        rooms.forEach(r => {
            if (!groups[r.hotelId]) groups[r.hotelId] = [];
            groups[r.hotelId].push(r);
        });

        let html = '';
        for (const [hotelId, hotelRooms] of Object.entries(groups)) {
            const hotel = appState.hotels.find(h => h.hotelId === hotelId);
            const hotelName = hotel ? hotel.hotelName : hotelId;
            const city = hotel ? hotel.city : '';

            html += `
                <div class="hotel-room-group" style="grid-column: 1 / -1;">
                    <div class="hotel-group-header">
                        <div class="hotel-group-title">
                            <i class="fa-solid fa-hotel text-indigo"></i> ${hotelName} <small style="color: #64748b; font-weight: 500;">(${city})</small>
                        </div>
                        <span class="hotel-group-badge">${hotelRooms.length} Phòng</span>
                    </div>
                    <div class="room-grid">
                        ${hotelRooms.map(r => renderSingleRoomCard(r)).join('')}
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    } else {
        container.innerHTML = rooms.map(r => renderSingleRoomCard(r)).join('');
    }
}

function renderSingleRoomCard(r) {
    const curStatus = r.effectiveStatus || r.status || 'AVAILABLE';
    const statusLower = curStatus.toLowerCase();
    
    let actionBtnHtml = '';
    if (curStatus === 'AVAILABLE') {
        actionBtnHtml = `
            <button class="btn-card-action btn-card-available" onclick="event.stopPropagation(); changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'OCCUPIED')" title="Chuyển sang Đang Ở">
                <i class="fa-solid fa-user-check"></i> Đang Ở
            </button>
            <button class="btn-card-action btn-card-maintenance" onclick="event.stopPropagation(); changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'MAINTENANCE')" title="Chuyển sang Bảo Trì">
                <i class="fa-solid fa-wrench"></i> Bảo Trì
            </button>
        `;
    } else if (curStatus === 'OCCUPIED') {
        actionBtnHtml = `
            <button class="btn-card-action btn-card-occupied" onclick="event.stopPropagation(); changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'AVAILABLE')" title="Trả phòng (Về Trống)">
                <i class="fa-solid fa-arrow-right-from-bracket"></i> Trả Phòng
            </button>
            <button class="btn-card-action btn-card-maintenance" onclick="event.stopPropagation(); changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'MAINTENANCE')" title="Bảo trì">
                <i class="fa-solid fa-wrench"></i> Bảo Trì
            </button>
        `;
    } else if (curStatus === 'BOOKED') {
        actionBtnHtml = `
            <button class="btn-card-action btn-card-booked" onclick="event.stopPropagation(); changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'OCCUPIED')" title="Khách Nhận Phòng">
                <i class="fa-solid fa-key"></i> Nhận Phòng
            </button>
            <button class="btn-card-action btn-card-available" onclick="event.stopPropagation(); changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'AVAILABLE')" title="Hủy Đặt">
                <i class="fa-solid fa-xmark"></i> Hủy Đặt
            </button>
        `;
    } else if (curStatus === 'MAINTENANCE') {
        actionBtnHtml = `
            <button class="btn-card-action btn-card-maintenance" onclick="event.stopPropagation(); changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'AVAILABLE')" title="Xong Bảo Trì">
                <i class="fa-solid fa-circle-check"></i> Xong Bảo Trì
            </button>
        `;
    }

    const statusTextMap = {
        'AVAILABLE': '🟢 Trống',
        'OCCUPIED': '🔴 Đang ở',
        'BOOKED': '🟡 Đã đặt',
        'MAINTENANCE': '⚪ Bảo trì'
    };

    const price = r.priceVnd || r.pricePerNightVnd || 0;
    const viewText = r.roomView || 'City View';
    const capacityText = r.capacity ? `${r.capacity} khách` : '2 khách';

    let guestTagHtml = '';
    if (r.activeBooking) {
        const b = r.activeBooking;
        const tagClass = curStatus === 'OCCUPIED' ? 'occupied' : 'booked';
        guestTagHtml = `
            <div class="room-card-guest-tag ${tagClass}">
                <i class="fa-solid fa-user-tag"></i> <span>${b.guestName}</span>
            </div>
        `;
    }

    return `
        <div class="room-card room-${statusLower}" onclick="openRoomDetailModal('${r.hotelId}', '${r.roomNumber}')" title="Nhấp để xem chi tiết phòng">
            <div class="room-card-header">
                <div class="room-card-number-wrapper">
                    <span class="room-card-number">P.${r.roomNumber}</span>
                    <span class="room-card-floor-tag">Tầng ${r.floor || 1}</span>
                </div>
                <div class="room-card-badge badge-${statusLower}">
                    ${statusTextMap[curStatus] || curStatus}
                </div>
            </div>

            <div class="room-card-body">
                <div class="room-card-type">${r.roomType || 'Standard'}</div>
                <div class="room-card-price-row">
                    <span class="room-card-price">${formatVnd(price)}</span>
                    <span class="room-card-unit">/đêm</span>
                </div>
                <div class="room-card-meta-chips">
                    <span><i class="fa-solid fa-users text-indigo"></i> ${capacityText}</span>
                    <span><i class="fa-solid fa-binoculars text-sky"></i> ${viewText}</span>
                </div>
                ${guestTagHtml}
            </div>

            <div class="room-card-footer">
                <div class="room-card-actions">
                    ${actionBtnHtml}
                </div>
                <div class="room-card-more">
                    <button class="btn-card-icon" onclick="event.stopPropagation(); openEditRoomModal('${r.hotelId}', '${r.roomNumber}')" title="Sửa thông tin">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-card-icon text-rose" onclick="event.stopPropagation(); deleteRoom('${r.hotelId}', '${r.roomNumber}')" title="Xóa phòng">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderRoomTable(rooms) {
    const tbody = document.getElementById('roomTableBody');
    if (!tbody) return;

    if (rooms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không tìm thấy phòng phù hợp.</td></tr>';
        return;
    }

    const statusBadgeMap = {
        'AVAILABLE': '<span class="status-pill status-available">🟢 Trống</span>',
        'OCCUPIED': '<span class="status-pill status-occupied">🔴 Đang ở</span>',
        'BOOKED': '<span class="status-pill status-booked">🟡 Đã đặt</span>',
        'MAINTENANCE': '<span class="status-pill status-maintenance">⚪ Bảo trì</span>'
    };

    tbody.innerHTML = rooms.map(r => {
        const hotel = appState.hotels.find(h => h.hotelId === r.hotelId);
        const hotelName = hotel ? hotel.hotelName : r.hotelId;
        const price = r.priceVnd || r.pricePerNightVnd || 0;
        const curStatus = r.effectiveStatus || r.status || 'AVAILABLE';

        let guestNote = '';
        if (r.activeBooking) {
            guestNote = `<br><small style="color:var(--indigo); font-weight:600;"><i class="fa-solid fa-user"></i> ${r.activeBooking.guestName}</small>`;
        }

        return `
            <tr style="cursor: pointer;" onclick="openRoomDetailModal('${r.hotelId}', '${r.roomNumber}')" title="Click xem chi tiết">
                <td><strong>P.${r.roomNumber}</strong></td>
                <td>${hotelName}</td>
                <td>${r.roomType || 'Standard'} ${guestNote}</td>
                <td>Tầng ${r.floor || 1}</td>
                <td><small style="color:var(--text-muted);">${r.roomView || 'City'}</small></td>
                <td><strong style="color: var(--indigo);">${formatVnd(price)}</strong></td>
                <td>${statusBadgeMap[curStatus] || curStatus}</td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openEditRoomModal('${r.hotelId}', '${r.roomNumber}')" title="Chỉnh sửa">
                            <i class="fa-solid fa-pen"></i> Sửa
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteRoom('${r.hotelId}', '${r.roomNumber}')" title="Xóa phòng">
                            <i class="fa-solid fa-trash"></i> Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Hiển thị Chi Tiết Phòng (Room Detail Modal)
 */
function openRoomDetailModal(hotelId, roomNumber) {
    const room = allRooms.find(r => r.hotelId === hotelId && r.roomNumber === roomNumber);
    if (!room) return;

    const hotel = appState.hotels.find(h => h.hotelId === room.hotelId);
    const hotelName = hotel ? hotel.hotelName : room.hotelId;
    const price = room.priceVnd || room.pricePerNightVnd || 0;
    const curStatus = room.effectiveStatus || room.status || 'AVAILABLE';

    const statusTextMap = {
        'AVAILABLE': '<span class="status-pill status-available">🟢 Trống (Sẵn sàng đón khách)</span>',
        'OCCUPIED': '<span class="status-pill status-occupied">🔴 Đang có khách ở</span>',
        'BOOKED': '<span class="status-pill status-booked">🟡 Đã có khách đặt trước</span>',
        'MAINTENANCE': '<span class="status-pill status-maintenance">⚪ Đang bảo trì / Dọn phòng</span>'
    };

    let bookingSectionHtml = '';
    if (room.activeBooking) {
        const b = room.activeBooking;
        bookingSectionHtml = `
            <div class="booking-info-box">
                <div class="booking-info-header">
                    <i class="fa-solid fa-calendar-check"></i> Thông Tin Khách Đặt Phòng Vào Ngày Này (${selectedDate})
                </div>
                <div class="room-detail-grid" style="margin-bottom: 0;">
                    <div class="detail-item" style="background:#ffffff;">
                        <div class="detail-item-label"><i class="fa-solid fa-user text-indigo"></i> Khách Hàng</div>
                        <div class="detail-item-value">${b.guestName} <small style="color:var(--text-muted)">(${b.guestId})</small></div>
                    </div>
                    <div class="detail-item" style="background:#ffffff;">
                        <div class="detail-item-label"><i class="fa-solid fa-barcode text-indigo"></i> Mã Booking</div>
                        <div class="detail-item-value" style="color:var(--indigo); font-family:monospace;">${b.bookingId}</div>
                    </div>
                    <div class="detail-item full-width" style="background:#ffffff;">
                        <div class="detail-item-label"><i class="fa-solid fa-clock text-indigo"></i> Thời Gian Lưu Trú</div>
                        <div class="detail-item-value">Check-in: <strong>${b.checkInDate}</strong> ➔ Check-out: <strong>${b.checkOutDate}</strong> (${b.numberOfNights || 1} đêm)</div>
                    </div>
                    <div class="detail-item" style="background:#ffffff;">
                        <div class="detail-item-label"><i class="fa-solid fa-sack-dollar text-emerald"></i> Tổng Tiền Booking</div>
                        <div class="detail-item-value" style="color:var(--emerald);">${formatVnd(b.totalAmountVnd || 0)}</div>
                    </div>
                    <div class="detail-item" style="background:#ffffff;">
                        <div class="detail-item-label"><i class="fa-solid fa-comment-dots text-amber"></i> Ghi Chú Đặc Biệt</div>
                        <div class="detail-item-value" style="font-size:13px; font-weight:500;">${b.specialRequest || 'Không có ghi chú'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    const titleEl = document.getElementById('roomDetailTitle');
    if (titleEl) {
        titleEl.innerHTML = `<i class="fa-solid fa-door-open text-indigo"></i> Chi Tiết Phòng P.${room.roomNumber} - ${hotelName}`;
    }

    const contentEl = document.getElementById('roomDetailContent');
    if (contentEl) {
        contentEl.innerHTML = `
            <div class="room-detail-grid">
                <div class="detail-item">
                    <div class="detail-item-label"><i class="fa-solid fa-hotel text-indigo"></i> Khách Sạn / Chi Nhánh</div>
                    <div class="detail-item-value">${hotelName} <small style="color:var(--text-muted)">(${room.hotelId})</small></div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-label"><i class="fa-solid fa-hashtag text-indigo"></i> Số Phòng & Vị Trí</div>
                    <div class="detail-item-value">Phòng ${room.roomNumber} · Tầng ${room.floor || 1}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-label"><i class="fa-solid fa-bed text-purple"></i> Loại Phòng</div>
                    <div class="detail-item-value">${room.roomType || 'Standard'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-label"><i class="fa-solid fa-tag text-emerald"></i> Giá Niêm Yết / Đêm</div>
                    <div class="detail-item-value" style="color:var(--indigo); font-size:16px;">${formatVnd(price)} <small style="font-size:11px; color:var(--text-muted);">/đêm</small></div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-label"><i class="fa-solid fa-binoculars text-sky"></i> Hướng Nhìn (Room View)</div>
                    <div class="detail-item-value">${room.roomView || 'City View'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-label"><i class="fa-solid fa-users text-amber"></i> Sức Chứa Tối Đa</div>
                    <div class="detail-item-value">${room.capacity || 2} Khách</div>
                </div>
                <div class="detail-item full-width">
                    <div class="detail-item-label"><i class="fa-solid fa-signal text-indigo"></i> Trạng Thái (Ngày: ${selectedDate})</div>
                    <div class="detail-item-value" style="margin-top:4px;">${statusTextMap[curStatus] || curStatus}</div>
                </div>
                <div class="detail-item full-width">
                    <div class="detail-item-label"><i class="fa-solid fa-align-left text-indigo"></i> Tiện Nghi & Mô Tả Chi Tiết</div>
                    <div class="detail-desc-box">${room.description || 'Chưa có mô tả chi tiết cho phòng này.'}</div>
                </div>
            </div>

            ${bookingSectionHtml}
        `;
    }

    const footerEl = document.getElementById('roomDetailFooter');
    if (footerEl) {
        footerEl.innerHTML = `
            <button class="btn btn-secondary" onclick="closeRoomDetailModal()">Đóng</button>
            <button class="btn btn-secondary" onclick="closeRoomDetailModal(); openEditRoomModal('${room.hotelId}', '${room.roomNumber}')">
                <i class="fa-solid fa-pen"></i> Sửa Phòng
            </button>
            <a href="bookings.html" class="btn btn-primary"><i class="fa-solid fa-calendar-check"></i> Xem Đặt Phòng</a>
        `;
    }

    const modal = document.getElementById('roomDetailModal');
    if (modal) modal.classList.add('show');
}

function closeRoomDetailModal() {
    const modal = document.getElementById('roomDetailModal');
    if (modal) modal.classList.remove('show');
}

async function changeRoomStatus(hotelId, roomNumber, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(hotelId)}/${encodeURIComponent(roomNumber)}/status?status=${encodeURIComponent(newStatus)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
            showToast(`Đã đổi trạng thái phòng P.${roomNumber} thành công!`, 'success');
            loadRooms();
        } else {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.error || 'Không thể cập nhật trạng thái phòng.', 'error');
        }
    } catch (err) {
        console.error('Lỗi khi đổi trạng thái phòng:', err);
        showToast('Lỗi kết nối máy chủ.', 'error');
    }
}

function openAddRoomModal() {
    isEditMode = false;
    const titleEl = document.getElementById('roomModalTitle');
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-plus text-indigo"></i> Thêm Phòng Mới';
    
    const hotelSelect = document.getElementById('modalHotelId');
    if (hotelSelect) {
        hotelSelect.disabled = false;
        if (appState.selectedHotelId) {
            hotelSelect.value = appState.selectedHotelId;
        }
    }

    const numEl = document.getElementById('modalRoomNumber');
    if (numEl) {
        numEl.value = '';
        numEl.disabled = false;
    }

    const typeEl = document.getElementById('modalRoomType');
    if (typeEl) typeEl.value = 'Deluxe Ocean View';

    const floorEl = document.getElementById('modalFloor');
    if (floorEl) floorEl.value = '1';

    const viewEl = document.getElementById('modalRoomView');
    if (viewEl) viewEl.value = 'Ocean View';

    const capEl = document.getElementById('modalCapacity');
    if (capEl) capEl.value = '2';

    const priceEl = document.getElementById('modalPrice');
    if (priceEl) priceEl.value = '1200000';

    const statusEl = document.getElementById('modalRoomStatus');
    if (statusEl) statusEl.value = 'AVAILABLE';

    const descEl = document.getElementById('modalDescription');
    if (descEl) descEl.value = '';

    const modal = document.getElementById('roomModal');
    if (modal) modal.classList.add('show');
}

function openEditRoomModal(hotelId, roomNumber) {
    isEditMode = true;
    const room = allRooms.find(r => r.hotelId === hotelId && r.roomNumber === roomNumber);
    if (!room) return;

    const titleEl = document.getElementById('roomModalTitle');
    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-pen text-indigo"></i> Sửa Phòng P.${roomNumber}`;

    const hotelSelect = document.getElementById('modalHotelId');
    if (hotelSelect) {
        hotelSelect.value = room.hotelId;
        hotelSelect.disabled = true;
    }

    const numEl = document.getElementById('modalRoomNumber');
    if (numEl) {
        numEl.value = room.roomNumber;
        numEl.disabled = true;
    }

    const typeEl = document.getElementById('modalRoomType');
    if (typeEl) typeEl.value = room.roomType || 'Standard';

    const floorEl = document.getElementById('modalFloor');
    if (floorEl) floorEl.value = room.floor || 1;

    const viewEl = document.getElementById('modalRoomView');
    if (viewEl) {
        viewEl.value = room.roomView || 'Ocean View';
        if (!viewEl.value) viewEl.value = 'Ocean View';
    }

    const capEl = document.getElementById('modalCapacity');
    if (capEl) capEl.value = String(room.capacity || 2);

    const priceEl = document.getElementById('modalPrice');
    if (priceEl) priceEl.value = room.priceVnd || room.pricePerNightVnd || 500000;

    const statusEl = document.getElementById('modalRoomStatus');
    if (statusEl) statusEl.value = room.status || 'AVAILABLE';

    const descEl = document.getElementById('modalDescription');
    if (descEl) descEl.value = room.description || '';

    const modal = document.getElementById('roomModal');
    if (modal) modal.classList.add('show');
}

function closeRoomModal() {
    const modal = document.getElementById('roomModal');
    if (modal) modal.classList.remove('show');
}

async function saveRoom() {
    const hotelSelect = document.getElementById('modalHotelId');
    const hotelId = hotelSelect ? hotelSelect.value : '';
    const roomNumberEl = document.getElementById('modalRoomNumber');
    const roomNumber = roomNumberEl ? roomNumberEl.value.trim() : '';
    const roomTypeEl = document.getElementById('modalRoomType');
    const roomType = roomTypeEl ? roomTypeEl.value.trim() || 'Standard' : 'Standard';
    const floorEl = document.getElementById('modalFloor');
    const floor = floorEl ? parseInt(floorEl.value) || 1 : 1;
    const roomViewEl = document.getElementById('modalRoomView');
    const roomView = roomViewEl ? roomViewEl.value : 'City View';
    const capacityEl = document.getElementById('modalCapacity');
    const capacity = capacityEl ? parseInt(capacityEl.value) || 2 : 2;
    const priceEl = document.getElementById('modalPrice');
    const priceValue = priceEl ? parseInt(priceEl.value) || 500000 : 500000;
    const statusEl = document.getElementById('modalRoomStatus');
    const status = statusEl ? statusEl.value : 'AVAILABLE';
    const descEl = document.getElementById('modalDescription');
    const description = descEl ? descEl.value.trim() : '';

    if (!hotelId || !roomNumber) {
        showToast('Vui lòng chọn khách sạn và nhập số phòng!', 'warning');
        return;
    }

    const payload = {
        hotelId,
        roomNumber,
        roomType,
        floor,
        priceVnd: priceValue,
        roomView,
        status,
        capacity,
        description
    };

    try {
        let url = `${API_BASE}/rooms`;
        let method = 'POST';

        if (isEditMode) {
            url = `${API_BASE}/rooms/${encodeURIComponent(hotelId)}/${encodeURIComponent(roomNumber)}`;
            method = 'PUT';
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast(`Đã lưu phòng P.${roomNumber} thành công!`, 'success');
            closeRoomModal();
            loadRooms();
        } else {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.error || 'Không thể lưu thông tin phòng.', 'error');
        }
    } catch (err) {
        console.error('Lỗi khi lưu phòng:', err);
        showToast('Lỗi kết nối máy chủ.', 'error');
    }
}

async function deleteRoom(hotelId, roomNumber) {
    if (!confirm(`Bạn có chắc chắn muốn xóa phòng P.${roomNumber}?`)) return;

    try {
        const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(hotelId)}/${encodeURIComponent(roomNumber)}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            showToast(`Đã xóa phòng P.${roomNumber} thành công!`, 'success');
            loadRooms();
        } else {
            showToast('Không thể xóa phòng.', 'error');
        }
    } catch (err) {
        console.error('Lỗi khi xóa phòng:', err);
        showToast('Lỗi kết nối máy chủ.', 'error');
    }
}

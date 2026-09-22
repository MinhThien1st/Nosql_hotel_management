/**
 * ============================================================
 * ROOMS JAVASCRIPT (DEV 1)
 * Phụ trách: PMS Room Grid, Live Status Filter, Room CRUD
 * ============================================================
 */

let allRooms = [];
let currentStatusFilter = 'ALL';
let viewMode = 'grid';

document.addEventListener('DOMContentLoaded', () => {
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

function initFilters() {
    const floorFilter = document.getElementById('filterRoomFloor');
    const keywordFilter = document.getElementById('searchRoomKeyword');
    if (floorFilter) floorFilter.addEventListener('change', filterAndRenderRooms);
    if (keywordFilter) keywordFilter.addEventListener('input', filterAndRenderRooms);
}

/**
 * Tải danh sách phòng từ API /api/rooms
 */
async function loadRooms() {
    try {
        let url = `${API_BASE}/rooms`;
        if (appState.selectedHotelId) {
            url += `?hotelId=${encodeURIComponent(appState.selectedHotelId)}`;
        }

        const res = await fetch(url);
        const rooms = await res.json();
        allRooms = rooms;

        updateStatusChipCounts();
        filterAndRenderRooms();
    } catch (err) {
        console.error('Lỗi khi tải danh sách phòng:', err);
    }
}

function updateStatusChipCounts() {
    const total = allRooms.length;
    const available = allRooms.filter(r => r.status === 'AVAILABLE').length;
    const occupied = allRooms.filter(r => r.status === 'OCCUPIED').length;
    const booked = allRooms.filter(r => r.status === 'BOOKED').length;
    const maintenance = allRooms.filter(r => r.status === 'MAINTENANCE').length;

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
        const matchStatus = (statusFilter === 'ALL') || (r.status === statusFilter);
        const matchFloor = (floorFilter === 'ALL') || (r.floor == floorFilter);
        const matchKeyword = !keyword || 
            (r.roomNumber && r.roomNumber.toLowerCase().includes(keyword)) ||
            (r.roomType && r.roomType.toLowerCase().includes(keyword));

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
    const statusLower = (r.status || 'AVAILABLE').toLowerCase();
    
    let actionBtnHtml = '';
    if (r.status === 'AVAILABLE') {
        actionBtnHtml = `
            <button class="btn-card-action btn-card-available" onclick="changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'OCCUPIED')" title="Chuyển sang Đang Ở">
                <i class="fa-solid fa-user-check"></i> Đang Ở
            </button>
            <button class="btn-card-action btn-card-maintenance" onclick="changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'MAINTENANCE')" title="Chuyển sang Bảo Trì">
                <i class="fa-solid fa-wrench"></i> Bảo Trì
            </button>
        `;
    } else if (r.status === 'OCCUPIED') {
        actionBtnHtml = `
            <button class="btn-card-action btn-card-occupied" onclick="changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'AVAILABLE')" title="Trả phòng (Về Trống)">
                <i class="fa-solid fa-arrow-right-from-bracket"></i> Trả Phòng
            </button>
            <button class="btn-card-action btn-card-maintenance" onclick="changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'MAINTENANCE')" title="Bảo trì">
                <i class="fa-solid fa-wrench"></i> Bảo Trì
            </button>
        `;
    } else if (r.status === 'BOOKED') {
        actionBtnHtml = `
            <button class="btn-card-action btn-card-booked" onclick="changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'OCCUPIED')" title="Khách Nhận Phòng">
                <i class="fa-solid fa-key"></i> Nhận Phòng
            </button>
            <button class="btn-card-action btn-card-available" onclick="changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'AVAILABLE')" title="Hủy Đặt">
                <i class="fa-solid fa-xmark"></i> Hủy Đặt
            </button>
        `;
    } else if (r.status === 'MAINTENANCE') {
        actionBtnHtml = `
            <button class="btn-card-action btn-card-maintenance" onclick="changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'AVAILABLE')" title="Xong Bảo Trì">
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

    return `
        <div class="room-card room-${statusLower}">
            <div class="room-card-header">
                <div class="room-card-number-wrapper">
                    <span class="room-card-number">P.${r.roomNumber}</span>
                    <span class="room-card-floor-tag">Tầng ${r.floor || 1}</span>
                </div>
                <div class="room-card-badge badge-${statusLower}">
                    ${statusTextMap[r.status] || r.status}
                </div>
            </div>

            <div class="room-card-body">
                <div class="room-card-type">${r.roomType || 'Standard'}</div>
                <div class="room-card-price-row">
                    <span class="room-card-price">${formatVnd(price)}</span>
                    <span class="room-card-unit">/đêm</span>
                </div>
            </div>

            <div class="room-card-footer">
                <div class="room-card-actions">
                    ${actionBtnHtml}
                </div>
                <div class="room-card-more">
                    <button class="btn-card-icon" onclick="openEditRoomModal('${r.hotelId}', '${r.roomNumber}')" title="Sửa thông tin">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-card-icon text-rose" onclick="deleteRoom('${r.hotelId}', '${r.roomNumber}')" title="Xóa phòng">
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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Không tìm thấy phòng phù hợp.</td></tr>';
        return;
    }

    const statusBadgeMap = {
        'AVAILABLE': '<span class="status-pill status-available">Trống</span>',
        'OCCUPIED': '<span class="status-pill status-occupied">Đang ở</span>',
        'BOOKED': '<span class="status-pill status-booked">Đã đặt</span>',
        'MAINTENANCE': '<span class="status-pill status-maintenance">Bảo trì</span>'
    };

    tbody.innerHTML = rooms.map(r => {
        const hotel = appState.hotels.find(h => h.hotelId === r.hotelId);
        const hotelName = hotel ? hotel.hotelName : r.hotelId;
        const price = r.priceVnd || r.pricePerNightVnd || 0;

        return `
            <tr>
                <td><strong>P.${r.roomNumber}</strong></td>
                <td>${hotelName}</td>
                <td>${r.roomType || 'Standard'}</td>
                <td>Tầng ${r.floor || 1}</td>
                <td><strong style="color: var(--indigo);">${formatVnd(price)}</strong></td>
                <td>${statusBadgeMap[r.status] || r.status}</td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-secondary btn-sm" onclick="openEditRoomModal('${r.hotelId}', '${r.roomNumber}')">
                            <i class="fa-solid fa-pen"></i> Sửa
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteRoom('${r.hotelId}', '${r.roomNumber}')">
                            <i class="fa-solid fa-trash"></i> Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
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
    document.getElementById('roomModalTitle').innerHTML = '<i class="fa-solid fa-plus text-indigo"></i> Thêm Phòng Mới';
    document.getElementById('modalRoomNumber').value = '';
    document.getElementById('modalRoomNumber').disabled = false;
    document.getElementById('modalRoomType').value = 'Standard';
    document.getElementById('modalFloor').value = '1';
    document.getElementById('modalPrice').value = '500000';
    document.getElementById('modalRoomStatus').value = 'AVAILABLE';
    document.getElementById('modalDescription').value = '';

    if (appState.selectedHotelId) {
        document.getElementById('modalHotelId').value = appState.selectedHotelId;
    }

    document.getElementById('roomModal').classList.add('show');
}

function openEditRoomModal(hotelId, roomNumber) {
    const room = allRooms.find(r => r.hotelId === hotelId && r.roomNumber === roomNumber);
    if (!room) return;

    document.getElementById('roomModalTitle').innerHTML = `<i class="fa-solid fa-pen text-indigo"></i> Sửa Phòng P.${roomNumber}`;
    document.getElementById('modalHotelId').value = room.hotelId;
    document.getElementById('modalRoomNumber').value = room.roomNumber;
    document.getElementById('modalRoomNumber').disabled = true;
    document.getElementById('modalRoomType').value = room.roomType || 'Standard';
    document.getElementById('modalFloor').value = room.floor || 1;
    document.getElementById('modalPrice').value = room.priceVnd || room.pricePerNightVnd || 500000;
    document.getElementById('modalRoomStatus').value = room.status || 'AVAILABLE';
    document.getElementById('modalDescription').value = room.description || '';

    document.getElementById('roomModal').classList.add('show');
}

function closeRoomModal() {
    document.getElementById('roomModal').classList.remove('show');
}

async function saveRoom() {
    const hotelId = document.getElementById('modalHotelId').value;
    const roomNumber = document.getElementById('modalRoomNumber').value.trim();
    const roomType = document.getElementById('modalRoomType').value;
    const floor = parseInt(document.getElementById('modalFloor').value) || 1;
    const priceValue = parseInt(document.getElementById('modalPrice').value) || 500000;
    const status = document.getElementById('modalRoomStatus').value;
    const description = document.getElementById('modalDescription').value.trim();

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
        pricePerNightVnd: priceValue,
        status,
        description
    };

    try {
        const res = await fetch(`${API_BASE}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast(`Đã lưu phòng P.${roomNumber} thành công!`, 'success');
            closeRoomModal();
            loadRooms();
        } else {
            showToast('Không thể lưu thông tin phòng.', 'error');
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

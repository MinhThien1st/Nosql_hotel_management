/** INVOICES JAVASCRIPT (DEV 3) - Q5 invoices_by_booking */
const invoiceState = { invoices: [], filtered: [], selected: null };

document.addEventListener('DOMContentLoaded', async () => {
    initCustomDropdown((hotelId) => loadInvoices(hotelId));
    document.getElementById('btnRefresh')?.addEventListener('click', () => loadInvoices(appState.selectedHotelId));
    document.getElementById('invoiceSearch')?.addEventListener('input', applyInvoiceFilters);
    document.getElementById('paymentFilter')?.addEventListener('change', applyInvoiceFilters);
    document.getElementById('btnClearFilters')?.addEventListener('click', clearInvoiceFilters);
    await loadHotels();
    await loadInvoices();
});

async function loadInvoices(hotelId = '') {
    const body = document.getElementById('invoiceTableBody');
    if (body) body.innerHTML = '<tr><td colspan="8"><div class="invoice-loading"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải hóa đơn...</div></td></tr>';
    try {
        const params = new URLSearchParams();
        if (hotelId) params.set('hotelId', hotelId);
        const res = await fetch(`${API_BASE}/invoices${params.toString() ? '?' + params.toString() : ''}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        invoiceState.invoices = await res.json();
        applyInvoiceFilters();
    } catch (error) {
        console.error('Lỗi tải hóa đơn:', error);
        invoiceState.invoices = [];
        invoiceState.filtered = [];
        renderInvoiceTable();
        showToast('Không thể tải danh sách hóa đơn.', 'error');
    }
}

function applyInvoiceFilters() {
    const keyword = (document.getElementById('invoiceSearch')?.value || '').trim().toLowerCase();
    const status = document.getElementById('paymentFilter')?.value || '';
    invoiceState.filtered = invoiceState.invoices.filter(invoice => {
        const haystack = [invoice.bookingId, invoice.invoiceId, invoice.guestName, invoice.guestId, invoice.hotelName, invoice.roomType].filter(Boolean).join(' ').toLowerCase();
        return (!keyword || haystack.includes(keyword)) && (!status || String(invoice.paymentStatus).toUpperCase() === status);
    });
    renderInvoiceSummary(invoiceState.filtered);
    renderInvoiceTable();
}

function clearInvoiceFilters() {
    const search = document.getElementById('invoiceSearch');
    const status = document.getElementById('paymentFilter');
    if (search) search.value = '';
    if (status) status.value = '';
    applyInvoiceFilters();
}

function renderInvoiceSummary(list) {
    const paid = list.filter(i => i.paymentStatus === 'PAID').reduce((sum, i) => sum + Number(i.totalAmountVnd || 0), 0);
    const unpaid = list.filter(i => i.paymentStatus !== 'PAID').reduce((sum, i) => sum + Number(i.totalAmountVnd || 0), 0);
    const discount = list.reduce((sum, i) => sum + Number(i.discountVnd || 0), 0);
    document.getElementById('sumCount').textContent = list.length;
    document.getElementById('sumPaid').textContent = formatVnd(paid);
    document.getElementById('sumUnpaid').textContent = formatVnd(unpaid);
    document.getElementById('sumDiscount').textContent = formatVnd(discount);
}

function renderInvoiceTable() {
    const tbody = document.getElementById('invoiceTableBody');
    if (!tbody) return;
    if (!invoiceState.filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8"><div class="empty-invoices"><i class="fa-solid fa-file-circle-xmark"></i><div>Không có hóa đơn phù hợp.</div></div></td></tr>';
        return;
    }
    tbody.innerHTML = invoiceState.filtered.map(invoice => {
        const paid = String(invoice.paymentStatus).toUpperCase() === 'PAID';
        return `<tr>
            <td><div class="invoice-id">${escapeHtml(invoice.invoiceId || '-')}</div></td>
            <td><span class="booking-id">${escapeHtml(invoice.bookingId || '-')}</span></td>
            <td><div class="guest-name">${escapeHtml(invoice.guestName || '-')}</div><small class="text-muted">${escapeHtml(invoice.guestId || '')}</small></td>
            <td>${escapeHtml(shortHotelName(invoice.hotelName))}<br><small class="text-muted">${escapeHtml(invoice.hotelId || '')}</small></td>
            <td>${formatDate(invoice.issuedDate)}</td>
            <td><span class="money">${formatVnd(invoice.totalAmountVnd)}</span></td>
            <td><span class="status-pill ${paid ? 'paid' : 'unpaid'}"><i class="fa-solid ${paid ? 'fa-circle-check' : 'fa-clock'}"></i>${paid ? 'Đã thanh toán' : 'Chưa thanh toán'}</span></td>
            <td><div class="invoice-actions">
                <button class="invoice-btn" onclick="openInvoiceDetail('${escapeAttr(invoice.bookingId)}')"><i class="fa-solid fa-eye"></i> Chi tiết</button>
                ${paid ? '' : `<button class="invoice-btn pay" onclick="openPayInvoice('${escapeAttr(invoice.bookingId)}')"><i class="fa-solid fa-cash-register"></i> Thu tiền</button>`}
            </div></td>
        </tr>`;
    }).join('');
}

function openInvoiceDetail(bookingId) {
    const invoice = invoiceState.invoices.find(i => i.bookingId === bookingId);
    if (!invoice) return;
    invoiceState.selected = invoice;
    const paid = invoice.paymentStatus === 'PAID';
    document.getElementById('modalTitle').innerHTML = `<i class="fa-solid fa-file-invoice-dollar text-indigo"></i> ${escapeHtml(invoice.invoiceId)}`;
    document.getElementById('invoiceModalBody').innerHTML = `
        <div class="invoice-detail-grid">
            ${detail('Booking', invoice.bookingId)}
            ${detail('Khách hàng', `${invoice.guestName} (${invoice.guestId})`)}
            ${detail('Khách sạn', `${shortHotelName(invoice.hotelName)} (${invoice.hotelId})`)}
            ${detail('Loại phòng', invoice.roomType)}
            ${detail('Số đêm', invoice.numberOfNights)}
            ${detail('Ngày xuất', formatDate(invoice.issuedDate))}
            ${detail('Tạm tính', formatVnd(invoice.subtotalVnd))}
            ${detail('Giảm giá', formatVnd(invoice.discountVnd))}
            ${detail('Phương thức', paymentMethodLabel(invoice.paymentMethod))}
            ${detail('Trạng thái', paid ? 'Đã thanh toán' : 'Chưa thanh toán')}
        </div>
        <div class="invoice-total"><span>Tổng thanh toán</span><strong>${formatVnd(invoice.totalAmountVnd)}</strong></div>
        ${paid ? `<div style="margin-top:12px;color:#047857;font-size:12px;"><i class="fa-solid fa-circle-check"></i> Hóa đơn đã hoàn tất thanh toán.</div>` : `
            <div class="pay-form">
                <select id="detailPaymentMethod" class="pay-select">${paymentOptions(invoice.paymentMethod)}</select>
                <button class="btn-primary" onclick="confirmPayment()"><i class="fa-solid fa-check"></i> Xác nhận thanh toán</button>
            </div>`}
    `;
    document.getElementById('invoiceModal').classList.add('open');
    document.getElementById('invoiceModal').setAttribute('aria-hidden', 'false');
}

function openPayInvoice(bookingId) { openInvoiceDetail(bookingId); }

async function confirmPayment() {
    const invoice = invoiceState.selected;
    const method = document.getElementById('detailPaymentMethod')?.value;
    if (!invoice || !method) return;
    try {
        const res = await fetch(`${API_BASE}/invoices/${encodeURIComponent(invoice.bookingId)}/pay`, {
            method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ paymentMethod: method })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Thanh toán thất bại');
        showToast(data.message || 'Thanh toán thành công!', 'success');
        closeInvoiceModal();
        await loadInvoices(appState.selectedHotelId);
    } catch (error) {
        console.error(error);
        showToast(error.message || 'Không thể xác nhận thanh toán.', 'error');
    }
}

function closeInvoiceModal() {
    const modal = document.getElementById('invoiceModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
}

document.addEventListener('click', event => { if (event.target.id === 'invoiceModal') closeInvoiceModal(); });
function detail(label, value) { return `<div class="invoice-detail-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value ?? '-'))}</strong></div>`; }
function paymentOptions(current) {
    const methods = [['CASH','Tiền mặt'],['CREDIT_CARD','Thẻ tín dụng'],['BANK_TRANSFER','Chuyển khoản'],['MOMO','MoMo'],['VNPAY','VNPay']];
    return methods.map(([value,label]) => `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`).join('');
}
function paymentMethodLabel(method) { return ({CASH:'Tiền mặt',CREDIT_CARD:'Thẻ tín dụng',BANK_TRANSFER:'Chuyển khoản',MOMO:'MoMo',VNPAY:'VNPay'})[method] || method || '-'; }
function shortHotelName(name) { return String(name || '-').replace(/^Suong Mai\s+/,''); }
function formatDate(value) { if (!value) return '-'; const [y,m,d] = String(value).split('-'); return d && m && y ? `${d}/${m}/${y}` : value; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function escapeAttr(value) { return String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, ''); }

# Dev 3 - Task 3: Invoice & Payment

## Files
- `src/main/java/com/qlks/model/Invoice.java`
- `src/main/java/com/qlks/controller/InvoiceController.java`
- `src/main/resources/static/invoices.html`
- `src/main/resources/static/js/invoice.js`

## Implemented
- GET `/api/invoices`
- GET `/api/invoices/{bookingId}`
- POST `/api/invoices`
- PUT `/api/invoices/{bookingId}/pay`
- Cassandra prepared statements for Q5 `invoices_by_booking`
- Mock fallback with the 10 Q5 seed invoices from `data_seed.cql`
- Hotel and payment-status filtering
- Invoice search/detail modal
- Payment confirmation with CASH/CREDIT_CARD/BANK_TRANSFER/MOMO/VNPAY
- Validation: one invoice per booking, discount <= subtotal, total = subtotal - discount

## Note about Cassandra schema
Q5 uses only `booking_id` as the partition key. Therefore the list endpoint uses `ALLOW FILTERING` for the assignment's `GET /api/invoices` requirement. For production-scale reporting, a separate query table/materialized read model should be added instead of scanning Q5.

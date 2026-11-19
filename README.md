# Tally Ledger Portal (Node.js + MongoDB)

Simple and clean Ledger Portal for **Tally Prime** integration:
1. **Add Ledger** – Clean form to create and save party ledgers directly to MongoDB.
2. **Ledger Report** – Tabular report showing all ledgers with search, filter, print, and CSV export.

---

## How to Run

1. Make sure MongoDB is running on `27017`.
2. Start the server:
   ```bash
   npm start
   ```
   *(or `node Index.js`)*
3. Open in browser:
   ```
   http://localhost:3000
   ```

---

## API Endpoints

- `POST /api/ledger` &rarr; Add a new ledger to MongoDB
- `GET /api/ledger` &rarr; Ledger report / Tally JSON sync endpoint

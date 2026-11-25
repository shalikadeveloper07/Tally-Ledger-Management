const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const { connectDB, getCollection } = require("./config/db");

const app = express();
app.use(express.json());

// Connect to MongoDB
connectDB();

// Enable CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

// Serve index.html on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/public/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.use(express.static(__dirname));

// ─── 1. ADD LEDGER ──────────────────────────────────────────────────────────
app.post('/api/ledger', async (req, res) => {
    try {
        const { Name, Parent, Address1, Address2, Address3, Address4, Address5,
                State, Country, Pincode, ProvideBankDetails, BankDetails,
                PanItNo, RegistrationType, GstUIn, isActive } = req.body;

        if (!Name || !Name.trim())
            return res.status(400).json({ success: false, message: "Ledger Name is required" });

        // Duplicate check (case-insensitive)
        const allDocs = await getCollection().find({}, { projection: { Name: 1 } }).toArray();
        const nameLower = Name.trim().toLowerCase();
        const dup = allDocs.find(d => d.Name && d.Name.trim().toLowerCase() === nameLower);
        if (dup)
            return res.status(409).json({ success: false, message: `Ledger "${Name.trim()}" already exists. Duplicate not allowed.` });

        const isBankProvided = ProvideBankDetails === "Yes" || Boolean(BankDetails?.AccountNo || BankDetails?.BankName || BankDetails?.UpiId);
        const bDetails = isBankProvided ? {
            TransactionType: BankDetails?.TransactionType || "e-Fund Transfer",
            AccountNo:  BankDetails?.AccountNo  ? String(BankDetails.AccountNo).trim()  : "",
            IfscCode:   BankDetails?.IfscCode   ? String(BankDetails.IfscCode).trim().toUpperCase() : "",
            BankName:   BankDetails?.BankName   ? String(BankDetails.BankName).trim()   : "",
            UpiId:      BankDetails?.UpiId      ? String(BankDetails.UpiId).trim()      : "",
            CrossUsing: BankDetails?.CrossUsing ? String(BankDetails.CrossUsing).trim() : ""
        } : null;

        const newLedger = {
            Name: Name.trim(),
            Parent: Parent ? Parent.trim() : "Sundry Debtors",
            Address1: Address1 ? Address1.trim() : "",
            Address2: Address2 ? Address2.trim() : "",
            Address3: Address3 ? Address3.trim() : "",
            Address4: Address4 ? Address4.trim() : "",
            Address5: Address5 ? Address5.trim() : "",
            State: State ? State.trim() : "",
            Country: Country ? Country.trim() : "India",
            Pincode: Pincode ? Pincode.trim() : "",
            ProvideBankDetails: isBankProvided ? "Yes" : "No",
            BankDetails: bDetails,
            TransactionType: bDetails ? bDetails.TransactionType : "",
            AccountNo:       bDetails ? bDetails.AccountNo  : "",
            IfscCode:        bDetails ? bDetails.IfscCode   : "",
            BankName:        bDetails ? bDetails.BankName   : "",
            UpiId:           bDetails ? bDetails.UpiId      : "",
            CrossUsing:      bDetails ? bDetails.CrossUsing : "",
            PanItNo:          PanItNo          ? PanItNo.trim().toUpperCase()          : "",
            RegistrationType: RegistrationType ? RegistrationType.trim()               : "Regular",
            GstUIn:           GstUIn           ? GstUIn.trim().toUpperCase()           : "",
            isActive: (isActive === false || isActive === 'false') ? false : true,
            createdAt: new Date()
        };

        const result = await getCollection().insertOne(newLedger);
        console.log("Saved:", newLedger.Name);
        res.status(201).json({ success: true, message: "Ledger added successfully", data: { _id: result.insertedId, ...newLedger } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── 2. GET ALL LEDGERS ─────────────────────────────────────────────────────
app.get('/api/ledger', async (req, res) => {
    try {
        const data = await getCollection().find({}).sort({ createdAt: -1 }).toArray();
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── 3. GET SINGLE LEDGER ───────────────────────────────────────────────────
app.get('/api/ledger/:id', async (req, res) => {
    try {
        let queryId;
        try { queryId = new mongoose.Types.ObjectId(req.params.id); } catch { queryId = req.params.id; }
        const ledger = await getCollection().findOne({ _id: queryId });
        if (!ledger) return res.status(404).json({ success: false, message: "Ledger not found" });
        res.status(200).json({ success: true, data: ledger });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── 4. UPDATE LEDGER ───────────────────────────────────────────────────────
app.put('/api/ledger/:id', async (req, res) => {
    try {
        let queryId;
        try { queryId = new mongoose.Types.ObjectId(req.params.id); } catch { queryId = req.params.id; }

        const { Name, Parent, Address1, Address2, Address3, Address4, Address5,
                State, Country, Pincode, ProvideBankDetails, BankDetails,
                PanItNo, RegistrationType, GstUIn, isActive } = req.body;

        if (!Name || !Name.trim())
            return res.status(400).json({ success: false, message: "Ledger Name is required" });

        // Duplicate check excluding self
        const allDocs2 = await getCollection().find({}, { projection: { _id: 1, Name: 1 } }).toArray();
        const nameLower2 = Name.trim().toLowerCase();
        const dupOther = allDocs2.find(d => d.Name && d.Name.trim().toLowerCase() === nameLower2 && String(d._id) !== String(queryId));
        if (dupOther)
            return res.status(409).json({ success: false, message: `Ledger "${Name.trim()}" already exists. Duplicate not allowed.` });

        const isBankProvided = ProvideBankDetails === "Yes" || Boolean(BankDetails?.AccountNo || BankDetails?.BankName || BankDetails?.UpiId);
        const bDetails = isBankProvided ? {
            TransactionType: BankDetails?.TransactionType || "e-Fund Transfer",
            AccountNo:  BankDetails?.AccountNo  ? String(BankDetails.AccountNo).trim()  : "",
            IfscCode:   BankDetails?.IfscCode   ? String(BankDetails.IfscCode).trim().toUpperCase() : "",
            BankName:   BankDetails?.BankName   ? String(BankDetails.BankName).trim()   : "",
            UpiId:      BankDetails?.UpiId      ? String(BankDetails.UpiId).trim()      : "",
            CrossUsing: BankDetails?.CrossUsing ? String(BankDetails.CrossUsing).trim() : ""
        } : null;

        const updateData = {
            Name: Name.trim(),
            Parent: Parent ? Parent.trim() : "Sundry Debtors",
            Address1: Address1 ? Address1.trim() : "",
            Address2: Address2 ? Address2.trim() : "",
            Address3: Address3 ? Address3.trim() : "",
            Address4: Address4 ? Address4.trim() : "",
            Address5: Address5 ? Address5.trim() : "",
            State: State ? State.trim() : "",
            Country: Country ? Country.trim() : "India",
            Pincode: Pincode ? Pincode.trim() : "",
            ProvideBankDetails: isBankProvided ? "Yes" : "No",
            BankDetails: bDetails,
            TransactionType: bDetails ? bDetails.TransactionType : "",
            AccountNo:       bDetails ? bDetails.AccountNo  : "",
            IfscCode:        bDetails ? bDetails.IfscCode   : "",
            BankName:        bDetails ? bDetails.BankName   : "",
            UpiId:           bDetails ? bDetails.UpiId      : "",
            CrossUsing:      bDetails ? bDetails.CrossUsing : "",
            PanItNo:          PanItNo          ? PanItNo.trim().toUpperCase()          : "",
            RegistrationType: RegistrationType ? RegistrationType.trim()               : "Regular",
            GstUIn:           GstUIn           ? GstUIn.trim().toUpperCase()           : "",
            isActive: (isActive === false || isActive === 'false') ? false : true,
            updatedAt: new Date()
        };

        const result = await getCollection().findOneAndUpdate({ _id: queryId }, { $set: updateData }, { returnDocument: 'after' });
        const updatedDoc = result && result.value !== undefined ? result.value : result;
        if (!updatedDoc) return res.status(404).json({ success: false, message: "Ledger not found" });

        console.log("Updated:", updateData.Name);
        res.status(200).json({ success: true, message: "Ledger updated successfully", data: updatedDoc });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── 5. DELETE LEDGER ───────────────────────────────────────────────────────
app.delete('/api/ledger/:id', async (req, res) => {
    try {
        const rawId = req.params.id;
        let result = { deletedCount: 0 };

        if (mongoose.Types.ObjectId.isValid(rawId)) {
            result = await getCollection().deleteOne({ _id: new mongoose.Types.ObjectId(rawId) });
        }
        if (result.deletedCount === 0) {
            result = await getCollection().deleteOne({ _id: rawId });
        }

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Ledger not found" });
        }

        console.log("Deleted ledger ID:", rawId);
        res.status(200).json({ success: true, message: "Ledger deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 404 fallback
app.use((req, res) => {
    if (req.path.startsWith('/api'))
        return res.status(404).json({ success: false, message: "API endpoint not found" });
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
const PORT = 3501;
const HOST = "0.0.0.0";
const DOMAIN = "http://v35011.22189.tallyprimecloud.in";

app.listen(PORT, HOST, () => {
    console.log("================================");
    console.log("Node.js Server Started");
    console.log(`Server URL: ${DOMAIN}:${PORT}`);
    console.log(`Frontend: ${DOMAIN}:${PORT}`);
    console.log(`Ledger API: ${DOMAIN}:${PORT}/api/ledger`);
    console.log("================================");
});

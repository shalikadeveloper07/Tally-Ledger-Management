const express = require("express");
const path = require("path");
const { connectDB, getCollection } = require("./config/db");

const app = express();
app.use(express.json());

// Connect to MongoDB using config and .env variables
connectDB();

// Enable CORS for all requests (allows file:// and http:// localhost access)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

// Serve index.html explicitly on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/public/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(__dirname));

// 1. ADD LEDGER API
app.post('/api/ledger', async (req, res) => {
    try {
        const {
            Name,
            Parent,
            Address1,
            Address2,
            Address3,
            Address4,
            Address5,
            State,
            Country,
            Pincode,
            ProvideBankDetails,
            PanItNo,
            RegistrationType,
            GstUIn,
            isActive
        } = req.body;

        if (!Name || !Name.trim()) {
            return res.status(400).json({ success: false, message: "Ledger Name is required" });
        }

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
            ProvideBankDetails: ProvideBankDetails || "No",
            PanItNo: PanItNo ? PanItNo.trim().toUpperCase() : "",
            RegistrationType: RegistrationType ? RegistrationType.trim() : "Regular",
            GstUIn: GstUIn ? GstUIn.trim().toUpperCase() : "",
            isActive: (isActive === false || isActive === 'false') ? false : true,
            createdAt: new Date()
        };

        const result = await getCollection().insertOne(newLedger);
        console.log("Saving ledger:", newLedger.Name, "| isActive:", newLedger.isActive);

        res.status(201).json({
            success: true,
            message: "Ledger added successfully",
            data: { _id: result.insertedId, ...newLedger }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 2. LEDGER REPORT API 
app.get('/api/ledger', async (req, res) => {
    try {
        const data = await getCollection()
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            count: data.length,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, message: "API endpoint not found" });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`Tally API: http://localhost:${PORT}/api/ledger`);
});

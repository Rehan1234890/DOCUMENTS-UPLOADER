const express = require("express");
const multer = require("multer");
const db = require("./db");
require("dotenv").config();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5000;

// Multer Configuration (Store file in memory before saving to DB)
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));  // Serve static files

// Serve index.html when visiting "/"
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route: Upload Document
app.post("/upload", upload.single("document"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const { originalname, mimetype, buffer } = req.file;
    db.query(
        "INSERT INTO pdf_files (name, type, data) VALUES (?, ?, ?)",
        [originalname, mimetype, buffer],
        (err, result) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ message: "Upload failed" });
            }
            res.json({ message: "File uploaded successfully", fileId: result.insertId });
        }
    );
});

// Route: Download Document (by ID)
app.post("/download", express.json(), (req, res) => {
    const { id } = req.body;
    
    db.query("SELECT * FROM pdf_files WHERE id = ?", [id], (err, result) => {
        if (err || result.length === 0) {
            return res.status(404).json({ message: "File not found" });
        }

        const file = result[0];
        res.setHeader("Content-Type", file.type);
        res.setHeader("Content-Disposition", `attachment; filename=${file.name}`);
        res.send(file.data);
    });
});

// Route: Get all uploaded files
app.get("/files", (req, res) => {
    db.query("SELECT id, name FROM pdf_files", (err, result) => {
        if (err) {
            console.error("Error fetching files:", err);
            return res.status(500).json({ message: "Error fetching files" });
        }
        res.json(result);
    });
});

// Route: View File (opens in a new tab)
app.get("/view/:id", (req, res) => {
    const { id } = req.params;

    db.query("SELECT name, type, data FROM pdf_files WHERE id = ?", [id], (err, result) => {
        if (err || result.length === 0) {
            return res.status(404).send("File not found");
        }

        const file = result[0];
        res.setHeader("Content-Type", file.type);
        res.setHeader("Content-Disposition", `inline; filename=${file.name}`);
        res.send(file.data);
    });
});

// Route: Delete File
app.delete("/delete/:id", (req, res) => {
    const { id } = req.params;

    db.query("SELECT name FROM pdf_files WHERE id = ?", [id], (err, result) => {
        if (err || result.length === 0) {
            return res.status(404).json({ message: "File not found" });
        }

        db.query("DELETE FROM pdf_files WHERE id = ?", [id], (deleteErr) => {
            if (deleteErr) {
                return res.status(500).json({ message: "Failed to delete file" });
            }
            res.json({ message: "File deleted successfully" });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

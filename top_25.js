// top_25.js - Matches Reference Image Layout
// Declare CSV_URL once at the top
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTlys14AiGHJNcXDBF-7tgiPZhIPN4Kl90Ml5ua9QMivwQz0_8ykgI-jo8fB3c9TZnUrMjF2Xfa3FO5/pub?gid=216440093&single=true&output=csv';

// Ensure these are global for use in personal_search.js
window.HEADERS = {
    NAME: 'STAFF NAME',
    COMPANY: 'COMPANY NAME',
    OS: 'OS',
    BIZ_TARGET: 'Business Target',
    FC_TARGET: 'FC Target',
    BIZ_ACH: 'Business Ach',
    FC_ACH: 'FC Ach',
    BIZ_PERC: 'Business Ach %',
    FC_PERC: 'FC Ach %'
};

// Formatting Helpers made global
window.getNumeric = (v) => parseFloat(String(v).replace(/[^0-9.\\-]/g, "")) || 0;
window.formatCurr = (v) => new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
}).format(window.getNumeric(v));

// Global Data Fetcher
let dataPromise = null;
window.getContestData = function() {
    if (dataPromise) return dataPromise;
    dataPromise = fetch(CSV_URL)
        .then(res => res.text())
        .then(csvText => {
            // Updated to handle both \n and \r\n and filter empty lines
            const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
            const headers = lines[0].split(',').map(h => h.trim());
            return lines.slice(1).map(line => {
                // Robust CSV splitting to handle commas within quotes
                const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                let obj = {};
                headers.forEach((header, i) => { 
                    obj[header] = values[i] ? values[i].trim().replace(/^"|"$/g, '') : ""; 
                });
                return obj;
            });
        });
    return dataPromise;
};

window.calculateStatus = function(row) {
    const bizAch = window.getNumeric(row[window.HEADERS.BIZ_ACH]);
    const bizTarget = window.getNumeric(row[window.HEADERS.BIZ_TARGET]);
    const fcAch = window.getNumeric(row[window.HEADERS.FC_ACH]);
    const fcTarget = window.getNumeric(row[window.HEADERS.FC_TARGET]);

    const bizMet = bizAch >= bizTarget;
    const fcMet = fcAch >= fcTarget;

    let seats = 0;
    let remark = "";

    // 1. Both Targets Met (Winner)
    if (bizMet && fcMet) {
        const surplus = bizAch - bizTarget;
        seats = 1 + Math.floor(surplus / 7000000); // 1 seat + 1 per 70L surplus
        remark = seats > 1 ? `🏆 WINNER (${seats} SEATS)` : "🏆 WINNER (1 SEAT)";
    } 
    // 2. Both Targets Pending
    else if (!bizMet && !fcMet) {
        const bizPending = window.formatCurr(bizTarget - bizAch);
        const fcPending = fcTarget - fcAch;
        remark = `Pending: ${bizPending} & ${fcPending} FC`;
    } 
    // 3. Only Business Pending
    else if (!bizMet) {
        const bizPending = window.formatCurr(bizTarget - bizAch);
        remark = `Need ${bizPending} more Business`;
    } 
    // 4. Only FC Pending
    else {
        const fcPending = fcTarget - fcAch;
        remark = `Need ${fcPending} more Fresh Customers`;
    }

    return { seats, remark, bizMet, fcMet };
};

// top_25.js - Logic for Data Labeling
function renderReport(data) {
    const container = document.getElementById('report-container');
    if (!container) return;

    const sorted = data.sort((a, b) => 
        window.getNumeric(b[window.HEADERS.BIZ_PERC]) - window.getNumeric(a[window.HEADERS.BIZ_PERC])
    ).slice(0, 25);

    let html = `<table class="report-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Staff Name</th>
                            <th>Target</th>
                            <th>Achieved</th>
                            <th>FC Status</th>
                            <th>Remark</th>
                        </tr>
                    </thead>
                    <tbody>`;

    sorted.forEach((row, index) => {
        const { remark, seats } = window.calculateStatus(row);
        // Added data-label to every <td> for mobile compatibility
        html += `
            <tr class="${seats > 0 ? 'winner-row' : ''}">
                <td data-label="Rank">${index + 1}</td>
                <td data-label="Name"><strong>${row[window.HEADERS.NAME]}</strong><br><small>${row[window.HEADERS.COMPANY]}</small></td>
                <td data-label="Target">${window.formatCurr(row[window.HEADERS.BIZ_TARGET])}</td>
                <td data-label="Achieved" class="achieved-val">${window.formatCurr(row[window.HEADERS.BIZ_ACH])}<br><small>(${row[window.HEADERS.BIZ_PERC]})</small></td>
                <td data-label="FC Status">${row[window.HEADERS.FC_TARGET]} / ${row[window.HEADERS.FC_ACH]}</td>
                <td data-label="Remark" class="status-cell">${remark}</td>
            </tr>`;
    });

    container.innerHTML = html + `</tbody></table>`;
}
document.addEventListener('DOMContentLoaded', () => {
    // Check if the report container exists (only on top_25.html)
    if (document.getElementById('report-container')) {
        window.getContestData().then(data => {
            renderReport(data);
            const loader = document.getElementById('loading-indicator');
            if (loader) loader.style.display = 'none';
        }).catch(err => {
            console.error("Data fetch error:", err);
            const loader = document.getElementById('loading-indicator');
            if (loader) loader.textContent = "Error loading data.";
        });
    }
});
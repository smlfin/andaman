// top_25.js - Full Logic with Progress Bars & Ticket Surplus Rule
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTlys14AiGHJNcXDBF-7tgiPZhIPN4Kl90Ml5ua9QMivwQz0_8ykgI-jo8fB3c9TZnUrMjF2Xfa3FO5/pub?gid=216440093&single=true&output=csv';

window.HEADERS = {
    NAME: 'STAFF NAME',
    COMPANY: 'COMPANY NAME',
    BIZ_TARGET: 'Business Target',
    FC_TARGET: 'FC Target',
    BIZ_ACH: 'Business Ach',
    FC_ACH: 'FC Ach'
};

// Formatting utilities
window.getNumeric = (v) => parseFloat(String(v).replace(/[^0-9.\\-]/g, "")) || 0;
window.formatCurr = (v) => new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
}).format(window.getNumeric(v));

// Fetch and Parse CSV
window.getContestData = function() {
    return fetch(CSV_URL)
        .then(res => res.text())
        .then(csvText => {
            const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
            const headers = lines[0].split(',').map(h => h.trim());
            return lines.slice(1).map(line => {
                const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                let obj = {};
                headers.forEach((header, i) => { 
                    obj[header] = values[i] ? values[i].trim().replace(/^"|"$/g, '') : ""; 
                });
                return obj;
            });
        });
};

// Logic for Tickets and Progress
window.calculateStatus = function(row) {
    const bizAch = window.getNumeric(row[window.HEADERS.BIZ_ACH]);
    const bizTarget = window.getNumeric(row[window.HEADERS.BIZ_TARGET]);
    const fcAch = window.getNumeric(row[window.HEADERS.FC_ACH]);
    const fcTarget = window.getNumeric(row[window.HEADERS.FC_TARGET]);

    const bizMet = bizAch >= bizTarget;
    const fcMet = fcAch >= fcTarget;
    
    // Progress for the visual bar (0-100)
    const progressPerc = bizTarget > 0 ? Math.min(100, (bizAch / bizTarget) * 100).toFixed(0) : 0;

    let tickets = 0;
    let remark = "";

    if (bizMet && fcMet) {
        const surplus = bizAch - bizTarget;
        // 1 ticket for meeting target + 1 for every 40,00,000 extra
        tickets = 1 + Math.floor(surplus / 4000000); 
        remark = `<span class="ticket-badge">🎟️ ${tickets} TICKET${tickets > 1 ? 'S' : ''} QUALIFIED</span>`;
    } else {
        if (!bizMet && !fcMet) {
            remark = `<span class="sub-text">Pending: ${window.formatCurr(bizTarget - bizAch)} & ${fcTarget - fcAch} FC</span>`;
        } else if (!bizMet) {
            remark = `<span class="sub-text">Need ${window.formatCurr(bizTarget - bizAch)} more Business</span>`;
        } else {
            remark = `<span class="sub-text">Need ${fcTarget - fcAch} more Fresh Customers</span>`;
        }
    }

    return { tickets, remark, progressPerc };
};

function renderReport(data) {
    const container = document.getElementById('report-container');
    if (!container) return;

    // Filter out rows where target is 0 or name is missing
    const activeData = data.filter(row => row[window.HEADERS.NAME] && window.getNumeric(row[window.HEADERS.BIZ_TARGET]) > 0);

    // Sort by Business Achievement amount (Highest first)
    const sorted = activeData.sort((a, b) => 
        window.getNumeric(b[window.HEADERS.BIZ_ACH]) - window.getNumeric(a[window.HEADERS.BIZ_ACH])
    ).slice(0, 25);

    let html = `<table class="report-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Staff Name</th>
                            <th>Achievement Status</th>
                            <th>Fresh Customers</th>
                            <th>Contest Reward</th>
                        </tr>
                    </thead>
                    <tbody>`;

    sorted.forEach((row, index) => {
        const { remark, tickets, progressPerc } = window.calculateStatus(row);
        const isWinner = tickets > 0;
        
        html += `
            <tr class="${isWinner ? 'winner-row' : ''}">
                <td data-label="Rank" class="rank-cell"><strong>#${index + 1}</strong></td>
                <td data-label="Staff Name" class="cell-name">
                    <span class="staff-name">${row[window.HEADERS.NAME]}</span>
                    <span class="sub-text">${row[window.HEADERS.COMPANY]}</span>
                </td>
                <td data-label="Achievement Status" class="cell-ach">
                    <div class="achieved-val">${window.formatCurr(row[window.HEADERS.BIZ_ACH])}</div>
                    <div class="progress-container">
                        <div class="progress-bg"><div class="progress-fill" style="width: ${progressPerc}%"></div></div>
                        <span class="sub-text">Target: ${window.formatCurr(row[window.HEADERS.BIZ_TARGET])}</span>
                    </div>
                </td>
                <td data-label="Fresh Customers" class="cell-fc">
                    <strong>${row[window.HEADERS.FC_ACH]}</strong> <span class="sub-text">Goal: ${row[window.HEADERS.FC_TARGET]}</span>
                </td>
                <td data-label="Contest Reward" class="cell-reward">${remark}</td>
            </tr>`;
    });

    container.innerHTML = html + `</tbody></table>`;
}

// Execution
document.addEventListener('DOMContentLoaded', () => {
    const reportBox = document.getElementById('report-container');
    if (reportBox) {
        window.getContestData().then(data => {
            renderReport(data);
            const loader = document.getElementById('loading-indicator');
            if (loader) loader.style.display = 'none';
        }).catch(err => {
            console.error("Data fetch error:", err);
            const loader = document.getElementById('loading-indicator');
            if (loader) loader.textContent = "Unable to load data. Please check connection.";
        });
    }
});

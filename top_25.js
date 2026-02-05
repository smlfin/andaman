// top_25.js - Premium Contest Logic 2026
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTlys14AiGHJNcXDBF-7tgiPZhIPN4Kl90Ml5ua9QMivwQz0_8ykgI-jo8fB3c9TZnUrMjF2Xfa3FO5/pub?gid=216440093&single=true&output=csv';

window.HEADERS = {
    NAME: 'STAFF NAME',
    COMPANY: 'COMPANY NAME',
    BIZ_TARGET: 'Business Target',
    FC_TARGET: 'FC Target',
    BIZ_ACH: 'Business Ach',
    FC_ACH: 'FC Ach'
};

window.getNumeric = (v) => parseFloat(String(v).replace(/[^0-9.\\-]/g, "")) || 0;
window.formatCurr = (v) => new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
}).format(window.getNumeric(v));

let dataPromise = null;
window.getContestData = function() {
    if (dataPromise) return dataPromise;
    dataPromise = fetch(CSV_URL)
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
    return dataPromise;
};

window.calculateStatus = function(row) {
    const bizAch = window.getNumeric(row[window.HEADERS.BIZ_ACH]);
    const bizTarget = window.getNumeric(row[window.HEADERS.BIZ_TARGET]);
    const fcAch = window.getNumeric(row[window.HEADERS.FC_ACH]);
    const fcTarget = window.getNumeric(row[window.HEADERS.FC_TARGET]);

    const bizMet = bizAch >= bizTarget;
    const fcMet = fcAch >= fcTarget;
    
    // Progress calculation (capped at 100% for the bar)
    const progressPerc = Math.min(100, (bizAch / bizTarget) * 100).toFixed(0);

    let tickets = 0;
    let remark = "";

    if (bizMet && fcMet) {
        const surplus = bizAch - bizTarget;
        // 1 ticket for target + 1 for every 40,00,000 surplus
        tickets = 1 + Math.floor(surplus / 4000000); 
        remark = `<span class="ticket-badge">🎟️ ${tickets} TICKET${tickets > 1 ? 'S' : ''} QUALIFIED</span>`;
    } else {
        if (!bizMet && !fcMet) {
            remark = `Pending: ${window.formatCurr(bizTarget - bizAch)} & ${fcTarget - fcAch} FC`;
        } else if (!bizMet) {
            remark = `Need ${window.formatCurr(bizTarget - bizAch)} Business`;
        } else {
            remark = `Need ${fcTarget - fcAch} Fresh Customers`;
        }
    }

    return { tickets, remark, progressPerc };
};

function renderReport(data) {
    const container = document.getElementById('report-container');
    if (!container) return;

    // Sort by Business Achievement Amount
    const sorted = data.sort((a, b) => 
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
        
        html += `
            <tr class="${tickets > 0 ? 'winner-row' : ''}">
                <td data-label="Rank" class="rank-cell">${index + 1}</td>
                <td data-label="Staff Name">
                    <span class="staff-name">${row[window.HEADERS.NAME]}</span>
                    <span class="sub-text">${row[window.HEADERS.COMPANY]}</span>
                </td>
                <td data-label="Achievement Status">
                    <div class="achieved-val">${window.formatCurr(row[window.HEADERS.BIZ_ACH])}</div>
                    <div class="progress-container">
                        <div class="progress-bg"><div class="progress-fill" style="width: ${progressPerc}%"></div></div>
                        <span class="sub-text">Target: ${window.formatCurr(row[window.HEADERS.BIZ_TARGET])}</span>
                    </div>
                </td>
                <td data-label="Fresh Customers">
                    <strong>${row[window.HEADERS.FC_ACH]}</strong> <small class="sub-text">/ ${row[window.HEADERS.FC_TARGET]}</small>
                </td>
                <td data-label="Contest Reward">${remark}</td>
            </tr>`;
    });

    container.innerHTML = html + `</tbody></table>`;
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('report-container')) {
        window.getContestData().then(data => {
            renderReport(data);
            const loader = document.getElementById('loading-indicator');
            if (loader) loader.style.display = 'none';
        }).catch(err => {
            console.error("Data fetch error:", err);
        });
    }
});
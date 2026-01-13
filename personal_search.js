document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('staffNameInput');
    const suggestions = document.getElementById('nameSuggestions');
    const reportCard = document.getElementById('personal-report-card');
    const resultContainer = document.getElementById('result-container');
    
    let allData = [];

    // Safety check to ensure top_25.js globals are ready
    const initSearch = () => {
        if (typeof window.getContestData === 'function' && window.HEADERS) {
            window.getContestData().then(data => {
                allData = data;
                if(document.getElementById('loading-indicator')) 
                    document.getElementById('loading-indicator').style.display = 'none';
            });
        } else {
            setTimeout(initSearch, 100); // Retry if not ready
        }
    };

    initSearch();

    input.addEventListener('input', () => {
        const val = input.value.toUpperCase();
        suggestions.innerHTML = '';
        if (val.length < 2) return;

        // Uses the now-global window.HEADERS
        const matches = allData.filter(u => 
            u[window.HEADERS.NAME]?.toUpperCase().includes(val)
        ).slice(0, 10);

        matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = match[window.HEADERS.NAME];
            div.onclick = () => {
                input.value = match[window.HEADERS.NAME];
                suggestions.innerHTML = '';
                displayResult(match);
            };
            suggestions.appendChild(div);
        });
    });

    function displayResult(row) {
        const { remark, seats, bizMet, fcMet } = window.calculateStatus(row);
        resultContainer.style.display = 'block';
        
        reportCard.innerHTML = `
            <div class="personal-card">
                <div class="card-header">
                    <h2>${row[window.HEADERS.NAME]}</h2>
                    <p>${row[window.HEADERS.COMPANY]} | ${row['BRANCH'] || 'General'}</p>
                </div>
                <div class="stat-grid">
                    <div class="stat-box ${bizMet ? 'met' : ''}">
                        <label>Business Achieved</label>
                        <div class="val">${window.formatCurr(row[window.HEADERS.BIZ_ACH])}</div>
                        <small>Target: ${window.formatCurr(row[window.HEADERS.BIZ_TARGET])}</small>
                    </div>
                    <div class="stat-box ${fcMet ? 'met' : ''}">
                        <label>Fresh Customers</label>
                        <div class="val">${row[window.HEADERS.FC_ACH]}</div>
                        <small>Target: ${row[window.HEADERS.FC_TARGET]}</small>
                    </div>
                </div>
                <div class="status-banner ${seats > 0 ? 'winner' : ''}">${remark}</div>
            </div>`;
    }
});
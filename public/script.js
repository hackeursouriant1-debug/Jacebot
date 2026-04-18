 countdownInterval = null;

async function generateCode() {
    const phoneInput = document.getElementById('phone');
    const generateBtn = document.getElementById('generateBtn');
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const codeDisplay = document.getElementById('codeDisplay');
    
    let phone = phoneInput.value.trim().replace(/\D/g, '');
    
    if (phone.length < 8) {
        showError('❌ Numéro de téléphone invalide !');
        return;
    }
    
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    generateBtn.disabled = true;
    loadingDiv.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    
    try {
        const response = await fetch('/pair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: phone })
        });
        
        const data = await response.json();
        
        if (data.success && data.code) {
            codeDisplay.textContent = data.formattedCode || data.code.slice(0,4) + '-' + data.code.slice(4);
            resultDiv.classList.remove('hidden');
            startCountdown(120);
        } else {
            showError(data.message || '❌ Erreur lors de la génération du code.');
        }
    } catch (err) {
        console.error('Erreur:', err);
        showError('❌ Impossible de contacter le serveur. Réessaie plus tard.');
    } finally {
        generateBtn.disabled = false;
        loadingDiv.classList.add('hidden');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function startCountdown(seconds) {
    const expireEl = document.getElementById('expireText');
    let remaining = seconds;
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        remaining--;
        
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            expireEl.textContent = '⏱️ Code expiré. Générez un nouveau code.';
            document.getElementById('codeDisplay').textContent = 'EXPIRÉ';
        } else {
            const minutes = Math.floor(remaining / 60);
            const secs = remaining % 60;
            expireEl.textContent = `⏱️ Ce code expire dans ${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

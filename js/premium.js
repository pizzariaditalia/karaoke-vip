// ============================================================================
// 💎 FUNÇÕES PREMIUM (QR CODE, REAÇÕES E FAVORITOS)
// ============================================================================

function enviarReacao(emoji) {
    if (!refSalaAtual) return;
    refSalaAtual.child('palco/reacoes').push({ emoji: emoji, timestamp: Date.now() });
    mostrarReacaoVoando(emoji);
}

function mostrarReacaoVoando(emoji) {
    const container = document.getElementById('container-reacoes');
    if (!container) return;
    
    const el = document.createElement('div');
    el.innerText = emoji;
    el.style.position = 'absolute';
    el.style.bottom = '0px';
    el.style.fontSize = '35px';
    el.style.left = (Math.random() * 80) + 'px'; 
    el.style.transition = 'all 2s ease-out';
    el.style.opacity = '1';
    el.style.zIndex = '9999';
    container.appendChild(el);

    setTimeout(() => {
        el.style.bottom = '300px';
        el.style.opacity = '0';
        el.style.transform = 'scale(1.5)';
    }, 50);

    setTimeout(() => { if (container.contains(el)) container.removeChild(el); }, 2000);
}

function escutarReacoesPalco(refPalco) {
    refPalco.child('reacoes').on('child_added', snapshot => {
        const val = snapshot.val();
        if (Date.now() - val.timestamp < 5000) { mostrarReacaoVoando(val.emoji); }
    });
}

function mostrarQR() {
    if (!salaAtual) return;
    const container = document.getElementById('qrcode-container');
    container.innerHTML = '';
    
    const urlApp = window.location.href.split('?')[0]; 
    const linkConvite = `${urlApp}?sala=${encodeURIComponent(salaAtual)}${salaSelecionadaTemp && salaSelecionadaTemp.senha ? '&senha=' + encodeURIComponent(salaSelecionadaTemp.senha) : ''}`;
    
    new QRCode(container, {
        text: linkConvite, width: 180, height: 180, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H
    });
    
    document.getElementById('modal-qr').classList.remove('escondido');
}

function fecharModalQR() { document.getElementById('modal-qr').classList.add('escondido'); }

function verificarConviteURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const sala = urlParams.get('sala');
    const senha = urlParams.get('senha');
    
    if (sala) {
        setTimeout(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            const salaExiste = salasCriadas.find(s => s.nome.toLowerCase() === sala.toLowerCase());
            if(salaExiste) {
                if(salaExiste.senha && senha) {
                    if(senha === salaExiste.senha) { efetivarEntradaSala(salaExiste.nome); }
                } else if (!salaExiste.senha) { efetivarEntradaSala(salaExiste.nome); }
            }
        }, 1500); 
    }
}
window.addEventListener('load', verificarConviteURL);

// ATUALIZADO: Agora ele atualiza a aba "Favoritos"
function favoritarMusica(idMusica) {
    let favoritas = JSON.parse(localStorage.getItem('karaoke_favoritas') || '[]');
    if (favoritas.includes(idMusica)) {
        favoritas = favoritas.filter(id => id !== idMusica);
    } else {
        favoritas.push(idMusica);
    }
    localStorage.setItem('karaoke_favoritas', JSON.stringify(favoritas));
    
    if (document.getElementById('tela-playlist').classList.contains('ativa')) {
        mudarPagina(paginaAtual);
    } else if (document.getElementById('tela-favoritos').classList.contains('ativa')) {
        if (typeof renderizarFavoritos === "function") renderizarFavoritos();
    }
}

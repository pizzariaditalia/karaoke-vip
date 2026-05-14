// ============================================================================
// 💎 FUNÇÕES PREMIUM (QR CODE E REAÇÕES)
// ============================================================================

// 1. REAÇÕES EM TEMPO REAL (TikTok Style)
function enviarReacao(emoji) {
    if (!refSalaAtual) return;
    
    // Manda o emoji pra nuvem
    refSalaAtual.child('palco/reacoes').push({
        emoji: emoji,
        timestamp: Date.now()
    });
    
    // Mostra pro usuário que ele clicou
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
    el.style.left = (Math.random() * 80) + 'px'; // Posição aleatória
    el.style.transition = 'all 2s ease-out';
    el.style.opacity = '1';
    el.style.zIndex = '9999';
    container.appendChild(el);

    // Faz o emoji flutuar e sumir
    setTimeout(() => {
        el.style.bottom = '300px';
        el.style.opacity = '0';
        el.style.transform = 'scale(1.5)';
    }, 50);

    // Limpa a tela depois
    setTimeout(() => {
        if (container.contains(el)) container.removeChild(el);
    }, 2000);
}

function escutarReacoesPalco(refPalco) {
    refPalco.child('reacoes').on('child_added', snapshot => {
        const val = snapshot.val();
        // Só mostra a reação se ela for nova (menos de 5 segundos atrás)
        if (Date.now() - val.timestamp < 5000) {
            mostrarReacaoVoando(val.emoji);
        }
    });
}

// 2. QR CODE DE ENTRADA VIP
function mostrarQR() {
    if (!salaAtual) return;
    const container = document.getElementById('qrcode-container');
    container.innerHTML = '';
    
    // Cria a URL com os dados da sala embutidos
    const urlApp = window.location.href.split('?')[0]; 
    const linkConvite = `${urlApp}?sala=${encodeURIComponent(salaAtual)}${salaSelecionadaTemp && salaSelecionadaTemp.senha ? '&senha=' + encodeURIComponent(salaSelecionadaTemp.senha) : ''}`;
    
    // Gera o desenho do QR Code
    new QRCode(container, {
        text: linkConvite,
        width: 180,
        height: 180,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
    
    document.getElementById('modal-qr').classList.remove('escondido');
}

function fecharModalQR() {
    document.getElementById('modal-qr').classList.add('escondido');
}

// Lógica mágica para ler o QR Code quando o app abre
function verificarConviteURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const sala = urlParams.get('sala');
    const senha = urlParams.get('senha');
    
    if (sala) {
        setTimeout(() => {
            // Limpa a URL para não ficar feio
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Preenche e entra na sala sozinho
            const salaExiste = salasCriadas.find(s => s.nome.toLowerCase() === sala.toLowerCase());
            if(salaExiste) {
                if(salaExiste.senha && senha) {
                    if(senha === salaExiste.senha) { efetivarEntradaSala(salaExiste.nome); }
                } else if (!salaExiste.senha) {
                    efetivarEntradaSala(salaExiste.nome);
                }
            }
        }, 1500); 
    }
}
window.addEventListener('load', verificarConviteURL);

// 3. MÚSICAS FAVORITAS
function favoritarMusica(idMusica) {
    let favoritas = JSON.parse(localStorage.getItem('karaoke_favoritas') || '[]');
    if (favoritas.includes(idMusica)) {
        favoritas = favoritas.filter(id => id !== idMusica);
    } else {
        favoritas.push(idMusica);
    }
    localStorage.setItem('karaoke_favoritas', JSON.stringify(favoritas));
    
    // Pede pro app.js redesenhar a lista na aba atual
    if (document.getElementById('tela-playlist').classList.contains('ativa')) {
        mudarPagina(paginaAtual);
    } else if (document.getElementById('tela-perfil').classList.contains('ativa')) {
        renderizarFavoritos();
    }
}

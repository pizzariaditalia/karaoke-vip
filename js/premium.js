// ============================================================================
// 💎 FUNÇÕES PREMIUM (QR CODE, REAÇÕES, FAVORITOS E ESTÚDIO VIP)
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

// ============================================================================
// 🎛️ CONTROLE DE ESTÚDIO (TOM E VELOCIDADE)
// ============================================================================
let tomAtual = 0;
let velocidadeAtual = 1.0;
let audioEstudioInicializado = false;
let tonePitchShift = null;
let mediaSourceNode = null; // <- O segredo para não travar na 2ª música

function iniciarAudioEstudio() {
    if (audioEstudioInicializado) return;
    
    const videoEl = document.getElementById('player-video');
    if (!videoEl) return;

    try {
        // Inicializa o motor de áudio
        Tone.start();
        
        // Cria o alterador de Tom
        if (!tonePitchShift) {
            tonePitchShift = new Tone.PitchShift().toDestination();
        }
        
        // Captura o áudio do vídeo apenas UMA vez para não dar erro
        if (!mediaSourceNode) {
            mediaSourceNode = Tone.context.createMediaElementSource(videoEl);
        }
        
        // Limpa conexões velhas e liga na nova
        mediaSourceNode.disconnect();
        mediaSourceNode.connect(tonePitchShift);
        
        audioEstudioInicializado = true;
        console.log("Estúdio VIP ativado! Motor de áudio conectado.");
    } catch (e) {
        console.error("Erro ao iniciar o estúdio. Pode ser bloqueio de CORS do R2.", e);
        mostrarAlerta("O bloqueio do servidor ainda está na memória do celular. Limpe o cache ou tente em uma aba anônima!", "Erro de Áudio", "fa-triangle-exclamation");
    }
}

function ajustarTom(valor) {
    if (!audioEstudioInicializado) {
        iniciarAudioEstudio();
    }
    
    tomAtual += valor;
    
    // Limite máximo e mínimo de tons para não estourar o áudio (-12 a +12)
    if (tomAtual > 12) tomAtual = 12;
    if (tomAtual < -12) tomAtual = -12;
    
    if (tonePitchShift) {
        tonePitchShift.pitch = tomAtual;
    }
    
    // Atualiza o painel visual
    let textoTom = tomAtual > 0 ? '+' + tomAtual : tomAtual;
    document.getElementById('display-tom').innerText = textoTom;
}

function ajustarVelocidade(valor) {
    velocidadeAtual += valor;
    
    // Limites de velocidade (Metade do tempo ou 2x mais rápido)
    if (velocidadeAtual > 2.0) velocidadeAtual = 2.0;
    if (velocidadeAtual < 0.5) velocidadeAtual = 0.5;
    
    // Arredonda para 1 casa decimal
    velocidadeAtual = Math.round(velocidadeAtual * 10) / 10;
    
    const videoEl = document.getElementById('player-video');
    if (videoEl) {
        videoEl.playbackRate = velocidadeAtual;
    }
    
    // Atualiza o painel visual
    document.getElementById('display-velocidade').innerText = velocidadeAtual.toFixed(1) + 'x';
}

function resetarEstudio() {
    tomAtual = 0;
    velocidadeAtual = 1.0;
    
    if (tonePitchShift) tonePitchShift.pitch = 0;
    
    const videoEl = document.getElementById('player-video');
    if (videoEl) videoEl.playbackRate = 1.0;
    
    const dTom = document.getElementById('display-tom');
    const dVel = document.getElementById('display-velocidade');
    
    if (dTom) dTom.innerText = '0';
    if (dVel) dVel.innerText = '1.0x';
}

// ============================================================================
// ☁️ CONFIGURAÇÃO DO FIREBASE (NOSSA NUVEM EM TEMPO REAL)
// ============================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBJ6OrvDbqmJSVbhYfJCS5mhjIrA21_Mgk",
    authDomain: "karaoke-app-98867.firebaseapp.com",
    databaseURL: "https://karaoke-app-98867-default-rtdb.firebaseio.com",
    projectId: "karaoke-app-98867",
    storageBucket: "karaoke-app-98867.firebasestorage.app",
    messagingSenderId: "372059857805",
    appId: "1:372059857805:web:35c532c2ed1f1a1a2253c4"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ============================================================================
// 🎥 CONFIGURAÇÃO CLOUDFLARE R2 (NUVEM DE VÍDEOS)
// ============================================================================
const urlNuvemR2 = "https://pub-b5f6932035684a59b4f704ebec0be62c.r2.dev";

// ============================================================================
// VARIÁVEIS GLOBAIS DO APLICATIVO
// ============================================================================
let salaAtual = null; 
let salaSelecionadaTemp = null; 
let refSalaAtual = null; 

let salasCriadas = [];
let perfisFamilia = [];
let filaDeReproducao = [];
let historicoTocadas = {}; 

let categoriaAtual = "Todas";
let perfilAtual = null; 

let cantorAoVivo = null; 
let cantor2AoVivo = null; 
let musicaAoVivo = null;

let musicasAtuaisFiltradas = []; 
let paginaAtual = 1;
const musicasPorPagina = 10; 

let timerTransicao = null;
let intervaloContador = null;
const playerPrevia = new Audio();
let previewTimer = null;
let musicaPreviaAtualId = null;

const sementesAvatares = ['Felix', 'Aneka', 'Loki', 'Salem', 'Mimi', 'Oliver', 'Cleo', 'Buster', 'Tinkerbell', 'Bandit', 'Max', 'Bella', 'Charlie', 'Lucy', 'Leo', 'Luna', 'Milo', 'Nala', 'Simba', 'Daisy', 'Garfield', 'Chloe', 'Jack', 'Mia', 'Rocky', 'Lily', 'Oscar', 'Zoe', 'Buddy', 'Stella'];
const listaURLsAvatares = sementesAvatares.map(seed => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`);
let avatarSelecionadoCriacao = listaURLsAvatares[0];

const bottomBar = document.getElementById('bottom-bar');
const navItems = document.querySelectorAll('.nav-item');
const telas = document.querySelectorAll('.tela');
const telaPalcoOverlay = document.getElementById('tela-palco');
const playerVideo = document.getElementById('player-video');
const somAplauso = document.getElementById('som-aplauso');

// ============================================================================
// SISTEMA DE ALERTAS CUSTOMIZADOS
// ============================================================================
function mostrarAlerta(mensagem, titulo = "Aviso", icone = "fa-bell") {
    document.getElementById('titulo-alerta').innerHTML = `<i class="fa-solid ${icone} texto-destaque"></i> ${titulo}`;
    document.getElementById('mensagem-alerta').innerText = mensagem;
    document.getElementById('modal-alerta').classList.remove('escondido');
}

function fecharModalAlerta() {
    document.getElementById('modal-alerta').classList.add('escondido');
}

// ============================================================================
// LÓGICA DE NUVEM - SALAS E DADOS (FIREBASE)
// ============================================================================

db.ref('salas_abertas').on('value', snapshot => {
    salasCriadas = snapshot.val() || [];
    if (!salaAtual) {
        renderizarLobbySalas();
    }
});

function salvarListaSalasGlobais() {
    db.ref('salas_abertas').set(salasCriadas);
}

function renderizarLobbySalas() {
    const container = document.getElementById('lista-salas-abertas');
    if(salasCriadas.length === 0) {
        container.innerHTML = '<p class="texto-cinza">Nenhuma sala rolando no momento.</p>';
        return;
    }
    
    container.innerHTML = '';
    salasCriadas.forEach(sala => {
        const icone = sala.senha ? 'fa-lock' : 'fa-door-open';
        container.innerHTML += `
            <button class="btn-categoria ativo" style="margin-bottom: 8px; margin-right: 5px;" onclick="tentarEntrarSala('${sala.nome}')">
                <i class="fa-solid ${icone}"></i> ${sala.nome}
            </button>
        `;
    });
}

function criarSala() {
    const nome = document.getElementById('input-criar-sala').value.trim();
    const senha = document.getElementById('input-senha-sala').value.trim();
    
    if (nome !== "") {
        if(salasCriadas.find(s => s.nome.toLowerCase() === nome.toLowerCase())) {
            mostrarAlerta("Já existe uma sala com esse nome! Escolha outro ou entre nela na lista abaixo.", "Sala já existe", "fa-circle-xmark");
            return;
        }

        salasCriadas.push({ nome: nome, senha: senha !== "" ? senha : null });
        salvarListaSalasGlobais(); 

        efetivarEntradaSala(nome);
    } else {
        mostrarAlerta("Por favor, digite um nome para a sala!", "Nome Inválido", "fa-triangle-exclamation");
    }
}

function tentarEntrarSala(nomeBusca) {
    if (!nomeBusca || nomeBusca === "") return;
    
    const salaExiste = salasCriadas.find(s => s.nome.toLowerCase() === nomeBusca.toLowerCase());
    
    if(salaExiste) {
        if(salaExiste.senha) {
            salaSelecionadaTemp = salaExiste;
            document.getElementById('input-senha-acesso').value = '';
            document.getElementById('modal-senha').classList.remove('escondido');
        } else {
            efetivarEntradaSala(salaExiste.nome);
        }
    } else {
        mostrarAlerta("Sala não encontrada!", "Erro", "fa-circle-xmark");
    }
}

function verificarSenha() {
    const senhaDigitada = document.getElementById('input-senha-acesso').value.trim();
    
    if(senhaDigitada === salaSelecionadaTemp.senha) {
        const nomeDaSalaLiberada = salaSelecionadaTemp.nome;
        fecharModalSenha();
        efetivarEntradaSala(nomeDaSalaLiberada);
    } else {
        mostrarAlerta("Senha Incorreta! Acesso negado.", "Acesso Negado", "fa-lock");
    }
}

function fecharModalSenha() {
    document.getElementById('modal-senha').classList.add('escondido');
    salaSelecionadaTemp = null;
}

function efetivarEntradaSala(nome) {
    salaAtual = nome;
    localStorage.setItem('karaoke_sala_ativa', salaAtual);
    entrarNoSistema();
}

function sairDaSala() {
    if (refSalaAtual) {
        refSalaAtual.off(); 
        refSalaAtual = null;
    }
    
    salaAtual = null;
    perfilAtual = null;
    localStorage.removeItem('karaoke_sala_ativa');
    localStorage.removeItem('karaoke_perfil_atual_id'); 
    
    document.getElementById('bottom-bar').classList.add('escondido');
    telas.forEach(tela => tela.classList.remove('ativa'));
    document.getElementById('tela-salas').classList.add('ativa');
    
    renderizarLobbySalas(); 
}

function entrarNoSistema() {
    renderizarSeletorAvatares();
    renderizarCategorias();
    prepararLista(catalogoMusicas);
    
    refSalaAtual = db.ref('dados_salas/' + salaAtual);
    
    refSalaAtual.on('value', snapshot => {
        const dados = snapshot.val() || {};
        
        let pRaw = dados.perfis || [];
        perfisFamilia = Array.isArray(pRaw) ? pRaw : Object.values(pRaw);

        let fRaw = dados.fila || [];
        filaDeReproducao = Array.isArray(fRaw) ? fRaw : Object.values(fRaw);

        historicoTocadas = dados.historico || {};

        const idAtualSalvo = localStorage.getItem('karaoke_perfil_atual_id');
        if (idAtualSalvo) { 
            let perfilEncontrado = perfisFamilia.find(p => String(p.id) === String(idAtualSalvo));
            if(perfilEncontrado) {
                perfilAtual = perfilEncontrado; 
            }
        }

        // ==========================================
        // SINCRONIZAÇÃO DA PLATÉIA (O SEGREDO DA NUVEM)
        // ==========================================
        if (dados.palco && dados.palco.cantor) {
            // Verifica se quem está no palco é diferente de você (Para não bugar o player de quem está cantando de verdade)
            if (!cantorAoVivo || (cantorAoVivo && String(cantorAoVivo.id) !== String(dados.palco.cantor))) {
                const perfilCantor = perfisFamilia.find(p => String(p.id) === String(dados.palco.cantor));
                const perfilCantor2 = dados.palco.cantor2 ? perfisFamilia.find(p => String(p.id) === String(dados.palco.cantor2)) : null;
                const musicaPalco = catalogoMusicas.find(m => String(m.id) === String(dados.palco.musica));
                
                if (perfilCantor && musicaPalco) {
                     // Alguém assumiu o palco na nuvem! Atualiza os dados para a platéia ver o card
                     cantorAoVivo = perfilCantor;
                     cantor2AoVivo = perfilCantor2;
                     musicaAoVivo = musicaPalco;
                     
                     // Mantém a tela do palco "escondida" ou "minimizada" para a platéia (não dá autoplay no video)
                     if (!telaPalcoOverlay.classList.contains('escondido') === false) {
                         telaPalcoOverlay.classList.add('minimizado');
                         telaPalcoOverlay.classList.remove('escondido');
                     }
                }
            }
        } else {
             // Nuvem avisou que o palco esvaziou
             if (cantorAoVivo && String(cantorAoVivo.id) !== String(idAtualSalvo)) {
                 cantorAoVivo = null;
                 cantor2AoVivo = null;
                 musicaAoVivo = null;
                 telaPalcoOverlay.classList.add('escondido');
             }
        }

        renderizarPerfis();
        atualizarPerfilGlobal();
        atualizarFilaUI();
        if(document.getElementById('tela-dashboard').classList.contains('ativa')) atualizarDashboard();
        if(document.getElementById('tela-ranking').classList.contains('ativa')) renderizarRanking();
    });

    if (!perfilAtual) {
        perfilAtual = { id: 'convidado_base', nome: "Visitante", foto: `https://api.dicebear.com/7.x/avataaars/svg?seed=Visitante&backgroundColor=e2e2e2`, pontos: 0, isGuest: true };
    }
    
    document.getElementById('badge-nome-sala').innerHTML = `<i class="fa-solid fa-door-open"></i> Sala: <strong>${salaAtual}</strong> <i class="fa-solid fa-right-from-bracket" style="margin-left: 10px; cursor: pointer; color: var(--rosa-neon);" onclick="sairDaSala()" title="Sair"></i>`;
    document.getElementById('bottom-bar').classList.remove('escondido');
    mudarTela('tela-dashboard', navItems[0]); 
}

function salvarDados() {
    if (!salaAtual || !refSalaAtual) return; 
    
    refSalaAtual.set({
        perfis: perfisFamilia,
        fila: filaDeReproducao,
        historico: historicoTocadas,
        // Envia o estado do palco para a nuvem
        palco: {
            cantor: cantorAoVivo ? cantorAoVivo.id : null,
            cantor2: cantor2AoVivo ? cantor2AoVivo.id : null,
            musica: musicaAoVivo ? musicaAoVivo.id : null
        }
    });
}

window.onload = () => { 
    const salaSalva = localStorage.getItem('karaoke_sala_ativa');
    if (salaSalva) {
        salaAtual = salaSalva;
        entrarNoSistema();
    } else {
        document.getElementById('bottom-bar').classList.add('escondido');
    }
};

// ============================================================================
// NAVEGAÇÃO E LÓGICA DO APLICATIVO
// ============================================================================

function mudarTela(idTelaAlvo, elementoNav = null) {
    if (!salaAtual && idTelaAlvo !== 'tela-salas') return; 

    pararPrevia(); 
    telas.forEach(tela => tela.classList.remove('ativa'));
    document.getElementById(idTelaAlvo).classList.add('ativa');
    
    if(elementoNav) {
        navItems.forEach(item => item.classList.remove('ativo'));
        elementoNav.classList.add('ativo');
    }

    if(idTelaAlvo === 'tela-dashboard') atualizarDashboard();
    if(idTelaAlvo === 'tela-ranking') renderizarRanking();
    if(idTelaAlvo === 'tela-fila') atualizarFilaUI();

    window.scrollTo(0, 0); 
}

function tocarPrevia(idMusica) {
    if (musicaPreviaAtualId === idMusica && !playerPrevia.paused) {
        pararPrevia();
        return;
    }
    pararPrevia(); 
    const musica = catalogoMusicas.find(m => m.id === idMusica);
    if(!musica) return;

    const btn = document.getElementById(`btn-previa-${idMusica}`);
    if(btn) btn.innerHTML = '<i class="fa-solid fa-circle-stop"></i>';

    playerPrevia.src = `${urlNuvemR2}/${encodeURIComponent(musica.arquivo)}`;
    
    playerPrevia.onloadedmetadata = () => {
        playerPrevia.currentTime = 30; 
        playerPrevia.play().catch(e => console.log("Prévia bloqueada."));
    };
    musicaPreviaAtualId = idMusica;
    previewTimer = setTimeout(() => { pararPrevia(); }, 30000);
}

function pararPrevia() {
    playerPrevia.pause();
    if (musicaPreviaAtualId) {
        const btnAntigo = document.getElementById(`btn-previa-${musicaPreviaAtualId}`);
        if(btnAntigo) btnAntigo.innerHTML = '<i class="fa-solid fa-headphones"></i>';
    }
    musicaPreviaAtualId = null;
    clearTimeout(previewTimer);
}

function renderizarSeletorAvatares() {
    const container = document.getElementById('seletor-avatares');
    container.innerHTML = '';
    listaURLsAvatares.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.classList.add('avatar-opcao');
        if(url === avatarSelecionadoCriacao) img.classList.add('selecionado');
        img.onclick = () => { avatarSelecionadoCriacao = url; renderizarSeletorAvatares(); };
        container.appendChild(img);
    });
}

function criarPerfil() {
    const inputNome = document.getElementById('input-novo-perfil');
    const nome = inputNome.value.trim();
    if (nome !== "") {
        const novoPerfil = { id: Date.now(), nome: nome, foto: avatarSelecionadoCriacao, pontos: 0, isGuest: false };
        perfisFamilia.push(novoPerfil);
        perfilAtual = novoPerfil;
        
        localStorage.setItem('karaoke_perfil_atual_id', novoPerfil.id);
        salvarDados(); 
        
        inputNome.value = "";
        mostrarAlerta(`Cantor Oficial ${nome} registrado e conectado!`, "Sucesso", "fa-circle-check");
    } else { 
        mostrarAlerta("Por favor, digite um nome válido!", "Atenção", "fa-triangle-exclamation"); 
    }
}

function entrarComoConvidado() {
    const inputConvidado = document.getElementById('input-convidado');
    const nome = inputConvidado.value.trim();
    if (nome !== "") {
        const perfilConvidado = { id: 'convidado_' + Date.now(), nome: `${nome} (Convidado)`, foto: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nome + 'conv')}&backgroundColor=e2e2e2`, pontos: 0, isGuest: true };
        perfilAtual = perfilConvidado;
        
        localStorage.removeItem('karaoke_perfil_atual_id');
        
        atualizarPerfilGlobal();
        renderizarPerfis(); 
        inputConvidado.value = '';
        mostrarAlerta(`Bem-vindo, ${nome}! Você está na sala ${salaAtual}.`, "Visitante", "fa-user-astronaut");
        mudarTela('tela-playlist', navItems[1]); 
    } else { 
        mostrarAlerta("Digite o nome do visitante!", "Atenção", "fa-triangle-exclamation"); 
    }
}

function renderizarPerfis() {
    const listaPerfis = document.getElementById('lista-perfis');
    listaPerfis.innerHTML = '';
    if(perfisFamilia.length === 0) {
        listaPerfis.innerHTML = '<p class="texto-cinza">Nenhum cantor oficial cadastrado nesta sala ainda.</p>';
        return;
    }
    
    perfisFamilia.forEach(perfil => {
        const card = document.createElement('div');
        card.classList.add('card-perfil');
        if (perfilAtual && String(perfil.id) === String(perfilAtual.id)) card.classList.add('ativo');
        
        card.innerHTML = `<img src="${perfil.foto}" class="foto-perfil"><span class="nome-perfil">${perfil.nome}</span>`;
        
        card.onclick = () => { 
            perfilAtual = perfil; 
            localStorage.setItem('karaoke_perfil_atual_id', perfil.id);
            atualizarPerfilGlobal();
            renderizarPerfis();
            mostrarAlerta(`Bem-vindo de volta! Você agora é: ${perfil.nome}`, "Perfil Selecionado", "fa-user-check");
        };
        
        listaPerfis.appendChild(card);
    });
}

function atualizarPerfilGlobal() {
    if(perfilAtual) { document.getElementById('dash-foto-perfil').src = perfilAtual.foto; }
}

function atualizarDashboard() {
    document.getElementById('dash-qtd-musicas').innerText = catalogoMusicas.length;
    document.getElementById('dash-qtd-cantores').innerText = perfisFamilia.length;
    document.getElementById('dash-qtd-salas').innerText = salasCriadas.length;

    const bannerAoVivo = document.getElementById('banner-ao-vivo');
    if (cantorAoVivo && musicaAoVivo && telaPalcoOverlay.classList.contains('minimizado')) {
        bannerAoVivo.classList.remove('escondido');
        document.getElementById('ao-vivo-foto').src = cantorAoVivo.foto;
        
        const foto2 = document.getElementById('ao-vivo-foto-2');
        if(cantor2AoVivo) {
            foto2.src = cantor2AoVivo.foto;
            foto2.classList.remove('escondido');
            document.getElementById('ao-vivo-nome').innerText = `${cantorAoVivo.nome} & ${cantor2AoVivo.nome}`;
        } else {
            foto2.classList.add('escondido');
            document.getElementById('ao-vivo-nome').innerText = cantorAoVivo.nome;
        }
        document.getElementById('ao-vivo-musica').innerText = musicaAoVivo.titulo;
    } else {
        bannerAoVivo.classList.add('escondido');
    }

    const containerTopCantores = document.getElementById('dash-top-cantores');
    let cantoresComPonto = [...perfisFamilia].filter(p => p.pontos > 0 && !p.isGuest).sort((a, b) => b.pontos - a.pontos);

    if (cantoresComPonto.length === 0) {
        containerTopCantores.innerHTML = '<p class="texto-cinza text-center">Nenhum voto registrado nesta sala.</p>';
    } else {
        containerTopCantores.innerHTML = '';
        cantoresComPonto.slice(0, 5).forEach((perfil, index) => { 
            let cor = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : 'var(--texto-cinza)';
            containerTopCantores.innerHTML += `
                <div class="item-rank">
                    <div class="rank-info">
                        <span class="rank-pos" style="color:${cor}">${index + 1}º</span>
                        <img src="${perfil.foto}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
                        <span>${perfil.nome}</span>
                    </div>
                    <span class="rank-pontos">${perfil.pontos} pts</span>
                </div>
            `;
        });
    }

    const containerTopHits = document.getElementById('dash-top-musicas');
    let hitsOrdenados = Object.entries(historicoTocadas).sort((a, b) => b[1] - a[1]).slice(0, 7);

    if (hitsOrdenados.length === 0) {
        containerTopHits.innerHTML = '<p class="texto-cinza text-center mt-10">Nenhuma música cantada nesta sala ainda.</p>';
    } else {
        containerTopHits.innerHTML = '';
        hitsOrdenados.forEach(([idStr, qtd], index) => {
            const musica = catalogoMusicas.find(m => String(m.id) === String(idStr));
            if(musica) {
                containerTopHits.innerHTML += `
                    <div class="item-rank-musica">
                        <div class="info-hit">
                            <span class="titulo-hit">${index + 1}. ${musica.titulo}</span>
                            <span class="artista-hit">${musica.artista}</span>
                        </div>
                        <span class="qtd-hit"><i class="fa-solid fa-fire"></i> ${qtd}x</span>
                    </div>
                `;
            }
        });
    }
}

function renderizarRanking() {
    const containerRanking = document.getElementById('lista-ranking-completa');
    let cantoresComPonto = [...perfisFamilia].filter(p => p.pontos > 0 && !p.isGuest).sort((a, b) => b.pontos - a.pontos);

    if (cantoresComPonto.length === 0) {
        containerRanking.innerHTML = '<div class="empty-state"><i class="fa-solid fa-medal fa-3x"></i><p>A competição desta sala ainda não começou!</p></div>';
        return;
    }

    containerRanking.innerHTML = '';
    cantoresComPonto.forEach((perfil, index) => {
        let corPodio = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : 'var(--texto-cinza)';
        containerRanking.innerHTML += `
            <div class="item-rank" style="margin-bottom: 10px;">
                <div class="rank-info">
                    <span class="rank-pos" style="color: ${corPodio};">${index + 1}º</span>
                    <img src="${perfil.foto}" style="width: 45px; height: 45px; border-radius: 50%; object-fit:cover;">
                    <strong>${perfil.nome}</strong>
                </div>
                <span class="rank-pontos">${perfil.pontos} <i class="fa-solid fa-star"></i></span>
            </div>
        `;
    });
}

function renderizarCategorias() {
    const containerCategorias = document.getElementById('container-categorias');
    const categorias = ["Todas", ...new Set(catalogoMusicas.map(m => m.categoria))];
    containerCategorias.innerHTML = '';
    categorias.forEach(cat => {
        const btn = document.createElement('button');
        btn.classList.add('btn-categoria');
        if(cat === categoriaAtual) btn.classList.add('ativo');
        btn.innerText = cat;
        btn.onclick = () => { categoriaAtual = cat; renderizarCategorias(); filtrarMusicas(); };
        containerCategorias.appendChild(btn);
    });
}

function filtrarMusicas() {
    const termo = document.getElementById('input-busca').value.toLowerCase();
    const filtradas = catalogoMusicas.filter(m => 
        (m.titulo.toLowerCase().includes(termo) || m.artista.toLowerCase().includes(termo) || m.codigo?.includes(termo)) &&
        (categoriaAtual === "Todas" || m.categoria === categoriaAtual)
    );
    prepararLista(filtradas);
}
document.getElementById('input-busca').addEventListener('input', filtrarMusicas);

function prepararLista(musicas) {
    musicasAtuaisFiltradas = musicas;
    mudarPagina(1);
}

function mudarPagina(numeroPagina) {
    pararPrevia(); 
    const totalPaginas = Math.ceil(musicasAtuaisFiltradas.length / musicasPorPagina);
    if (numeroPagina < 1) numeroPagina = 1;
    if (numeroPagina > totalPaginas && totalPaginas > 0) numeroPagina = totalPaginas;
    paginaAtual = numeroPagina;
    const inicio = (paginaAtual - 1) * musicasPorPagina;
    const musicasDaPagina = musicasAtuaisFiltradas.slice(inicio, inicio + musicasPorPagina);
    renderizarMusicas(musicasDaPagina);
    renderizarControlesPaginacao(totalPaginas);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderizarControlesPaginacao(totalPaginas) {
    const paginacaoContainer = document.getElementById('paginacao-container');
    if (totalPaginas <= 1) { paginacaoContainer.innerHTML = ''; return; }
    paginacaoContainer.innerHTML = `
        <button class="btn-pagina" onclick="mudarPagina(${paginaAtual - 1})" ${paginaAtual === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>
        <span class="info-pagina">Página ${paginaAtual} de ${totalPaginas}</span>
        <button class="btn-pagina" onclick="mudarPagina(${paginaAtual + 1})" ${paginaAtual === totalPaginas ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>
    `;
}

function renderizarMusicas(musicas) {
    const listaMusicas = document.getElementById('lista-musicas');
    listaMusicas.innerHTML = '';
    if (musicas.length === 0) {
        listaMusicas.innerHTML = '<div class="empty-state"><i class="fa-solid fa-music fa-3x"></i><p>Nenhuma música encontrada.</p></div>';
        return;
    }
    musicas.forEach(musica => {
        const card = document.createElement('div');
        card.classList.add('card-musica');
        
        card.innerHTML = `
            <div class="info-musica">
                <div class="titulo-musica">${musica.titulo}</div>
                <div class="artista-musica">${musica.artista}</div>
            </div>
            <div class="botoes-card">
                <button class="btn-acao btn-previa" id="btn-previa-${musica.id}" onclick="tocarPrevia(${musica.id})" title="Ouvir Prévia"><i class="fa-solid fa-headphones"></i></button>
                <button class="btn-acao btn-fila" onclick="adicionarFila(${musica.id})" title="Add Solo"><i class="fa-solid fa-plus"></i></button>
                <button class="btn-acao btn-dueto" onclick="abrirModalDueto(${musica.id})" title="Add Dueto"><i class="fa-solid fa-user-group"></i></button>
                <button class="btn-acao btn-cantar" onclick="irParaPalco(${musica.id}, null)">Cantar</button>
            </div>
        `;
        listaMusicas.appendChild(card);
    });
}

let idMusicaDuetoTemporaria = null;

function abrirModalDueto(idMusica) {
    if(!perfilAtual || perfilAtual.isGuest) { 
        mostrarAlerta("Identifique-se como Oficial na aba 'Perfil' primeiro!", "Atenção", "fa-user"); 
        mudarTela('tela-perfil', navItems[4]); 
        return; 
    }
    idMusicaDuetoTemporaria = idMusica;
    const modal = document.getElementById('modal-dueto');
    document.getElementById('lista-parceiros-modal').innerHTML = '';
    const parceirosDisponiveis = perfisFamilia.filter(p => String(p.id) !== String(perfilAtual.id));
    if(parceirosDisponiveis.length === 0) { 
        mostrarAlerta("Cadastre mais um Cantor nesta sala para fazer dueto!", "Atenção", "fa-user-group"); 
        return; 
    }
    parceirosDisponiveis.forEach(perfil => {
        const card = document.createElement('div');
        card.classList.add('card-perfil');
        card.innerHTML = `<img src="${perfil.foto}" class="foto-perfil"><span class="nome-perfil">${perfil.nome}</span>`;
        card.onclick = () => { adicionarFila(idMusicaDuetoTemporaria, perfil); fecharModalDueto(); };
        document.getElementById('lista-parceiros-modal').appendChild(card);
    });
    modal.classList.remove('escondido');
}

function fecharModalDueto() { document.getElementById('modal-dueto').classList.add('escondido'); idMusicaDuetoTemporaria = null; }

function adicionarFila(id, parceiro = null) {
    if(!perfilAtual) { 
        mostrarAlerta("Selecione um cantor na aba 'Perfil' primeiro!", "Atenção", "fa-user"); 
        mudarTela('tela-perfil', navItems[4]); 
        return; 
    }
    const musica = catalogoMusicas.find(m => m.id === id);
    filaDeReproducao.push({ ...musica, cantor: perfilAtual, cantor2: parceiro, instanciaId: Date.now() });
    salvarDados(); 
    if(parceiro) {
        mostrarAlerta(`Dueto de ${perfilAtual.nome} & ${parceiro.nome} na fila!`, "Sucesso", "fa-list-ol");
    } else {
        mostrarAlerta(`${musica.titulo} na fila!`, "Sucesso", "fa-list-ol");
    }
}

function removerDaFila(instanciaId) {
    filaDeReproducao = filaDeReproducao.filter(m => m.instanciaId !== instanciaId);
    salvarDados(); 
}

function atualizarFilaUI() {
    const listaFila = document.getElementById('lista-fila');
    if (filaDeReproducao.length === 0) {
        listaFila.innerHTML = '<div class="empty-state"><i class="fa-solid fa-microphone-slash fa-3x"></i><p>O palco está livre!</p></div>';
        return;
    }
    listaFila.innerHTML = '';
    filaDeReproducao.forEach((m, index) => {
        const item = document.createElement('div');
        item.classList.add('item-fila-grande');
        let htmlAvatares = `<img src="${m.cantor.foto}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">`;
        let nomeCantor = m.cantor.nome;
        if(m.cantor2) {
            htmlAvatares += `<img src="${m.cantor2.foto}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" class="foto-sobreposta">`;
            nomeCantor += ` & ${m.cantor2.nome}`;
        }
        item.innerHTML = `
            <div class="fila-rank">${index + 1}º</div>
            <div class="avatares-dupla">${htmlAvatares}</div>
            <div class="fila-info-textos">
                <strong class="fila-nome">${nomeCantor}</strong>
                <span class="fila-musica">${m.titulo}</span>
            </div>
            <div class="fila-acoes">
                <button class="btn-acao btn-cantar" style="padding: 10px 15px;" onclick="puxarDaFilaParaPalco(${m.instanciaId})"><i class="fa-solid fa-play"></i></button>
                <button class="btn-remover" onclick="removerDaFila(${m.instanciaId})"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
        listaFila.appendChild(item);
    });
}

function puxarDaFilaParaPalco(instanciaId) {
    const itemFila = filaDeReproducao.find(m => m.instanciaId === instanciaId);
    if(itemFila) {
        irParaPalco(itemFila.id, itemFila.cantor2);
        removerDaFila(instanciaId); 
    }
}

function irParaPalco(idMusica, parceiro = null, pularContagem = false) {
    if(!perfilAtual) { 
        mostrarAlerta("Identifique-se na aba Perfil antes de cantar!", "Atenção", "fa-user"); 
        mudarTela('tela-perfil', navItems[4]); 
        return; 
    }
    
    pararPrevia(); 
    document.getElementById('tela-transicao-palco').classList.add('escondido');
    clearInterval(intervaloContador);
    clearTimeout(timerTransicao);
    window.speechSynthesis.cancel(); 
    somAplauso.onended = null;       

    historicoTocadas[idMusica] = (historicoTocadas[idMusica] || 0) + 1;

    const musica = catalogoMusicas.find(m => m.id === idMusica);
    cantorAoVivo = perfilAtual;
    cantor2AoVivo = parceiro;
    musicaAoVivo = musica;

    salvarDados(); // AVISA A NUVEM QUE O PALCO ESTÁ OCUPADO

    document.getElementById('titulo-atual').innerText = musica.titulo;
    document.getElementById('artista-atual').innerText = musica.artista;
    
    const foto2 = document.getElementById('palco-foto-cantor-2');
    
    let nomeAnuncio = perfilAtual.nome;
    let htmlFotos = `<img src="${perfilAtual.foto}" class="foto-transicao">`;

    if(parceiro) {
        nomeAnuncio += ` & ${parceiro.nome}`;
        htmlFotos += `<img src="${parceiro.foto}" class="foto-transicao foto-sobreposta-palco">`;
        document.getElementById('palco-nome-cantor').innerText = `🎤 ${perfilAtual.nome} & ${parceiro.nome}`;
        foto2.src = parceiro.foto;
        foto2.classList.remove('escondido');
    } else {
        document.getElementById('palco-nome-cantor').innerText = `🎤 ${perfilAtual.nome}`;
        foto2.classList.add('escondido');
    }
    document.getElementById('palco-foto-cantor').src = perfilAtual.foto;
    
    document.getElementById('alerta-nota-palco').classList.add('escondido');
    
    telaPalcoOverlay.classList.remove('escondido');
    telaPalcoOverlay.classList.remove('minimizado');

    playerVideo.src = `${urlNuvemR2}/${encodeURIComponent(musica.arquivo)}`;

    if (pularContagem) {
        playerVideo.play().catch(e => console.log("Autoplay bloqueado pelo navegador."));
    } else {
        const divTransicao = document.getElementById('tela-transicao-palco');
        document.getElementById('transicao-nome').innerText = nomeAnuncio;
        document.getElementById('transicao-musica').innerText = musica.titulo;
        document.getElementById('transicao-fotos').innerHTML = htmlFotos;
        
        divTransicao.classList.remove('escondido');
        
        let contagem = 5;
        document.getElementById('transicao-contador').innerText = contagem;
        
        intervaloContador = setInterval(() => {
            contagem--;
            document.getElementById('transicao-contador').innerText = contagem;
            if(contagem <= 0) clearInterval(intervaloContador);
        }, 1000);

        timerTransicao = setTimeout(() => {
            divTransicao.classList.add('escondido');
            playerVideo.play().catch(e => console.log("Autoplay bloqueado pelo navegador."));
        }, 5000);
    }

    atualizarDashboard();
}

function minimizarPalco() {
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); }
    telaPalcoOverlay.classList.add('minimizado');
    atualizarDashboard(); 
}

function maximizarPalco() {
    telaPalcoOverlay.classList.remove('minimizado');
    atualizarDashboard(); 
}

function encerrarPalco(forcarFechamento = false) {
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); }
    
    pararPrevia(); 
    clearInterval(intervaloContador);
    clearTimeout(timerTransicao);
    window.speechSynthesis.cancel();
    somAplauso.onended = null;
    
    playerVideo.pause();
    playerVideo.src = ""; 
    cantorAoVivo = null;
    cantor2AoVivo = null;
    musicaAoVivo = null;
    
    document.getElementById('tela-transicao-palco').classList.add('escondido');
    telaPalcoOverlay.classList.add('escondido');
    telaPalcoOverlay.classList.remove('minimizado');
    
    salvarDados(); // AVISA A NUVEM QUE O PALCO ESVAZIOU
    atualizarDashboard();
}

function abrirCabineVotacao() {
    if(!cantorAoVivo) { 
        mostrarAlerta("Ninguém está no palco agora!", "Palco Vazio", "fa-microphone-slash"); 
        return; 
    }
    
    document.getElementById('voto-musica').innerText = musicaAoVivo.titulo;
    
    const foto2Voto = document.getElementById('voto-foto-cantor-2');
    if(cantor2AoVivo) {
        document.getElementById('voto-nome-cantor').innerText = `${cantorAoVivo.nome} & ${cantor2AoVivo.nome}`;
        foto2Voto.src = cantor2AoVivo.foto;
        foto2Voto.classList.remove('escondido');
    } else {
        document.getElementById('voto-nome-cantor').innerText = cantorAoVivo.nome;
        foto2Voto.classList.add('escondido');
    }
    document.getElementById('voto-foto-cantor').src = cantorAoVivo.foto;
    document.getElementById('resultado-voto').innerText = "Aguardando seu voto...";

    mudarTela('tela-votacao');
}

function votar(nota) {
    let pontuou = false;
    if(cantorAoVivo && !cantorAoVivo.isGuest) { let c1 = perfisFamilia.find(p => String(p.id) === String(cantorAoVivo.id)); if(c1) { c1.pontos += nota; pontuou = true; } }
    if(cantor2AoVivo && !cantor2AoVivo.isGuest) { let c2 = perfisFamilia.find(p => String(p.id) === String(cantor2AoVivo.id)); if(c2) { c2.pontos += nota; pontuou = true; } }

    if(pontuou) salvarDados(); 

    const frases = { 1: "Piedade... 💀", 5: "Dá pra melhorar! 🎤", 8: "Mandou bem! 🔥", 10: "ESTRELA NASCEU! 🌟" };
    let comentario = frases[nota] || "Nota registrada!";
    if(!pontuou) { comentario = "Nota dada! (Visitante não pontua)"; }
    
    const divAlertaPalco = document.getElementById('alerta-nota-palco');
    
    if(nota === 10) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#ff2a7a', '#00e5ff', '#ffd700'] });
        somAplauso.currentTime = 0;
        somAplauso.play().catch(() => {});
        
        document.getElementById('resultado-voto').innerHTML = `<span class="fade-in" style="color: gold; text-shadow: 0 0 10px gold;">⭐ NOTA 10! ${comentario}</span>`;
        divAlertaPalco.innerHTML = `⭐ NOTA 10 DA PLATEIA! ⭐`;
        divAlertaPalco.classList.remove('escondido');
    } else {
        document.getElementById('resultado-voto').innerHTML = `<span class="fade-in">Voto: +${nota} - ${comentario}</span>`;
        divAlertaPalco.innerHTML = `+${nota} PONTOS!`;
        divAlertaPalco.classList.remove('escondido');
    }

    setTimeout(() => { divAlertaPalco.classList.add('escondido'); }, 3000);
}

playerVideo.addEventListener('ended', () => {
    somAplauso.currentTime = 0;
    somAplauso.play().catch(() => {});

    if (filaDeReproducao.length > 0) {
        if (telaPalcoOverlay.classList.contains('minimizado')) { maximizarPalco(); }

        const proximo = filaDeReproducao[0];
        
        let eOMesmoCantor = false;
        if (cantorAoVivo) {
            let atualIds = cantorAoVivo.id + (cantor2AoVivo ? "_" + cantor2AoVivo.id : "");
            let proximoIds = proximo.cantor.id + (proximo.cantor2 ? "_" + proximo.cantor2.id : "");
            let atualInvertido = (cantor2AoVivo ? cantor2AoVivo.id + "_" : "") + cantorAoVivo.id;
            if (atualIds === proximoIds || atualInvertido === proximoIds) { eOMesmoCantor = true; }
        }

        removerDaFila(proximo.instanciaId); 

        let nomeAnuncio = proximo.cantor.nome;
        if(proximo.cantor2) { nomeAnuncio += ` e ${proximo.cantor2.nome}`; }
        
        const divTransicao = document.getElementById('tela-transicao-palco');
        document.getElementById('transicao-nome').innerText = nomeAnuncio;
        document.getElementById('transicao-musica').innerText = proximo.titulo;
        
        let htmlFotos = `<img src="${proximo.cantor.foto}" class="foto-transicao">`;
        if (proximo.cantor2) { htmlFotos += `<img src="${proximo.cantor2.foto}" class="foto-transicao foto-sobreposta-palco">`; }
        document.getElementById('transicao-fotos').innerHTML = htmlFotos;
        divTransicao.classList.remove('escondido');
        
        let contagem = 20;
        document.getElementById('transicao-contador').innerText = contagem;
        
        intervaloContador = setInterval(() => {
            contagem--;
            document.getElementById('transicao-contador').innerText = contagem;
            if(contagem <= 0) clearInterval(intervaloContador);
        }, 1000);

        somAplauso.onended = () => {
            if (!eOMesmoCantor) {
                let textoVoz = `Atenção! Próximo cantor no palco: ${nomeAnuncio}. Preparem-se!`;
                const voz = new SpeechSynthesisUtterance(textoVoz);
                voz.lang = 'pt-BR'; 
                voz.pitch = 0.8; 
                voz.rate = 1.1;  
                window.speechSynthesis.speak(voz);
            }
            somAplauso.onended = null; 
        };

        timerTransicao = setTimeout(() => {
            divTransicao.classList.add('escondido');
            perfilAtual = proximo.cantor; 
            irParaPalco(proximo.id, proximo.cantor2, true); 
        }, 20000);

    } else {
        const divAlerta = document.getElementById('alerta-nota-palco');
        divAlerta.innerHTML = `Fim do Show! O palco está livre.`;
        divAlerta.classList.remove('escondido');
        
        timerTransicao = setTimeout(() => {
            divAlerta.classList.add('escondido');
            encerrarPalco();
        }, 5000);
    }
});

// ============================================================================
// SISTEMA DE INSTALAÇÃO DO APLICATIVO (PWA)
// ============================================================================
let promptDeInstalacao;
const btnInstalar = document.getElementById('btn-instalar-app');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptDeInstalacao = e;
    if (btnInstalar) btnInstalar.classList.remove('escondido');
});

if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
        if (promptDeInstalacao) {
            promptDeInstalacao.prompt();
            const { outcome } = await promptDeInstalacao.userChoice;
            if (outcome === 'accepted') {
                console.log('App instalado com sucesso!');
                btnInstalar.classList.add('escondido');
            }
            promptDeInstalacao = null;
        }
    });
}

window.addEventListener('appinstalled', () => {
    if (btnInstalar) btnInstalar.classList.add('escondido');
});

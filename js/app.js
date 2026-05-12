// ============================================================================
// ☁️ CONFIGURAÇÃO DO FIREBASE (DADOS EM TEMPO REAL)
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
// SISTEMA DE ALERTAS E UTILITÁRIOS
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
// LÓGICA DE SALAS (FIREBASE)
// ============================================================================
db.ref('salas_abertas').on('value', snapshot => {
    salasCriadas = snapshot.val() || [];
    if (!salaAtual) renderizarLobbySalas();
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
            mostrarAlerta("Já existe uma sala com esse nome!", "Atenção", "fa-circle-xmark");
            return;
        }
        salasCriadas.push({ nome: nome, senha: senha !== "" ? senha : null });
        salvarListaSalasGlobais(); 
        efetivarEntradaSala(nome);
    }
}

function tentarEntrarSala(nomeBusca) {
    const salaExiste = salasCriadas.find(s => s.nome.toLowerCase() === nomeBusca.toLowerCase());
    if(salaExiste) {
        if(salaExiste.senha) {
            salaSelecionadaTemp = salaExiste;
            document.getElementById('input-senha-acesso').value = '';
            document.getElementById('modal-senha').classList.remove('escondido');
        } else {
            efetivarEntradaSala(salaExiste.nome);
        }
    }
}

function verificarSenha() {
    const senhaDigitada = document.getElementById('input-senha-acesso').value.trim();
    if(senhaDigitada === salaSelecionadaTemp.senha) {
        efetivarEntradaSala(salaSelecionadaTemp.nome);
        fecharModalSenha();
    } else {
        mostrarAlerta("Senha Incorreta!", "Erro", "fa-lock");
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
    if (refSalaAtual) refSalaAtual.off();
    salaAtual = null;
    localStorage.removeItem('karaoke_sala_ativa');
    document.getElementById('bottom-bar').classList.add('escondido');
    mudarTela('tela-salas');
    renderizarLobbySalas(); 
}

function entrarNoSistema() {
    renderizarSeletorAvatares();
    renderizarCategorias();
    prepararLista(catalogoMusicas);
    refSalaAtual = db.ref('dados_salas/' + salaAtual);
    refSalaAtual.on('value', snapshot => {
        const dados = snapshot.val() || {};
        perfisFamilia = dados.perfis || [];
        filaDeReproducao = dados.fila || [];
        historicoTocadas = dados.historico || {};
        const idSalvo = localStorage.getItem('karaoke_perfil_atual_id');
        if (idSalvo) perfilAtual = perfisFamilia.find(p => p.id == idSalvo) || perfilAtual;
        renderizarPerfis();
        atualizarPerfilGlobal();
        atualizarFilaUI();
        if(document.getElementById('tela-dashboard').classList.contains('ativa')) atualizarDashboard();
        if(document.getElementById('tela-ranking').classList.contains('ativa')) renderizarRanking();
    });
    if (!perfilAtual) perfilAtual = { id: 'visitante', nome: "Visitante", foto: listaURLsAvatares[0], pontos: 0, isGuest: true };
    document.getElementById('badge-nome-sala').innerHTML = `<i class="fa-solid fa-door-open"></i> Sala: <strong>${salaAtual}</strong> <i class="fa-solid fa-right-from-bracket" onclick="sairDaSala()" style="cursor:pointer; margin-left:10px;"></i>`;
    document.getElementById('bottom-bar').classList.remove('escondido');
    mudarTela('tela-dashboard', navItems[0]); 
}

function salvarDados() {
    if (!salaAtual || !refSalaAtual) return; 
    refSalaAtual.set({ perfis: perfisFamilia, fila: filaDeReproducao, historico: historicoTocadas });
    if (perfilAtual && !perfilAtual.isGuest) localStorage.setItem('karaoke_perfil_atual_id', perfilAtual.id);
}

// ============================================================================
// NAVEGAÇÃO E PLAYER
// ============================================================================
function mudarTela(idTelaAlvo, elementoNav = null) {
    pararPrevia(); 
    telas.forEach(tela => tela.classList.remove('ativa'));
    document.getElementById(idTelaAlvo).classList.add('ativa');
    if(elementoNav) {
        navItems.forEach(item => item.classList.remove('ativo'));
        elementoNav.classList.add('ativo');
    }
    window.scrollTo(0, 0); 
}

function tocarPrevia(idMusica) {
    if (musicaPreviaAtualId === idMusica && !playerPrevia.paused) { pararPrevia(); return; }
    pararPrevia(); 
    const musica = catalogoMusicas.find(m => m.id === idMusica);
    const btn = document.getElementById(`btn-previa-${idMusica}`);
    if(btn) btn.innerHTML = '<i class="fa-solid fa-circle-stop"></i>';
    // Puxa prévia do R2
    playerPrevia.src = `${urlNuvemR2}/${musica.arquivo}`;
    playerPrevia.onloadedmetadata = () => { playerPrevia.currentTime = 30; playerPrevia.play(); };
    musicaPreviaAtualId = idMusica;
    previewTimer = setTimeout(pararPrevia, 30000);
}

function pararPrevia() {
    playerPrevia.pause();
    if (musicaPreviaAtualId) {
        const btn = document.getElementById(`btn-previa-${musicaPreviaAtualId}`);
        if(btn) btn.innerHTML = '<i class="fa-solid fa-headphones"></i>';
    }
    musicaPreviaAtualId = null;
    clearTimeout(previewTimer);
}

// ============================================================================
// GESTÃO DE CANTORES E FILA
// ============================================================================
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
    const nome = document.getElementById('input-novo-perfil').value.trim();
    if (nome) {
        const novo = { id: Date.now(), nome: nome, foto: avatarSelecionadoCriacao, pontos: 0, isGuest: false };
        perfisFamilia.push(novo);
        perfilAtual = novo;
        salvarDados();
        document.getElementById('input-novo-perfil').value = "";
        mostrarAlerta("Perfil criado!", "Sucesso", "fa-check");
    }
}

function entrarComoConvidado() {
    const nome = document.getElementById('input-convidado').value.trim();
    if (nome) {
        perfilAtual = { id: 'conv_'+Date.now(), nome: nome + " (Convidado)", foto: listaURLsAvatares[1], pontos: 0, isGuest: true };
        atualizarPerfilGlobal();
        mudarTela('tela-playlist', navItems[1]);
    }
}

function renderizarPerfis() {
    const lista = document.getElementById('lista-perfis');
    lista.innerHTML = '';
    perfisFamilia.forEach(p => {
        const div = document.createElement('div');
        div.className = `card-perfil ${perfilAtual?.id === p.id ? 'ativo' : ''}`;
        div.innerHTML = `<img src="${p.foto}" class="foto-perfil"><span>${p.nome}</span>`;
        div.onclick = () => { perfilAtual = p; salvarDados(); };
        lista.appendChild(div);
    });
}

function atualizarPerfilGlobal() {
    if(perfilAtual) document.getElementById('dash-foto-perfil').src = perfilAtual.foto;
}

// ============================================================================
// CATÁLOGO E FILTRO
// ============================================================================
function renderizarCategorias() {
    const container = document.getElementById('container-categorias');
    const categorias = ["Todas", ...new Set(catalogoMusicas.map(m => m.categoria))];
    container.innerHTML = '';
    categorias.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `btn-categoria ${cat === categoriaAtual ? 'ativo' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => { categoriaAtual = cat; renderizarCategorias(); filtrarMusicas(); };
        container.appendChild(btn);
    });
}

function filtrarMusicas() {
    const termo = document.getElementById('input-busca').value.toLowerCase();
    const filtradas = catalogoMusicas.filter(m => 
        (m.titulo.toLowerCase().includes(termo) || m.artista.toLowerCase().includes(termo)) &&
        (categoriaAtual === "Todas" || m.categoria === categoriaAtual)
    );
    prepararLista(filtradas);
}
document.getElementById('input-busca').addEventListener('input', filtrarMusicas);

function prepararLista(musicas) {
    musicasAtuaisFiltradas = musicas;
    mudarPagina(1);
}

function mudarPagina(num) {
    const total = Math.ceil(musicasAtuaisFiltradas.length / musicasPorPagina);
    if (num < 1) num = 1; if (num > total) num = total;
    paginaAtual = num;
    const inicio = (num - 1) * musicasPorPagina;
    renderizarMusicas(musicasAtuaisFiltradas.slice(inicio, inicio + musicasPorPagina));
    renderizarControlesPaginacao(total);
}

function renderizarControlesPaginacao(total) {
    const container = document.getElementById('paginacao-container');
    if (total <= 1) { container.innerHTML = ''; return; }
    container.innerHTML = `
        <button class="btn-pagina" onclick="mudarPagina(${paginaAtual - 1})"><i class="fa-solid fa-chevron-left"></i></button>
        <span class="info-pagina">${paginaAtual} / ${total}</span>
        <button class="btn-pagina" onclick="mudarPagina(${paginaAtual + 1})"><i class="fa-solid fa-chevron-right"></i></button>
    `;
}

function renderizarMusicas(musicas) {
    const container = document.getElementById('lista-musicas');
    container.innerHTML = '';
    musicas.forEach(m => {
        const div = document.createElement('div');
        div.className = 'card-musica';
        div.innerHTML = `
            <div class="info-musica"><strong>${m.titulo}</strong><br><small>${m.artista}</small></div>
            <div class="botoes-card">
                <button class="btn-acao btn-previa" id="btn-previa-${m.id}" onclick="tocarPrevia(${m.id})"><i class="fa-solid fa-headphones"></i></button>
                <button class="btn-acao btn-fila" onclick="adicionarFila(${m.id})"><i class="fa-solid fa-plus"></i></button>
                <button class="btn-acao btn-cantar" onclick="irParaPalco(${m.id})">Cantar</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function adicionarFila(id, parceiro = null) {
    if(!perfilAtual) { mostrarAlerta("Se identifique primeiro!"); return; }
    const musica = catalogoMusicas.find(m => m.id === id);
    filaDeReproducao.push({ ...musica, cantor: perfilAtual, cantor2: parceiro, instanciaId: Date.now() });
    salvarDados();
    mostrarAlerta(`${musica.titulo} na fila!`);
}

function atualizarFilaUI() {
    const container = document.getElementById('lista-fila');
    container.innerHTML = '';
    if (filaDeReproducao.length === 0) { container.innerHTML = '<p>Palco livre!</p>'; return; }
    filaDeReproducao.forEach((m, i) => {
        const div = document.createElement('div');
        div.className = 'item-fila-grande';
        div.innerHTML = `
            <div class="fila-rank">${i+1}º</div>
            <div class="fila-info-textos"><strong>${m.cantor.nome}</strong><br>${m.titulo}</div>
            <div class="fila-acoes">
                <button class="btn-acao btn-cantar" onclick="irParaPalco(${m.id}, null, true, ${m.instanciaId})"><i class="fa-solid fa-play"></i></button>
                <button class="btn-remover" onclick="removerFila(${m.instanciaId})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

function removerFila(id) {
    filaDeReproducao = filaDeReproducao.filter(m => m.instanciaId !== id);
    salvarDados();
}

// ============================================================================
// PALCO E VOTAÇÃO
// ============================================================================
function irParaPalco(idMusica, parceiro = null, daFila = false, idInstancia = null) {
    const musica = catalogoMusicas.find(m => m.id === idMusica);
    if(daFila) removerFila(idInstancia);
    
    cantorAoVivo = perfilAtual;
    musicaAoVivo = musica;
    
    document.getElementById('titulo-atual').innerText = musica.titulo;
    document.getElementById('artista-atual').innerText = musica.artista;
    document.getElementById('palco-nome-cantor').innerText = perfilAtual.nome;
    document.getElementById('palco-foto-cantor').src = perfilAtual.foto;

    telaPalcoOverlay.classList.remove('escondido');
    // PUXA DO R2
    playerVideo.src = `${urlNuvemR2}/${musica.arquivo}`;
    playerVideo.play();
    
    historicoTocadas[idMusica] = (historicoTocadas[idMusica] || 0) + 1;
    salvarDados();
}

function minimizarPalco() { telaPalcoOverlay.classList.add('minimizado'); }
function maximizarPalco() { telaPalcoOverlay.classList.remove('minimizado'); }
function encerrarPalco() { 
    playerVideo.pause(); playerVideo.src = ""; 
    telaPalcoOverlay.classList.add('escondido'); 
    cantorAoVivo = null; 
}

function abrirCabineVotacao() {
    document.getElementById('voto-nome-cantor').innerText = cantorAoVivo.nome;
    document.getElementById('voto-musica').innerText = musicaAoVivo.titulo;
    document.getElementById('voto-foto-cantor').src = cantorAoVivo.foto;
    mudarTela('tela-votacao');
}

function votar(nota) {
    const c = perfisFamilia.find(p => p.id === cantorAoVivo.id);
    if(c) c.pontos += nota;
    salvarDados();
    mostrarAlerta("Voto registrado!");
    mudarTela('tela-dashboard', navItems[0]);
}

// ============================================================================
// DASHBOARD E RANKING
// ============================================================================
function atualizarDashboard() {
    document.getElementById('dash-qtd-musicas').innerText = catalogoMusicas.length;
    document.getElementById('dash-qtd-cantores').innerText = perfisFamilia.length;
    
    const container = document.getElementById('dash-top-cantores');
    const tops = [...perfisFamilia].sort((a,b) => b.pontos - a.pontos).slice(0,5);
    container.innerHTML = '';
    tops.forEach((p, i) => {
        container.innerHTML += `<div class="item-rank"><span>${i+1}º ${p.nome}</span> <span>${p.pontos} pts</span></div>`;
    });
}

function renderizarRanking() {
    const container = document.getElementById('lista-ranking-completa');
    const ordenados = [...perfisFamilia].sort((a,b) => b.pontos - a.pontos);
    container.innerHTML = '';
    ordenados.forEach((p, i) => {
        container.innerHTML += `<div class="item-rank"><span>${i+1}º ${p.nome}</span> <span>${p.pontos} pts</span></div>`;
    });
}

// ============================================================================
// INICIALIZAÇÃO E PWA
// ============================================================================
window.onload = () => {
    const salva = localStorage.getItem('karaoke_sala_ativa');
    if(salva) { salaAtual = salva; entrarNoSistema(); }
};

let promptInstalacao;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptInstalacao = e;
    document.getElementById('btn-instalar-app').classList.remove('escondido');
});

document.getElementById('btn-instalar-app').addEventListener('click', () => {
    if(promptInstalacao) promptInstalacao.prompt();
});

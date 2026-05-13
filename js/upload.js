// ============================================================================
// 📸 SISTEMA DE UPLOAD DE FOTO DE PERFIL (COMPRESSÃO BASE64)
// ============================================================================

const inputFoto = document.getElementById('input-foto-perfil');
const btnUpload = document.getElementById('btn-upload-foto');

if (btnUpload && inputFoto) {
    // 1. O clique no botão bonito abre a galeria do celular
    btnUpload.addEventListener('click', () => {
        inputFoto.click();
    });

    // 2. Quando o usuário escolhe a foto na galeria
    inputFoto.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;

        mostrarAlerta("Processando a sua foto...", "Aguarde", "fa-spinner fa-spin");

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // 3. A MÁGICA: Comprime a imagem para não travar o Firebase
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 200; // Tamanho ideal para as miniaturas
                const MAX_HEIGHT = 200;
                let width = img.width;
                let height = img.height;

                // Calcula a proporção exata para não distorcer a foto
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Converte para texto leve (Base64 JPEG com 80% de qualidade)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

                // 4. Injeta a foto na nossa variável global do app.js
                avatarSelecionadoCriacao = dataUrl;

                // 5. Mostra a foto no painel para o usuário ver que deu certo
                const container = document.getElementById('seletor-avatares');
                const imgUpload = document.createElement('img');
                imgUpload.src = dataUrl;
                imgUpload.classList.add('avatar-opcao', 'selecionado');
                
                // Tira a borda rosa dos outros avatares
                document.querySelectorAll('.avatar-opcao').forEach(el => el.classList.remove('selecionado'));
                
                // Coloca a foto real em primeiro lugar na lista
                container.prepend(imgUpload);

                fecharModalAlerta();
                mostrarAlerta("Foto pronta! Agora digite seu nome e salve.", "Sucesso", "fa-image");
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

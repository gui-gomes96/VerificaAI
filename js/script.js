let memoriaConversa = [];
let usuarioAtual = "Visitante";

// --- SISTEMA DE USUÁRIO E MEMÓRIA LOCAL ---
function carregarUsuario() {
    const inputNome = document.getElementById("nomeUsuario");
    const ultimoUsuario = localStorage.getItem("verifica_ai_ultimo_user") || "Visitante";
    inputNome.value = ultimoUsuario === "Visitante" ? "" : ultimoUsuario;
    trocarUsuario();
}

function verificarEnterUsuario(event) {
    if (event.key === 'Enter') {
        document.getElementById("nomeUsuario").blur();
    }
}

function trocarUsuario() {
    const inputNome = document.getElementById("nomeUsuario").value.trim();
    usuarioAtual = inputNome !== "" ? inputNome : "Visitante";
    
    localStorage.setItem("verifica_ai_ultimo_user", usuarioAtual);
    
    const conversaSalva = localStorage.getItem(`verifica_ai_chat_${usuarioAtual}`);
    if (conversaSalva) {
        memoriaConversa = JSON.parse(conversaSalva);
    } else {
        memoriaConversa = [];
    }
    
    renderizarChat();
}

function salvarConversaNoNavegador() {
    localStorage.setItem(`verifica_ai_chat_${usuarioAtual}`, JSON.stringify(memoriaConversa));
}

function renderizarChat() {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.innerHTML = `
        <div class="message ai">
            Olá, <strong>${usuarioAtual}</strong>! Sou o agente investigador do VERIFICA.AI. Digite o que você quer checar ou clique no microfone para falar comigo!
        </div>
    `;
    
    memoriaConversa.forEach(msg => {
        if (msg.role === 'user') {
            chatContainer.innerHTML += `<div class="message user history">${msg.content}</div>`;
        } else if (msg.role === 'assistant') {
            chatContainer.innerHTML += `<div class="message ai history">${formatarTextoIA(msg.content)}</div>`;
        }
    });
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function limparConversa() {
    memoriaConversa = [];
    salvarConversaNoNavegador();
    renderizarChat();
}

// --- MICROFONE: ENTRADA DE VOZ ---
function iniciarReconhecimentoVoz() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Seu navegador não suporta reconhecimento de voz nativo. Use o Google Chrome no PC ou celular.");
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.start();
    
    const btnVoz = document.getElementById("btnVoz");
    btnVoz.classList.add("gravando");
    btnVoz.innerText = "🔴";
    
    recognition.onresult = function(event) {
        const transcricao = event.results[0][0].transcript;
        document.getElementById("campoTexto").value = transcricao;
        
        // Dispara o envio logo após reconhecer a voz
        setTimeout(enviarMensagem, 600); 
    };
    
    recognition.onend = function() {
        btnVoz.classList.remove("gravando");
        btnVoz.innerText = "🎙️";
    };
}

// --- EFEITO MÁQUINA DE ESCREVER ---
function efeitoDigitacaoSeguro(elementoHtml, htmlCompleto, velocidade, callback) {
    let i = 0;
    let isTag = false;
    let textoAtual = "";
    
    function digitar() {
        if (i < htmlCompleto.length) {
            let char = htmlCompleto.charAt(i);
            textoAtual += char;
            elementoHtml.innerHTML = textoAtual;
            
            if (char === '<') isTag = true;
            if (char === '>') isTag = false;
            
            i++;
            
            if (isTag) {
                digitar(); // Não faz pausa no meio de tags HTML (<br>, <strong>)
            } else {
                setTimeout(digitar, velocidade);
            }
        } else {
            if (callback) callback();
        }
    }
    digitar();
}

// --- RESPOSTAS RÁPIDAS (CHIPS) ---
function adicionarRespostasRapidas() {
    const chatContainer = document.getElementById('chatContainer');
    const idSugestoes = 'sugestoes-' + Date.now();
    
    chatContainer.innerHTML += `
        <div id="${idSugestoes}" class="quick-replies">
            <button class="btn-quick" onclick="usarSugestao('Resuma a avaliação em uma linha, por favor.', '${idSugestoes}')">Resumir</button>
            <button class="btn-quick" onclick="usarSugestao('O que significa o modelo SVM que você usa?', '${idSugestoes}')">O que é SVM?</button>
            <button class="btn-quick" onclick="usarSugestao('Obrigado pela análise!', '${idSugestoes}')">Obrigado</button>
        </div>
    `;
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function usarSugestao(texto, idParaRemover) {
    document.getElementById(idParaRemover).remove();
    document.getElementById("campoTexto").value = texto;
    enviarMensagem();
}

// --- GERAÇÃO DE PDF OTIMIZADA ---
function baixarLaudoPDF(idMensagem) {
    const elementoOriginal = document.getElementById(idMensagem);
    const elementoClone = elementoOriginal.cloneNode(true);
    
    const botaoPdf = elementoClone.querySelector('.btn-pdf');
    if (botaoPdf) botaoPdf.remove();

    const detalhes = elementoClone.querySelectorAll('details');
    detalhes.forEach(detalhe => detalhe.setAttribute('open', 'true'));

    elementoClone.style.padding = '20px';
    elementoClone.style.backgroundColor = '#0f172a'; 
    elementoClone.style.color = '#f8fafc';
    elementoClone.style.width = '100%';
    elementoClone.style.maxWidth = '800px'; 
    elementoClone.style.boxSizing = 'border-box';
    elementoClone.style.borderRadius = '0'; 

    const cabecalho = document.createElement('div');
    const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    cabecalho.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="color: #38bdf8; margin: 0; font-size: 22px; text-transform: uppercase;">🤖 VERIFICA.AI - Laudo Oficial</h2>
            <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0 0;">Pesquisa gerada por: ${usuarioAtual} | Data: ${dataAtual}</p>
        </div>
    `;
    elementoClone.insertBefore(cabecalho, elementoClone.firstChild);

    const divTemporaria = document.createElement('div');
    divTemporaria.style.position = 'absolute';
    divTemporaria.style.left = '-9999px';
    divTemporaria.appendChild(elementoClone);
    document.body.appendChild(divTemporaria);

    const opcoes = {
        margin:       15,
        filename:     `Laudo_VerificaAI_${usuarioAtual}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 2, backgroundColor: '#0f172a', useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opcoes).from(elementoClone).save().then(() => {
        document.body.removeChild(divTemporaria);
    });
}

function checarEnter(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        enviarMensagem();
    }
}

function formatarTextoIA(texto) {
    return texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

async function enviarMensagem() {
    const campo = document.getElementById('campoTexto');
    const texto = campo.value.trim();
    const chatContainer = document.getElementById('chatContainer');
    const botao = document.getElementById('btnEnviar');

    if (!texto) return;

    chatContainer.innerHTML += `<div class="message user">${texto}</div>`;
    campo.value = '';
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const idTemp = 'msg-' + Date.now();
    chatContainer.innerHTML += `<div class="message ai pensando" id="${idTemp}">⏳ [01s] Iniciando triagem...</div>`;
    chatContainer.scrollTop = chatContainer.scrollHeight;
    botao.disabled = true;

    let segundos = 1;
    const timerInterval = setInterval(() => {
        segundos++;
        const elementoPensando = document.getElementById(idTemp);
        if (elementoPensando) {
            let statusTexto = "⏳ Analisando...";
            if (segundos === 2) statusTexto = "🔍 Consultando fontes na web...";
            if (segundos === 4) statusTexto = "📊 Rodando modelo estatístico SVM...";
            if (segundos === 6) statusTexto = "🤖 Cruzando matemática com realidade...";
            if (segundos >= 8) statusTexto = "⚡ Finalizando veredito...";
            elementoPensando.innerHTML = `${statusTexto} (${segundos}s)`;
        }
    }, 1000);

    try {
        const resposta = await fetch("http://127.0.0.1:8000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensagem: texto, historico: memoriaConversa })
        });

        const dados = await resposta.json();
        clearInterval(timerInterval);

        const msgElemento = document.getElementById(idTemp);
        msgElemento.classList.remove('pensando');
        msgElemento.innerHTML = ""; // Limpa a ampulheta

        memoriaConversa.push({ role: "user", content: texto });
        memoriaConversa.push({ role: "assistant", content: dados.texto });
        salvarConversaNoNavegador();

        if (dados.origem === "agente_dialogo" || dados.origem === "erro") {
            // Efeito de digitação também na conversa normal
            efeitoDigitacaoSeguro(msgElemento, formatarTextoIA(dados.texto), 15, () => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
                adicionarRespostasRapidas();
            });
        } 
        else if (dados.origem === "agente_verificacao") {
            const ml = dados.dados_ml;
            const idTextoPrincipal = 'txt-' + Date.now();
            const idPainelOculto = 'painel-' + Date.now();
            
            let htmlAlertaErro = '';
            if (dados.modelo_errou) {
                const corFato = dados.fato_real === "VERDADEIRO" ? "#22c55e" : (dados.fato_real === "FALSO" ? "#ef4444" : "#eab308");
                htmlAlertaErro = `
                    <div style="background-color: #450a0a; border-left: 5px solid #ef4444; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
                        <h3 style="color: #fca5a5; margin: 0 0 12px 0; font-size: 15px;">⚠️ ALERTA: O MODELO ESTATÍSTICO SE CONFUNDIU!</h3>
                        <div style="margin-bottom: 12px;">
                            <span style="background-color: ${corFato}; color: #fff; padding: 6px 10px; border-radius: 4px; font-weight: bold; font-size: 13px;">FATO REAL: ${dados.fato_real}</span>
                        </div>
                        <p style="color: #f8fafc; font-size: 13px; margin: 0;"><strong>Por que a máquina errou?</strong> ${formatarTextoIA(dados.motivo_erro)}</p>
                    </div>
                `;
            }
            
            let htmlFontes = '';
            if (ml.fontes_lista && ml.fontes_lista.length > 0) {
                const itensLista = ml.fontes_lista.map(fonte => {
                    const textoFonte = typeof fonte === 'object' ? JSON.stringify(fonte) : fonte;
                    return `<li style="margin-bottom: 6px;">${textoFonte}</li>`;
                }).join('');

                htmlFontes = `<details style="margin-top: 12px; background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155;"><summary style="cursor: pointer; color: #38bdf8; font-weight: bold; font-size: 13px; outline: none;">🔍 Ver Fontes de Notícias Coletadas (${ml.fontes_cruzadas})</summary><ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 11px; color: #cbd5e1; line-height: 1.4;">${itensLista}</ul></details>`;
            }

            const htmlDetalhesTecnicos = `<details style="margin-top: 8px; background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155;"><summary style="cursor: pointer; color: #4ade80; font-weight: bold; font-size: 13px; outline: none;">⚙️ Ver Detalhes do Pipeline (Transparência Técnica)</summary><div style="margin-top: 10px; font-size: 11px; color: #cbd5e1; line-height: 1.5; font-family: monospace;">• <strong>Modelo Estatístico:</strong> SVM (TF-IDF Vectorizer)<br>• <strong>Score Verdadeiro (Matemático):</strong> ${ml.verdadeiro}%<br>• <strong>Score Falso (Matemático):</strong> ${ml.falso}%<br>• <strong>Agente de Contexto:</strong> Groq API (Llama 3)<br>• <strong>Web Scraping:</strong> Google News RSS Parser Ativo</div></details>`;

            // O container do laudo é criado, mas o painel técnico fica escondido durante a digitação
            msgElemento.innerHTML = `
                ${htmlAlertaErro}
                <div id="${idTextoPrincipal}" style="margin-bottom: 10px;"></div>
                
                <div id="${idPainelOculto}" style="display: none;">
                    <div class="termometro">
                        <div class="stat-item"><span>Veracidade (SVM)</span><strong style="color: #4ade80;">${ml.verdadeiro}%</strong></div>
                        <div class="stat-item"><span>Fake (SVM)</span><strong style="color: #f87171;">${ml.falso}%</strong></div>
                    </div>
                    ${htmlFontes}
                    ${htmlDetalhesTecnicos}
                    
                    <button class="btn-pdf" onclick="baixarLaudoPDF('${idTemp}')" style="margin-top: 15px; width: 100%; background-color: #ef4444; color: white; padding: 10px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer;">📄 Baixar Laudo Oficial em PDF</button>
                    
                    <!-- NOVO: Sistema de Feedback de Qualidade -->
                    <div class="feedback-area">
                        <span style="font-size: 12px; color: #94a3b8;">Avalie a precisão desta análise:</span>
                        <button class="btn-feedback" onclick="this.innerHTML='✅'; this.style.opacity='1';" title="Foi preciso!">👍</button>
                        <button class="btn-feedback" onclick="this.innerHTML='❌'; this.style.opacity='1';" title="Não concordei">👎</button>
                    </div>
                </div>
            `;

            const divTextoPrincipal = document.getElementById(idTextoPrincipal);
            const divPainelOculto = document.getElementById(idPainelOculto);

            // Inicia o efeito de Máquina de Escrever apenas no texto do veredito
            efeitoDigitacaoSeguro(divTextoPrincipal, formatarTextoIA(dados.texto), 10, () => {
                // Quando terminar de digitar a última letra, exibe o painel técnico, os botões e rola a tela
                divPainelOculto.style.display = 'block';
                chatContainer.scrollTop = chatContainer.scrollHeight;
                adicionarRespostasRapidas();
            });
        }

    } catch (erro) {
        clearInterval(timerInterval);
        const msgElemento = document.getElementById(idTemp);
        if (msgElemento) {
            msgElemento.classList.remove('pensando');
            msgElemento.innerHTML = `❌ Erro de conexão com o servidor local. Verifique se o Uvicorn está rodando.`;
        }
    } finally {
        botao.disabled = false;
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}
const API_BASE_URL = "http://127.0.0.1:8000";
let memoriaConversa = [];
let usuarioAtual = "Visitante";

document.addEventListener("DOMContentLoaded", () => {
    verificarStatusAPI();
});

async function verificarStatusAPI() {
    const badge = document.getElementById("statusApi");
    if (!badge) return;

    try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (!res.ok) throw new Error("Offline");
        const dados = await res.json();

        badge.className = "status-badge online";
        badge.innerText = dados.svm_carregado ? "● API + SVM Online" : "● API Online (Sem SVM)";
    } catch {
        badge.className = "status-badge offline";
        badge.innerText = "● API Desconectada";
    }
}

function escaparHTML(texto) {
    if (!texto) return "";
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function formatarTextoIA(texto) {
    return escaparHTML(texto)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
}

function carregarUsuario() {
    const inputNome = document.getElementById("nomeUsuario");
    const ultimoUsuario = localStorage.getItem("verifica_ai_ultimo_user") || "Visitante";
    inputNome.value = ultimoUsuario === "Visitante" ? "" : ultimoUsuario;
    trocarUsuario();
}

function verificarEnterUsuario(event) {
    if (event.key === "Enter") {
        document.getElementById("nomeUsuario").blur();
    }
}

function trocarUsuario() {
    const inputNome = document.getElementById("nomeUsuario").value.trim();
    usuarioAtual = inputNome !== "" ? inputNome : "Visitante";
    localStorage.setItem("verifica_ai_ultimo_user", usuarioAtual);

    const conversaSalva = localStorage.getItem(`verifica_ai_chat_${usuarioAtual}`);
    memoriaConversa = conversaSalva ? JSON.parse(conversaSalva) : [];
    renderizarChat();
}

function salvarConversaNoNavegador() {
    const recorte = memoriaConversa.slice(-25);
    localStorage.setItem(`verifica_ai_chat_${usuarioAtual}`, JSON.stringify(recorte));
}

function renderizarChat() {
    const chatContainer = document.getElementById("chatContainer");
    chatContainer.innerHTML = `
        <div class="message ai">
            Olá, <strong>${escaparHTML(usuarioAtual)}</strong>! Sou o agente investigador do VERIFICA.AI. Digite a afirmação que deseja checar ou use o microfone.
        </div>
    `;

    memoriaConversa.forEach((msg, index) => {
        if (msg.role === "user") {
            chatContainer.insertAdjacentHTML(
                "beforeend",
                `<div class="message user history">${escaparHTML(msg.content)}</div>`
            );
        } else if (msg.role === "assistant") {
            const idHist = `msg-hist-${index}`;
            if (msg.meta && (msg.meta.origem === "agente_verificacao" || msg.meta.origem === "fallback_estatistico")) {
                const htmlCard = construirHTMLTransparencia(msg.meta, idHist, formatarTextoIA(msg.content));
                chatContainer.insertAdjacentHTML(
                    "beforeend",
                    `<div class="message ai history" id="${idHist}">${htmlCard}</div>`
                );
            } else {
                chatContainer.insertAdjacentHTML(
                    "beforeend",
                    `<div class="message ai history" id="${idHist}">${formatarTextoIA(msg.content)}</div>`
                );
            }
        }
    });

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function limparConversa() {
    memoriaConversa = [];
    salvarConversaNoNavegador();
    renderizarChat();
}

function iniciarReconhecimentoVoz() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Seu navegador não suporta reconhecimento de voz nativo. Utilize o Google Chrome ou Edge.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.start();

    const btnVoz = document.getElementById("btnVoz");
    btnVoz.classList.add("gravando");
    btnVoz.innerText = "🔴";

    recognition.onresult = function (event) {
        const transcricao = event.results[0][0].transcript;
        document.getElementById("campoTexto").value = transcricao;
        setTimeout(enviarMensagem, 500);
    };

    recognition.onerror = function () {
        btnVoz.classList.remove("gravando");
        btnVoz.innerText = "🎙️";
    };

    recognition.onend = function () {
        btnVoz.classList.remove("gravando");
        btnVoz.innerText = "🎙️";
    };
}

function efeitoDigitacaoSeguro(elementoHtml, htmlCompleto, velocidade, callback) {
    let i = 0;
    let isTag = false;
    let textoAtual = "";

    function digitar() {
        if (i < htmlCompleto.length) {
            const char = htmlCompleto.charAt(i);
            textoAtual += char;
            elementoHtml.innerHTML = textoAtual;

            if (char === "<") isTag = true;
            if (char === ">") isTag = false;

            i++;
            if (isTag) {
                digitar();
            } else {
                setTimeout(digitar, velocidade);
            }
        } else if (callback) {
            callback();
        }
    }
    digitar();
}

function adicionarRespostasRapidas() {
    const chatContainer = document.getElementById("chatContainer");
    const idSugestoes = "sugestoes-" + Date.now();

    chatContainer.insertAdjacentHTML(
        "beforeend",
        `
        <div id="${idSugestoes}" class="quick-replies">
            <button type="button" class="btn-quick" onclick="usarSugestao('Resuma a avaliação em uma linha, por favor.', '${idSugestoes}')">Resumir</button>
            <button type="button" class="btn-quick" onclick="usarSugestao('Como funciona o cálculo do modelo SVM?', '${idSugestoes}')">O que é SVM?</button>
            <button type="button" class="btn-quick" onclick="usarSugestao('Obrigado pela análise!', '${idSugestoes}')">Obrigado</button>
        </div>
        `
    );
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function usarSugestao(texto, idParaRemover) {
    const el = document.getElementById(idParaRemover);
    if (el) el.remove();
    document.getElementById("campoTexto").value = texto;
    enviarMensagem();
}

function baixarLaudoPDF(idMensagem) {
    const elementoOriginal = document.getElementById(idMensagem);
    if (!elementoOriginal) {
        alert("Erro: Laudo não encontrado na tela.");
        return;
    }

    const clone = elementoOriginal.cloneNode(true);

    // Remove o botão de ação para não sair na folha
    const areaAcoes = clone.querySelector(".feedback-area");
    if (areaAcoes) areaAcoes.remove();

    // Abre o painel de auditoria do SVM e fontes para sair completo
    clone.querySelectorAll("details").forEach((d) => d.setAttribute("open", "true"));

    const dataAtual = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    });

    // Cria um iframe oculto (não ativa bloqueador de pop-up)
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Laudo_VerificaAI_${escaparHTML(usuarioAtual)}</title>
            <style>
                @page { size: A4; margin: 18mm; }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    color: #0f172a;
                    background: #ffffff;
                    line-height: 1.6;
                    margin: 0;
                    padding: 0;
                }
                .cabecalho-laudo {
                    border-bottom: 2px solid #0284c7;
                    padding-bottom: 12px;
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .cabecalho-laudo h1 {
                    margin: 0;
                    font-size: 20px;
                    color: #0284c7;
                    letter-spacing: 0.5px;
                }
                .cabecalho-laudo p {
                    margin: 4px 0 0 0;
                    font-size: 11px;
                    color: #475569;
                }
                .selo-fato {
                    display: inline-block;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-weight: bold;
                    font-size: 13px;
                    margin-bottom: 14px;
                    border: 1px solid #cbd5e1;
                }
                .selo-fato.verdadeiro { background: #dcfce7; color: #166534; border-color: #16a34a; }
                .selo-fato.falso { background: #fee2e2; color: #991b1b; border-color: #dc2626; }
                .selo-fato.inconclusivo { background: #fef3c7; color: #92400e; border-color: #d97706; }
                .texto-veredito {
                    font-size: 14px;
                    text-align: justify;
                    margin-bottom: 18px;
                }
                details.painel-transparencia {
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    padding: 12px;
                    background: #f8fafc;
                    page-break-inside: avoid;
                }
                details.painel-transparencia summary {
                    font-weight: bold;
                    color: #0f172a;
                    margin-bottom: 10px;
                    list-style: none;
                }
                .termometro {
                    display: flex;
                    justify-content: space-between;
                    gap: 10px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    padding: 10px;
                    border-radius: 6px;
                    margin-bottom: 10px;
                }
                .stat-item span { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; }
                .stat-item strong { font-size: 15px; }
                .alerta-divergencia {
                    padding: 10px;
                    background: #fffbeb;
                    border-left: 3px solid #f59e0b;
                    font-size: 12px;
                    color: #78350f;
                    margin-bottom: 10px;
                }
                .fontes-box { font-size: 12px; }
                .lista-fontes { margin: 6px 0 0 18px; padding: 0; }
                .lista-fontes li { margin-bottom: 4px; }
                .lista-fontes a { color: #0284c7; text-decoration: none; word-break: break-all; }
                .rodape-laudo {
                    margin-top: 25px;
                    padding-top: 10px;
                    border-top: 1px solid #e2e8f0;
                    font-size: 10px;
                    color: #64748b;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="cabecalho-laudo">
                <div>
                    <h1>VERIFICA.AI — LAUDO DE CHECAGEM</h1>
                    <p>Arquitetura Híbrida: IA Generativa + Machine Learning (SVM) + Busca Web</p>
                </div>
                <div style="text-align: right;">
                    <p><strong>Solicitante:</strong> ${escaparHTML(usuarioAtual)}</p>
                    <p><strong>Emissão:</strong> ${dataAtual}</p>
                </div>
            </div>
            ${clone.innerHTML}
            <div class="rodape-laudo">
                Documento gerado automaticamente pelo sistema VERIFICA.AI. Os índices estatísticos refletem a análise combinada do modelo SVM e das fontes indexadas na data de emissão.
            </div>
        </body>
        </html>
    `);
    doc.close();

    // Aguarda a renderização do iframe e abre a janela de salvar como PDF
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
}
function checarEnter(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        enviarMensagem();
    }
}

function construirHTMLTransparencia(dados, idCard, textoInicial = "") {
    const ml = dados.dados_ml || { verdadeiro: 50, falso: 50, fontes_cruzadas: 0, fontes_lista: [] };
    const classeSelo = dados.fato_real ? dados.fato_real.toLowerCase() : "inconclusivo";

    let alertaErroHTML = "";
    if (dados.modelo_errou) {
        alertaErroHTML = `
            <div class="alerta-divergencia">
                <strong>⚠️ Divergência Detectada no SVM:</strong> ${escaparHTML(dados.motivo_erro || "O modelo estatístico divergiu das evidências jornalísticas.")}
            </div>
        `;
    }

    let listaFontesHTML = "<p class='sem-fontes'>Nenhuma fonte externa indexada para esta consulta.</p>";
    if (ml.fontes_lista && ml.fontes_lista.length > 0) {
        const itens = ml.fontes_lista.map((f) => {
            const titulo = escaparHTML(f.titulo || f.title || f.url || "Fonte consultada");
            const link = f.link || f.url || "#";
            return `<li><a href="${escaparHTML(link)}" target="_blank" rel="noopener noreferrer">${titulo}</a></li>`;
        }).join("");
        listaFontesHTML = `<ul class="lista-fontes">${itens}</ul>`;
    }

    return `
        <div class="veredito-header">
            <span class="selo-fato ${classeSelo}">VEREDITO: ${escaparHTML(dados.fato_real || "INCONCLUSIVO")}</span>
        </div>
        <div class="texto-veredito">${textoInicial}</div>
        <details class="painel-transparencia">
            <summary>📊 Auditoria Técnica (SVM + ${ml.fontes_cruzadas} Fontes)</summary>
            <div class="termometro">
                <div class="stat-item">
                    <span>Índice Veracidade (SVM)</span>
                    <strong style="color: #10b981;">${ml.verdadeiro}%</strong>
                </div>
                <div class="stat-item">
                    <span>Alerta Desinformação (SVM)</span>
                    <strong style="color: #ef4444;">${ml.falso}%</strong>
                </div>
                <div class="stat-item">
                    <span>Fontes Cruzadas</span>
                    <strong style="color: #38bdf8;">${ml.fontes_cruzadas}</strong>
                </div>
            </div>
            ${alertaErroHTML}
            <div class="fontes-box">
                <strong>Fontes Consultadas na Web:</strong>
                ${listaFontesHTML}
            </div>
        </details>
        <div class="feedback-area">
            <button type="button" class="btn-pdf" onclick="baixarLaudoPDF('${idCard}')">📄 Baixar Laudo PDF</button>
        </div>
    `;
}

async function enviarMensagem() {
    const campo = document.getElementById("campoTexto");
    const texto = campo.value.trim();
    const chatContainer = document.getElementById("chatContainer");
    const botao = document.getElementById("btnEnviar");

    if (!texto) return;

    document.querySelectorAll(".quick-replies").forEach((el) => el.remove());

    chatContainer.insertAdjacentHTML("beforeend", `<div class="message user">${escaparHTML(texto)}</div>`);
    campo.value = "";
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const idTemp = "msg-" + Date.now();
    chatContainer.insertAdjacentHTML(
        "beforeend",
        `<div class="message ai pensando" id="${idTemp}">⏳ [01s] Iniciando triagem inteligente...</div>`
    );
    chatContainer.scrollTop = chatContainer.scrollHeight;
    botao.disabled = true;

    let segundos = 1;
    const timerInterval = setInterval(() => {
        segundos++;
        const el = document.getElementById(idTemp);
        if (el) {
            const tempoFormatado = String(segundos).padStart(2, "0");
            let statusTexto = "Iniciando triagem...";
            if (segundos >= 2 && segundos < 5) statusTexto = "Consultando modelo SVM e buscando notícias...";
            else if (segundos >= 5) statusTexto = "Cruzando fontes e redigindo veredito...";
            el.innerText = `⏳ [${tempoFormatado}s] ${statusTexto}`;
        }
    }, 1000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
        const historicoLimpo = memoriaConversa.slice(-6).map((m) => ({
            role: m.role,
            content: m.content
        }));

        const resposta = await fetch(`${API_BASE_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mensagem: texto,
                historico: historicoLimpo
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        clearInterval(timerInterval);

        if (!resposta.ok) {
            throw new Error(`Erro HTTP ${resposta.status}`);
        }

        const dados = await resposta.json();
        const cardMensagem = document.getElementById(idTemp);
        cardMensagem.classList.remove("pensando");

        memoriaConversa.push({ role: "user", content: texto });
        memoriaConversa.push({ role: "assistant", content: dados.texto, meta: dados });
        salvarConversaNoNavegador();

        if (dados.origem === "agente_verificacao" || dados.origem === "fallback_estatistico") {
            cardMensagem.innerHTML = construirHTMLTransparencia(dados, idTemp);
            const divTexto = cardMensagem.querySelector(".texto-veredito");
            efeitoDigitacaoSeguro(divTexto, formatarTextoIA(dados.texto), 12, () => {
                adicionarRespostasRapidas();
                chatContainer.scrollTop = chatContainer.scrollHeight;
            });
        } else {
            cardMensagem.innerHTML = "";
            efeitoDigitacaoSeguro(cardMensagem, formatarTextoIA(dados.texto), 15, () => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            });
        }
    } catch (erro) {
        clearTimeout(timeoutId);
        clearInterval(timerInterval);
        const cardErro = document.getElementById(idTemp);
        if (cardErro) {
            cardErro.classList.remove("pensando");
            cardErro.innerHTML = `<span style="color: #ef4444;">❌ Não foi possível conectar ao servidor VERIFICA.AI (${escaparHTML(erro.message)}). Verifique se o backend está rodando.</span>`;
        }
    } finally {
        botao.disabled = false;
        campo.focus();
    }
}
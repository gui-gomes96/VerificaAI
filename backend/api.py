# -*- coding: utf-8 -*-
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
import csv
import joblib
import json
import logging
from datetime import datetime
from typing import List, Dict
from dotenv import load_dotenv
from groq import Groq

from backend.buscar_noticias import buscar_noticias
from backend.analisar_afirmacao import analisar_afirmacao

# Carrega variáveis do arquivo .env (apenas no ambiente local)
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("VERIFICA_AI_ENTERPRISE")

app = FastAPI(title="VERIFICA.AI - Agente Híbrido com Groq API", version="21.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lê o token com segurança do ambiente (.env local ou painel da hospedagem)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY não encontrada nas variáveis de ambiente! Configure o arquivo .env ou o painel da nuvem.")

client = Groq(api_key=GROQ_API_KEY)

MODELO_GROQ = "openai/gpt-oss-120b"

instrucoes_triagem = """
Você é o motor de triagem de dados do sistema VERIFICA.AI.
Sua função é ler a nova mensagem do usuário junto com o histórico da conversa e classificar a intenção.
Regras de Negócio:
1. BATE-PAPO / MEMÓRIA: Se o usuário estiver apenas conversando, agradecendo, dizendo "olá", ou fazendo perguntas sobre o histórico (ex: "O que eu perguntei antes?", "Como funciona o modelo SVM?"), NÃO acione a pesquisa. Responda diretamente: {"status": "conversa", "mensagem": "Sua resposta direta, séria e imparcial baseada no histórico."}
2. CONTEXTO LIVRE E DEDUÇÃO INTELIGENTE: Se a frase for um boato/notícia para checar, deduza o contexto automaticamente a partir das mensagens anteriores ou do conhecimento geral sem fazer perguntas desnecessárias.
3. Se a frase (boato/notícia) estiver compreensível, responda: {"status": "pronto", "frase_limpa": "A frase completa e deduzida para busca"}
4. APENAS em casos extremos de texto ininteligível sobre uma notícia, responda: {"status": "precisa_contexto", "mensagem": "Por favor, reformule a frase."}
PROIBIDO USAR EMOJIS ou clichês de IA. Responda SEMPRE em formato JSON válido.
"""

data_hoje = datetime.now().strftime("%d/%m/%Y")

instrucoes_resposta = f"""
Você é o agente VERIFICA.AI, um especialista imparcial e objetivo em checagem de fatos.
Sua missão é escrever um veredito final cruzando a matemática do modelo estatístico SVM com as notícias da web.

DATA ATUAL DO SISTEMA: {data_hoje}

REGRAS DE REDAÇÃO E INTERPRETAÇÃO:
1. IMPARCIALIDADE ABSOLUTA: Seja direto, sério e estritamente focado nos fatos e nos dados coletados. Não emita juízo de valor e não seja informal.
2. PROIBIDO EMOJIS: Não utilize nenhum emoji, emoticon ou símbolo expressivo em nenhuma parte do texto.
3. ZERO "CARA DE IA": Nunca utilize frases clichês de inteligência artificial (ex: "Como um modelo de linguagem...", "Olá, estou aqui para ajudar..."). Escreva com a firmeza de um jornalista investigativo humano.
4. ESTRUTURA: Escreva um texto corrido, dividido em no máximo 3 ou 4 parágrafos bem conectados. PROIBIDO usar tabelas ou listas longas.
5. FONTES: Cite as fontes raspadas da web de forma orgânica no meio do texto para embasar estamente os fatos.
6. AVALIAÇÃO DE ERRO DO MODELO: Explique a probabilidade estatística do SVM de forma técnica. Se a nota do SVM for discrepante da realidade das notícias, identifique essa falha de forma imparcial (ex: viés de vocabulário alarmista).
7. CONSCIÊNCIA TEMPORAL: Use a "Data Atual do Sistema" para interpretar as notícias corretamente.
8. Saída: Retorne APENAS um objeto JSON válido no formato exato abaixo: 
{{
    "texto_final": "Veredito em texto corrido, estritamente informativo, imparcial e sem emojis.",
    "modelo_errou": true ou false,
    "fato_real": "VERDADEIRO" ou "FALSO" ou "INCONCLUSIVO",
    "motivo_erro": "Se modelo_errou for true, explique tecnicamente por que a máquina se confundiu."
}}
"""

try:
    modelo_ia = joblib.load("modelo/modelo_fake_news.joblib")
    vetorizador_ia = joblib.load("modelo/tfidf.joblib")
    logger.info("Modelos SVM carregados na memória com sucesso.")
except Exception as e:
    logger.error(f"Erro crítico ao carregar modelos SVM: {e}")
    modelo_ia = None
    vetorizador_ia = None

# ==========================================================================
# COLETA ANÔNIMA DE DADOS PARA APRENDIZADO CONTÍNUO DO SVM
# ==========================================================================
CAMINHO_COLETA_CSV = "modelo/dataset_coletado_evento.csv"

def registrar_dado_anonimo(frase: str, fato_real: str, p_verdade: float, p_falso: float, origem_registro: str = "checagem"):
    if not frase or len(frase.strip()) < 12 or fato_real not in ["VERDADEIRO", "FALSO"]:
        return

    try:
        os.makedirs(os.path.dirname(CAMINHO_COLETA_CSV), exist_ok=True)
        arquivo_existe = os.path.exists(CAMINHO_COLETA_CSV)
        label_numerico = 1 if fato_real == "VERDADEIRO" else 0

        with open(CAMINHO_COLETA_CSV, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if not arquivo_existe:
                writer.writerow(["data_hora", "texto", "label", "fato_real", "svm_verdadeiro", "svm_falso", "origem"])
            writer.writerow([
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                frase.strip(),
                label_numerico,
                fato_real,
                p_verdade,
                p_falso,
                origem_registro
            ])
    except Exception as e:
        logger.warning(f"Falha ao registrar dado anônimo para treino: {e}")


class RequisicaoChat(BaseModel):
    mensagem: str
    historico: List[Dict[str, str]] = []


class RequisicaoFeedback(BaseModel):
    texto_afirmacao: str
    veredito_exibido: str
    avaliacao: str


@app.get("/health")
def verificar_saude():
    return {
        "status": "online",
        "svm_carregado": modelo_ia is not None and vetorizador_ia is not None,
    }


@app.post("/feedback")
def registrar_feedback_visitante(req: RequisicaoFeedback):
    veredito = req.veredito_exibido.upper().strip()
    avaliacao = req.avaliacao.lower().strip()

    if veredito in ["VERDADEIRO", "FALSO"]:
        rotulo_final = veredito if avaliacao == "preciso" else (
            "FALSO" if veredito == "VERDADEIRO" else "VERDADEIRO"
        )
        registrar_dado_anonimo(
            frase=req.texto_afirmacao,
            fato_real=rotulo_final,
            p_verdade=50.0,
            p_falso=50.0,
            origem_registro=f"feedback_{avaliacao}"
        )
    return {"status": "ok"}


def executar_pipeline_completo(frase_alvo: str, historico: List[Dict[str, str]]):
    logger.info(f"Acionando Machine Learning (SVM) para: {frase_alvo}")

    noticias = buscar_noticias(frase_alvo)

    p_verdade, p_falso = 50.0, 50.0
    if modelo_ia and vetorizador_ia:
        try:
            texto_vet = vetorizador_ia.transform([frase_alvo])
            probs = modelo_ia.predict_proba(texto_vet)[0]
            p_verdade = round(probs[1] * 100, 2)
            p_falso = round(probs[0] * 100, 2)
        except Exception as e:
            logger.error(f"Erro ao rodar predição do modelo SVM local: {e}")

    prompt_final = f'''
    Fato investigado (já com contexto deduzido): "{frase_alvo}".
    Cálculo estatístico do modelo SVM: {p_verdade}% de Veracidade e {p_falso}% de Desinformação.
    Notícias extraídas da web para cruzamento: {json.dumps(noticias, ensure_ascii=False)}.
    
    Analise os dados, verifique se o modelo SVM errou na avaliação e escreva o veredito final em JSON. Lembre-se do histórico da conversa para manter a coesão.
    '''

    mensagens_finais = [{"role": "system", "content": instrucoes_resposta}]
    mensagens_finais.extend(historico)
    mensagens_finais.append({"role": "user", "content": prompt_final})

    try:
        resposta_groq = client.chat.completions.create(
            model=MODELO_GROQ,
            messages=mensagens_finais,
            temperature=0.2,
            response_format={"type": "json_object"},
        )

        dados_json = json.loads(resposta_groq.choices[0].message.content)
        texto_final = dados_json.get("texto_final", "Análise concluída com sucesso.")
        modelo_errou = dados_json.get("modelo_errou", False)
        fato_real = dados_json.get("fato_real", "INCONCLUSIVO")
        motivo_erro = dados_json.get("motivo_erro", "")

        # Salva anonimamente para o retreino futuro do SVM
        registrar_dado_anonimo(frase_alvo, fato_real, p_verdade, p_falso, "checagem_hibrida")

    except Exception as e:
        logger.error(f"Erro na Groq API (resposta final): {e}")
        texto_final = f"A análise estatística apontou {p_falso}% de alerta com base em {len(noticias)} fontes coletadas."
        modelo_errou = False
        fato_real = "INCONCLUSIVO"
        motivo_erro = ""

    return {
        "origem": "agente_verificacao",
        "texto": texto_final,
        "modelo_errou": modelo_errou,
        "fato_real": fato_real,
        "motivo_erro": motivo_erro,
        "dados_ml": {
            "verdadeiro": p_verdade,
            "falso": p_falso,
            "fontes_cruzadas": len(noticias),
            "fontes_lista": noticias,
        },
    }


@app.post("/chat")
def conversar_com_agente(req: RequisicaoChat):
    logger.info(f"Usuário disse: {req.mensagem}")

    mensagens_triagem = [{"role": "system", "content": instrucoes_triagem}]
    mensagens_triagem.extend(req.historico)
    mensagens_triagem.append({"role": "user", "content": req.mensagem})

    try:
        resposta_groq = client.chat.completions.create(
            model=MODELO_GROQ,
            messages=mensagens_triagem,
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        decisao = json.loads(resposta_groq.choices[0].message.content)

        if decisao.get("status") in ["precisa_contexto", "conversa"]:
            return {
                "origem": "agente_dialogo",
                "texto": decisao.get("mensagem", "Por favor, especifique o contexto da sua pergunta."),
            }

        frase_alvo = decisao.get("frase_limpa", req.mensagem)
        return executar_pipeline_completo(frase_alvo, req.historico)

    except Exception as e:
        logger.error(f"Erro na Groq API (triagem): {e}")
        resultado_fallback = executar_pipeline_completo(req.mensagem, req.historico)
        resultado_fallback["texto"] = f"[Modo de Contingência] {resultado_fallback['texto']}"
        return resultado_fallback


if __name__ == "__main__":
    import uvicorn
    porta = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=porta)
# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import joblib
import json
import logging
import os
from groq import Groq  # Importando a biblioteca oficial da Groq

# Importando os SEUS módulos de Machine Learning
from backend.buscar_noticias import buscar_noticias
from backend.analisar_afirmacao import analisar_afirmacao

# Configuração de logs corporativos
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("VERIFICA_AI_ENTERPRISE")

app = FastAPI(title="VERIFICA.AI - Agente Híbrido com Groq API", version="15.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# =================================================================
# 1. CONFIGURAÇÃO DA GROQ API (Velocidade Relâmpago + Llama 3)
# =================================================================
# Cole a sua chave da Groq aqui embaixo entre as aspas
GROQ_API_KEY = "" 
client = Groq(api_key=GROQ_API_KEY)

# Usaremos o Llama 3 8B na Groq (ultra rápido e altamente inteligente)
MODELO_GROQ = "openai/gpt-oss-120b"
# Agente 1: Triagem de Contexto Detalhada (Padrão Google)
instrucoes_triagem = """ Você é o VERIFICA.AI, um agente investigativo que prepara frases para um modelo matemático de checagem. Sua única função é garantir que a afirmação do usuário tenha CONTEXTO (local, época, sujeito) e esteja compreensível. Responda SEMPRE em formato JSON válido. Regras de Negócio: 1. Se o usuário cometeu erros de digitação graves ou a frase estiver confusa/fora do comum, mas você entendeu a intenção, corrija a ortografia e inclua a sugestão no formato: {"status": "precisa_contexto", "mensagem": "Você quis dizer '[frase corrigida]'? Por favor, confirme ou especifique melhor."} 2. Se faltar contexto geográfico ou temporal (ex: "A maconha é legalizada?"), responda: {"status": "precisa_contexto", "mensagem": "Pergunta curta pedindo o contexto faltante (ex: país ou estado)"} 3. Se a frase estiver completa, clara e pronta, responda: {"status": "pronto", "frase_limpa": "A frase corrigida, clara e com contexto para busca"} """
# Agente 2: LIBERTO DO JSON! Agora ele foca 100% em ser eloquente, rico e analítico
# Agente 2: Redação Fluida, Humana e Analítica
instrucoes_resposta = """
Você é o agente VERIFICA.AI, um jornalista investigativo e especialista em checagem de fatos.
Sua missão é escrever um veredito final cruzando a matemática do modelo estatístico SVM com as notícias da web.

REGRAS ESTABELECIDAS DE ESTILO E FORMATAÇÃO (CRÍTICO):
1. PROIBIDO USAR TABELAS, listas longas ou subtítulos de marcação (como "### Análise" ou "### Limites").
2. Escreva um texto corrido, fluido e elegante, dividido em no máximo 3 ou 4 parágrafos bem conectados e fáceis de ler.
3. Esconda a "cara de IA": não seja robótico. Cite as fontes de forma orgânica no meio do texto (ex: "De acordo com levantamentos de portais como CNN e UOL...").
4. Explique a probabilidade estatística do SVM de forma natural e didática, integrando esse dado à realidade dos fatos encontrados nas notícias.
5. Se houver discrepância (ex: o modelo achou que era falso por causa do vocabulário, mas a notícia é verdadeira), explique o limite do sistema dentro da narrativa.
6. Responda SEMPRE E APENAS em formato JSON válido, exatamente com a seguinte estrutura:
{"texto_final": "O seu texto limpo, em prosa e com tom profissional aqui."}
"""
# =================================================================
# 2. CARREGAMENTO DO SEU MACHINE LEARNING LOCAL (SVM + TF-IDF)
# =================================================================
try:
    modelo_ia = joblib.load("modelo/modelo_fake_news.joblib")
    vetorizador_ia = joblib.load("modelo/tfidf.joblib")
    logger.info("✅ Modelos SVM carregados na memória com sucesso!")
except Exception as e:
    logger.error(f"❌ Erro crítico ao carregar modelos SVM: {e}")
    modelo_ia = None
    vetorizador_ia = None

class RequisicaoChat(BaseModel):
    mensagem: str


def limpar_e_carregar_json(texto: str):
    """Função de segurança para garantir que a API leia o JSON perfeitamente"""
    try:
        limpo = texto.strip()
        if limpo.startswith("```"):
            limpo = limpo.split("```")[1]
            if limpo.startswith("json"):
                limpo = limpo[4:]
        return json.loads(limpo.strip())
    except:
        return None


def executar_pipeline_completo(frase_alvo: str):
    logger.info(f"🤖 Acionando Machine Learning (SVM) para: {frase_alvo}")
    
    # A) Busca Notícias reais da Web
    noticias = buscar_noticias(frase_alvo)
    
    # B) Roda a matemática do SVM
    p_verdade, p_falso = 50.0, 50.0
    if modelo_ia and vetorizador_ia:
        try:
            texto_vet = vetorizador_ia.transform([frase_alvo])
            probs = modelo_ia.predict_proba(texto_vet)[0]
            p_verdade = round(probs[1] * 100, 2)
            p_falso = round(probs[0] * 100, 2)
            logger.info(f"📊 Resultado SVM -> Verdadeiro: {p_verdade}% | Falso: {p_falso}%")
        except Exception as e:
            logger.error(f"❌ Erro ao rodar predição do modelo SVM local: {e}")

    # C) A LLM da Groq analisa os dados com toda a eloquência
    prompt_final = f'''
    Fato investigado pelo usuário: "{frase_alvo}".
    Cálculo estatístico do modelo SVM: {p_verdade}% de Veracidade e {p_falso}% de Desinformação.
    Notícias extraídas da web para cruzamento: {json.dumps(noticias, ensure_ascii=False)}.
    
    Analise esses dados e escreva um veredito final rico, analítico e detalhado justificando a classificação, conforme as diretrizes do sistema.
    '''
    
    try:
        # A Groq processa o texto em milissegundos
        resposta_groq = client.chat.completions.create(
            model=MODELO_GROQ,
            messages=[
                {"role": "system", "content": instrucoes_resposta},
                {"role": "user", "content": prompt_final}
            ],
            temperature=0.4, # Temperatura levemente aumentada para texto mais fluido
            response_format={"type": "json_object"}
        )
        
        dados_json = json.loads(resposta_groq.choices[0].message.content)
        texto_final = dados_json.get("texto_final", "Análise concluída com sucesso.")
            
    except Exception as e:
        logger.error(f"❌ Erro na Groq API (resposta final): {e}")
        texto_final = f"A análise estatística apontou {p_falso}% de alerta com base em {len(noticias)} fontes coletadas."

    return {
        "origem": "agente_verificacao",
        "texto": texto_final,
        "dados_ml": {
            "verdadeiro": p_verdade,
            "falso": p_falso,
            "fontes_cruzadas": len(noticias),
            "fontes_lista": noticias
        }
    }


@app.post("/chat")
def conversar_com_agente(req: RequisicaoChat):
    logger.info(f"👤 Usuário disse: {req.mensagem}")
    
    try:
        # Passo 1: A IA avalia se precisa de contexto
        resposta_groq = client.chat.completions.create(
            model=MODELO_GROQ,
            messages=[
                {"role": "system", "content": instrucoes_triagem},
                {"role": "user", "content": req.mensagem}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        decisao = json.loads(resposta_groq.choices[0].message.content)
        logger.info(f"🧠 Decisão de Triagem da Groq: {decisao}")
            
        if decisao.get("status") == "precisa_contexto":
            return {
                "origem": "agente_dialogo",
                "texto": decisao.get("mensagem", "Poderia especificar o país ou contexto da sua pergunta?")
            }

        # Passo 2: Roda o pipeline com a frase limpa e corrigida
        frase_alvo = decisao.get("frase_limpa", req.mensagem)
        return executar_pipeline_completo(frase_alvo)

    except Exception as e:
        logger.error(f"⚠️ Erro na Groq API (triagem): {e}")
        resultado_fallback = executar_pipeline_completo(req.mensagem)
        resultado_fallback["texto"] = f"⚠️ *(Modo de Contingência de Nuvem)*\n\n{resultado_fallback['texto']}"
        return resultado_fallback

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
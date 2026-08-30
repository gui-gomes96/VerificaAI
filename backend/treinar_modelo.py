import pandas as pd
import joblib
import nltk
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# Baixa o dicionário de palavras inúteis em português (só faz o download na primeira vez)
nltk.download('stopwords')
stop_words_pt = stopwords.words('portuguese')

ARQUIVO = "dataset/pre-processed.csv"

print("==============================")
print("  TREINAMENTO DE IA AVANÇADO  ")
print("==============================")
print("Carregando dataset...")
dados = pd.read_csv(ARQUIVO)
print(f"Total de notícias: {len(dados)}\n")

textos = dados["preprocessed_news"]
classes = dados["label"].map({"fake": 0, "true": 1})

textos_treino, textos_teste, y_treino, y_teste = train_test_split(
    textos, classes, test_size=0.2, random_state=42, stratify=classes
)

print("🧠 1. Criando TF-IDF com Bi-gramas e Remoção de Stopwords...")
# ngram_range=(1,2) significa que ele lê palavras sozinhas E pares de palavras
# max_features=20000 limita o cérebro às 20 mil combinações mais importantes para não estourar a memória
vetorizador = TfidfVectorizer(
    stop_words=stop_words_pt,
    ngram_range=(1, 2),
    max_features=20000
)

X_treino = vetorizador.fit_transform(textos_treino)
X_teste = vetorizador.transform(textos_teste)

print("🤖 2. Treinando o modelo SVM (Support Vector Machine)...")
print("⏳ Isso pode levar alguns minutos, o SVM é detalhista matemática e estatisticamente...")
# kernel='linear' é excelente para textos. probability=True é obrigatório para termos a porcentagem depois.
modelo = SVC(kernel='linear', probability=True, random_state=42)
modelo.fit(X_treino, y_treino)

print("\n💾 3. Salvando a nova IA...")
joblib.dump(modelo, "modelo/modelo_fake_news.joblib")
joblib.dump(vetorizador, "modelo/tfidf.joblib")
print("Arquivos atualizados na pasta modelo/!")

print("\n==============================")
print("     RESULTADOS DO TESTE      ")
print("==============================")
previsoes = modelo.predict(X_teste)
acuracia = accuracy_score(y_teste, previsoes)

print(f"🎯 Nova Acurácia do SVM: {acuracia:.2%}\n")

print("Relatório de Classificação detalhado:")
print(classification_report(y_teste, previsoes, target_names=["fake", "true"]))

print("Matriz de Confusão:")
matriz = confusion_matrix(y_teste, previsoes)
print(matriz)
print("==============================")


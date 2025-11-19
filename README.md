# Spaß starten
## 1. Fenster (Elasticsearch starten)

cd "C:\camunda8\camunda8-getting-started-bundle\c8run\elasticsearch-8.17.3"
.\bin\elasticsearch.bat

1 min ca. warten

## 2. Fenster (Camunda 8 starten):
cd "C:\camunda8\camunda8-getting-started-bundle\c8run"
.\c8run start -disable-elasticsearch

kann sein dass man was löschen muss: C:\camunda8\camunda8-getting-started-bundle\c8run\elasticsearch-8.17.3\data

## 3. Fenster (Worker starten):
cd "C:\Users\flori\OneDrive\Desktop\agents"
### Gemini hinzufügen
npm install @google/genai

### Programm starten
npm start


# Wichtiger Link:
https://camunda.com/blog/2022/04/camunda-platform-8-orchestrate-all-the-things?utm_source=modeler&utm_medium=referral

const API_KEY = "AIzaSyCmzFvDYrSugXK2hqLQH-DeZobQQwPQ_Bk";

async function listModels() {
  console.log("🔍 Frage Google nach verfügbaren Modellen...");
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("❌ FEHLER VOM GOOGLE SERVER:");
      console.error(JSON.stringify(data.error, null, 2));
    } else if (data.models) {
      console.log("✅ ERFOLG! Verfügbare Modelle für diesen Key:");
      console.log("------------------------------------------------");
      data.models.forEach(m => {
        // Wir filtern nur die Modelle, die "generateContent" unterstützen
        if (m.supportedGenerationMethods.includes("generateContent")) {
            console.log(`Name: ${m.name.replace('models/', '')}`);
        }
      });
      console.log("------------------------------------------------");
      console.log("BITTE KOPIERE EINEN DIESER NAMEN IN DEINEN WORKER.");
    } else {
      console.log("⚠️ Keine Modelle gefunden (Liste ist leer).");
    }

  } catch (error) {
    console.error("Netzwerkfehler:", error);
  }
}

listModels();
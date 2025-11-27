require('dotenv').config();

const { ZBClient } = require('zeebe-node');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ============================================================
// ⚙️ KONFIGURATION
// ============================================================
const ZEEBE_ADDRESS = 'localhost:26500';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; //https://aistudio.google.com/app/usage?timeRange=last-1-day&project=gen-lang-client-0368553948

if (!GEMINI_API_KEY) {
    console.error("❌ FEHLER: Kein GEMINI_API_KEY in der .env Datei gefunden!");
    process.exit(1); // Beendet das Programm
}

const AI_MODEL_NAME = "gemini-2.5-flash";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const zbc = new ZBClient(ZEEBE_ADDRESS);

// ============================================================
// 🧠 HILFSFUNKTIONEN (AI LOGIK)
// ============================================================

/**
 * Fragt Gemini nach einem Preis.
 * @param {string} prompt - Der Textbefehl an die KI.
 * @returns {Promise<number>} - Der Preis als Zahl.
 */
async function getPriceFromAI(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: AI_MODEL_NAME });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(`📝 KI Roh-Antwort: ${text}`);

    // Zahl säubern und zurückgeben
    const price = Number(text.replace(/[^0-9]/g, ''));
    console.log(`💰 Extrahierter Preis: ${price}`);
    return price;

  } catch (error) {
    console.error("❌ KI Fehler:", error.message);
    throw error; // Fehler weiterwerfen, damit der Worker failen kann
  }
}

// ============================================================
// 🛠️ WORKER DEFINITIONEN
// Hier definieren wir, was bei welchem Task passiert.
// ============================================================
const workers = [
  {
    type: 'anfrage-schreiben',
    handler: async (job) => {
      console.log('\n=== 1. Anfrage schreiben ===');
      const { berg, datum } = job.variables;
      const anfrageID = job.processInstanceKey;

      console.log(`🔑 Erzeuge AnfrageID: ${anfrageID}`);

      return {
        anfrageID: anfrageID,
        berg: berg,
        datum: datum
      };
    }
  },
  {
    type: 'angebot-erstellen',
    handler: async (job) => {
      console.log('\n=== 2. Angebot erstellen ===');
      const { anfrageID, berg, hotelAngebot, flugAngebot } = job.variables;

      const text = `Hier ist dein Angebot für die Reise zum ${berg}: Flug (${flugAngebot} EUR) + Unterkunft (${hotelAngebot} EUR).`;
      console.log(`📝 Angebot erstellt: ${text}`);

      return { angebot: text, anfrageID };
    }
  },
  {
    type: 'absage-erstellen',
    handler: async (job) => {
      console.log('\n=== 3. Absage erstellen ===');
      const { anfrageID, berg } = job.variables;
      const text = `Der Berg ${berg} wird leider nicht unterstützt.`;

      return { absage: text, anfrageID };
    }
  },
  {
    type: 'zusage-schreiben',
    handler: async (job) => {
      console.log('\n=== 4. Zusage schreiben ===');
      const { anfrageID } = job.variables;
      const text = "Das ist die finale Antwort an den Kunden.";

      return { anfrageID, Antwort: text };
    }
  },
  {
    type: 'hotelanfrage-schreiben',
    handler: async (job) => {
      console.log('\n=== Hotelanfrage schreiben ===');
      const { datum, berg } = job.variables;
      const hotelAnfrageID = job.processInstanceKey;

      return {
        datum,
        hotelAnfrageID,
        hotelStandort: berg
      };
    }
  },
  {
    type: 'hotel-angebot-senden',
    handler: async (job) => {
      console.log('\n=== Hotel-Angebot senden ===');
      const { hotelAnfrageID, Hotelangebot } = job.variables;

      return {
        hotelAngebot: Hotelangebot,
        hotelAnfrageID
      };
    }
  },
  {
    type: 'fluganfrage-schreiben',
    handler: async (job) => {
      console.log('\n=== Fluganfrage schreiben ===');
      const { berg, datum } = job.variables;
      const flugAnfrageID = job.processInstanceKey;

      return {
        flugZiel: berg,
        flugDatum: datum,
        flugAnfrageID
      };
    }
  },
  {
    type: 'flug-angebot-erstellen-smart',
    handler: async (job) => {
      console.log('\n=== 🤖 KI generiert Flugangebot ===');
      const { flugZiel, flugDatum, flugAnfrageID } = job.variables;

      const prompt = `
        Schätze einen realistischen Flugpreis (nur die Zahl und in Euro) für:
        - Ziel: ${flugZiel}
        - Datum: ${flugDatum}
        Antworte nur mit der Zahl (z.B. 350). Keine Währung.
      `;

      // Wir nutzen unsere Hilfsfunktion
      const price = await getPriceFromAI(prompt);

      return {
        flugAngebot: price,
        flugAnfrageID
      };
    }
  },
  {
    type: 'hotel-angebot-erstellen-smart',
    handler: async (job) => {
      console.log('\n=== 🏨 KI generiert HOTEL-Angebot ===');
      // Fallback Logik beibehalten
      const zielOrt = job.variables.hotelStandort || job.variables.berg;
      const { datum, hotelAnfrageID } = job.variables;

      const prompt = `
        Schätze einen realistischen Hotelpreis pro Nacht (nur die Zahl und in Euro) für:
        - Ziel: ${zielOrt}
        - Datum: ${datum}
        Antworte nur mit der Zahl (z.B. 120). Keine Währung.
      `;

      const price = await getPriceFromAI(prompt);

      return {
        hotelAngebot: price,
        hotelAnfrageID
      };
    }
  },
  {
    type: 'flug-angebot-senden',
    handler: async (job) => {
      console.log('\n=== Flug-Angebot senden ===');
      const { flugZiel, flugAnfrageID, Flugangebot } = job.variables;

      return {
        flugAngebot: Flugangebot,
        flugAnfrageID
      };
    }
  },
  {
    type: 'zahlungsaufforderung-erstellen',
    handler: async (job) => {
      console.log('\n=== Zahlungsaufforderung erstellen ===');
      const { anfrageID } = job.variables;
      const text = "Bitte begleichen Sie den offenen Betrag von 750 EUR.";

      return { anfrageID, Zahlungsaufforderung: text };
    }
  },
  {
    type: 'zahlung-vorbereiten',
    handler: async (job) => {
      console.log('\n=== Zahlung vorbereiten ===');
      const { anfrageID } = job.variables;
      const betrag = 750; // Könnte man später auch berechnen: hotel + flug

      return {
        zahlungsID: anfrageID,
        anfrageID,
        Betrag: betrag
      };
    }
  },
  {
    type: 'bank-zahlung-vorbereiten',
    handler: async (job) => {
      console.log('\n=== Bank-Zahlung vorbereiten ===');
      const { Verwendungszweck } = job.variables;
      const betrag = 750;

      return {
        anfrageID: Verwendungszweck,
        Zahlung: betrag
      };
    }
  },
  {
    type: 'bank-zahlungsbestätigung-vorbereiten',
    handler: async (job) => {
      console.log('\n=== Bank-Zahlungsbestätigung vorbereiten ===');
      const { zahlungsID } = job.variables;
      const betrag = 750;

      return { zahlungsID, Betrag: betrag };
    }
  },
  {
    type: 'hotel-zahlung-vorbereiten',
    handler: async (job) => {
      console.log('\n=== Hotel-Zahlung vorbereiten ===');
      const { hotelAnfrageID, datum } = job.variables;
      return { hotelAnfrageID, datum };
    }
  },
  {
    type: 'flug-zahlung-vorbereiten',
    handler: async (job) => {
      console.log('\n=== Flug-Zahlung vorbereiten ===');
      const { flugAnfrageID, datum } = job.variables;
      return { flugAnfrageID, datum };
    }
  },
  {
    type: 'flug-zahlungsbestätigung-senden',
    handler: async (job) => {
      console.log('\n=== Flug-Zahlungsbestätigung senden ===');
      const { flugAnfrageID } = job.variables;
      const text = "Ihre Flug-Zahlung wurde erfolgreich verbucht. Vielen Dank.";
      return { flugAnfrageID, flugbestätigung: text };
    }
  },
  {
    type: 'hotel-zahlungsbestätigung-senden',
    handler: async (job) => {
      console.log('\n=== Hotel-Zahlungsbestätigung senden ===');
      const { hotelAnfrageID } = job.variables;
      const text = "Ihre Hotel-Zahlung wurde erfolgreich verbucht. Wir freuen uns auf Sie.";
      return { hotelAnfrageID, hotelbestätigung: text };
    }
  },
  {
    type: 'buchungsbestätigung-vorbereiten',
    handler: async (job) => {
      console.log('\n=== Finale Buchungsbestätigung vorbereiten ===');
      const { anfrageID } = job.variables;
      const text = "Ihre Reise ist nun vollständig gebucht. Gute Reise!";
      
      console.log(`📝 Finale Buchung: ${text}`);
      return { anfrageID, buchungsbestätigung: text };
    }
  },
  {
    type: 'anfrage-pruefen',
    handler: async (job) => {
      console.log('\n=== Anfrage prüfen (Blacklist) ===');
      const { berg, anfrageID } = job.variables;

      const blacklist = ['Pöstlingberg', 'Mount Everest', 'Mont Blanc'];
      let istMoeglich = "ja";

      if (blacklist.includes(berg)) {
        istMoeglich = "ja";
        console.log(`❌ Berg "${berg}" ist auf der Sperrliste.`);
      } else {
        console.log(`✅ Berg "${berg}" ist machbar.`);
      }

      return { moeglich: istMoeglich, anfrageID };
    }
  },
  //Workers Agent Nico
{
  type: 'anfrage-auswerten',
  handler: async (job) => {
    console.log('\n=== User Anfrage Ausarbeiten ===');
    const auswertungID = job.processInstanceKey;


    const { berg, anfrageID, datum } = job.variables || {};

    console.log('Job-Variablen anfrage-auswerten:', job.variables);

    return {
      berg,
      anfrageID,
      auswertungID,
      datum
    };
  }
},
 {
   type: 'antwort-auswerten',
   handler: async (job) => {
     console.log('\n=== User Anfrage Ausarbeiten ===');
     const antwortID = job.processInstanceKey;
     const { anfrageID, absage } = job.variables;

     console.log(`🔑 Erzeuge AuswertungID: ${antwortID}`);

     return {
       anfrageID: anfrageID,
       absage: absage,
       antwortID: antwortID
     };
   }
 },
   {
      type: 'berg-neu',
      handler: async (job) => {
        console.log('\n=== User Anfrage Ausarbeiten ===');
        const antwortID = job.processInstanceKey;

        const { anfrageID, berg } = job.variables;
        console.log(`🔑 Erzeuge AuswertungID: ${antwortID}`);

        return {
          anfrageID: anfrageID,
          berg: berg
        };
      }
   },
   {
     type: 'berg-aktualisieren',
     handler: async (job) => {
       console.log('\n=== User Anfrage Ausarbeiten ===');
       const antwortID = job.processInstanceKey;

       const { anfrageID, berg } = job.variables;
       console.log(`🔑 Erzeuge AuswertungID: ${antwortID}`);

       return {
         anfrageID: anfrageID,
         berg: berg
       };
     }
      },
      {
        type: 'angebot-auswerten',
        handler: async (job) => {
          console.log('\n=== Angebot auswerten ===');
          const angebot_auswertungID = job.processInstanceKey;

          // Angebot & Anfrage aus den Prozess-Variablen holen
          const { anfrageID, angebot } = job.variables || {};

          console.log(`🔍 Prüfe Angebot für Anfrage ${anfrageID}:`, angebot);

          //komplett hart gesetzt
          const besseresAngebot = "nein"; // nie zurück im Flow


          console.log(`💡 Gibt es ein besseres Angebot? ${besseresAngebot}`);

          // Diese Variablen gehen zurück in den Prozess
          return {
            anfrageID:anfrageID,
            angebot:angebot,
            angebot_auswertungID:angebot_auswertungID,
            besseresAngebot:besseresAngebot
          };
        }
      },
      {
        type: 'absage-schreiben',
        handler: async (job) => {
          console.log('\n=== Absage schreiben ===');
          const absageID = job.processInstanceKey;

          // Variablen aus dem Prozess holen
          const { anfrageID, absage } = job.variables || {};

          console.log(`🔍 Absage für Anfrage ${anfrageID}:`, absage);

          // Hier kannst du den Text anpassen / „schöner machen“
          const absageText = `Wir müssen Ihre Anfrage leider ablehnen.`;

          console.log(`📝 Endgültige Absage: ${absageText}`);

          // Wichtig: "absage" zurückgeben, wenn der Flow später genau diese Variable erwartet
          return {
            anfrageID:anfrageID,
            absage: absageText,
            absageID:absageID
          };
        }
      },
      {
         type: 'absage-weiterleiten-hotel',
         handler: async (job) => {
           console.log('\n=== Absage weiterleiten (HOTEL) ===');
           console.log('Job-Variablen (Hotel):', JSON.stringify(job.variables, null, 2));

           const { anfrageID, absage } = job.variables || {};

           const absageHotelText =
             absage ?? 'Ihre Hotelbuchung können wir leider nicht durchführen.';

           return {
             anfrageID,
             absageHotel: absageHotelText
           };
         }
       },
       {
         type: 'absage-weiterleiten-flug',
         handler: async (job) => {
           console.log('\n=== Absage weiterleiten (FLUG) ===');
           console.log('Job-Variablen (Flug):', JSON.stringify(job.variables, null, 2));

           const { anfrageID, absage } = job.variables || {};

           const absageFlugText =
             absage ?? 'Ihre Flugbuchung können wir leider nicht durchführen.';

           return {
             anfrageID,
             absageFlug: absageFlugText
           };
         }
       }
];

// ============================================================
// 🚀 MAIN FUNCTION
// Startet alle Worker
// ============================================================
async function main() {
  try {
    console.log('🚀 Starte Camunda Worker...');
    console.log('✅ Verbunden mit Zeebe');

    // Wir gehen durch unsere Liste und erstellen für jeden Eintrag einen Worker
    workers.forEach(({ type, handler }) => {
      
      zbc.createWorker({
        taskType: type,
        taskHandler: async (job) => {
          try {
            // Wir führen die Logik aus und holen uns die Variablen, die zurückgegeben werden sollen
            const variablesToComplete = await handler(job);
            
            // Job erfolgreich abschließen
            await job.complete(variablesToComplete);
            console.log(`✅ Task "${type}" abgeschlossen.\n`);
            
          } catch (error) {
            console.error(`❌ Fehler im Task "${type}":`, error.message);
            // Job failen (retry wird durch Zeebe gesteuert)
            await job.fail("WORKER_ERROR", error.message);
          }
        }
      });
      
      console.log(`🔧 Worker registriert: ${type}`);
    });

  } catch (err) {
    console.error('❌ Kritischer Fehler beim Starten:', err);
  }
}

// Start!
main();
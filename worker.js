const { ZBClient } = require('zeebe-node');

// Diese Variable existiert nur, solange der Worker läuft.
// Sie ist KEINE Camunda-Prozessvariable.
let executionCount = 0;

async function main() {
  try {
    console.log('🚀 Starte Camunda Worker...');

    const zbc = new ZBClient('localhost:26500', {
      loglevel: 'INFO',
      retry: true,
    });

    console.log('✅ Verbunden mit Zeebe')

    zbc.createWorker({
      taskType: 'anfrage-schreiben',
      taskHandler: async (job) => {
        console.log('\n=== 1. Anfrage schreiben ===');
        console.log('📊 Empfangene Variablen:', job.variables);
        const nachrichtVomUser1 = job.variables.berg; // Variable vom User
        const nachrichtVomUser2 = job.variables.datum; // Variable vom User

        // BESSERE LÖSUNG: Eine eindeutige ID verwenden.
        // // Der processInstanceKey ist pro Instanz eindeutig.
        const eindeutigeAnfrageID = job.processInstanceKey; 
        
        // Alternative (falls du npm-Pakete nutzen kannst):
        // const { v4: uuidv4 } = require('uuid');
        // const eindeutigeAnfrageID = uuidv4();

        console.log(`🔑 Erzeuge eindeutige anfrageID (Korrelationsschlüssel): ${eindeutigeAnfrageID}`);
        await job.complete({
          anfrageID: eindeutigeAnfrageID, // Die neue, eindeutige ID
          berg: nachrichtVomUser1, // Die ursprüngliche Variable weiterleiten
          datum: nachrichtVomUser1 // Die ursprüngliche Variable weiterleiten
          });

          console.log(`✅ "Anfrage stellen" abgeschlossen.`);
        },
      });
      
    zbc.createWorker({
      taskType: 'angebot-erstellen',
      taskHandler: async (job) => {
        console.log('\n=== 2. Angebot erstellen ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        // 1. Benötigte Variablen aus dem Prozess holen
        const anfrageID = job.variables.anfrageID; // SEHR WICHTIG!
        const bergWunsch = job.variables.berg;

        // 2. Das Angebot als Variable erstellen (wie gewünscht)
        const angebotText = `Hier ist dein Angebot für die Reise zum ${bergWunsch}: Flug + Unterkunft: 750 EUR.`;
        console.log(`📝 Angebot erstellt: ${angebotText}`);

        // 3. Job abschließen und die NEUE Variable "angebot" 
        // UND die anfrageID für das Throw Event bereitstellen
        await job.complete({
          angebot: angebotText, 
          anfrageID: anfrageID // Unbedingt die ID für die Korrelation weitergeben!
        });
      
        console.log(`✅ "Angebot erstellen" abgeschlossen.`);

      },
    });

    zbc.createWorker({
      taskType: 'absage-erstellen',
      taskHandler: async (job) => {
        console.log('\n=== 2. Absage erstellen ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        // 1. Benötigte Variablen aus dem Prozess holen
        const anfrageID = job.variables.anfrageID; // SEHR WICHTIG!
        const bergWunsch = job.variables.berg;

        // 2. Das Angebot als Variable erstellen (wie gewünscht)
        const absageText = `Der Berg ${bergWunsch} wird leider nicht unterstützt.`;
        console.log(`📝 Angebot erstellt: ${absageText}`);

        // 3. Job abschließen und die NEUE Variable "angebot" 
        // UND die anfrageID für das Throw Event bereitstellen
        await job.complete({
          absage: absageText, 
          anfrageID: anfrageID // Unbedingt die ID für die Korrelation weitergeben!
        });
      
        console.log(`✅ "Absage erstellen" abgeschlossen.`);

      },
    });

    zbc.createWorker({
      // Dieser Typ muss mit dem "Job type" im Prozessmodell übereinstimmen
      taskType: 'zusage-schreiben',
      
      taskHandler: async (job) => {
        console.log('\n=== 4. Zusage schreiben ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        // 1. Eindeutige ID für die Korrelation abrufen
        // (Die ID, die zu Beginn erstellt wurde, um die Antwort einem Prozess zuzuordnen)
        const korrelationsID = job.variables.anfrageID;

        // 2. Neue Variable "Antwort" erstellen
        const antwortText = 'zusage';
        console.log(`📝 Antwort erstellt: ${antwortText}`);
        console.log(`🔑 Korrelationsschlüssel für Antwort: ${korrelationsID}`);

        // 3. Job abschließen und Variablen zurückgeben
        await job.complete({
          Antwort: antwortText,
          anfrageID: korrelationsID // ursprüngliche ID für das Throw Event weitergeben
        });

        console.log('✅ "Zusage schreiben" abgeschlossen.');
      },
    });


    zbc.createWorker({
      // Dieser Typ muss mit dem "Job type" in deinem BPMN-Modell übereinstimmen
      taskType: 'hotelanfrage-schreiben',

      taskHandler: async (job) => {
        console.log('\n=== 1. Hotelanfrage schreiben ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        // 1. Variable "datum" holen (muss bereits im Prozess vorhanden sein)
        const reiseDatum = job.variables.datum;

        // 2. Eindeutige ID für diese Anfrage erstellen
        // Wir nutzen den processInstanceKey, da er garantiert eindeutig ist.
        const hotelAnfrageID = job.processInstanceKey;
        console.log(`🔑 Erzeuge Hotel-Korrelationsschlüssel: ${hotelAnfrageID}`);
        console.log(`📅 Sende Datum: ${reiseDatum}`);

        // 3. Job abschließen -> Variablen stehen für das Message Throw Event bereit
        await job.complete({
          datum: reiseDatum,
          hotelAnfrageID: hotelAnfrageID
        });

        console.log('✅ "Hotelanfrage schreiben" abgeschlossen.');
      },
    });

    zbc.createWorker({
      // Dieser Typ muss mit dem "Job type" im "Hotel-Prozess" übereinstimmen
      taskType: 'hotel-angebot-senden',

      taskHandler: async (job) => {
        console.log('\n=== 2. Hotel-Vorschlag erstellen (Worker: "Angebot senden") ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        // 1. Variablen aus der Anfrage holen
        const angefragtesDatum = job.variables.datum;
        const korrelationsID = job.variables.hotelAnfrageID; // ID vom ursprünglichen Anfrager

        // 2. Vorschlagstext erstellen
        const vorschlagText =
          `Hier ist unser Vorschlag für ${angefragtesDatum}: Hotel "Sonne", 120 EUR/Nacht.`;

        console.log(`📝 Vorschlag erstellt: ${vorschlagText}`);

        // 3. Job abschließen -> Variablen für das Antwort-Throw-Event bereitstellen
        await job.complete({
          vorschlag: vorschlagText,
          hotelAnfrageID: korrelationsID // ID für die Rückkorrelation
        });

        console.log('✅ "Vorschlag erstellen" abgeschlossen.');
      },
    });

    zbc.createWorker({
      // Dieser Typ muss mit dem "Job type" in deinem BPMN-Modell übereinstimmen
      taskType: 'fluganfrage-schreiben',

      taskHandler: async (job) => {
        console.log('\n=== 1. Fluganfrage schreiben ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        // 1. Variable holen (z.B. "flugZiel")
        const flugWunsch = job.variables.flugZiel;

        // 2. Eindeutige ID für diese Anfrage erstellen
        const flugAnfrageID = job.processInstanceKey;
        console.log(`🔑 Erzeuge Flug-Korrelationsschlüssel: ${flugAnfrageID}`);
        console.log(`✈️ Sende Flugwunsch: ${flugWunsch}`);

        // 3. Job abschließen -> Variablen für das Message Throw Event bereitstellen
        await job.complete({
          flugZiel: flugWunsch,
          flugAnfrageID: flugAnfrageID
        });

        console.log('✅ "Fluganfrage schreiben" abgeschlossen.');
      },
    });

    zbc.createWorker({
      // WICHTIG: Muss exakt zum Job Type im Flug-Prozess passen
      taskType: 'flug-angebot-senden',

      taskHandler: async (job) => {
        console.log('\n=== 2. Flug-Angebot erstellen (Worker: "Angebot senden") ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        // 1. Variablen aus der Anfrage holen
        const angefragtesZiel = job.variables.flugZiel;
        const korrelationsID = job.variables.flugAnfrageID; // ID vom ursprünglichen Anfrager

        // 2. Flugangebot erstellen
        const angebotText = `Hier ist unser Flug-Angebot für ${angefragtesZiel}: 350 EUR.`;
        console.log(`📝 Flug-Angebot erstellt: ${angebotText}`);

        // 3. Job abschließen -> Variablen für das Antwort-Throw-Event bereitstellen
        await job.complete({
          flugAngebot: angebotText,
          flugAnfrageID: korrelationsID  // ID zur Korrelation zurückgeben
        });

        console.log('✅ "Flug-Angebot erstellen" abgeschlossen.');
      },
    });




    // ----------------------------------------------------------------------------------------------------------------------------
    // ---------------------------------------------------ALT-------------------------------------------------------------------------
    // ----------------------------------------------------------------------------------------------------------------------------
    // ----------------------------------------------------------------------------------------------------------------------------

    // =========================================================================
    // 1. WORKER: "WhatsApp öffnen"
    // BPMN-Task-Type: whatsapp-oeffnen
    // =========================================================================
    zbc.createWorker({
      taskType: 'whatsapp-oeffnen',
      taskHandler: async (job) => {
        console.log('\n=== 1. WhatsApp öffnen ===');
        
        // LOKALE VARIABLE:
        // 'korrelationsId' existiert NUR hier im Worker.
        // Camunda weiß nichts von dieser Variable, bis wir sie senden.
        const korrelationsId = 'B-' + Date.now();
        console.log(`🔑 Erzeuge nachrichtID (Korrelationsschlüssel): ${korrelationsId}`);

        // OUTPUT AN CAMUNDA:
        // Mit 'job.complete' sendest du Variablen an den Prozess.
        // Hier nimmst du den WERT von 'korrelationsId' (z.B. "B-12345")
        // und erstellst damit eine NEUE PROZESSVARIABLE namens 'nachrichtID'.
        await job.complete({
          nachrichtID: korrelationsId, // nachrichtID ist jetzt eine Prozessvariable
        });
        console.log('✅ "WhatsApp öffnen" abgeschlossen, nachrichtID gesendet.');
      },
    });

    // =========================================================================
    // 2. WORKER: "Antwort eintippen"
    // BPMN-Task-Type: nachricht-beantworten
    // =========================================================================
    zbc.createWorker({
      taskType: 'nachricht-beantworten',
      taskHandler: async (job) => {
        console.log('\n=== 2. Antwort eintippen ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        // INPUT VON CAMUNDA:
        // 'job.variables' enthält alle Prozessvariablen.
        // Hier HOLST du dir den Wert der Variable 'nachricht',
        // die der Mensch im User Task zuvor eingegeben hat.
        const nachrichtVomUser = job.variables.nachricht;

        // OUTPUT AN CAMUNDA (PASS-THROUGH):
        // Ein 'job.complete()' OHNE { } bedeutet:
        // "Ich bin fertig. Sende KEINE neuen Variablen, aber
        // lösche auch KEINE alten."
        // Alle Variablen ('nachricht' und 'nachrichtID')
        // bleiben für den nächsten Schritt ("Antwort senden") erhalten.
        await job.complete(); 

        console.log(`✅ "Antwort eintippen" abgeschlossen. Nachricht "${nachrichtVomUser}" wird weitergeleitet...`);
      },
    });

    zbc.createWorker({
      taskType: 'zusage-schreiben',
      taskHandler: async (job) => {
        console.log('\n=== Zusage schreiben (POOL 2) ===');
        // console.log('📊 Empfangene Variablen:', job.variables);

        // LOKALE VARIABLE:
        // 'entscheidung' ist eine rein lokale Variable. Camunda sieht sie NICHT.
        // Sie wird nur hier für die Logik des Workers benötigt.
        let entscheidung = 'ja';
        
        console.log(`⚖️ Entscheidung getroffen (Lauf ${executionCount}): ${entscheidung}`);

        // OUTPUT AN CAMUNDA:
        // Hier nimmst du den WERT von 'entscheidung' (z.B. "ja")
        // und sendest ihn an Camunda.
        // Camunda erstellt/überschreibt die PROZESSVARIABLE 'status'.
        // Im nächsten Gateway (Raute) kannst du dann prüfen: = status = "ja"
        await job.complete({
          zusage: entscheidung,
        });
        console.log('✅ Zusage schreiben, Zusage gesendet.');
      },
    });

    // =============================================================================================================================================================================================================================================================================================================================================================================
    // =============================================================================================================================================================================================================================================================================================================================================================================
    
    // =========================================================================
    // 3. WORKER: "Antrag vorbereiten"
    // BPMN-Task-Type: anfrage-vorbereiten
    // =========================================================================
    zbc.createWorker({
      taskType: 'anfrage-vorbereiten',
      taskHandler: async (job) => {
        console.log('\n=== 3. ANTRAG VORBEREITEN ===');
        
        // LOKALE VARIABLE:
        // 'korrelationsId' existiert NUR hier im Worker.
        const korrelationsId = 'A-' + Date.now();
        console.log(`🔑 Erzeuge anfrageID: ${korrelationsId}`);

        // OUTPUT AN CAMUNDA:
        // Genau wie bei Worker 1:
        // Erzeuge eine NEUE PROZESSVARIABLE namens 'anfrageID'.
        await job.complete({
          anfrageID: korrelationsId, // anfrageID ist jetzt eine Prozessvariable
        });
        console.log('✅ Anfrage vorbereitet, anfrageID gesendet.');
      },
    });

    // =========================================================================
    // 4. WORKER: "Antrag bearbeiten"
    // BPMN-Task-Type: anfrage-bearbeiten
    // =========================================================================
    zbc.createWorker({
      taskType: 'anfrage-bearbeiten',
      taskHandler: async (job) => {
        console.log('\n=== 4. ANTRAG BEARBEITEN (POOL 2) ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        // LOKALE VARIABLE:
        // 'entscheidung' ist eine rein lokale Variable. Camunda sieht sie NICHT.
        // Sie wird nur hier für die Logik des Workers benötigt.
        let entscheidung;
        
        // (executionCount ist eine globale Variable in dieser JS-Datei, 
        // KEINE Camunda-Variable. Sie zählt, wie oft dieser Worker aufgerufen wurde.)
        if (executionCount === 0) {
          entscheidung = 'nein';
        } else {
          entscheidung = 'ja';
        }
        executionCount++;
        
        console.log(`⚖️ Entscheidung getroffen (Lauf ${executionCount}): ${entscheidung}`);

        // OUTPUT AN CAMUNDA:
        // Hier nimmst du den WERT von 'entscheidung' (z.B. "ja")
        // und sendest ihn an Camunda.
        // Camunda erstellt/überschreibt die PROZESSVARIABLE 'status'.
        // Im nächsten Gateway (Raute) kannst du dann prüfen: = status = "ja"
        await job.complete({
          status: entscheidung,
        });
        console.log('✅ Anfrage bearbeitet, status gesendet.');
      },
    });

    // --- Info-Ausgabe ---
    console.log('\n👂 Alle 4 Worker sind jetzt aktiv:');
    console.log('   1. whatsapp-oeffnen');
    console.log('   2. nachricht-beantworten');
    console.log('   3. anfrage-vorbereiten');
    console.log('   4. anfrage-bearbeiten');
    console.log('\n💡 Drücke Ctrl+C zum Beenden');
  } catch (error) {
    console.error('💥 Schwerer Fehler beim Starten des Workers:', error);
    process.exit(1);
  }
}

main();
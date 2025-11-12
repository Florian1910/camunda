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

    console.log('✅ Verbunden mit Zeebe');

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